import { shopifyOrderWorker, revenueCalculationWorker, historicalSyncWorker } from './shopifyWorker.js';

export const initializeShopifyWorkers = () => {
  console.log('🚀 Initializing Shopify workers...');
  
  shopifyOrderWorker.on('ready', () => {
    console.log('✅ Shopify order worker ready');
  });
  
  revenueCalculationWorker.on('ready', () => {
    console.log('✅ Revenue calculation worker ready');
  });
  
  historicalSyncWorker.on('ready', () => {
    console.log('✅ Historical sync worker ready');
  });
  

  const handleWorkerError = (worker, name) => {
    worker.on('error', (err) => {
      console.error(`❌ ${name} worker error:`, err);
    });
  };
  
  handleWorkerError(shopifyOrderWorker, 'Shopify order');
  handleWorkerError(revenueCalculationWorker, 'Revenue calculation');
  handleWorkerError(historicalSyncWorker, 'Historical sync');
  
  console.log('✅ All Shopify workers initialized');
  
  return {
    shopifyOrderWorker,
    revenueCalculationWorker,
    historicalSyncWorker
  };
};


export const shutdownShopifyWorkers = async () => {
  console.log('🛑 Shutting down Shopify workers...');
  
  await Promise.all([
    shopifyOrderWorker.close(),
    revenueCalculationWorker.close(),
    historicalSyncWorker.close()
  ]);
  
  console.log('✅ Shopify workers shut down');
};

