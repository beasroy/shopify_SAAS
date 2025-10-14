import { shopifyOrderQueue } from '../config/shopifyQueues.js';

/**
 * Handle Order Created Webhook
 * Just queues the job and returns immediately
 */
export const handleOrderCreated = async (req, res) => {
  try {
    const order = req.body;
    const shopDomain = req.headers['x-shopify-shop-domain'];
    
    // Validate
    if (!order || !order.id) {
      return res.status(400).send('Invalid order data');
    }
    
    // Queue the job
    await shopifyOrderQueue.add(
      'order-created',
      {
        type: 'order_created',
        order,
        shopDomain,
        receivedAt: new Date().toISOString()
      },
      {
        jobId: `order-${order.id}` // Prevent duplicates
      }
    );
    
    // Return immediately
    res.status(200).send('OK');
    
    console.log(`📦 Queued order creation: ${order.id}`);
  } catch (error) {
    console.error('Error queuing order created:', error);
    res.status(500).send('Error');
  }
};

/**
 * Handle Refund Created Webhook
 * Handles both partial refunds and full cancellations
 */
export const handleRefundCreated = async (req, res) => {
  try {
    const refundData = req.body;
    const shopDomain = req.headers['x-shopify-shop-domain'];
    
    // Validate
    if (!refundData || !refundData.order_id) {
      return res.status(400).send('Invalid refund data');
    }
    
    // Queue the job
    await shopifyOrderQueue.add(
      'refund-created',
      {
        type: 'refund_created',
        refundData,
        orderId: refundData.order_id,
        shopDomain,
        receivedAt: new Date().toISOString()
      },
      {
        jobId: `refund-${refundData.order_id}-${Date.now()}` // Allow multiple refunds per order
      }
    );
    
    // Return immediately
    res.status(200).send('OK');
    
    console.log(`💰 Queued refund for order: ${refundData.order_id}`);
  } catch (error) {
    console.error('Error queuing refund created:', error);
    res.status(500).send('Error');
  }
};

/**
 * Trigger historical sync for a brand
 */
export const syncHistoricalOrders = async (req, res) => {
  try {
    const { brandId } = req.params;
    const Brand = (await import('../models/Brands.js')).default;
    
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ 
        success: false, 
        message: 'Brand not found' 
      });
    }
    
    if (!brand.shopifyAccessToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shopify not connected for this brand' 
      });
    }
    
    const { historicalSyncQueue } = await import('../config/shopifyQueues.js');
    
    // Queue historical sync
    const job = await historicalSyncQueue.add(
      'sync-historical',
      {
        brandId: brand._id.toString(),
        shopifyDomain: brand.shopifyDomain,
        accessToken: brand.shopifyAccessToken
      },
      {
        jobId: `historical-${brandId}` // One sync at a time per brand
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Historical sync started',
      jobId: job.id,
      brand: brand.name
    });
    
    console.log(`🔄 Started historical sync for brand ${brand.name}`);
  } catch (error) {
    console.error('Error starting historical sync:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Get sync job status
 */
export const getSyncStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { historicalSyncQueue } = await import('../config/shopifyQueues.js');
    
    const job = await historicalSyncQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }
    
    const state = await job.getState();
    const progress = job.progress || 0;
    const result = job.returnvalue;
    
    res.json({
      success: true,
      jobId: job.id,
      state,
      progress,
      result,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

