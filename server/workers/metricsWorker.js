import { Worker } from 'bullmq';
import { calculateMetricsForSingleBrand } from '../Report/MonthlyReport.js';
import { createRedisConnection } from '../config/redis.js';
import { connectDB, getConnectionStatus } from '../config/db.js';
import mongoose from 'mongoose';
import { sendToUser, sendToBrand } from '../config/socket.js';

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

const worker = new Worker('metrics-calculation', async (job) => {
    const { brandId, userId } = job.data;
    
    try {
        // Ensure MongoDB connection before processing
        await ensureMongoConnection();
        
        console.log(`Processing metrics calculation for brand ${brandId}`);
        await calculateMetricsForSingleBrand(brandId, userId);
        console.log(`Successfully calculated metrics for brand ${brandId}`);
        
        // Send success notification using existing socket functions
        const successNotification = {
            type: 'metrics-calculation-complete',
            data: {
                success: true,
                brandId,
                userId,
                message: 'Metrics calculation completed successfully!',
                jobId: job.id,
                timestamp: new Date().toISOString()
            }
        };
        
        // Send to both user and brand
        sendToUser(userId, 'notification', successNotification);
        sendToBrand(brandId, 'brand-notification', successNotification);
        
    } catch (error) {
        console.error(`Error calculating metrics for brand ${brandId}:`, error);
        
        // Send error notification using existing socket functions
        const errorNotification = {
            type: 'metrics-calculation-error',
            data: {
                success: false,
                brandId,
                userId,
                message: `Metrics calculation failed: ${error.message}`,
                jobId: job.id,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            }
        };
        
        // Send to both user and brand
        sendToUser(userId, 'notification', errorNotification);
        sendToBrand(brandId, 'brand-notification', errorNotification);
        
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
        worker.on('ready', () => {
            console.log('Metrics worker is ready to process jobs');
        });
    }).catch(error => {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    });
}

export default worker; 