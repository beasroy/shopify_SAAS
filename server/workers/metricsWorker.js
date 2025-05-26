import { Worker } from 'bullmq';
import { calculateMetricsForSingleBrand } from '../Report/MonthlyReport.js';
import { createRedisConnection } from '../config/redis.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

const worker = new Worker('metrics-calculation', async (job) => {
    const { brandId, userId } = job.data;
    
    try {
        console.log(`Processing metrics calculation for brand ${brandId}`);
        await calculateMetricsForSingleBrand(brandId, userId);
        console.log(`Successfully calculated metrics for brand ${brandId}`);
    } catch (error) {
        console.error(`Error calculating metrics for brand ${brandId}:`, error);
        throw error;
    }
}, {
    connection: createRedisConnection(),
    concurrency: isDevelopment ? 2 : 5, 
    limiter: isDevelopment ? {
        max: 5, 
        duration: 1000
    } : {
        max: 10,
        duration: 1000
    },
    settings: {
        lockDuration: isDevelopment ? 30000 : 300000, 
        stalledInterval: isDevelopment ? 5000 : 30000, 
    }
});

worker.on('active', (job) => {
    if (isDevelopment) {
        console.log(`[DEV] Job ${job.id} started processing for brand ${job.data.brandId}`);
    } else {
        console.log(`[PROD] Processing metrics for brand ${job.data.brandId}`);
    }
});

worker.on('progress', (job, progress) => {
    if (isDevelopment) {
        console.log(`[DEV] Job ${job.id} progress: ${progress}%`);
    } else {
        // In production, only log significant progress milestones
        if (progress % 25 === 0) {
            console.log(`[PROD] Metrics calculation ${progress}% complete for brand ${job.data.brandId}`);
        }
    }
});

worker.on('completed', (job) => {
    if (isDevelopment) {
        console.log(`[DEV] Job ${job.id} completed for brand ${job.data.brandId}`);
    } else {
        console.log(`[PROD] Successfully completed metrics calculation for brand ${job.data.brandId}`);
    }
});

worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed for brand ${job?.data?.brandId}:`, error);
});

worker.on('error', (error) => {
    if (isDevelopment) {
        console.error('[DEV] Worker error:', error);
    } else {
        console.error('[PROD] Worker error:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Graceful shutdown handling
const shutdown = async () => {
    console.log('Shutting down worker...');
    await worker.close();
    process.exit(0);
};

// Handle process signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Starting metrics worker...');
    worker.on('ready', () => {
        console.log('Metrics worker is ready to process jobs');
    });
}

export default worker; 