import { config } from 'dotenv';
import { Queue } from 'bullmq';
config();

const isDevelopment = process.env.NODE_ENV !== 'production';

// Base configuration
const baseConfig = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || 6379), // Changed default to 6379
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Development uses local Redis
const devConfig = {
  host: 'localhost',
  port: 6379
};

// Production configuration
const prodConfig = {
  ...baseConfig,
  tls: undefined // Explicitly disable TLS
};

// Use appropriate config based on environment
const connection = isDevelopment ? devConfig : prodConfig;

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

