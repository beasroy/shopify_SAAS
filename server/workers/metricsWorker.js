import { Worker } from 'bullmq';
import { calculateMetricsForSingleBrand, calculateMetricsForNewAdditions } from '../Report/MonthlyReport.js';
import { createRedisConnection } from '../config/redis.js';
import { connectDB, getConnectionStatus } from '../config/db.js';
import mongoose from 'mongoose';

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

// Create worker for metrics calculation (handles both regular and new additions)
const metricsWorker = new Worker('metrics-calculation', async (job) => {
    const { brandId, userId, newAdditions } = job.data;
    
    try {
        // Ensure MongoDB connection before processing
        await ensureMongoConnection();
        
        if (newAdditions) {
            // Handle new additions processing
            console.log(`Processing metrics calculation for new additions for brand ${brandId}`);
            await calculateMetricsForNewAdditions(brandId, userId, newAdditions);
            console.log(`Successfully calculated metrics for new additions for brand ${brandId}`);
        } else {
            // Handle regular metrics calculation
            console.log(`Processing regular metrics calculation for brand ${brandId}`);
            await calculateMetricsForSingleBrand(brandId, userId);
            console.log(`Successfully calculated regular metrics for brand ${brandId}`);
        }
        
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

// Event handlers for metrics worker
metricsWorker.on('active', (job) => {
    if (isDevelopment) {
        const jobType = job.data.newAdditions ? 'new additions' : 'regular';
        console.log(`[DEV] Metrics job ${job.id} started processing for brand ${job.data.brandId} (${jobType})`);
    } else {
        const jobType = job.data.newAdditions ? 'new additions' : 'regular';
        console.log(`[PROD] Processing ${jobType} metrics for brand ${job.data.brandId}`);
    }
});

metricsWorker.on('progress', (job, progress) => {
    if (isDevelopment) {
        console.log(`[DEV] Metrics job ${job.id} progress: ${progress}%`);
    } else {
        // In production, only log significant progress milestones
        if (progress % 25 === 0) {
            const jobType = job.data.newAdditions ? 'new additions' : 'regular';
            console.log(`[PROD] ${jobType} metrics calculation ${progress}% complete for brand ${job.data.brandId}`);
        }
    }
});

metricsWorker.on('completed', (job) => {
    if (isDevelopment) {
        const jobType = job.data.newAdditions ? 'new additions' : 'regular';
        console.log(`[DEV] Metrics job ${job.id} completed for brand ${job.data.brandId} (${jobType})`);
    } else {
        const jobType = job.data.newAdditions ? 'new additions' : 'regular';
        console.log(`[PROD] Successfully completed ${jobType} metrics calculation for brand ${job.data.brandId}`);
    }
});

metricsWorker.on('failed', (job, error) => {
    const jobType = job?.data?.newAdditions ? 'new additions' : 'regular';
    console.error(`${jobType} metrics job ${job?.id} failed for brand ${job?.data?.brandId}:`, error);
});

// Error handler
const handleWorkerError = (error) => {
    if (isDevelopment) {
        console.error(`[DEV] Metrics worker error:`, error);
    } else {
        console.error(`[PROD] Metrics worker error:`, {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
};

metricsWorker.on('error', handleWorkerError);

// Graceful shutdown handling
const shutdown = async () => {
    console.log('Shutting down metrics worker...');
    await metricsWorker.close();
    await mongoose.connection.close();
    
    process.exit(0);
};

// Handle process signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Starting metrics worker...');
    
    // Ensure MongoDB connection before starting worker
    connectDB().then(() => {
        metricsWorker.on('ready', () => {
            console.log('Metrics worker is ready to process jobs (both regular and new additions)');
        });
    }).catch(error => {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    });
}

export { metricsWorker }; 