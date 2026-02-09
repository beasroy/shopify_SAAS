import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
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

// Create worker for city classification
const cityClassificationWorker = new Worker(
    'city-classification',
    async (job) => {
        const { type, cities, batchNumber, totalBatches } = job.data;

        try {
            // Ensure MongoDB connection before processing
            await ensureMongoConnection();

            if (type === 'batch') {
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
            
            // Mark cities as failed in metadata (if classifications were created before error)
            // Note: We can't mark them as failed if GPT call failed before creating classifications
            // This is a best-effort attempt to update status if partial data exists
            
            throw error;
        }
    },
    {
        connection: createRedisConnection(),
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
cityClassificationWorker.on('completed', (job) => {
    console.log(`✅ [Worker] City classification job ${job.id} completed`);
});

cityClassificationWorker.on('failed', (job, err) => {
    console.error(`❌ [Worker] City classification job ${job.id} failed:`, err.message);
});

cityClassificationWorker.on('error', (err) => {
    console.error('❌ [Worker] City classification worker error:', err);
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

export default cityClassificationWorker;

