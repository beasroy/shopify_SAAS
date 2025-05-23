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
      port: 6379
    });
  }

  // Production Redis Cloud configuration
  return new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT || 6380),
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    tls: {
      rejectUnauthorized: false,
      servername: process.env.REDIS_HOST
    },
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: false
  });
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

