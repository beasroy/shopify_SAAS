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

// Create workers for different job types
const regularMetricsWorker = new Worker('metrics-calculation', async (job) => {
    const { brandId, userId } = job.data;
    
    try {
        // Ensure MongoDB connection before processing
        await ensureMongoConnection();
        
        console.log(`Processing regular metrics calculation for brand ${brandId}`);
        await calculateMetricsForSingleBrand(brandId, userId);
        console.log(`Successfully calculated regular metrics for brand ${brandId}`);
        
    } catch (error) {
        console.error(`Error calculating regular metrics for brand ${brandId}:`, error);
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

const newAdditionsWorker = new Worker('calculate-metrics-new-additions', async (job) => {
    const { brandId, userId, newAdditions = {} } = job.data;
    
    try {
        // Ensure MongoDB connection before processing
        await ensureMongoConnection();
        
        console.log(`Processing metrics calculation for new additions for brand ${brandId}`);
        await calculateMetricsForNewAdditions(brandId, userId, newAdditions);
        console.log(`Successfully calculated metrics for new additions for brand ${brandId}`);
        
    } catch (error) {
        console.error(`Error calculating metrics for new additions for brand ${brandId}:`, error);
        throw error;
    }
}, {
    connection: createRedisConnection(),
    concurrency: isDevelopment ? 1 : 3, // Lower concurrency for new additions processing
    limiter: isDevelopment ? {
        max: 3, 
        duration: 1000
    } : {
        max: 5,
        duration: 1000
    },
    settings: {
        lockDuration: isDevelopment ? 30000 : 300000, 
        stalledInterval: isDevelopment ? 5000 : 30000, 
    }
});

// Event handlers for regular metrics worker
regularMetricsWorker.on('active', (job) => {
    if (isDevelopment) {
        console.log(`[DEV] Regular metrics job ${job.id} started processing for brand ${job.data.brandId}`);
    } else {
        console.log(`[PROD] Processing regular metrics for brand ${job.data.brandId}`);
    }
});

regularMetricsWorker.on('progress', (job, progress) => {
    if (isDevelopment) {
        console.log(`[DEV] Regular metrics job ${job.id} progress: ${progress}%`);
    } else {
        // In production, only log significant progress milestones
        if (progress % 25 === 0) {
            console.log(`[PROD] Regular metrics calculation ${progress}% complete for brand ${job.data.brandId}`);
        }
    }
});

regularMetricsWorker.on('completed', (job) => {
    if (isDevelopment) {
        console.log(`[DEV] Regular metrics job ${job.id} completed for brand ${job.data.brandId}`);
    } else {
        console.log(`[PROD] Successfully completed regular metrics calculation for brand ${job.data.brandId}`);
    }
});

regularMetricsWorker.on('failed', (job, error) => {
    console.error(`Regular metrics job ${job?.id} failed for brand ${job?.data?.brandId}:`, error);
});

// Event handlers for new additions worker
newAdditionsWorker.on('active', (job) => {
    if (isDevelopment) {
        console.log(`[DEV] New additions job ${job.id} started processing for brand ${job.data.brandId}`);
    } else {
        console.log(`[PROD] Processing new additions metrics for brand ${job.data.brandId}`);
    }
});

newAdditionsWorker.on('progress', (job, progress) => {
    if (isDevelopment) {
        console.log(`[DEV] New additions job ${job.id} progress: ${progress}%`);
    } else {
        // In production, only log significant progress milestones
        if (progress % 25 === 0) {
            console.log(`[PROD] New additions metrics calculation ${progress}% complete for brand ${job.data.brandId}`);
        }
    }
});

newAdditionsWorker.on('completed', (job) => {
    if (isDevelopment) {
        console.log(`[DEV] New additions job ${job.id} completed for brand ${job.data.brandId}`);
    } else {
        console.log(`[PROD] Successfully completed new additions metrics calculation for brand ${job.data.brandId}`);
    }
});

newAdditionsWorker.on('failed', (job, error) => {
    console.error(`New additions job ${job?.id} failed for brand ${job?.data?.brandId}:`, error);
});

// Combined error handler
const handleWorkerError = (workerType, error) => {
    if (isDevelopment) {
        console.error(`[DEV] ${workerType} worker error:`, error);
    } else {
        console.error(`[PROD] ${workerType} worker error:`, {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
};

regularMetricsWorker.on('error', (error) => handleWorkerError('Regular metrics', error));
newAdditionsWorker.on('error', (error) => handleWorkerError('New additions', error));

// Graceful shutdown handling
const shutdown = async () => {
    console.log('Shutting down workers...');
    await regularMetricsWorker.close();
    await newAdditionsWorker.close();
    await mongoose.connection.close();
    
    process.exit(0);
};

// Handle process signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Starting metrics workers...');
    
    // Ensure MongoDB connection before starting workers
    connectDB().then(() => {
        regularMetricsWorker.on('ready', () => {
            console.log('Regular metrics worker is ready to process jobs');
        });
        newAdditionsWorker.on('ready', () => {
            console.log('New additions metrics worker is ready to process jobs');
        });
    }).catch(error => {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    });
}

export { regularMetricsWorker, newAdditionsWorker }; 