import { Worker } from 'bullmq';
import { connection } from '../config/redis.js';
import ShopifyOrder from '../models/ShopifyOrder.js';
import AdMetrics from '../models/AdMetrics.js';
import Brand from '../models/Brands.js';
import { 
  calculateRefundAmount, 
  fetchShopifyOrder, 
  fetchShopifyOrdersForDateRange,
  updateAdMetricsForDate 
} from '../utils/shopifyHelpers.js';
import { revenueCalculationQueue } from '../config/shopifyQueues.js';

/**
 * Main Shopify Order Worker
 * Processes order creation, refunds, and cancellations
 */
export const shopifyOrderWorker = new Worker(
  'shopify-orders',
  async (job) => {
    const { type, order, refundData, orderId, shopDomain } = job.data;
    
    try {
      switch (type) {
        case 'order_created':
          return await processOrderCreated(order, shopDomain);
        
        case 'refund_created':
          return await processRefund(refundData, orderId, shopDomain);
        
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      console.error(`❌ Error processing job ${job.id}:`, error);
      throw error; // Will trigger retry
    }
  },
  {
    connection,
    concurrency: 10, // Process 10 orders simultaneously
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000 // per second
    }
  }
);

/**
 * Process Order Created
 */
const processOrderCreated = async (order, shopDomain) => {
  try {
    // Find brand
    const brand = await Brand.findOne({ shopifyDomain: shopDomain });
    if (!brand) {
      throw new Error(`Brand not found for domain: ${shopDomain}`);
    }
    
    const orderDate = order.created_at.split('T')[0];
    
    // Check if order already exists (prevent duplicates)
    const existing = await ShopifyOrder.findOne({
      shopify_order_id: order.id.toString()
    });
    
    if (existing) {
      console.log(`⚠️  Order ${order.id} already exists, skipping`);
      return { status: 'duplicate', orderId: order.id };
    }
    
    // Create order (only essential fields)
    await ShopifyOrder.create({
      shopify_order_id: order.id.toString(),
      brand_id: brand._id,
      order_date: orderDate,
      total_price: parseFloat(order.total_price),
      is_cancelled: false,
      refund_amount: 0
    });
    
    console.log(`✅ Order ${order.id} created for ${orderDate}`);
    
    // Queue revenue calculation with delay (to batch multiple orders)
    await revenueCalculationQueue.add(
      'calculate-revenue',
      {
        brandId: brand._id.toString(),
        date: orderDate
      },
      {
        jobId: `revenue-${brand._id}-${orderDate}`, // Deduplicate
        delay: 5000 // Wait 5 seconds to batch
      }
    );
    
    return { 
      status: 'success', 
      orderId: order.id, 
      orderDate 
    };
  } catch (error) {
    console.error(`❌ Error processing order creation:`, error);
    throw error;
  }
};

/**
 * Process Refund (handles both partial and full cancellations)
 */
const processRefund = async (refundData, orderId, shopDomain) => {
  try {
    // Find brand
    const brand = await Brand.findOne({ shopifyDomain: shopDomain });
    if (!brand) {
      throw new Error(`Brand not found for domain: ${shopDomain}`);
    }
    
    // Find existing order
    let existingOrder = await ShopifyOrder.findOne({
      shopify_order_id: orderId.toString(),
      brand_id: brand._id
    });
    
    if (!existingOrder) {
      // Order not in DB yet - fetch from Shopify and create it
      console.log(`⚠️  Order ${orderId} not found, fetching from Shopify...`);
      const shopifyOrder = await fetchShopifyOrder(brand, orderId);
      
      const orderDate = shopifyOrder.created_at.split('T')[0];
      existingOrder = await ShopifyOrder.create({
        shopify_order_id: orderId.toString(),
        brand_id: brand._id,
        order_date: orderDate,
        total_price: parseFloat(shopifyOrder.total_price),
        is_cancelled: !!shopifyOrder.cancelled_at,
        refund_amount: 0
      });
    }
    
    // Fetch complete order with all refunds
    const fullOrder = await fetchShopifyOrder(brand, orderId);
    const refundAmount = calculateRefundAmount(fullOrder);
    
    // Check if fully cancelled/refunded
    const isCancelled = refundAmount >= existingOrder.total_price;
    
    // Update order (only essential fields)
    existingOrder.refund_amount = refundAmount;
    existingOrder.is_cancelled = isCancelled;
    await existingOrder.save();
    
    console.log(`✅ Refund processed: ₹${refundAmount} for order ${orderId}`);
    console.log(`   Order date: ${existingOrder.order_date}, Cancelled: ${isCancelled}`);
    
    // Queue revenue calculation for ORIGINAL order date
    await revenueCalculationQueue.add(
      'calculate-revenue',
      {
        brandId: brand._id.toString(),
        date: existingOrder.order_date
      },
      {
        jobId: `revenue-${brand._id}-${existingOrder.order_date}`,
        delay: 2000
      }
    );
    
    return { 
      status: 'success', 
      orderId, 
      refundAmount,
      orderDate: existingOrder.order_date,
      isCancelled
    };
  } catch (error) {
    console.error(`❌ Error processing refund:`, error);
    throw error;
  }
};

/**
 * Revenue Calculation Worker
 * Aggregates orders and updates AdMetrics
 */
export const revenueCalculationWorker = new Worker(
  'revenue-calculation',
  async (job) => {
    const { brandId, date } = job.data;
    
    try {
      const result = await updateAdMetricsForDate(brandId, date);
      return result;
    } catch (error) {
      console.error(`❌ Error calculating revenue for ${date}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5 // Lower concurrency for DB-heavy operations
  }
);

/**
 * Historical Sync Worker
 * Fetches last 2 years of orders
 */
export const historicalSyncWorker = new Worker(
  'historical-sync',
  async (job) => {
    const { brandId, shopifyDomain, accessToken } = job.data;
    
    try {
      console.log(`🔄 Starting historical sync for brand ${brandId}...`);
      
      // Calculate date range (2 years ago to yesterday)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const startDate = twoYearsAgo.toISOString().split('T')[0];
      const endDate = yesterday.toISOString().split('T')[0];
      
      console.log(`📅 Fetching orders from ${startDate} to ${endDate}...`);
      
      // Fetch all orders
      const brand = { shopifyDomain, shopifyAccessToken: accessToken };
      const allOrders = await fetchShopifyOrdersForDateRange(brand, startDate, endDate);
      
      console.log(`✅ Fetched ${allOrders.length} total orders`);
      job.updateProgress(50);
      
      // Process orders in chunks for bulk insert
      const chunkSize = 100;
      const uniqueDates = new Set();
      let processedCount = 0;
      
      for (let i = 0; i < allOrders.length; i += chunkSize) {
        const chunk = allOrders.slice(i, i + chunkSize);
        
        // Prepare bulk operations
        const bulkOps = chunk.map(order => {
          const orderDate = order.created_at.split('T')[0];
          const refundAmount = calculateRefundAmount(order);
          const isCancelled = !!order.cancelled_at || refundAmount >= parseFloat(order.total_price);
          
          uniqueDates.add(orderDate);
          
          return {
            updateOne: {
              filter: { shopify_order_id: order.id.toString() },
              update: {
                $set: {
                  shopify_order_id: order.id.toString(),
                  brand_id: brandId,
                  order_date: orderDate,
                  total_price: parseFloat(order.total_price),
                  is_cancelled: isCancelled,
                  refund_amount: refundAmount
                }
              },
              upsert: true
            }
          };
        });
        
        // Bulk write
        await ShopifyOrder.bulkWrite(bulkOps, { ordered: false });
        
        processedCount += chunk.length;
        const progress = 50 + ((processedCount / allOrders.length) * 40);
        job.updateProgress(progress);
        
        console.log(`📦 Processed ${processedCount}/${allOrders.length} orders`);
      }
      
      console.log(`📊 Calculating revenue for ${uniqueDates.size} unique dates...`);
      
      // Queue revenue calculation for all affected dates
      const dateArray = Array.from(uniqueDates);
      for (const date of dateArray) {
        await revenueCalculationQueue.add(
          'calculate-revenue',
          { brandId, date },
          { jobId: `revenue-${brandId}-${date}` }
        );
      }
      
      job.updateProgress(100);
      
      console.log(`✅ Historical sync complete for brand ${brandId}`);
      console.log(`   Orders processed: ${allOrders.length}`);
      console.log(`   Dates affected: ${uniqueDates.size}`);
      
      return {
        status: 'success',
        ordersProcessed: allOrders.length,
        datesAffected: uniqueDates.size,
        dateRange: { start: startDate, end: endDate }
      };
    } catch (error) {
      console.error('❌ Historical sync error:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1 // Only 1 historical sync at a time
  }
);

// Worker event handlers
shopifyOrderWorker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result.status);
});

shopifyOrderWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

revenueCalculationWorker.on('completed', (job, result) => {
  console.log(`✅ Revenue calculated: ${result.date} = ₹${result.netSales}`);
});

historicalSyncWorker.on('completed', (job, result) => {
  console.log(`✅ Historical sync completed: ${result.ordersProcessed} orders processed`);
});

historicalSyncWorker.on('progress', (job, progress) => {
  console.log(`📊 Historical sync progress: ${progress}%`);
});

console.log('✅ Shopify workers initialized');


