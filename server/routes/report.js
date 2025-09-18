import express from 'express';
import { getMetricsbyID, checkRefundCache } from '../controller/report.js';
import AdMetrics from '../models/AdMetrics.js';
//import {calculateMetricsForSingleBrand} from "../Report/MonthlyReport.js"
import moment from "moment";
import Shopify from 'shopify-api-node'
import Brand from '../models/Brands.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.get('/:brandId',verifyAuth, getMetricsbyID);
// API endpoint to check refund cache
router.post('/refund-cache/:brandId', checkRefundCache);

router.delete('/delete/byDate', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
      

        if (!startDate) {
            return res.status(400).json({ message: 'startDate is required' });
        }

        // Create date objects
        const start = new Date(startDate);
        const end = new Date(endDate || startDate);
        
        // Set time to start of day for startDate and end of day for endDate
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Log the deletion attempt
        console.log('\n=== AdMetrics Delete Operation ===');
        console.log('Type: Delete by Date Range');
        console.log('User ID:', userId);
        console.log('Date Range:', {
            start: start.toISOString(),
            end: end.toISOString()
        });
        console.log('Timestamp:', new Date().toISOString());

        // Delete records within the date range
        const result = await AdMetrics.deleteMany({
            date: {
                $gte: start,
                $lte: end
            }
        });

        if (result.deletedCount === 0) {
            console.log('Result: No records found for deletion');
            return res.status(404).json({ 
                message: 'No records found for the specified date range' 
            });
        }

        // Log the deletion result
        console.log('Result: Success');
        console.log('Records Deleted:', result.deletedCount);
        console.log('===============================\n');

        res.status(200).json({ 
            message: 'AdMetrics data deleted successfully', 
            deletedCount: result.deletedCount,
            dateRange: {
                from: start.toISOString(),
                to: end.toISOString()
            }
        });

    } catch (error) {
        console.error('\n=== Delete Operation Error ===');
        console.error('Error:', error.message);
        console.error('Timestamp:', new Date().toISOString());
        console.error('===============================\n');
        
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

router.delete('/delete/:brandId', verifyAuth, async (req, res) => {
    try {
        const { brandId } = req.params;
  
        
        // Log the deletion attempt
        console.log('\n=== AdMetrics Delete Operation ===');
        console.log('Type: Delete by Brand');
      
        console.log('Brand ID:', brandId);
        console.log('Timestamp:', new Date().toISOString());
        
        const result = await AdMetrics.deleteMany({ brandId });
        
        if (result.deletedCount === 0) {
            console.log('Result: No records found for deletion');
            return res.status(404).json({ message: 'No records found for this brand' });
        }

        // Log the deletion result
        console.log('Result: Success');
        console.log('Records Deleted:', result.deletedCount);
        console.log('===============================\n');
        
        res.status(200).json({ 
            message: 'AdMetrics data deleted successfully', 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        console.error('\n=== Delete Operation Error ===');
        console.error('Error:', error.message);
        console.error('Timestamp:', new Date().toISOString());
        console.error('===============================\n');
        
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add a new endpoint to get delete logs
router.get('/delete-logs/:brandId', verifyAuth, async (req, res) => {
    try {
        const { brandId } = req.params;
        const logs = await DeleteLog.find({ brandId })
            .sort({ timestamp: -1 })
            .populate('performedBy', 'email name')
            .lean();

        res.status(200).json({
            success: true,
            logs: logs
        });
    } catch (error) {
        console.error('Error fetching delete logs:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

const calculateRefundAmount = (refund) => {
  const lineItemAmount = refund.refund_line_items?.reduce((sum, item) => {
      return sum + Number(item.subtotal_set?.shop_money?.amount || 0);
  }, 0) || 0;

  const transactionAmount = refund.transactions?.reduce((sum, trans) => {
      return sum + Number(trans.amount || 0);
  }, 0) || 0;

  return Math.max(lineItemAmount, transactionAmount);
};

router.post('/monthly', async (req, res) => {
  try {
    const { brandId, startDate, endDate } = req.body;
    
    // Validate required parameters
    if (!brandId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: brandId, startDate, and endDate are required'
      });
    }
    
    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }
    
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: 'Access token is missing or invalid.'
      });
    }

    const shopify = new Shopify({
      shopName: brand.shopifyAccount?.shopName,
      accessToken: access_token,
      apiVersion: '2023-07'
    });

    const shopData = await shopify.shop.get();
    const storeTimezone = shopData.iana_timezone || 'UTC';
    console.log('Store timezone:', storeTimezone);

    // Initialize daily sales data structure
    const dailySalesMap = {};
    let currentDay = moment.tz(startDate, storeTimezone).startOf('day');
    const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

    // Store all orders by date for the response
    const allOrdersByDate = {};

    while (currentDay.isSameOrBefore(endMoment)) {
      const dateStr = currentDay.format('YYYY-MM-DD');
      dailySalesMap[dateStr] = {
        date: dateStr,
        grossSales: 0,
        totalPrice: 0,
        refundAmount: 0,
        discountAmount: 0,
        orderCount: 0,
        cancelledOrderCount: 0
      };
      
      // Initialize orders array for this date
      allOrdersByDate[dateStr] = [];
      
      currentDay.add(1, 'day');
    }

    // Reset for fetching
    currentDay = moment.tz(startDate, storeTimezone).startOf('day');

    const fetchOrdersForTimeRange = async (startTime, endTime) => {
      let orders = [];
      let pageInfo = null;
      let retryCount = 0;
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 5000;

      do {
        try {
          // Add mandatory delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));

          const params = {
            status: 'any', // Get all orders including cancelled ones
            created_at_min: startTime,
            created_at_max: endTime,
            limit: 150
          };

          if (pageInfo) {
            params.page_info = pageInfo;
          }

          const response = await shopify.order.list(params);
          
          // Fixed: Extract orders array and handle pagination properly
          const orders_batch = Array.isArray(response) ? response : response.data;
          
          if (!orders_batch || !Array.isArray(orders_batch)) {
            console.warn('Unexpected response format:', response);
            break;
          }

          orders = orders.concat(orders_batch);

          // Extract pagination info from headers
          // Fixed: Handle headers properly based on shopify API response format
          const linkHeader = response.headers?.link;
          if (linkHeader) {
            const nextLink = linkHeader.split(',').find(link => link.includes('rel="next"'));
            pageInfo = nextLink ? nextLink.match(/page_info=([^&>]*)/)?.[1] : null;
          } else {
            pageInfo = null;
          }

          console.log(`Fetched ${orders_batch.length} orders, total: ${orders.length}`);
          retryCount = 0; // Reset retry count on successful request

        } catch (error) {
          console.error('Error fetching orders:', error);

          if (error.statusCode === 429) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            continue;
          }

          if (error.statusCode === 400 && pageInfo) {
            console.log('Bad request with page_info, restarting chunk');
            pageInfo = null;
            retryCount++;
            
            if (retryCount >= MAX_RETRIES) {
              console.error('Max retries reached for time range');
              break;
            }
            
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            continue;
          }

          throw error;
        }
      } while (pageInfo);

      return orders;
    };

    while (currentDay.isSameOrBefore(endMoment)) {
      const dateStr = currentDay.format('YYYY-MM-DD');
      console.log(`Processing date: ${dateStr}`);

      // Split day into 6-hour chunks for better handling
      const timeChunks = Array.from({ length: 4 }, (_, i) => ({
        start: currentDay.clone().add(i * 6, 'hours').toISOString(),
        end: currentDay.clone().add((i + 1) * 6, 'hours').toISOString()
      }));

      for (const chunk of timeChunks) {
        const orders = await fetchOrdersForTimeRange(chunk.start, chunk.end);
        
        orders.forEach(order => {
          const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
          
          // Always add the order to the full orders list regardless of status
          if (allOrdersByDate[orderDate]) {
            allOrdersByDate[orderDate].push(order);
          }
          
          // FIXED: This condition was wrong - test orders should be excluded, not included
          // Changed from: const isCancelled = (order.cancelled_at || order.cancel_reason) && order.test === true;
          const isTestOrder = order.test === true;
          
          // Skip test orders and handle cancelled orders
          if (isTestOrder) {
            // Don't process test orders at all
            return;
          } 
            else {
              // Only increment cancelled order count, don't add to sales metrics
            if (dailySalesMap[orderDate]) {
              dailySalesMap[orderDate].cancelledOrderCount += 1;
            } 
            // Process regular orders for sales metrics
            const totalPrice = Number(order.total_price || 0);
            const discountAmount = Number(order.total_discounts || 0);
            
            // Calculate true gross sales from line items (before discounts)
            let lineItemTotal = 0;
            if (order.line_items && Array.isArray(order.line_items)) {
              lineItemTotal = order.line_items.reduce((sum, item) => {
                // Calculate pre-discount price: price × quantity
                const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
                return sum + itemTotal;
              }, 0);
            }
            
            // Fallback to subtotal_price + discounts if line items calculation is not available
            const grossSales = lineItemTotal > 0 ? 
              lineItemTotal : 
              (Number(order.subtotal_price || 0) + discountAmount);
            
            if (dailySalesMap[orderDate]) {
              dailySalesMap[orderDate].grossSales += grossSales;
              dailySalesMap[orderDate].totalPrice += totalPrice;
              dailySalesMap[orderDate].discountAmount += discountAmount;
              dailySalesMap[orderDate].orderCount += 1;
            }

            // Process refunds for non-cancelled, non-test orders
            if (order.refunds?.length > 0) {
              order.refunds.forEach(refund => {
                const refundDate = moment.tz(refund.created_at, storeTimezone).format('YYYY-MM-DD');
                // Added debugging for refund processing
                console.log('Processing refund:', {
                  refundId: refund.id,
                  refundDate,
                  refundLineItems: refund.refund_line_items?.length || 0,
                  transactions: refund.transactions?.length || 0
                });
                
                const refundAmount = calculateRefundAmount(refund);
                console.log(`Calculated refund amount: ${refundAmount}`);
                
                if (dailySalesMap[refundDate]) {
                  dailySalesMap[refundDate].refundAmount += refundAmount;
                }
              });
            }
          }
        });
      }

      currentDay.add(1, 'day');
    }

    // Convert daily sales map to array and calculate derived metrics
    const salesData = Object.values(dailySalesMap).map(day => {
      const dateStr = day.date;
      
      // Ensure values are properly formatted as numbers
      const grossSales = Number(day.grossSales) || 0;
      const discountAmount = Number(day.discountAmount) || 0;
      const refundAmount = Number(day.refundAmount) || 0;
      const totalPrice = Number(day.totalPrice) || 0;
      
      return {
        ...day,
        // Net product sales (excluding shipping, taxes, etc.)
        // Fixed from your monthlyFetchTotalSales function
        shopifySales: Number((grossSales - discountAmount).toFixed(2)),
        // Total customer payments including all charges, minus refunds
        // Fixed typo: was 'refundAmoount'
        totalSales: Number((totalPrice - refundAmount).toFixed(2)),
        refundAmount: Number(refundAmount.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        // Include full orders for this date
        orders: allOrdersByDate[dateStr] || []
      };
    });
    
    return res.status(200).json({
      success: true,
      data: salesData
    });
    
  } catch (error) {
    console.error('API Error:', error);
    
    if (error.message === 'Brand not found.') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales data',
      error: error.message
    });
  }
});


export default router;