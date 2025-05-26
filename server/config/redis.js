import { config } from 'dotenv';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
config();

const isDevelopment = process.env.NODE_ENV !== 'production';

// Create Redis connection
const createRedisConnection = () => {
    if (isDevelopment) {
      return new Redis({
        host: 'localhost',
        port: 6379,
      });
    }
  
    const redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '13509'),
      password: process.env.REDIS_PASSWORD,
    });
  
    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  
    return redis;
  };
  

// Create Redis connection
const connection = createRedisConnection();

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
