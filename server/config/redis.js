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
    rejectUnauthorized: false // Set to true if you have valid SSL certificates
  }
}

export const metricsQueue = new Queue('metrics-calculation', {
    connection: isDevelopment ? { host: 'localhost', port: 6379 } : redisConfig,
});

