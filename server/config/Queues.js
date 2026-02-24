import { Queue } from 'bullmq';
import { connection } from './redis.js';

export const shopifyOrderQueue = new Queue('shopify-order', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, 
      count: 1000
    },
    removeOnFail: {
      age: 604800 
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
    // Auto-cleanup to prevent Redis OOM errors
    removeOnComplete: {
      age: 86400, 
      count: 500 
    },
    removeOnFail: {
      age: 604800, 
      count: 100 
    }
  }
});

console.log('✅ Queues initialized');

