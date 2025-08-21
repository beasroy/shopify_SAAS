import { config } from 'dotenv';
import Shopify from 'shopify-api-node'
import Brand from '../models/Brands.js';
import RefundCache from '../models/RefundCache.js';
import moment from 'moment-timezone';

config();

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

    // Use provided date range or default to current month
    let startDateTime, endDateTime;
    if (startDate && endDate) {
      startDateTime = moment.tz(startDate, storeTimezone).startOf('day');
      endDateTime = moment.tz(endDate, storeTimezone).endOf('day');
    } else {
      const now = moment().tz(storeTimezone);
      startDateTime = moment(now).startOf('month');
      endDateTime = moment(now).endOf('month');
    }

    // Calculate total days in the period
    const totalDays = endDateTime.diff(startDateTime, 'days') + 1;
    
    // Calculate number of weeks dynamically
    const totalWeeks = Math.ceil(totalDays / 7);
    console.log(`Period: ${totalDays} days, ${totalWeeks} weeks`);

    // Get current date to determine which weeks are pending
    const currentDate = moment().tz(storeTimezone);

    // Create dynamic weekly structure
    const weeklySalesMap = {};
    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      const weekStart = startDateTime.clone().add((weekNum - 1) * 7, 'days');
      const weekEnd = moment.min(weekStart.clone().add(6, 'days'), endDateTime);
      
      // Check if this week has started yet
      const weekHasStarted = currentDate.isSameOrAfter(weekStart);
      const weekHasEnded = currentDate.isAfter(weekEnd);
      
      weeklySalesMap[`week${weekNum}`] = {
        weekNumber: weekNum,
        status: weekHasStarted ? (weekHasEnded ? 'completed' : 'in-progress') : 'pending',
        totalSales: 0,
        grossSales: 0,
        refundAmount: 0,
        discountAmount: 0,
        orderCount: 0,
        cancelledOrderCount: 0,
        totalTaxes: 0
      };
    }

    // Helper function to determine which week a date belongs to
    const getWeekNumber = (dateMoment) => {
      const startOfPeriod = startDateTime.clone();
      const daysDiff = dateMoment.diff(startOfPeriod, 'days');
      return Math.floor(daysDiff / 7) + 1;
    };

    // Helper function to get week key
    const getWeekKey = (weekNum) => {
      return `week${weekNum}`;
    };

    // Chunked order fetching for reliability
    const CHUNK_SIZE_DAYS = 7;
    let allOrders = [];
    let currentStart = startDateTime.clone();
    const finalEnd = endDateTime.clone();
    while (currentStart.isSameOrBefore(finalEnd)) {
      const chunkEnd = moment.min(currentStart.clone().add(CHUNK_SIZE_DAYS - 1, 'days'), finalEnd);
      const startTime = currentStart.startOf('day').toISOString();
      const endTime = chunkEnd.endOf('day').toISOString();

      console.log(startTime , endTime)
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

    // Process orders and populate weekly data
    allOrders.forEach(order => {
      const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
      const orderDateMoment = moment.tz(order.created_at, storeTimezone);
      
      // Check if order is within our date range
      if (orderDateMoment.isBetween(startDateTime, endDateTime, 'day', '[]')) {
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
        
        // Update weekly sales map
        const weekNum = getWeekNumber(orderDateMoment);
        const weekKey = getWeekKey(weekNum);
        
        if (weeklySalesMap[weekKey]) {
          weeklySalesMap[weekKey].grossSales += grossSales;
          weeklySalesMap[weekKey].totalSales += totalPrice;
          weeklySalesMap[weekKey].discountAmount += discountAmount;
          weeklySalesMap[weekKey].orderCount += order.cancelled_at ? 0 : 1;
          weeklySalesMap[weekKey].cancelledOrderCount += order.cancelled_at ? 1 : 0;
          weeklySalesMap[weekKey].totalTaxes += totalTaxes;
        }
      }
    });

    // Fetch refund amounts from cache for the date range
    const refundAmountsFromCache = await getRefundAmountsFromCache(brandId, startDateTime.format('YYYY-MM-DD'), endDateTime.format('YYYY-MM-DD'));
    
    // Apply refund amounts to weekly data
    Object.keys(refundAmountsFromCache).forEach(date => {
      const dateMoment = moment.tz(date, storeTimezone);
      if (dateMoment.isBetween(startDateTime, endDateTime, 'day', '[]')) {
        const refundData = refundAmountsFromCache[date];
        const weekNum = getWeekNumber(dateMoment);
        const weekKey = getWeekKey(weekNum);
        
        if (weeklySalesMap[weekKey]) {
          weeklySalesMap[weekKey].refundAmount += refundData.totalReturn;
        }
      }
    });

    // Prepare weekly results
    const weeklyResults = Object.values(weeklySalesMap).map(week => {
      return {
        weekNumber: week.weekNumber,
        status: week.status,
        totalSales: week.totalSales.toFixed(2),
        grossSales: week.grossSales.toFixed(2),
        refundAmount: week.refundAmount.toFixed(2),
        discountAmount: week.discountAmount.toFixed(2),
        orderCount: week.orderCount,
        cancelledOrderCount: week.cancelledOrderCount,
        totalTaxes: week.totalTaxes.toFixed(2),
        shopifySales: (week.grossSales - week.totalTaxes - week.refundAmount).toFixed(2),
        currency: storeCurrency
      };
    });

    res.json({
      weeklyResults,
      periodInfo: {
        totalDays: totalDays,
        totalWeeks: totalWeeks,
        startDate: startDateTime.format('YYYY-MM-DD'),
        endDate: endDateTime.format('YYYY-MM-DD'),
        timezone: storeTimezone
      },
      currency: storeCurrency
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


