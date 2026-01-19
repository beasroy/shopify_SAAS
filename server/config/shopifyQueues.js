import { Queue } from 'bullmq';
import { connection } from './redis.js';

// Single queue for all Shopify order operations
export const shopifyOrderQueue = new Queue('shopify-orders', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, // Keep for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 604800 // Keep failed for 7 days
    }
  }
});

// Queue for revenue calculations (batched)
export const revenueCalculationQueue = new Queue('revenue-calculation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000
    },
    removeOnComplete: {
      age: 3600
    }
  }
});

// Queue for historical sync
export const historicalSyncQueue = new Queue('historical-sync', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000
    },
    timeout: 600000 // 10 minutes timeout
  }
});

// Queue for city classification
export const cityClassificationQueue = new Queue('city-classification', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, // Keep for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 604800 // Keep failed for 7 days
    }
  }
});

console.log('✅ Shopify queues initialized');

