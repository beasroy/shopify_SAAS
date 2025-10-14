import cron from 'node-cron';
import Brand from '../models/Brands.js';
import ShopifyOrder from '../models/ShopifyOrder.js';
import { fetchShopifyOrdersForDateRange } from '../utils/shopifyHelpers.js';
import { shopifyOrderQueue, revenueCalculationQueue } from '../config/shopifyQueues.js';

/**
 * Daily Reconciliation Cron Job
 * Runs at 2 AM every day to catch missed webhooks
 */
export const initShopifyDailySync = () => {
  // Run every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Starting daily Shopify reconciliation...');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Get all brands with Shopify connected
      const brands = await Brand.find({
        shopifyAccessToken: { $exists: true, $ne: null },
        shopifyDomain: { $exists: true, $ne: null }
      });
      
      console.log(`📊 Checking ${brands.length} brands for ${yesterdayStr}...`);
      
      let totalMissed = 0;
      
      for (const brand of brands) {
        try {
          console.log(`🔍 Checking ${brand.name || brand.shopifyDomain}...`);
          
          // Fetch yesterday's orders from Shopify
          const shopifyOrders = await fetchShopifyOrdersForDateRange(
            brand,
            yesterdayStr,
            yesterdayStr
          );
          
          // Get orders from our database for yesterday
          const dbOrders = await ShopifyOrder.find({
            brand_id: brand._id,
            order_date: yesterdayStr
          });
          
          const dbOrderIds = new Set(dbOrders.map(o => o.shopify_order_id));
          
          // Find missing orders (webhook missed)
          const missingOrders = shopifyOrders.filter(o => 
            !dbOrderIds.has(o.id.toString())
          );
          
          if (missingOrders.length > 0) {
            console.log(`⚠️  Found ${missingOrders.length} missing orders for ${brand.name}`);
            totalMissed += missingOrders.length;
            
            // Queue them for processing
            for (const order of missingOrders) {
              await shopifyOrderQueue.add(
                'order-created-cron',
                {
                  type: 'order_created',
                  order,
                  shopDomain: brand.shopifyDomain,
                  receivedAt: new Date().toISOString(),
                  source: 'cron'
                }
              );
            }
          }
          
          // Check for orders that might have been refunded/cancelled
          for (const dbOrder of dbOrders) {
            const shopifyOrder = shopifyOrders.find(o => o.id.toString() === dbOrder.shopify_order_id);
            
            if (shopifyOrder) {
              // Check if status changed
              const shopifyHasRefunds = shopifyOrder.refunds && shopifyOrder.refunds.length > 0;
              const dbHasRefunds = dbOrder.refunds && dbOrder.refunds.length > 0;
              
              // If Shopify has refunds but DB doesn't, process refund
              if (shopifyHasRefunds && !dbHasRefunds) {
                console.log(`⚠️  Order ${dbOrder.shopify_order_id} has new refunds`);
                await shopifyOrderQueue.add(
                  'refund-created-cron',
                  {
                    type: 'refund_created',
                    refundData: { order_id: shopifyOrder.id },
                    orderId: shopifyOrder.id,
                    shopDomain: brand.shopifyDomain,
                    source: 'cron'
                  }
                );
              }
            }
          }
          
          // Recalculate yesterday's revenue as safety check
          await revenueCalculationQueue.add(
            'calculate-revenue-cron',
            {
              brandId: brand._id.toString(),
              date: yesterdayStr
            },
            {
              jobId: `revenue-cron-${brand._id}-${yesterdayStr}`
            }
          );
          
          console.log(`✅ Reconciliation complete for ${brand.name}`);
          
        } catch (brandError) {
          console.error(`❌ Error reconciling brand ${brand.name}:`, brandError.message);
          // Continue with next brand
        }
        
        // Rate limit between brands
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`✅ Daily reconciliation complete`);
      console.log(`   Brands checked: ${brands.length}`);
      console.log(`   Missing orders found: ${totalMissed}`);
      
    } catch (error) {
      console.error('❌ Daily sync error:', error);
    }
  }, {
    timezone: "Asia/Kolkata" // Your timezone
  });
  
  console.log('✅ Daily Shopify sync cron initialized (runs at 2 AM IST)');
};

