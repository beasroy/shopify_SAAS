import { config } from 'dotenv';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { sendToUser, sendToBrand } from './socket.js';

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
    maxRetriesPerRequest: 3,
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
    
    // Subscribe to user notifications channel
    redisSubscriber.subscribe('user-notifications', (err) => {
        if (err) {
            console.error('❌ Error subscribing to user-notifications channel:', err);
        } else {
            console.log('✅ Subscribed to user-notifications channel');
        }
    });
    
    // Subscribe to brand notifications channel
    redisSubscriber.subscribe('brand-notifications', (err) => {
        if (err) {
            console.error('❌ Error subscribing to brand-notifications channel:', err);
        } else {
            console.log('✅ Subscribed to brand-notifications channel');
        }
    });
    
    // Handle incoming messages
    redisSubscriber.on('message', (channel, message) => {
        try {
            const data = JSON.parse(message);
            console.log(`📨 Received notification from Redis channel '${channel}':`, data);
            
            if (channel === 'user-notifications') {
                const { userId, data: notificationData } = data;
                sendToUser(userId, 'notification', notificationData);
            } else if (channel === 'brand-notifications') {
                const { brandId, data: notificationData } = data;
                sendToBrand(brandId, 'brand-notification', notificationData);
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

