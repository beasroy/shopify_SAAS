import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connectDB } from '../config/db.js';
import { cityClassificationQueue, CITY_CLASSIFICATION_PREFIX } from '../config/Queues.js';
import Order from '../models/Order.js';
import CityMetadata from '../models/CityMetadata.js';
import { getCanonicalCity } from '../utils/cityAliases.js';
import { acquireLock, releaseLock } from '../utils/lockUtils.js';

/** Build lookupKey the same way as gptService/locationAnalytics (city_state_country, normalized, no spaces in state/country) */
function buildLookupKey(city, state, country) {
    const cityCanonical = getCanonicalCity(city);
    const stateNorm = (state || '').toLowerCase().trim().replaceAll(/\s+/g, '');
    const countryNorm = (country || 'unknown').toLowerCase().trim().replaceAll(/\s+/g, '') || 'unknown';
    return `${cityCanonical}_${stateNorm}_${countryNorm}`;
}

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from server directory (parent of scripts directory)
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * One-time script to backfill CityMetadata for all existing cities in Orders.
 * Usage: node server/scripts/backfillCityMetadata.js
 * - By default, the script queues batches then starts the worker in-process and waits until the queue is empty.
 * - To only queue jobs (and run the worker separately): SKIP_WORKER=1 node server/scripts/backfillCityMetadata.js
 */
async function backfillCityMetadata() {
    const lockKey = 'backfill-city-metadata';
    let lockAcquired = false;
    
    try {
        console.log('🔄 Starting city metadata backfill...');
        
        // Check if backfill is already running
        const lockAcquiredResult = await acquireLock(lockKey, 7200); // 2 hour TTL
        if (!lockAcquiredResult) {
            console.log('⚠️  Backfill is already running. Exiting...');
            process.exit(0);
        }
        lockAcquired = true;
        console.log('✅ Acquired lock for backfill process');
        
        // Connect to database
        if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
            console.error('❌ Error: MongoDB connection string not found!');
            console.error('   Please set either MONGO_URI or MONGODB_URI in your .env file');
            console.error('   Example: MONGO_URI=mongodb://localhost:27017/your_database');
            process.exit(1);
        }
        
        // Use MONGODB_URI if MONGO_URI is not set (for compatibility)
        if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
            process.env.MONGO_URI = process.env.MONGODB_URI;
        }
        
        await connectDB();
        console.log('✅ Connected to database');
        
        // Get all unique city/state/country from Orders (country from Order, not GPT)
        console.log('📊 Fetching all unique cities from Orders...');
        const allCities = await Order.aggregate([
            { $match: { city: { $exists: true, $ne: null, $ne: '' }, state: { $exists: true, $ne: null, $ne: '' } } },
            {
                $group: {
                    _id: {
                        city: { $toLower: { $trim: { input: '$city' } } },
                        state: { $toLower: { $trim: { input: '$state' } } },
                        country: { $toLower: { $trim: { input: { $ifNull: ['$country', 'unknown'] } } } }
                    },
                    originalCity: { $first: '$city' },
                    originalState: { $first: '$state' },
                    originalCountry: { $first: '$country' }
                }
            },
            {
                $project: {
                    _id: 0,
                    cityNormalized: '$_id.city',
                    city: '$originalCity',
                    state: '$originalState',
                    country: { $ifNull: ['$originalCountry', 'unknown'] }
                }
            }
        ]);
        
        console.log(`📊 Found ${allCities.length} unique cities`);
        
        if (allCities.length === 0) {
            console.log('ℹ️  No cities found in Orders table');
            process.exit(0);
        }
        
        // Check existing by lookupKey (city_state_country from Order)
        const existingLookupKeys = new Set(await CityMetadata.distinct('lookupKey'));

        const newCities = allCities.filter(c => {
            const key = buildLookupKey(c.city, c.state, c.country);
            return !existingLookupKeys.has(key);
        });
        console.log(`🆕 ${newCities.length} new cities to classify (${allCities.length - newCities.length} already exist)`);
        
        if (newCities.length === 0) {
            console.log('✅ All cities already classified');
            process.exit(0);
        }
        
        // Ensure Redis connection is established before queueing
        console.log('🔌 Verifying Redis connection...');
        try {
            const queueConnection = cityClassificationQueue.opts.connection;
            
            // Test connection by trying to ping Redis
            if (queueConnection) {
                try {
                    await queueConnection.ping();
                    console.log('   ✅ Redis connection verified (ping successful)');
                } catch (pingError) {
                    // If ping fails, try to connect
                    console.log('   Attempting to connect to Redis...');
                    if (queueConnection.status !== 'ready' && queueConnection.status !== 'connecting') {
                        await queueConnection.connect();
                    }
                    // Wait a bit for connection to establish
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // Try ping again
                    await queueConnection.ping();
                    console.log('   ✅ Redis connected and verified');
                }
            } else {
                throw new Error('No Redis connection found in queue configuration');
            }
        } catch (error) {
            console.error('   ❌ Failed to connect to Redis:', error.message);
            console.error('   Stack:', error.stack);
            throw new Error(`Redis connection failed: ${error.message}`);
        }
        
        // Ensure Redis connection is ready before queuing
        const queueConnection = cityClassificationQueue.opts.connection;
        if (queueConnection.status !== 'ready') {
            console.log('   Ensuring Redis connection is ready...');
            await queueConnection.connect();
            // Wait for connection to be fully ready
            let attempts = 0;
            while (queueConnection.status !== 'ready' && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            if (queueConnection.status !== 'ready') {
                throw new Error('Redis connection failed to become ready');
            }
            console.log('   ✅ Redis connection ready');
        }
        
        // Queue batch jobs
        const batchSize = 20;
        let batchNumber = 1;
        const totalBatches = Math.ceil(newCities.length / batchSize);
        
        console.log(`📦 Creating ${totalBatches} batch jobs...`);
        
        let successCount = 0;
        let errorCount = 0;
        const queuedJobIds = [];
        
        for (let i = 0; i < newCities.length; i += batchSize) {
            const batch = newCities.slice(i, i + batchSize);
            
            try {
                // Add job with explicit jobId to ensure it's tracked
                const job = await cityClassificationQueue.add('classify-cities-batch', {
                    type: 'batch',
                    cities: batch,
                    batchNumber: batchNumber++,
                    totalBatches: totalBatches
                }, {
                    priority: 1,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    },
                    // Clean up jobs after processing to prevent Redis OOM
                    // Keep completed jobs for 1 hour for monitoring, then auto-clean
                    removeOnComplete: {
                        age: 3600, // 1 hour
                        count: 500 // Keep max 500 completed jobs
                    },
                    // Keep failed jobs for 24 hours for debugging
                    removeOnFail: {
                        age: 86400, // 24 hours
                        count: 100 // Keep max 100 failed jobs
                    }
                });
                
                if (job && job.id) {
                    queuedJobIds.push(job.id);
                    
                    // Wait a bit longer to ensure job is persisted
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Verify job was actually persisted by trying to get it back
                    try {
                        const verifyJob = await cityClassificationQueue.getJob(job.id);
                        if (verifyJob && verifyJob.id) {
                            console.log(`✅ Queued batch ${batchNumber - 1}/${totalBatches} (${batch.length} cities) - Job ID: ${job.id} [verified in Redis]`);
                            successCount++;
                        } else {
                            console.error(`⚠️  Queued batch ${batchNumber - 1}/${totalBatches} but job not found in Redis - Job ID: ${job.id}`);
                            console.error(`   This indicates the job was created but not persisted to Redis`);
                            errorCount++;
                        }
                    } catch (verifyError) {
                        console.error(`⚠️  Error verifying job ${job.id}:`, verifyError.message);
                        console.log(`✅ Queued batch ${batchNumber - 1}/${totalBatches} (${batch.length} cities) - Job ID: ${job.id} [verification failed]`);
                        successCount++; // Count as success since we got a job ID
                    }
                } else {
                    console.error(`❌ Failed to queue batch ${batchNumber - 1}/${totalBatches} - No job ID returned`);
                    errorCount++;
                }
            } catch (error) {
                console.error(`❌ Error queueing batch ${batchNumber - 1}/${totalBatches}:`, error.message);
                if (error.stack) {
                    console.error(`   Stack:`, error.stack);
                }
                errorCount++;
            }
        }
        
        if (errorCount > 0) {
            console.log(`\n⚠️  Warning: ${errorCount} batches failed to queue (${successCount} succeeded)`);
        }
        
        console.log(`\n✅ Backfill complete! Queued ${successCount}/${totalBatches} batch jobs successfully`);
        if (errorCount > 0) {
            console.log(`⚠️  ${errorCount} batches failed to queue`);
        }
        console.log('ℹ️  Monitor the queue to see job progress');
        
        // Wait a bit to ensure jobs are queued, then verify
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify jobs were actually added (use same connection and BullMQ key format: prefix:queueName:key)
        try {
            const queueConnection = cityClassificationQueue.opts.connection;
            const queueName = 'city-classification';
            const waitKey = `${CITY_CLASSIFICATION_PREFIX}:${queueName}:wait`;
            const waitCount = await queueConnection.llen(waitKey).catch(() => 0);

            let foundJobCount = 0;
            for (const jobId of queuedJobIds.slice(0, 5)) {
                try {
                    const jobKey = `${CITY_CLASSIFICATION_PREFIX}:${queueName}:${jobId}`;
                    const exists = await queueConnection.exists(jobKey);
                    if (exists) foundJobCount++;
                } catch (e) {
                    // Ignore errors
                }
            }
            
            const counts = await cityClassificationQueue.getJobCounts();
            const total = (counts.waiting || 0) + (counts.active || 0) + (counts.completed || 0) + (counts.failed || 0) + (counts.delayed || 0);
            
            console.log(`\n📊 Queue verification:`);
            console.log(`   Jobs queued: ${successCount}`);
            console.log(`   Job IDs collected: ${queuedJobIds.length}`);
            console.log(`   Waiting (BullMQ): ${counts.waiting || 0}`);
            console.log(`   Waiting (Redis direct LLEN): ${waitCount}`);
            console.log(`   Job keys found in Redis: ${foundJobCount}/5 checked`);
            console.log(`   Active: ${counts.active || 0}`);
            console.log(`   Completed: ${counts.completed || 0}`);
            console.log(`   Failed: ${counts.failed || 0}`);
            console.log(`   Delayed: ${counts.delayed || 0}`);
            console.log(`   Total (BullMQ): ${total}`);
            
            // Try to get a few jobs directly
            const sampleJobs = await cityClassificationQueue.getWaiting(0, 5).catch(() => []);
            console.log(`   Sample waiting jobs (getWaiting): ${sampleJobs.length}`);
            
            if (total === 0 && waitCount === 0 && successCount > 0) {
                console.log(`\n⚠️  WARNING: Jobs were queued but not found in queue!`);
                console.log(`   This could indicate:`);
                console.log(`   1. Jobs were processed immediately by a worker`);
                console.log(`   2. Redis connection issue (different instance/database)`);
                console.log(`   3. Queue name mismatch`);
                console.log(`   4. Jobs were added but immediately removed`);
                console.log(`   5. Redis eviction policy removed the keys`);
                
                // Check Redis eviction policy
                try {
                    const maxmemory = await queueConnection.config('GET', 'maxmemory-policy');
                    console.log(`\n   Redis eviction policy: ${maxmemory[1] || 'unknown'}`);
                    if (maxmemory[1] && maxmemory[1] !== 'noeviction') {
                        console.log(`   ⚠️  WARNING: Redis eviction policy is "${maxmemory[1]}"`);
                        console.log(`   ⚠️  BullMQ requires "noeviction" policy to prevent job loss`);
                        console.log(`   💡 Fix with: redis-cli CONFIG SET maxmemory-policy noeviction`);
                    }
                } catch (e) {
                    // Ignore
                }
                
                // Check if cities were actually classified in the database
                console.log(`\n🔍 Checking database to see if cities were classified...`);
                const classifiedCount = await CityMetadata.countDocuments({
                    source: 'gpt',
                    processingStatus: 'completed',
                    processedAt: { $gte: new Date(Date.now() - 60000) } // Last minute
                });
                
                if (classifiedCount > 0) {
                    console.log(`   ✅ Found ${classifiedCount} cities classified in the last minute!`);
                    console.log(`   ✅ Jobs WERE processed successfully by a worker`);
                } else {
                    console.log(`   ❌ No cities classified in the last minute`);
                    console.log(`   ⚠️  Jobs were queued but NOT processed`);
                    console.log(`   💡 Run the backfill without SKIP_WORKER=1 so the script starts the worker and drains the queue.`);
                    console.log(`   💡 Or start the worker manually: node server/workers/cityClassificationWorker.js`);
                }
            } else if (waitCount > 0 && total === 0) {
                console.log(`\n⚠️  WARNING: Jobs found in Redis (${waitCount}) but BullMQ counts show 0!`);
                console.log(`   This suggests a BullMQ connection or state issue.`);
                console.log(`   Jobs are in Redis and should be processed by the worker.`);
            } else if (waitCount > 0 || total > 0) {
                console.log(`\n✅ Jobs are waiting in the queue (${waitCount} in Redis, ${counts.waiting} via BullMQ)`);
                console.log(`   The worker should process them automatically.`);
            }
        } catch (error) {
            console.error(`\n❌ Error verifying queue:`, error.message);
            console.error(`   Stack:`, error.stack);
        }

        // Optionally start the worker in this process and wait until queue is empty (no separate worker process needed)
        if (successCount > 0 && process.env.SKIP_WORKER !== '1') {
            const maxWaitMs = 2 * 60 * 60 * 1000; // 2 hours
            const pollIntervalMs = 5000;
            console.log('\n🔄 Starting worker in this process to drain the queue (set SKIP_WORKER=1 to only queue and exit)...');
            console.log('   ℹ️  Do not run another city-classification worker in another terminal, or it may consume these jobs.');
            const connectionClosedHandler = () => {
                if (lockAcquired) releaseLock(lockKey).catch(() => {});
                process.exit(0);
            };
            const uncaughtHandler = (err) => {
                if (err && err.message === 'Connection is closed') connectionClosedHandler();
            };
            const rejectionHandler = (reason) => {
                if (reason && reason.message === 'Connection is closed') connectionClosedHandler();
            };
            process.once('uncaughtException', uncaughtHandler);
            process.once('unhandledRejection', rejectionHandler);
            const { default: worker } = await import('../workers/cityClassificationWorker.js');
            const startWait = Date.now();
            while (Date.now() - startWait < maxWaitMs) {
                const counts = await cityClassificationQueue.getJobCounts();
                const pending = (counts.waiting || 0) + (counts.active || 0);
                if (pending === 0) {
                    console.log('\n✅ All jobs processed.');
                    break;
                }
                console.log(`   Waiting for queue to drain... (waiting: ${counts.waiting || 0}, active: ${counts.active || 0})`);
                await new Promise(r => setTimeout(r, pollIntervalMs));
            }
            await worker.close();
            // Keep handlers registered in case "Connection is closed" is emitted after close() returns
            process.off('uncaughtException', uncaughtHandler);
            process.off('unhandledRejection', rejectionHandler);
        } else if (successCount > 0 && process.env.SKIP_WORKER === '1') {
            console.log('\nℹ️  Jobs queued. To process them, run: node server/workers/cityClassificationWorker.js');
        }

        // Release lock before exiting
        if (lockAcquired) {
            await releaseLock(lockKey);
            console.log('✅ Released backfill lock');
        }

        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error during backfill:', error);
        
        // Release lock on error
        if (lockAcquired) {
            await releaseLock(lockKey);
            console.log('✅ Released backfill lock after error');
        }
        
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    backfillCityMetadata();
}

export default backfillCityMetadata;

