import { config } from 'dotenv';
import { Queue } from 'bullmq';
config();

const isDevelopment = process.env.NODE_ENV !== 'production';
export const redisConfig = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || 6380),
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  tls: isDevelopment ? undefined : {
    rejectUnauthorized: false,
    servername: process.env.REDIS_HOST
  }
}

// Create a connection object that works in both development and production
const connection = isDevelopment 
  ? { host: 'localhost', port: 6379 }
  : {
      ...redisConfig,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };

export const metricsQueue = new Queue('metrics-calculation', {
    connection
});

