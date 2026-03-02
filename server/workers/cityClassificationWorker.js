import { Worker } from 'bullmq';
import { connection } from '../config/redis.js';
import { CITY_CLASSIFICATION_PREFIX } from '../config/Queues.js';
import { connectDB, getConnectionStatus } from '../config/db.js';
import CityMetadata from '../models/CityMetadata.js';
import { classifyCitiesWithGPT } from '../services/gptService.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Ensure MongoDB connection before processing jobs
const ensureMongoConnection = async () => {
    const { isConnected, cachedConnection } = getConnectionStatus();

    if (!isConnected || !cachedConnection) {
        console.log('Establishing new MongoDB connection...');
        await connectDB();
    } else {
        console.log('Using cached MongoDB connection');
    }
};

// Create worker for city classification (same connection + prefix as queue for in-process backfill)
const cityClassificationWorker = new Worker(
    'city-classification',
    async (job) => {
        const { type, cities, batchNumber, totalBatches } = job.data;

        try {
            // Ensure MongoDB connection before processing
            await ensureMongoConnection();

            if (type === 'batch') {
                if (!Array.isArray(cities)) {
                    throw new TypeError('Job data "cities" must be an array');
                }
                if (cities.length === 0) {
                    console.log(`🔄 [Worker] Batch ${batchNumber}/${totalBatches} has no cities, skipping`);
                    return { success: true, classified: 0, batchNumber, totalBatches };
                }

                console.log(`🔄 [Worker] Processing batch ${batchNumber}/${totalBatches} with ${cities.length} cities`);

                // 1. Call GPT API to classify cities
                const classifications = await classifyCitiesWithGPT(cities);

                // 2. Store in CityMetadata using bulkWrite
                const bulkOps = classifications.map(classification => ({
                    updateOne: {
                        filter: { lookupKey: classification.lookupKey },
                        update: {
                            $set: {
                                ...classification,
                                source: 'gpt',
                                lastVerifiedAt: new Date(),
                                processingStatus: 'completed',
                                processedAt: new Date()
                            }
                        },
                        upsert: true
                    }
                }));

                await CityMetadata.bulkWrite(bulkOps);

                console.log(`✅ [Worker] Classified ${classifications.length} cities in batch ${batchNumber}`);

                return {
                    success: true,
                    classified: classifications.length,
                    batchNumber,
                    totalBatches
                };
            } else {
                throw new Error(`Unknown job type: ${type}`);
            }

        } catch (error) {
            console.error(`❌ [Worker] Error processing batch ${batchNumber}:`, error);
            throw error;
        }
    },
    {
        connection,
        prefix: CITY_CLASSIFICATION_PREFIX,
        concurrency: isDevelopment ? 1 : 2, // Process 1-2 batches concurrently
        limiter: {
            max: isDevelopment ? 5 : 10, // Max jobs per duration
            duration: 60000 // 1 minute (to respect GPT API rate limits)
        },
        settings: {
            lockDuration: isDevelopment ? 30000 : 300000, // 30s dev, 5min prod
            stalledInterval: isDevelopment ? 5000 : 30000,
        }
    }
);

// Event handlers for city classification worker
cityClassificationWorker.on('ready', () => {
    console.log('✅ [Worker] City classification worker is ready and waiting for jobs');
});

cityClassificationWorker.on('active', (job) => {
    console.log(`🔄 [Worker] Job ${job.id} is now active (starting to process)`);
});

cityClassificationWorker.on('completed', (job) => {
    console.log(`✅ [Worker] City classification job ${job.id} completed`);
});

cityClassificationWorker.on('failed', (job, err) => {
    console.error(`❌ [Worker] City classification job ${job.id} failed:`, err.message);
    if (err.stack) {
        console.error('   Stack:', err.stack);
    }
});

cityClassificationWorker.on('error', (err) => {
    if (err && err.message === 'Connection is closed') {
        return; // Expected when backfill closes worker; backfill handles exit
    }
    console.error('❌ [Worker] City classification worker error:', err);
    if (err.stack) {
        console.error('   Stack:', err.stack);
    }

    // Handle Redis OOM errors specifically
    if (err.message && err.message.includes('OOM')) {
        console.error('\n⚠️  REDIS OUT OF MEMORY ERROR DETECTED!');
        console.error('   Redis has hit its maxmemory limit and cannot accept new commands.');
        console.error('\n💡 To fix this issue:');
        console.error('   1. Run cleanup script: node server/scripts/cleanupRedis.js city-classification');
        console.error('   2. For aggressive cleanup: node server/scripts/cleanupRedis.js city-classification --aggressive');
        console.error('   3. To drain queue completely: node server/scripts/cleanupRedis.js --drain city-classification');
        console.error('   4. Check Redis memory: redis-cli INFO memory');
        console.error('   5. Increase Redis maxmemory if needed');
        console.error('\n   The worker will continue retrying, but jobs may fail until Redis memory is freed.\n');
    }
});

cityClassificationWorker.on('stalled', (jobId) => {
    console.warn(`⚠️  [Worker] Job ${jobId} stalled (taking too long)`);
});

// Graceful shutdown handler
const shutdown = async () => {
  console.log('\n🛑 Shutting down city classification worker...');
  try {
    await cityClassificationWorker.close();
    console.log('✅ City classification worker closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing worker:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('✅ City classification worker initialized');
console.log(`   Queue: city-classification`);
console.log(`   Concurrency: ${isDevelopment ? 1 : 2}`);
console.log(`   Rate limit: ${isDevelopment ? 5 : 10} jobs per minute`);
console.log(`   Waiting for jobs...`);

export default cityClassificationWorker;

