import { config } from 'dotenv';
import Shopify from 'shopify-api-node'
import Brand from '../models/Brands.js';
import RefundCache from '../models/RefundCache.js';


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

// Helper for detailed refund calculation
function getRefundAmount(refund) {
    // Product-only refund (for net sales)
    const productReturn = refund?.refund_line_items
        ? refund.refund_line_items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
        : 0;

    // Total return (product + adjustments, for total returns)
    let adjustmentsTotal = 0;
    if (refund?.order_adjustments) {
        adjustmentsTotal = refund.order_adjustments.reduce((sum, adjustment) => sum + Number(adjustment.amount || 0), 0);
    }
    const totalReturn = productReturn - adjustmentsTotal;

    return {
        productReturn, // for net sales
        totalReturn    // for total returns
    };
}

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

    // Get shop data to determine timezone and currency
    const shopData = await shopify.shop.get();
    const storeTimezone = shopData.iana_timezone || 'UTC';
    const storeCurrency = shopData.currency || 'USD';
    console.log('Store timezone:', storeTimezone);
    console.log('Store currency:', storeCurrency);

    // Use provided date range or default to first day of current month
    let startDateTime, endDateTime;
    if (startDate && endDate) {
      startDateTime = moment.tz(startDate, storeTimezone).startOf('day');
      endDateTime = moment.tz(endDate, storeTimezone).endOf('day');
    } else {
      const now = moment().tz(storeTimezone);
      startDateTime = moment(now).startOf('month');
      endDateTime = moment(now);
    }

    // Chunked order fetching for reliability
    const CHUNK_SIZE_DAYS = 7;
    let allOrders = [];
    let currentStart = startDateTime.clone();
    const finalEnd = endDateTime.clone();
    while (currentStart.isSameOrBefore(finalEnd)) {
      const chunkEnd = moment.min(currentStart.clone().add(CHUNK_SIZE_DAYS - 1, 'days'), finalEnd);
      const startTime = currentStart.startOf('day').toISOString();
      const endTime = chunkEnd.endOf('day').toISOString();
      let chunkOrders = [];
      let pageInfo = null;
      let pageCount = 0;
      let retryCount = 0;
      const MAX_RETRIES = 3;
      do {
        try {
          let params = {
            status: 'any',
            limit: 250,
            fields: 'id,created_at,total_price,subtotal_price,total_discounts,test,tags,financial_status,line_items,refunds,cancelled_at'
          };
          if (pageInfo) {
            params.page_info = pageInfo;
          } else {
            params.created_at_min = startTime;
            params.created_at_max = endTime;
          }
          const response = await shopify.order.list(params);
          if (!response || response.length === 0) break;
          const validOrders = response.filter(order => !order.test);
          chunkOrders = chunkOrders.concat(validOrders);
          pageCount++;
          if (response.length === 250) {
            pageInfo = Buffer.from(response[response.length - 1].id.toString()).toString('base64');
            await new Promise(resolve => setTimeout(resolve, 300));
          } else {
            pageInfo = null;
          }
          retryCount = 0;
        } catch (error) {
          if (error.statusCode === 429) {
            console.log('  Rate limited, waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          } else if (error.statusCode === 500 && retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`  500 error, retry ${retryCount}/${MAX_RETRIES} after 3 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          } else {
            console.error(`  Error fetching chunk (${currentStart.format('YYYY-MM-DD')} to ${chunkEnd.format('YYYY-MM-DD')}):`, error.message);
            break;
          }
        }
      } while (pageInfo);
      allOrders = allOrders.concat(chunkOrders);
      currentStart = chunkEnd.clone().add(1, 'day');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log(`Successfully fetched a total of ${allOrders.length} valid orders`);

    // Detailed sales/refund calculation per day
    const dailySalesMap = {};
    let currentDay = startDateTime.clone().startOf('day');
    while (currentDay.isSameOrBefore(endDateTime)) {
      const dateStr = currentDay.format('YYYY-MM-DD');
      dailySalesMap[dateStr] = {
        date: dateStr,
        grossSales: 0,
        subtotalPrice: 0,
        totalPrice: 0,
        refundAmount: 0,
        discountAmount: 0,
        orderCount: 0,
        cancelledOrderCount: 0,
        totalTaxes: 0
      };
      currentDay.add(1, 'day');
    }
    // Helper to check if date is in range
    const isInTargetDateRange = (dateStr) => {
      const dateMoment = moment.tz(dateStr, storeTimezone);
      return dateMoment.isBetween(startDateTime, endDateTime, 'day', '[]');
    };
    // Process orders
    allOrders.forEach(order => {
      const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
      if (isInTargetDateRange(orderDate) && dailySalesMap[orderDate]) {
        const totalPrice = Number(order.total_price || 0);
        const subtotalPrice = Number(order.subtotal_price || 0);
        const discountAmount = Number(order.total_discounts || 0);
        let grossSales = 0;
        let totalTaxes = 0;
        
        // Check if this order has refunds
        const hasRefunds = order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0;
        
        if (order.line_items && Array.isArray(order.line_items) && order.line_items.length > 0) {
          grossSales = order.line_items.reduce((sum, item) => {
            const unitPrice = item.price_set
              ? Number(item.price_set.shop_money?.amount)
              : Number(item.original_price ?? item.price);
            const unitTotal = unitPrice * Number(item.quantity);
            let taxTotal = 0;
            
            // Only include taxes if the order has no refunds
            if (!hasRefunds && item.tax_lines && Array.isArray(item.tax_lines)) {
              taxTotal = item.tax_lines.reduce((taxSum, tax) => taxSum + Number(tax.price || 0), 0);
            }
            
            totalTaxes += taxTotal;
            const netItemTotal = unitTotal - taxTotal;
            return sum + netItemTotal;
          }, 0);
        } else {
          grossSales = subtotalPrice + discountAmount;
        }
        dailySalesMap[orderDate].grossSales += grossSales;
        dailySalesMap[orderDate].totalTaxes += totalTaxes;
        dailySalesMap[orderDate].subtotalPrice += subtotalPrice;
        dailySalesMap[orderDate].totalPrice += totalPrice;
        dailySalesMap[orderDate].discountAmount += discountAmount;
        dailySalesMap[orderDate][order.cancelled_at ? 'cancelledOrderCount' : 'orderCount']++;
        
        if (hasRefunds) {
          console.log(`Order ${order.id} has refunds - excluded taxes from calculation`);
        }
      }
    });
    
    // Fetch refund amounts from cache for the date range
    const refundAmountsFromCache = await getRefundAmountsFromCache(brandId, startDateTime.format('YYYY-MM-DD'), endDateTime.format('YYYY-MM-DD'));
    
    console.log(`Refunds found in cache for date range: ${Object.keys(refundAmountsFromCache).length} dates`);
    
    // Apply refund amounts from cache to daily sales data
    Object.keys(refundAmountsFromCache).forEach(date => {
      if (dailySalesMap[date]) {
        const refundData = refundAmountsFromCache[date];
        dailySalesMap[date].refundAmount = refundData.totalReturn;
        console.log(`Applied refunds for ${date}: totalReturn=${refundData.totalReturn}`);
      }
    });
    
    // Prepare response
    const dailyResults = Object.values(dailySalesMap).map(day => {
      const grossSales = Number(day.grossSales);
      const discountAmount = Number(day.discountAmount);
      const refundAmount = Number(day.refundAmount);
      const totalPrice = Number(day.totalPrice);
      const subtotalPrice = Number(day.subtotalPrice);
      const totalTaxes = Number(day.totalTaxes || 0);
      return {
        date: day.date,
        grossSales: grossSales.toFixed(2),
        shopifySales: (subtotalPrice - totalTaxes - refundAmount).toFixed(2),
        totalSales: (totalPrice - refundAmount).toFixed(2),
        subtotalSales: subtotalPrice.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        totalTaxes: totalTaxes.toFixed(2),
        orderCount: day.orderCount,
        cancelledOrderCount: day.cancelledOrderCount,
        currency: storeCurrency
      };
    });
    res.json({
      orders: allOrders,
      totalOrders: allOrders.length,
      dailyResults,
      currency: storeCurrency,
      dateRange: {
        start: startDateTime.format('YYYY-MM-DD'),
        end: endDateTime.format('YYYY-MM-DD'),
        timezone: storeTimezone
      }
    });
  } catch (error) {
    console.error('Error in fetchShopifySales:', error);
    let errorMessage = 'Failed to fetch Shopify sales data';
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
  let subtotalPrice = 0;
  const orderSummaries = [];

  // Process orders
  orders.forEach((order) => {
    // Convert order date to the store's timezone for accurate comparison
    const orderMoment = moment(order.created_at).tz(timezone);
    const totalPrice = Number(order.total_price || 0);
    const orderSubtotalPrice = Number(order.subtotal_price || 0);
    const totalDiscount = Number(order.total_discounts || 0);
    let orderGrossSales = 0;
    let orderTotalTaxes = 0;

    const isTestOrder = (order) => {
      return order.test
    };

    // Calculate gross sales and taxes from line items only for orders within date range
    if (orderMoment.isSameOrAfter(startMoment) && orderMoment.isSameOrBefore(endMoment)) {
      if (order.line_items && Array.isArray(order.line_items) && order.line_items.length > 0) {
        orderGrossSales = order.line_items.reduce((sum, item) => {
          const unitPrice = item.price_set
            ? Number(item.price_set.shop_money?.amount)
            : Number(item.original_price ?? item.price);
          const unitTotal = unitPrice * Number(item.quantity);
          let taxTotal = 0;
          if (item.tax_lines && Array.isArray(item.tax_lines)) {
            taxTotal = item.tax_lines.reduce((taxSum, tax) => taxSum + Number(tax.price || 0), 0);
          }
          orderTotalTaxes += taxTotal;
          const netItemTotal = unitTotal - taxTotal;
          return sum + netItemTotal;
        }, 0);
      } else {
        orderGrossSales = orderSubtotalPrice + totalDiscount;
      }
      
      grossSales += orderGrossSales;
      totalTaxes += orderTotalTaxes;
      totalDiscounts += totalDiscount;
      subtotalPrice += orderSubtotalPrice;

      console.log(`Order ${order.id} (${orderMoment.format('YYYY-MM-DD HH:mm:ss')}) - Gross Sales: ${orderGrossSales}, Taxes: ${orderTotalTaxes}, Subtotal: ${orderSubtotalPrice}`);
    } else {
      console.log(`Order ${order.id} (${orderMoment.format('YYYY-MM-DD HH:mm:ss')}) - Outside date range`);
    }

    // Process refunds using the same getRefundAmount function
    if (order.refunds && order.refunds.length > 0) {
      const orderRefunds = order.refunds.reduce((refundSum, refund) => {
        // Convert refund date to the store's timezone
        const refundMoment = moment(refund.created_at).tz(timezone);

        // Only include refunds processed within the specified date range
        if (refundMoment.isSameOrAfter(startMoment) && refundMoment.isSameOrBefore(endMoment)) {
          const refundAmount = getRefundAmount(refund);
          console.log(`Refund for order ${order.id} (${refundMoment.format('YYYY-MM-DD HH:mm:ss')}) - Amount: ${refundAmount}`);
          return refundSum + refundAmount;
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

  // Calculate net sales using the same formula: subtotalPrice - totalTaxes - totalRefunds
  const netSales = subtotalPrice - totalTaxes - totalRefunds;

  // Debug logging
  console.log('Sales Calculation Summary:', {
    timezone,
    periodStart: startMoment.format('YYYY-MM-DD HH:mm:ss'),
    periodEnd: endMoment.format('YYYY-MM-DD HH:mm:ss'),
    grossSales: grossSales.toFixed(2),
    subtotalPrice: subtotalPrice.toFixed(2),
    totalTaxes: totalTaxes.toFixed(2),
    totalRefunds: totalRefunds.toFixed(2),
    totalDiscounts: totalDiscounts.toFixed(2),
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
    subtotalPrice: Number(subtotalPrice.toFixed(2)),
    orderSummaries // Include for detailed reporting if needed
  };
}

// Function to get refund amounts from cache for a specific date range
const getRefundAmountsFromCache = async (brandId, startDate, endDate) => {
  try {
    console.log(`Fetching refunds from cache for brand ${brandId} from ${startDate} to ${endDate}`);
    
    // First, let's check if there are any refunds at all for this brand
    const allRefundsForBrand = await RefundCache.find({ brandId: brandId });
    console.log(`Total refunds in cache for brand ${brandId}: ${allRefundsForBrand.length}`);
    
    if (allRefundsForBrand.length > 0) {
      
      // Check for refunds specifically on the target date
      const targetDateRefunds = allRefundsForBrand.filter(r => {
        const refundDate = moment(r.refundCreatedAt).format('YYYY-MM-DD');
        return refundDate === startDate;
      });
      console.log(`Found ${targetDateRefunds.length} refunds specifically for target date ${startDate}`);
      
      if (targetDateRefunds.length > 0) {
        console.log('Target date refunds:', targetDateRefunds.map(r => ({
          refundId: r.refundId,
          refundCreatedAt: r.refundCreatedAt,
          productReturn: r.productReturn,
          totalReturn: r.totalReturn
        })));
      }
    }
    
    // Search by refundCreatedAt - exactly like MonthlyReport.js does
    const refunds = await RefundCache.find({
      brandId: brandId,
      refundCreatedAt: {
        $gte: moment(startDate).startOf('day').utc().toDate(),
        $lte: moment(endDate).endOf('day').utc().toDate()
      }
    });
    
    console.log(`Found ${refunds.length} refunds in cache for the date range by refundCreatedAt`);
    
    // If we have refunds but none match the date range, log this for debugging
    if (allRefundsForBrand.length > 0 && refunds.length === 0) {
      console.log(`Warning: Found ${allRefundsForBrand.length} refunds in cache but none match the date range ${startDate} to ${endDate}`);
      
      // Get the actual date range from the cached refunds
      const refundDates = allRefundsForBrand.map(r => moment(r.refundCreatedAt).format('YYYY-MM-DD')).sort();
      const uniqueRefundDates = [...new Set(refundDates)];
      console.log(`Available refund dates in cache: ${uniqueRefundDates.slice(0, 10).join(', ')}${uniqueRefundDates.length > 10 ? '...' : ''}`);
      console.log(`Total unique refund dates: ${uniqueRefundDates.length}`);
    }
    
    const result = refunds.reduce((acc, refund) => {
      const refundDate = moment(refund.refundCreatedAt).format('YYYY-MM-DD');
      if (!acc[refundDate]) {
        acc[refundDate] = {
          productReturn: 0,
          totalReturn: 0
        };
      }
      acc[refundDate].productReturn += refund.productReturn || 0;
      acc[refundDate].totalReturn += refund.totalReturn || 0;
      console.log(`Processing refund ${refund.refundId} for refund date ${refundDate}: productReturn=${refund.productReturn}, totalReturn=${refund.totalReturn}`);
      return acc;
    }, {});
    
    console.log(`Processed refunds for ${Object.keys(result).length} unique dates`);
    return result;
  } catch (error) {
    console.error('Error fetching refund amounts from cache:', error);
    return {};
  }
};

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
