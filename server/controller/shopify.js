
import Shopify from 'shopify-api-node'
import Brand from '../models/Brands.js';
import AdMetrics from '../models/AdMetrics.js';
import Customer from '../models/Customer.js';
import moment from 'moment-timezone';
import axios from 'axios';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ORDERS_QUERY, makeGraphQLRequest } from '../Report/MonthlyReportGraphQL.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const calculateMonthlyAOV = async (brandId, startDate, endDate) => {
  try {
    if (!brandId || !startDate || !endDate) {
      throw new Error('Missing required parameters: brandId, startDate, and endDate are required');
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      throw new Error('Invalid date format. Please use YYYY-MM-DD format');
    }

    console.log(`Calculating Monthly AOV (Fast) for brand ${brandId} from ${startDate} to ${endDate}`);

    // Get brand to access Shopify credentials
    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found.');
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      throw new Error('Access token is missing or invalid.');
    }

    const shopName = brand.shopifyAccount?.shopName;
    if (!shopName) {
      throw new Error('Shop name is missing or invalid.');
    }

    const shopify = new Shopify({
      shopName: shopName,
      accessToken: access_token,
      apiVersion: '2024-04'
    });

    // Get store timezone
    let shopData;
    try {
      shopData = await shopify.shop.get();
    } catch (shopError) {
      if (shopError.statusCode === 404) {
        const shopifyFallback = new Shopify({
          shopName: shopName,
          accessToken: access_token,
          apiVersion: '2024-01'
        });
        shopData = await shopifyFallback.shop.get();
      } else {
        throw shopError;
      }
    }

    const storeTimezone = shopData.iana_timezone || 'UTC';

    // Convert dates to moment objects
    const startMoment = moment.tz(startDate, storeTimezone).startOf('day');
    const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

    // Get today's date in store timezone
    const today = moment.tz(storeTimezone).startOf('day');
    const yesterday = today.clone().subtract(1, 'day').endOf('day');

    // Determine date range for AdMetrics (up to yesterday)
    const adMetricsEndDate = moment.min(yesterday, endMoment);

    // Fetch AdMetrics data for revenue (up to yesterday - already calculated and cached)
    const adMetrics = await AdMetrics.find({
      brandId,
      date: {
        $gte: startMoment.toDate(),
        $lte: adMetricsEndDate.toDate()
      }
    }).sort({ date: 1 });

    // Check if we need to fetch today's data from Shopify
    const needsTodayData = endMoment.isSameOrAfter(today);

    // Fetch order counts, today's sales, and item counts from Shopify
    const orderCountsByMonth = new Map();
    const todaySalesByMonth = new Map(); // For today's revenue if needed
    const totalItemsByMonth = new Map(); // Total items ordered per month
    let currentDate = startMoment.clone();

    // Process in chunks to avoid API limits
    const CHUNK_SIZE_DAYS = 30;

    while (currentDate.isSameOrBefore(endMoment)) {
      const chunkEnd = moment.min(currentDate.clone().add(CHUNK_SIZE_DAYS - 1, 'days'), endMoment);
      const startTime = currentDate.clone().startOf('day').tz(storeTimezone).utc().format();
      const endTime = chunkEnd.clone().endOf('day').tz(storeTimezone).utc().format();

      try {
        // Fetch orders with minimal fields - count and get today's sales
        let pageInfo = null;

        do {
          const params = {
            limit: 250,
            // Fetch line_items for item count calculation, and total_price/refunds for today's sales
            fields: needsTodayData && currentDate.isSameOrAfter(today, 'day')
              ? 'id,created_at,test,total_price,refunds,line_items'
              : 'id,created_at,test,line_items', // Include line_items for item counting
            status: 'any'
          };

          if (pageInfo) {
            params.page_info = pageInfo;
          } else {
            params.created_at_min = startTime;
            params.created_at_max = endTime;
          }

          const orders = await shopify.order.list(params);

          if (!orders || orders.length === 0) break;

          // Process orders
          for (const order of orders) {
            if (!order.test) {
              const orderDate = moment.tz(order.created_at, storeTimezone);
              const monthKey = orderDate.format('YYYY-MM');

              // Count orders
              if (!orderCountsByMonth.has(monthKey)) {
                orderCountsByMonth.set(monthKey, 0);
              }
              orderCountsByMonth.set(monthKey, orderCountsByMonth.get(monthKey) + 1);

              // Calculate total items in this order
              let orderItems = 0;
              if (order.line_items && Array.isArray(order.line_items)) {
                orderItems = order.line_items.reduce((sum, item) => {
                  return sum + Number(item.quantity || 0);
                }, 0);
              }

              // Add to total items count for the month
              if (!totalItemsByMonth.has(monthKey)) {
                totalItemsByMonth.set(monthKey, 0);
              }
              totalItemsByMonth.set(monthKey, totalItemsByMonth.get(monthKey) + orderItems);

              // Calculate today's sales if needed
              if (needsTodayData && orderDate.isSameOrAfter(today, 'day')) {
                let orderTotal = Number(order.total_price || 0);

                // Subtract refunds if any
                if (order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0) {
                  let refundAmount = 0;
                  for (const refund of order.refunds) {
                    if (refund.refund_line_items) {
                      refundAmount += refund.refund_line_items.reduce((sum, item) => {
                        return sum + Number(item.subtotal || 0) + Number(item.total_tax || 0);
                      }, 0);
                    }
                    if (refund.order_adjustments) {
                      refundAmount -= refund.order_adjustments.reduce((sum, adj) => {
                        return sum + Number(adj.amount || 0);
                      }, 0);
                    }
                  }
                  orderTotal -= refundAmount;
                }

                if (!todaySalesByMonth.has(monthKey)) {
                  todaySalesByMonth.set(monthKey, 0);
                }
                todaySalesByMonth.set(monthKey, todaySalesByMonth.get(monthKey) + orderTotal);
              }
            }
          }

          // Parse pagination
          const linkHeader = orders.headers?.link;
          if (linkHeader) {
            const match = linkHeader.match(/<[^>]*page_info=([^&>]*)[^>]*>; rel="next"/);
            pageInfo = match ? match[1] : null;
          } else {
            pageInfo = null;
          }

          await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
        } while (pageInfo);

      } catch (error) {
        console.error(`Error fetching order data for chunk ${startTime} to ${endTime}:`, error.message);
        // Continue with next chunk
      }

      currentDate = chunkEnd.clone().add(1, 'day');
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting between chunks
    }

    // Group AdMetrics by month and aggregate revenue (up to yesterday)
    const monthlyData = new Map();

    adMetrics.forEach(metric => {
      const metricDate = moment.tz(metric.date, storeTimezone);
      const monthKey = metricDate.format('YYYY-MM');

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          totalRevenue: 0,
          orderCount: 0,
          totalItems: 0
        });
      }

      const monthData = monthlyData.get(monthKey);
      // totalSales already has refunds deducted in AdMetrics
      monthData.totalRevenue += Number(metric.totalSales) || 0;
    });

    // Add today's sales data if needed (from Shopify)
    todaySalesByMonth.forEach((revenue, monthKey) => {
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          totalRevenue: 0,
          orderCount: 0,
          totalItems: 0
        });
      }
      monthlyData.get(monthKey).totalRevenue += revenue;
    });

    // Add order counts and total items from Shopify (includes today)
    orderCountsByMonth.forEach((count, monthKey) => {
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          totalRevenue: 0,
          orderCount: 0,
          totalItems: 0
        });
      }
      monthlyData.get(monthKey).orderCount = count;
    });

    // Add total items count from Shopify
    totalItemsByMonth.forEach((items, monthKey) => {
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          totalRevenue: 0,
          orderCount: 0,
          totalItems: 0
        });
      }
      monthlyData.get(monthKey).totalItems = items;
    });

    // Calculate AOV and Average Items Per Order for each month and format response
    const monthlyAOV = Array.from(monthlyData.entries())
      .map(([monthKey, monthData]) => {
        const { totalRevenue, orderCount, totalItems } = monthData;

        // Calculate AOV: Total Revenue ÷ Number of Orders
        const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

        // Calculate Average Items Per Order: Total Items ÷ Number of Orders
        const averageItemsPerOrder = orderCount > 0 ? totalItems / orderCount : 0;

        return {
          month: monthKey,
          monthName: moment(monthKey + '-01').format('MMM-YYYY'),
          totalRevenue: Number(totalRevenue.toFixed(2)),
          orderCount: orderCount,
          totalItems: totalItems,
          aov: Math.round(aov),
          averageItemsPerOrder: Math.round(averageItemsPerOrder)
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    console.log(`✅ Calculated Monthly AOV (Fast) for ${monthlyAOV.length} month(s)`);

    return monthlyAOV;

  } catch (error) {
    console.error('❌ Error calculating Monthly AOV (Fast):', {
      error: error.message,
      stack: error.stack,
      brandId: brandId,
      startDate: startDate,
      endDate: endDate
    });
    throw new Error(`Failed to calculate Monthly AOV: ${error.message}`);
  }
};

export const getAov = async( req,res)=>{
  try {
    const { brandId } = req.params;
    const { startDate, endDate } = req.body;

    const aov = await calculateMonthlyAOV(brandId, startDate, endDate);
    res.status(200).json({ success: true, data: aov });
  } catch (error) {
    console.error('Error fetching AOV:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export const getMonthlyPaymentOrders = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { startDate, endDate } = req.body;

    if (!brandId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: brandId, startDate, and endDate are required'
      });
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }

    console.log(`📊 Fetching monthly payment orders for brand ${brandId} from ${startDate} to ${endDate}`);

    // Get brand to access Shopify credentials
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      return res.status(400).json({ success: false, error: 'Access token is missing or invalid' });
    }

    const shopName = brand.shopifyAccount?.shopName;
    if (!shopName) {
      return res.status(400).json({ success: false, error: 'Shop name is missing or invalid' });
    }

    // Get store timezone
    const cleanShopName = shopName.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const apiVersion = '2024-04';

    let shopData;
    try {
      const shopResponse = await axios.get(
        `https://${cleanShopName}/admin/api/${apiVersion}/shop.json`,
        {
          headers: { 'X-Shopify-Access-Token': access_token },
          timeout: 30000,
        }
      );
      shopData = shopResponse.data.shop;
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: `Failed to fetch shop data: ${error.message}`
      });
    }

    const storeTimezone = shopData.iana_timezone || 'UTC';

    // Convert dates to moment objects
    const startMoment = moment.tz(startDate, storeTimezone).startOf('day');
    const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

    // Get today's date in store timezone
    const today = moment.tz(storeTimezone).startOf('day');
    const yesterday = today.clone().subtract(1, 'day').endOf('day');

    // Determine date range for AdMetrics (up to yesterday)
    const adMetricsEndDate = moment.min(yesterday, endMoment);

    // Fetch AdMetrics data for COD/prepaid counts (up to yesterday)
    const adMetrics = await AdMetrics.find({
      brandId,
      date: {
        $gte: startMoment.toDate(),
        $lte: adMetricsEndDate.toDate()
      }
    }).sort({ date: 1 });

    // Group AdMetrics by month and aggregate COD/prepaid counts
    const monthlyData = new Map();

    adMetrics.forEach(metric => {
      const metricDate = moment.tz(metric.date, storeTimezone);
      const monthKey = metricDate.format('YYYY-MM');

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          codOrderCount: 0,
          prepaidOrderCount: 0
        });
      }

      const monthData = monthlyData.get(monthKey);
      monthData.codOrderCount += Number(metric.codOrderCount) || 0;
      monthData.prepaidOrderCount += Number(metric.prepaidOrderCount) || 0;
    });

    // Fetch today's payment gateway data using GraphQL if needed
    const needsTodayData = endMoment.isSameOrAfter(today);

    if (needsTodayData) {
      console.log('🔄 Fetching today\'s payment gateway data using GraphQL...');
      try {
        const startTimeISO = today.clone().startOf('day').utc().toISOString();
        const endTimeISO = endMoment.clone().add(1, 'day').startOf('day').utc().toISOString();

        // Use a simplified GraphQL query just for payment gateways
        const PAYMENT_GATEWAY_QUERY = `
          query getOrders($first: Int!, $after: String, $query: String!) {
            orders(first: $first, after: $after, query: $query) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  legacyResourceId
                  createdAt
                  test
                  cancelledAt
                  paymentGatewayNames
                }
              }
            }
          }
        `;

        let hasNextPage = true;
        let cursor = null;
        const queryString = `created_at:>=${startTimeISO} AND created_at:<${endTimeISO}`;

        while (hasNextPage) {
          const variables = {
            first: 50,
            after: cursor,
            query: queryString,
          };

          const data = await makeGraphQLRequest(cleanShopName, access_token, PAYMENT_GATEWAY_QUERY, variables);

          if (!data?.orders?.edges || data.orders.edges.length === 0) {
            break;
          }

          // Process orders for payment gateway tracking
          for (const edge of data.orders.edges) {
            const order = edge.node;

            // Skip test orders
            if (order.test) {
              continue;
            }

            const orderDate = moment.tz(order.createdAt, storeTimezone);
            const monthKey = orderDate.format('YYYY-MM');

            // Skip cancelled orders for COD/prepaid count
            if (order.cancelledAt) {
              continue;
            }

            // Track COD and prepaid orders
            const paymentGateways = order.paymentGatewayNames || [];
            const isCOD = paymentGateways.some(gateway =>
              gateway && (gateway.toLowerCase().includes('cod') ||
                gateway.toLowerCase().includes('cash_on_delivery'))
              || gateway.toLowerCase().includes('cash on delivery'))
              ;
            const isPrepaid = !isCOD && paymentGateways.length > 0;

            if (!monthlyData.has(monthKey)) {
              monthlyData.set(monthKey, {
                month: monthKey,
                codOrderCount: 0,
                prepaidOrderCount: 0
              });
            }

            if (isCOD) {
              monthlyData.get(monthKey).codOrderCount += 1;
            } else if (isPrepaid) {
              monthlyData.get(monthKey).prepaidOrderCount += 1;
            }
          }

          hasNextPage = data.orders.pageInfo.hasNextPage;
          cursor = data.orders.pageInfo.endCursor;
          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }

        console.log('✅ Payment gateway data fetched successfully');
      } catch (error) {
        console.error('⚠️ Error fetching payment gateway data:', error.message);
        // Continue with historical data from AdMetrics
      }
    }

    // Format response
    const monthlyPaymentOrders = Array.from(monthlyData.entries())
      .map(([monthKey, monthData]) => ({
        month: monthKey,
        monthName: moment(monthKey + '-01').format('MMM-YYYY'),
        codOrderCount: monthData.codOrderCount,
        prepaidOrderCount: monthData.prepaidOrderCount,
        totalOrderCount: monthData.codOrderCount + monthData.prepaidOrderCount
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    console.log(`✅ Fetched payment orders for ${monthlyPaymentOrders.length} month(s)`);

    res.status(200).json({
      success: true,
      data: monthlyPaymentOrders
    });

  } catch (error) {
    console.error('❌ Error fetching monthly payment orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get total revenue for D2C calculator
export const getTotalRevenue = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { startDate, endDate } = req.body;

    if (!brandId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: brandId, startDate, and endDate are required'
      });
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found.' });
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      return res.status(403).json({
        success: false,
        error: 'Access token is missing or invalid.'
      });
    }

    const shopName = brand.shopifyAccount?.shopName;
    if (!shopName) {
      return res.status(403).json({
        success: false,
        error: 'Shop name is missing or invalid.'
      });
    }

    const shopify = new Shopify({
      shopName: shopName,
      accessToken: access_token,
      apiVersion: '2024-04'
    });

    // Get store timezone
    let shopData;
    try {
      shopData = await shopify.shop.get();
    } catch (shopError) {
      if (shopError.statusCode === 404) {
        const shopifyFallback = new Shopify({
          shopName: shopName,
          accessToken: access_token,
          apiVersion: '2024-01'
        });
        shopData = await shopifyFallback.shop.get();
      } else {
        throw shopError;
      }
    }

    const storeTimezone = shopData.iana_timezone || 'UTC';
    const startMoment = moment.tz(startDate, storeTimezone).startOf('day');
    const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

    // Fetch AdMetrics data for revenue (up to yesterday - already calculated and cached)
    const today = moment.tz(storeTimezone).startOf('day');
    const yesterday = today.clone().subtract(1, 'day').endOf('day');
    const adMetricsEndDate = moment.min(yesterday, endMoment);

    const adMetrics = await AdMetrics.find({
      brandId,
      date: {
        $gte: startMoment.toDate(),
        $lte: adMetricsEndDate.toDate()
      }
    }).sort({ date: 1 });

    // Calculate total revenue from AdMetrics (up to yesterday)
    let totalRevenue = 0;
    adMetrics.forEach(metric => {
      // totalSales already has refunds deducted in AdMetrics
      totalRevenue += Number(metric.totalSales) || 0;
    });

    // If end date includes today, fetch today's sales from Shopify
    if (endMoment.isSameOrAfter(today)) {
      const startTime = today.clone().startOf('day').tz(storeTimezone).utc().format();
      const endTime = endMoment.clone().endOf('day').tz(storeTimezone).utc().format();

      let pageInfo = null;
      do {
        const params = {
          limit: 250,
          fields: 'id,created_at,test,total_price,refunds',
          status: 'any',
          created_at_min: startTime,
          created_at_max: endTime
        };

        if (pageInfo) {
          params.page_info = pageInfo;
          delete params.created_at_min;
          delete params.created_at_max;
        }

        const orders = await shopify.order.list(params);

        if (!orders || orders.length === 0) break;

        // Process orders
        for (const order of orders) {
          if (!order.test) {
            let orderTotal = Number(order.total_price || 0);

            // Subtract refunds if any
            if (order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0) {
              let refundAmount = 0;
              for (const refund of order.refunds) {
                if (refund.refund_line_items) {
                  refundAmount += refund.refund_line_items.reduce((sum, item) => {
                    return sum + Number(item.subtotal || 0) + Number(item.total_tax || 0);
                  }, 0);
                }
                if (refund.order_adjustments) {
                  refundAmount -= refund.order_adjustments.reduce((sum, adj) => {
                    return sum + Number(adj.amount || 0);
                  }, 0);
                }
              }
              orderTotal -= refundAmount;
            }

            totalRevenue += orderTotal;
          }
        }

        // Parse pagination
        const linkHeader = orders.headers?.link;
        if (linkHeader) {
          const match = linkHeader.match(/<[^>]*page_info=([^&>]*)[^>]*>; rel="next"/);
          pageInfo = match ? match[1] : null;
        } else {
          pageInfo = null;
        }

        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
      } while (pageInfo);
    }

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        currency: shopData.currency || 'USD'
      }
    });
  } catch (error) {
    console.error('Error fetching total revenue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Test endpoint to fetch and inspect GraphQL order data
 */
export const testGraphQLOrders = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, limit = 5 } = req.query; // limit defaults to 5 orders

    if (!brandId) {
      return res.status(400).json({ success: false, error: 'Brand ID is required' });
    }

    // Get brand to access Shopify credentials
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      return res.status(400).json({ success: false, error: 'Access token is missing or invalid' });
    }

    const shopName = brand.shopifyAccount?.shopName;
    if (!shopName) {
      return res.status(400).json({ success: false, error: 'Shop name is missing or invalid' });
    }

    // Build query string
    let queryString = '';
    if (startDate && endDate) {
      const startTime = moment(startDate).startOf('day').utc().toISOString();
      const endTime = moment(endDate).add(1, 'day').startOf('day').utc().toISOString();
      queryString = `created_at:>=${startTime} AND created_at:<${endTime}`;
    } else {
      // Default to last 7 days if no dates provided
      const endTime = moment().utc().toISOString();
      const startTime = moment().subtract(7, 'days').utc().toISOString();
      queryString = `created_at:>=${startTime} AND created_at:<${endTime}`;
    }

    console.log('🧪 Testing GraphQL Orders Query:', {
      brandId,
      shopName,
      queryString,
      limit: Number.parseInt(limit, 10)
    });

    // Make GraphQL request
    const variables = {
      first: Number.parseInt(limit, 10),
      after: null,
      query: queryString,
    };

    const data = await makeGraphQLRequest(shopName, access_token, ORDERS_QUERY, variables);

    // Return raw data for inspection
    const orders = data?.orders?.edges?.map(edge => edge.node) || [];

    res.json({
      success: true,
      data: {
        query: queryString,
        pagination: data?.orders?.pageInfo || {},
        ordersCount: orders.length,
        orders: orders,
        // Also return first order in detail for easier inspection
        firstOrderDetail: orders[0] || null,
      }
    });

  } catch (error) {
    console.error('❌ Error testing GraphQL orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * GraphQL query to fetch customers with addresses and order counts
 */
const CUSTOMERS_QUERY = `
  query getCustomers($first: Int!, $after: String, $query: String) {
    customers(first: $first, after: $after, query: $query) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          legacyResourceId
          firstName
          lastName
          email
          phone
          numberOfOrders
          defaultAddress {
            id
            address1
            address2
            city
            provinceCode
            zip
            countryCode
          }
        }
      }
    }
  }
`;

export const calculateMonthlyProductLaunches = async (brandId, startDate, endDate) => {
  try {

    // 1. Strict Parameter Validation
    if (!brandId || !startDate || !endDate) {
      throw new Error('Missing required parameters');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      throw new Error('Invalid date format');
    }

    // 2. Fetch Brand & Credentials
    const brand = await Brand.findById(brandId);
    if (!brand) throw new Error('Brand not found');

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    const shopName = brand.shopifyAccount?.shopName;
    if (!access_token || !shopName) {
      throw new Error('Shopify credentials missing');
    }

    // 3. Initialize Shopify & Get Timezone (With Fallback)
    const shopify = new Shopify({
      shopName: shopName,
      accessToken: access_token,
      apiVersion: '2024-04'
    });

    let shopData;
    try {
      shopData = await shopify.shop.get();
    } catch (err) {
      // Fallbakc for older API versions if 2024-04 fails
      shopData = await new Shopify({
        shopName, accessToken: access_token, apiVersion: '2024-01'
      }).shop.get();
    }

    const storeTimezone = shopData.iana_timezone || 'UTC';
    const startMoment = moment.tz(startDate, storeTimezone).startOf('day');
    const endMoment = moment.tz(endDate, storeTimezone).endOf('day');
    const today = moment.tz(storeTimezone).startOf('day');

    const monthlyData = new Map();

    // 4. Fetch Historical Data from AdMetrics (Yesterday and older)
    const adMetricsEndDate = moment.min(today.clone().subtract(1, 'day'), endMoment);

    if (startMoment.isBefore(today)) {
      const adMetrics = await AdMetrics.find({
        brandId,
        date: {
          $gte: startMoment.toDate(),
          $lte: adMetricsEndDate.toDate()
        }
      }).sort({ date: 1 });

      adMetrics.forEach(metric => {
        const monthKey = moment.tz(metric.date, storeTimezone).format('YYYY-MM');
        if (!monthlyData.has(monthKey)) monthlyData.set(monthKey, 0);

        const count = Number(metric.productsLaunched) || 0;
        monthlyData.set(monthKey, monthlyData.get(monthKey) + count);
      });
    }

    // 5. Fetch "Live" Data from Shopify (If range includes today)
    if (endMoment.isSameOrAfter(today)) {
      let pageInfo = null;
      // Use UTC ISO string for Shopify API filters
      const startTimeISO = today.clone().utc().format();

      do {
        const params = {
          limit: 250,
          fields: 'id,created_at',
          // Only use date filters on the first page; page_info handles it thereafter
          ...(pageInfo ? { page_info: pageInfo } : { created_at_min: startTimeISO })
        };

        const products = await shopify.product.list(params);

        if (products && products.length > 0) {
          for (const product of products) {
            const productCreatedAt = moment.tz(product.created_at, storeTimezone);
            // Double check the product is within the requested endMoment
            if (productCreatedAt.isSameOrBefore(endMoment)) {
              const monthKey = productCreatedAt.format('YYYY-MM');
              monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
            }
          }
        }

        // Robust Pagination Handling
        const linkHeader = products.headers?.link;
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const match = linkHeader.match(/<[^>]+page_info=([^&>]+)>;\s*rel="next"/);
          pageInfo = match ? match[1] : null;
        } else {
          pageInfo = null;
        }

        // Avoid hitting 429 Rate Limits
        if (pageInfo) await new Promise(res => setTimeout(res, 350));

      } while (pageInfo);
    }

    // 6. Final Formatting & Sorting
    const response = Array.from(monthlyData.entries())
      .map(([monthKey, count]) => ({
        month: monthKey,
        monthName: moment(monthKey + '-01').format('MMM-YYYY'),
        productsLaunched: count
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    console.log(`✅ Success: ${response.length} months of product data fetched.`);

    return response;

  } catch (error) {
    console.error('❌ Error in getMonthlyProductsLaunched:', error);
    throw new Error(error.message);
  }
};


export const getMonthlyProductLaunches = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { startDate, endDate } = req.body;

    const data = await calculateMonthlyProductLaunches(
      brandId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error in getMonthlyProductLaunches:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch and sync customers from Shopify to database
 */
export const syncCustomers = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { query } = req.query; // Optional query filter for customers

    if (!brandId) {
      return res.status(400).json({ success: false, error: 'Brand ID is required' });
    }

    // Get brand to access Shopify credentials
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      return res.status(400).json({ success: false, error: 'Access token is missing or invalid' });
    }

    const shopName = brand.shopifyAccount?.shopName;
    if (!shopName) {
      return res.status(400).json({ success: false, error: 'Shop name is missing or invalid' });
    }

    console.log('🔄 Syncing customers from Shopify for brand:', brandId);

    let hasNextPage = true;
    let cursor = null;
    let totalSynced = 0;
    let totalUpdated = 0;
    let totalCreated = 0;
    let totalDuplicates = 0;
    let pageCount = 0;

    // Pagination loop - fetches ALL customers by iterating through all pages
    while (hasNextPage) {
      pageCount++;
      const variables = {
        first: 200, // Fetch 200 customers per request (increased from 50 for better performance)
        after: cursor,
        ...(query && { query }), // Only include query if provided
      };

      console.log(`📄 Fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ' (first page)'}`);

      const data = await makeGraphQLRequest(shopName, access_token, CUSTOMERS_QUERY, variables);

      if (!data?.customers?.edges || data.customers.edges.length === 0) {
        console.log('✅ No more customers to fetch');
        break;
      }

      console.log(`📦 Processing ${data.customers.edges.length} customers from this page...`);

      // Prepare all customer data first
      const customersToProcess = [];
      const shopifyCustomerIds = [];

      for (const edge of data.customers.edges) {
        const customerNode = edge.node;
        
        // Extract customer ID (remove 'gid://shopify/Customer/' prefix)
        const shopifyCustomerId = customerNode.legacyResourceId?.toString() || 
                                  customerNode.id?.split('/').pop() || 
                                  null;

        if (!shopifyCustomerId) {
          console.warn('⚠️ Skipping customer without ID:', customerNode);
          continue;
        }

        shopifyCustomerIds.push(shopifyCustomerId);

        // Use defaultAddress directly - it's the simplest and most reliable approach
        const defaultAddress = customerNode.defaultAddress || null;

        // Extract email and phone (using deprecated fields as they're still available)
        const email = customerNode.email || '';
        const phone = customerNode.phone || '';

        // Prepare customer data
        const customerData = {
          brandId: brand._id,
          shopifyCustomerId: shopifyCustomerId,
          firstName: customerNode.firstName || '',
          lastName: customerNode.lastName || '',
          email: email,
          phone: phone,
          addressLine1: defaultAddress?.address1 || '',
          addressLine2: defaultAddress?.address2 || '',
          city: defaultAddress?.city || '',
          state: defaultAddress?.provinceCode || '',
          pin: defaultAddress?.zip || '',
          totalOrders: customerNode.numberOfOrders || 0,
          defaultAddressId: defaultAddress?.id || null,
        };

        customersToProcess.push(customerData);
      }

      // Bulk find existing customers (single query instead of N queries)
      const existingCustomers = await Customer.find({
        brandId: brand._id,
        shopifyCustomerId: { $in: shopifyCustomerIds }
      }).lean();

      // Create a map of existing customers for quick lookup
      const existingCustomersMap = new Map();
      existingCustomers.forEach(customer => {
        existingCustomersMap.set(customer.shopifyCustomerId.toString(), customer);
      });

      // Separate customers into updates and inserts
      const customersToUpdate = [];
      const customersToInsert = [];

      for (const customerData of customersToProcess) {
        const existingCustomer = existingCustomersMap.get(customerData.shopifyCustomerId);
        
        if (existingCustomer) {
          // Customer exists - prepare update operation
          customersToUpdate.push({
            filter: {
              brandId: brand._id,
              shopifyCustomerId: customerData.shopifyCustomerId
            },
            update: {
              $set: {
                firstName: customerData.firstName,
                lastName: customerData.lastName,
                email: customerData.email,
                phone: customerData.phone,
                addressLine1: customerData.addressLine1,
                addressLine2: customerData.addressLine2,
                city: customerData.city,
                state: customerData.state,
                pin: customerData.pin,
                totalOrders: customerData.totalOrders,
                defaultAddressId: customerData.defaultAddressId,
                updatedAt: new Date()
              }
            }
          });
        } else {
          // New customer - prepare insert operation
          customersToInsert.push(customerData);
        }
      }

      // Execute bulk update operations
      if (customersToUpdate.length > 0) {
        try {
          const updateResult = await Customer.bulkWrite(
            customersToUpdate.map(op => ({
              updateOne: op
            })),
            { ordered: false } // Continue even if some operations fail
          );
          totalUpdated += updateResult.modifiedCount || customersToUpdate.length;
        } catch (error) {
          console.error('⚠️ Error in bulk update:', error.message);
          // Fallback to individual updates if bulk fails
          for (const op of customersToUpdate) {
            try {
              await Customer.updateOne(op.filter, op.update);
              totalUpdated++;
            } catch (err) {
              console.warn(`⚠️ Failed to update customer ${op.filter.shopifyCustomerId}:`, err.message);
            }
          }
        }
      }

      // Execute bulk insert operations
      if (customersToInsert.length > 0) {
        try {
          await Customer.insertMany(customersToInsert, {
            ordered: false, // Continue even if some inserts fail (duplicates)
            rawResult: false
          });
          totalCreated += customersToInsert.length;
        } catch (error) {
          // Handle partial failures (duplicates)
          if (error.writeErrors) {
            const duplicateErrors = error.writeErrors.filter(e => e.code === 11000);
            totalDuplicates += duplicateErrors.length;
            const successfulInserts = customersToInsert.length - duplicateErrors.length;
            totalCreated += successfulInserts;
            
            // Try to update the duplicates
            for (const writeError of duplicateErrors) {
              const failedCustomer = customersToInsert[writeError.index];
              try {
                await Customer.updateOne(
                  {
                    brandId: brand._id,
                    shopifyCustomerId: failedCustomer.shopifyCustomerId
                  },
                  {
                    $set: {
                      firstName: failedCustomer.firstName,
                      lastName: failedCustomer.lastName,
                      email: failedCustomer.email,
                      phone: failedCustomer.phone,
                      addressLine1: failedCustomer.addressLine1,
                      addressLine2: failedCustomer.addressLine2,
                      city: failedCustomer.city,
                      state: failedCustomer.state,
                      pin: failedCustomer.pin,
                      totalOrders: failedCustomer.totalOrders,
                      defaultAddressId: failedCustomer.defaultAddressId,
                      updatedAt: new Date()
                    }
                  }
                );
                totalUpdated++;
              } catch (updateErr) {
                console.warn(`⚠️ Failed to update duplicate customer ${failedCustomer.shopifyCustomerId}:`, updateErr.message);
              }
            }
          } else {
            throw error;
          }
        }
      }

      totalSynced += customersToProcess.length;

      // Update pagination info for next iteration
      hasNextPage = data.customers.pageInfo?.hasNextPage || false;
      cursor = data.customers.pageInfo?.endCursor || null;
      
      console.log(`✅ Page ${pageCount} completed. Progress: ${totalSynced} customers synced so far${hasNextPage ? ` (more pages to fetch...)` : ' (all pages fetched)'}`);
      
      // Rate limiting - wait 500ms between requests to avoid hitting Shopify rate limits
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Customer sync completed: ${totalSynced} total customers, ${totalCreated} created, ${totalUpdated} updated, ${totalDuplicates} duplicates detected across ${pageCount} page(s)`);

    res.status(200).json({
      success: true,
      message: 'Customers synced successfully',
      data: {
        totalSynced,
        totalCreated,
        totalUpdated,
        totalDuplicates,
        brandId
      }
    });

  } catch (error) {
    console.error('❌ Error syncing customers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get all customers for a brand
 */
export const getCustomers = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { page = 1, limit = 50, search } = req.query;

    if (!brandId) {
      return res.status(400).json({ success: false, error: 'Brand ID is required' });
    }

    // Build query
    const query = { brandId };
    
    // Add search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);
    const limitNum = Number.parseInt(limit, 10);

    // Fetch customers
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        customers,
        pagination: {
          page: Number.parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete all customers for a brand
 */
export const deleteCustomersByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({ success: false, error: 'Brand ID is required' });
    }

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    console.log(`🗑️ Deleting all customers for brand: ${brand.name} (${brandId})`);

    // Count customers before deletion
    const customerCount = await Customer.countDocuments({ brandId });

    if (customerCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'No customers found for this brand',
        data: {
          brandId,
          brandName: brand.name,
          deletedCount: 0
        }
      });
    }

    // Delete all customers for this brand
    const deleteResult = await Customer.deleteMany({ brandId });

    console.log(`✅ Deleted ${deleteResult.deletedCount} customers for brand "${brand.name}"`);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} customer(s) for brand "${brand.name}"`,
      data: {
        brandId,
        brandName: brand.name,
        deletedCount: deleteResult.deletedCount
      }
    });

  } catch (error) {
    console.error('❌ Error deleting customers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Export customers to Excel file
 */
export const exportCustomersToExcel = async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({ success: false, error: 'Brand ID is required' });
    }

    // Get brand to get brand name
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    // Get all customers for this brand
    const customers = await Customer.find({ brandId })
      .sort({ createdAt: -1 })
      .lean();

    if (!customers || customers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No customers found for this brand' 
      });
    }

    // Prepare Excel data with all columns properly formatted
    const excelData = customers.map(customer => {
      return {
        'Shopify Customer ID': customer.shopifyCustomerId || '',
        'First Name': customer.firstName || '',
        'Last Name': customer.lastName || '',
        'Email': customer.email || '',
        'Phone': customer.phone || '',
        'Address Line 1': customer.addressLine1 || '',
        'Address Line 2': customer.addressLine2 || '',
        'City': customer.city || '',
        'State': customer.state || '',
        'PIN': customer.pin || '',
        'Total Orders': customer.totalOrders || 0,
        'Created At': customer.createdAt ? moment(customer.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
        'Updated At': customer.updatedAt ? moment(customer.updatedAt).format('YYYY-MM-DD HH:mm:ss') : ''
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Create worksheet with explicit options to preserve all columns
    const worksheet = XLSX.utils.json_to_sheet(excelData, {
      header: [
        'Shopify Customer ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Address Line 1',
        'Address Line 2',
        'City',
        'State',
        'PIN',
        'Total Orders',
        'Created At',
        'Updated At'
      ],
      skipHeader: false
    });

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 20 }, // Shopify Customer ID
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 30 }, // Address Line 1
      { wch: 30 }, // Address Line 2
      { wch: 20 }, // City
      { wch: 15 }, // State
      { wch: 10 }, // PIN
      { wch: 12 }, // Total Orders
      { wch: 20 }, // Created At
      { wch: 20 }  // Updated At
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    // Generate unique file name
    const brandName = brand.name || 'Brand';
    const sanitizedBrandName = brandName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${sanitizedBrandName}_customers_${moment().format('YYYY-MM-DD')}.xlsx`;

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Generate full file path
    const filePath = path.join(exportsDir, fileName);

    // Write Excel file to disk
    XLSX.writeFile(workbook, filePath);

    // Generate download URL (adjust based on your server configuration)
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${baseUrl}/exports/${fileName}`;

    console.log(`✅ Excel export completed: ${customers.length} customers exported for brand "${brandName}"`);
    console.log(`📥 File saved to: ${filePath}`);
    console.log(`🔗 Download URL: ${downloadUrl}`);

    // Schedule file deletion after 24 hours (optional)
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`❌ Error deleting file ${fileName}:`, err);
          } else {
            console.log(`🗑️ Auto-deleted expired file: ${fileName}`);
          }
        });
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Return success response with download URL
    res.status(200).json({
      success: true,
      message: `Successfully exported ${customers.length} customers`,
      downloadUrl: downloadUrl,
      fileName: fileName,
      expiresIn: '24 hours',
      totalCustomers: customers.length
    });

  } catch (error) {
    console.error('❌ Error exporting customers to Excel:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

