import { config } from 'dotenv';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
config();

const isDevelopment = process.env.NODE_ENV !== 'production';

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = process.env.REDIS_PORT || 6379;
const password = process.env.REDIS_PASSWORD || null;

console.log(host, port, password, isDevelopment);

// Create Redis connection
export const createRedisConnection = () => {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379');
  const password = process.env.REDIS_PASSWORD || null;

  const redisOptions = {
    host,
    port,
    maxRetriesPerRequest: null,
  };

  if (password) {
    redisOptions.password = password;
  }

  const redis = new Redis(redisOptions);

  redis.on('connect', () => {
    console.log(`${host} ${port} ${password} ${isDevelopment}`);
    console.log('Redis connected successfully');
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  return redis;
};

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

