import { config } from 'dotenv';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { sendToBrand } from './socket.js';

config();

const isDevelopment = process.env.NODE_ENV !== 'production';

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = parseInt(process.env.REDIS_PORT || '6379');
const password = process.env.REDIS_PASSWORD || null;

console.log(host, port, password, isDevelopment);

// Redis connection configuration
const redisConfig = {
    host,
    port,
    password,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    db: 0,
};

// Create Redis connection function (for BullMQ)
export const createRedisConnection = () => {
    const redis = new Redis(redisConfig);
    
    redis.on('connect', () => {
        console.log('Redis connected successfully');
    });
    
    redis.on('error', (err) => {
        console.error('Redis connection error:', err);
    });
    
    return redis;
};

// Create Redis connection
export const connection = createRedisConnection();

// Create BullMQ queue with the Redis connection
export const metricsQueue = new Queue('metrics-calculation', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    }
});

// Redis subscriber for notifications
const redisSubscriber = new Redis(redisConfig);

// Initialize Redis notification subscriber
export const initializeNotificationSubscriber = () => {
    console.log('🔄 Initializing Redis notification subscriber...');
    // Subscribe to metrics completion notifications
    redisSubscriber.subscribe('metrics-completion', (err) => {
        if (err) {
            console.error('❌ Error subscribing to metrics-completion channel:', err);
        } else {
            console.log('✅ Subscribed to metrics-completion channel');
        }
    });
    
    // Subscribe to metrics error notifications
    redisSubscriber.subscribe('metrics-error', (err) => {
        if (err) {
            console.error('❌ Error subscribing to metrics-error channel:', err);
        } else {
            console.log('✅ Subscribed to metrics-error channel');
        }
    });
    
    // Handle incoming messages
    redisSubscriber.on('message', (channel, message) => {
        try {
            const data = JSON.parse(message);
            console.log(`📨 Received notification from Redis channel '${channel}':`, data);
            
            if (channel === 'metrics-completion') {
                // Handle metrics completion notification
                const notificationData = {
                    type: 'metrics-calculation-complete',
                    data: {
                        success: data.success,
                        message: data.message,
                        brandId: data.brandId,
                        userId: data.userId,
                        timestamp: new Date().toISOString()
                    }
                };
                
           
                
                // Send to brand room if brandId is provided
                if (data.brandId) {
                    sendToBrand(data.brandId, 'brand-notification', notificationData);
                }
            } else if (channel === 'metrics-error') {
                // Handle metrics error notification
                const notificationData = {
                    type: 'metrics-calculation-error',
                    data: {
                        success: false,
                        message: data.message || 'An error occurred during metrics calculation',
                        brandId: data.brandId,
                        userId: data.userId,
                        timestamp: new Date().toISOString()
                    }
                };
                
                // Send to brand room if brandId is provided
                if (data.brandId) {
                    sendToBrand(data.brandId, 'brand-notification', notificationData);
                }
            }
        } catch (error) {
            console.error('❌ Error processing Redis notification:', error);
        }
    });
    
    // Handle subscription errors
    redisSubscriber.on('error', (error) => {
        console.error('❌ Redis subscriber error:', error);
    });
    
    console.log('✅ Redis notification subscriber initialized successfully');
};

// Close Redis subscriber
export const closeNotificationSubscriber = async () => {
    try {
        await redisSubscriber.quit();
        console.log('✅ Redis notification subscriber closed');
    } catch (error) {
        console.error('❌ Error closing Redis notification subscriber:', error);
    }
};



