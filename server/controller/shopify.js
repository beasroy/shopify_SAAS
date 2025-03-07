
import { config } from 'dotenv';
import Shopify from 'shopify-api-node'
import Brand from '../models/Brands.js';


config();



import moment from 'moment-timezone';

export const fetchShopifyData = async (req, res) => {
  try {
    console.log('Fetching orders and session data...');
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      return res.status(403).json({ success: false, message: 'Access token is missing or invalid.' });
    }

    const shopify = new Shopify({
      shopName: brand.shopifyAccount?.shopName,
      accessToken: access_token
    });

    const shopData = await shopify.shop.get();
    const storeTimezone = shopData.iana_timezone || 'UTC';

    const { startDate, endDate } = req.query;
    let orders = [];
    let queryParams = {
      status: 'any',
      limit: 250, // Fetch 250 orders per request
    };

    if (startDate && endDate) {
      const start = moment.tz(startDate, storeTimezone).startOf('day'); // Start of the day in store's timezone
      const end = moment.tz(endDate, storeTimezone).endOf('day'); // End of the day in store's timezone

      queryParams.created_at_min = start.toISOString(); // Convert to UTC ISO format
      queryParams.created_at_max = end.toISOString();
    } else {
      // Default to 4th February in store timezone if no date is provided
      const defaultDate = moment.tz('2025-01-09', storeTimezone);
      queryParams.created_at_min = defaultDate.startOf('day').toISOString();
      queryParams.created_at_max = defaultDate.endOf('day').toISOString();
    }

    console.log('Query Parameters:', queryParams);

    // Pagination logic
    let hasNextPage = true;
    let pageInfo;

    while (hasNextPage) {
      if (pageInfo) {
        queryParams = { page_info: pageInfo };
      } else {
        delete queryParams.page_info;
      }
      console.log('Query Parameters after pageInfo:', queryParams);

      try {
        const response = await shopify.order.list(queryParams);

        if (!response || response.length === 0) {
          console.log('No more orders found.');
          break; // Exit the loop if no orders are found
        }

        orders = orders.concat(response);
        console.log(`Fetched ${response.length} orders from this page`);

        // Check if there is a next page
        pageInfo = response.nextPageParameters?.page_info || null;
        hasNextPage = !!pageInfo;
      } catch (error) {
        console.error('Error while fetching orders:', error);
        hasNextPage = false;
        return res.status(500).json({ error: `Error fetching orders: ${error.message}` });
      }
    }

    console.log(`Successfully fetched a total of ${orders.length} orders`);

    const totalOrders = orders.length;

    const totalsalesWithoutRefund = orders.reduce((sum, order) => {
      return sum + parseFloat(order.total_price);
    }, 0);
    const averageOrderValue = totalOrders > 0 ? totalsalesWithoutRefund / totalOrders : 0;

    const totalSales = calculateTotalSales(orders, queryParams.created_at_min, queryParams.created_at_max);

    res.json({
      orders,
      totalOrders,
      totalSales,
    });
  } catch (error) {
    console.error('Error in fetchShopifyData:', error);
    let errorMessage = 'Failed to fetch Shopify data';

    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection to Shopify API refused. Please check your network connection and Shopify store URL.';
    } else if (error.message.includes('Failed to fetch orders')) {
      errorMessage = `Error occurred while fetching orders: ${error.message}. Please verify your Shopify access token and API permissions.`;
    } else if (error.response && error.response.body) {
      errorMessage = `Shopify API error: ${error.response.body.errors}`;
    }

    res.status(500).json({ error: errorMessage });
  }
};



export const fetchShopifySales = async (req, res) => {
  try {
    console.log('Fetching orders and session data...');
    const { brandId } = req.params;
    const { startDate, endDate } = req.query;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      return res.status(403).json({ success: false, message: 'Access token is missing or invalid.' });
    }

    const shopify = new Shopify({
      shopName: brand.shopifyAccount?.shopName,
      accessToken: access_token
    });

    // Get shop data to determine timezone
    const shopData = await shopify.shop.get();
    const storeTimezone = shopData.iana_timezone || 'UTC';
    console.log('Store timezone:', storeTimezone);
    
    let orders = [];
    let queryParams = {
      status: 'any',
      limit: 250, // Fetch 250 orders per request
    };

    // Use provided date range or default to first day of current month
    let startDateTime, endDateTime;
    
    if (startDate && endDate) {
      // Convert provided dates to store's timezone and set to start/end of day
      startDateTime = moment.tz(startDate, storeTimezone).startOf('day');
      endDateTime = moment.tz(endDate, storeTimezone).endOf('day');
    } else {
      // Get first day of current month in store's timezone
      const now = moment().tz(storeTimezone);
      startDateTime = moment(now).startOf('month');
      endDateTime = moment(now);
    }
    
    // Format for Shopify API (ISO string)
    queryParams.created_at_min = startDateTime.toISOString();
    queryParams.created_at_max = endDateTime.toISOString();

    console.log('Date range in store timezone:', {
      timezone: storeTimezone,
      start: startDateTime.format('YYYY-MM-DD HH:mm:ss'),
      end: endDateTime.format('YYYY-MM-DD HH:mm:ss'),
      startISO: queryParams.created_at_min,
      endISO: queryParams.created_at_max
    });

    // Rest of your existing pagination logic and order fetching
    let hasNextPage = true;
    let pageInfo;

    while (hasNextPage) {
      // Add page_info to queryParams if it exists, otherwise remove it
      if (pageInfo) {
        // When using page_info, we need to ensure we don't lose our date filters
        const currentParams = { ...queryParams };
        // Page info needs to be the only parameter according to Shopify API docs
        queryParams = { page_info: pageInfo };
        
        // Log what's happening for debugging
        console.log('Using page_info for pagination. Original params:', currentParams);
        console.log('New params with page_info:', queryParams);
      }
      
      console.log('Query Parameters for this page:', queryParams);

      try {
        const response = await shopify.order.list(queryParams);

        // If response is empty, no need to continue
        if (!response || response.length === 0) {
          console.log('No more orders found.');
          break; // Exit the loop if no orders are found
        }

        orders = orders.concat(response);
        console.log(`Fetched ${response.length} orders from this page`);

        // Check if there is a next page
        pageInfo = response.nextPageParameters?.page_info || null;
        hasNextPage = !!pageInfo; // No more pages to fetch if no page_info
      } catch (error) {
        console.error('Error while fetching orders:', error);
        hasNextPage = false;
        return res.status(500).json({ error: `Error fetching orders: ${error.message}` });
      }
    }

    console.log(`Successfully fetched a total of ${orders.length} orders`);

    // Update calculateTotalSales to use timezone-aware dates
    const { totalSales, totalRefunds, totalDiscounts, grossSales, totalTaxes } = 
      calculateTotalSales(orders, queryParams.created_at_min, queryParams.created_at_max, storeTimezone);

    // Respond with data including returns and date range info
    res.json({
      totalSales, 
      totalRefunds,
      totalDiscounts, 
      grossSales, 
      totalTaxes,
      dateRange: {
        start: startDateTime.format('YYYY-MM-DD'),
        end: endDateTime.format('YYYY-MM-DD'),
        timezone: storeTimezone
      }
    });
  } catch (error) {
    console.error('Error in fetchShopifyData:', error);
    let errorMessage = 'Failed to fetch Shopify data';

    // Improved error handling
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection to Shopify API refused. Please check your network connection and Shopify store URL.';
    } else if (error.message.includes('Failed to fetch orders')) {
      errorMessage = `Error occurred while fetching orders: ${error.message}. Please verify your Shopify access token and API permissions.`;
    } else if (error.response && error.response.body) {
      errorMessage = `Shopify API error: ${error.response.body.errors}`;
    }

    res.status(500).json({ error: errorMessage });
  }
};

// Updated calculateTotalSales function with timezone support
function calculateTotalSales(orders, startDate, endDate, timezone = 'UTC') {
  // Parse dates using moment.tz to respect timezone
  const startMoment = moment(startDate).tz(timezone);
  const endMoment = moment(endDate).tz(timezone);
  
  console.log(`Calculating sales between ${startMoment.format('YYYY-MM-DD HH:mm:ss')} and ${endMoment.format('YYYY-MM-DD HH:mm:ss')} (${timezone})`);

  let totalRefunds = 0;
  let grossSales = 0;
  let totalDiscounts = 0;
  let totalTaxes = 0;
  const orderSummaries = [];

  // Process orders
  orders.forEach((order) => {
    // Convert order date to the store's timezone for accurate comparison
    const orderMoment = moment(order.created_at).tz(timezone);
    const totalPrice = Number(order.total_price || 0);
    const totalDiscount = Number(order.total_discounts || 0);
    const totalTax = Number(order.total_tax || 0);

    // Calculate gross sales only for orders within date range
    if (orderMoment.isSameOrAfter(startMoment) && orderMoment.isSameOrBefore(endMoment)) {
      grossSales += totalPrice;
      totalDiscounts += totalDiscount;
      totalTaxes += totalTax;
      
      console.log(`Order ${order.id} (${orderMoment.format('YYYY-MM-DD HH:mm:ss')}) - Amount: ${totalPrice}`);
    } else {
      console.log(`Order ${order.id} (${orderMoment.format('YYYY-MM-DD HH:mm:ss')}) - Outside date range`);
    }

    // Process refunds - consider all refunds that occurred within the date range
    if (order.refunds && order.refunds.length > 0) {
      const orderRefunds = order.refunds.reduce((refundSum, refund) => {
        // Convert refund date to the store's timezone
        const refundMoment = moment(refund.created_at).tz(timezone);

        // Only include refunds processed within the specified date range
        if (refundMoment.isSameOrAfter(startMoment) && refundMoment.isSameOrBefore(endMoment)) {
          const lineItemRefunds = refund.refund_line_items.reduce((lineSum, lineItem) => {
            return lineSum + Number(lineItem.subtotal_set?.shop_money?.amount || 0);
          }, 0);

          console.log(`Refund for order ${order.id} (${refundMoment.format('YYYY-MM-DD HH:mm:ss')}) - Amount: ${lineItemRefunds}`);
          return refundSum + lineItemRefunds;
        }
        return refundSum;
      }, 0);

      // Only add to summaries if there were refunds in this period
      if (orderRefunds > 0) {
        const orderSummary = {
          orderId: order.id,
          orderDate: orderMoment.format('YYYY-MM-DD HH:mm:ss'),
          orderTotal: totalPrice,
          refundsInPeriod: orderRefunds,
          // Include refund dates for transparency
          refundDates: order.refunds
            .filter(refund => {
              const refundMoment = moment(refund.created_at).tz(timezone);
              return refundMoment.isSameOrAfter(startMoment) && refundMoment.isSameOrBefore(endMoment);
            })
            .map(refund => moment(refund.created_at).tz(timezone).format('YYYY-MM-DD HH:mm:ss'))
        };

        orderSummaries.push(orderSummary);
        totalRefunds += orderRefunds;
      }
    }
  });

  // Net sales after refunds
  const netSales = grossSales - totalRefunds;

  // Debug logging
  console.log('Sales Calculation Summary:', {
    timezone,
    periodStart: startMoment.format('YYYY-MM-DD HH:mm:ss'),
    periodEnd: endMoment.format('YYYY-MM-DD HH:mm:ss'),
    grossSales: grossSales.toFixed(2),
    totalRefunds: totalRefunds.toFixed(2),
    totalDiscounts: totalDiscounts.toFixed(2),
    totalTaxes: totalTaxes.toFixed(2),
    netSales: netSales.toFixed(2),
    ordersWithRefunds: orderSummaries.length,
    totalOrdersProcessed: orders.length
  });

  return {
    totalSales: Number(netSales.toFixed(2)),
    totalRefunds: Number(totalRefunds.toFixed(2)),
    totalDiscounts: Number(totalDiscounts.toFixed(2)),
    grossSales: Number(grossSales.toFixed(2)),
    totalTaxes: Number(totalTaxes.toFixed(2)),
    orderSummaries // Include for detailed reporting if needed
  };
}





// function getMonthlyAverageOrderValue(orders) {
//   // Object to hold totals for each month
//   const monthlyData = {};

//   orders.forEach(order => {
//     const createdAt = new Date(order.created_at);
//     // Format the date as 'YYYY-MM'
//     const yearMonth = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1).toString().padStart(2, '0')}`;

//     if (!monthlyData[yearMonth]) {
//       monthlyData[yearMonth] = {
//         totalSales: 0,
//         orderCount: 0
//       };
//     }

//     monthlyData[yearMonth].totalSales += parseFloat(order.total_price);
//     monthlyData[yearMonth].orderCount += 1;
//   });

//   // Calculate the average order value for each month
//   const monthlyAverageOrderValue = {};

//   for (const [month, data] of Object.entries(monthlyData)) {
//     monthlyAverageOrderValue[month] = data.totalSales / data.orderCount;
//   }

//   return monthlyAverageOrderValue;
// }

