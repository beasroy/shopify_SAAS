import { config } from "dotenv";
import Brand from "../models/Brands.js";
import moment from 'moment-timezone';
import axios from "axios";
import winston from 'winston';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ensureOrderRefundExists, setOrderRefund } from '../utils/refundHelpers.js';
import logger from '../utils/logger.js';
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for date-specific loggers
const debugLoggers = new Map();

/**
 * Get or create a Winston logger for a specific date
 * Uses the same setup pattern as logger.js but creates date-specific log files
 */
function getDebugLogger(orderDate = null) {
  const logKey = orderDate || 'general';
  
  if (debugLoggers.has(logKey)) {
    return debugLoggers.get(logKey);
  }

  // Use same pattern as logger.js - ensure logs directory exists
  const logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFileName = orderDate 
    ? `graphql_debug_${orderDate.replaceAll('-', '_')}.log`
    : 'graphql_debug.log';
  const logFilePath = path.join(logDir, logFileName);

  // Create date-specific logger using same format as logger.js
  const debugLogger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level}]: ${message}`;
      })
    ),
    transports: [
      new winston.transports.File({ 
        filename: logFilePath,
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    ],
  });

  debugLoggers.set(logKey, debugLogger);
  return debugLogger;
}

/**
 * Write debug log using Winston
 */
function writeDebugLog(message, orderDate = null) {
  try {
    const debugLogger = getDebugLogger(orderDate);
    debugLogger.debug(message);
  } catch (error) {
    // Fallback to existing logger if date-specific logger fails
    logger.error('Error writing to debug log file:', error);
    logger.debug(message);
  }
}

/**
 * GraphQL-based Order Fetching with COGS Calculation
 * This implementation uses Shopify GraphQL API to fetch orders with:
 * - Order details (prices, taxes, discounts)
 * - Line items with product/variant information
 * - Inventory item costs (COGS)
 * - Refunds with full details
 * 
 * Benefits over REST:
 * - Single query fetches all nested data
 * - Better rate limit management
 * - More efficient for large datasets
 * - Direct access to inventory item costs
 */

/**
 * GraphQL query to fetch orders with all necessary data including COGS
 */
export const ORDERS_QUERY = `
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
          tags
          cancelledAt
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalDiscountsSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          lineItems(first: 250) {
            edges {
              node {
                id
                quantity
                originalUnitPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                discountedUnitPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                taxLines {
                  priceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  title
                  rate
                }
              }
            }
          }
          paymentGatewayNames 
          refunds(first: 100) {
            id
            createdAt
            note
            totalRefundedSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            refundLineItems(first: 250) {
              edges {
                node {
                  id
                  quantity
                  subtotalSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  totalTaxSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  lineItem {
                    id
                  }
                }
              }
            }
            refundShippingLines(first: 100) {
              edges {
                node {
                  id
                  subtotalAmountSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  taxAmountSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  shippingLine {
                    id
                  }
                }
              }
            }
            orderAdjustments(first: 100) {
              edges {
                node {
                  id
                  amountSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  reason
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Make GraphQL request to Shopify
 */
export async function makeGraphQLRequest(shopName, accessToken, query, variables) {
  // Ensure shopName doesn't have protocol
  const cleanShopName = shopName.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${cleanShopName}/admin/api/2024-04/graphql.json`;
  const startTime = Date.now();
  
  // Log request details
  console.log('🔄 Making GraphQL request:', {
    shopName: cleanShopName,
    url: url,
    query: query.substring(0, 100) + '...', // Log first 100 chars of query
    variables: variables,
    hasAccessToken: !!accessToken,
  });
  
  try {
    const response = await axios.post(
      url,
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        timeout: 60000, // 60 second timeout for GraphQL requests
      }
    );

    const duration = Date.now() - startTime;
    console.log(`✅ GraphQL request successful (${duration}ms):`, {
      status: response.status,
      hasData: !!response.data?.data,
      hasErrors: !!response.data?.errors,
      errorsCount: response.data?.errors?.length || 0,
    });

    if (response.data.errors) {
      console.error('❌ GraphQL errors in response:', {
        errors: response.data.errors,
        query: query.substring(0, 200),
        variables: variables,
      });
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    // Log response summary
    if (response.data?.data?.orders) {
      const ordersCount = response.data.data.orders?.edges?.length || 0;
      const hasNextPage = response.data.data.orders?.pageInfo?.hasNextPage || false;
      console.log(`📊 GraphQL response summary:`, {
        ordersCount,
        hasNextPage,
        cursor: response.data.data.orders?.pageInfo?.endCursor?.substring(0, 20) + '...',
      });
    }

    return response.data.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ GraphQL request failed:', {
      shopName: cleanShopName,
      url: url,
      duration: `${duration}ms`,
      error: {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      },
      query: query.substring(0, 200),
      variables: variables,
    });

    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error(`GraphQL request failed: Invalid or expired access token (401)`);
      } else if (status === 403) {
        throw new Error(`GraphQL request failed: Access forbidden (403). Check API permissions.`);
      } else if (status === 429) {
        throw new Error(`GraphQL request failed: Rate limit exceeded (429). Please retry later.`);
      } else if (status === 500 || status === 502 || status === 503) {
        throw new Error(`GraphQL request failed: Shopify server error (${status}). Please try again later.`);
      } else {
        throw new Error(`GraphQL request failed: ${status} - ${JSON.stringify(error.response.data)}`);
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error(`GraphQL request failed: Cannot connect to ${cleanShopName}. Check shop name.`);
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error(`GraphQL request failed: Request timeout after 60s.`);
    } else {
      throw error;
    }
  }
}

/**
 * Convert GraphQL refund to REST-like format for compatibility with existing refund calculation logic
 * Extracts subtotal, tax, and order adjustments from refund line items
 */
export function convertGraphQLRefundToRESTFormat(graphQLRefund) {

  const refund_line_items = graphQLRefund.refundLineItems?.edges?.map(edge => {
    const item = edge.node;
    const subtotal = item.subtotalSet?.shopMoney?.amount || '0';
    const tax = item.totalTaxSet?.shopMoney?.amount || '0';
    
    return {
      id: item.id,
      quantity: item.quantity,
      subtotal: subtotal,
      total_tax: tax,
      line_item_id: item.lineItem?.id,
    };
  }) || [];

  const refund_shipping_lines = graphQLRefund.refundShippingLines?.edges?.map(edge => {
    const shippingLine = edge.node;
    const shippingAmount = shippingLine.subtotalAmountSet?.shopMoney?.amount || '0';
    const shippingTax = shippingLine.taxAmountSet?.shopMoney?.amount || '0';
    
    
    return {
      id: shippingLine.id,
      amount: shippingAmount,
      tax: shippingTax,
      shipping_line_id: shippingLine.shippingLine?.id,
    };
  }) || [];

  const order_adjustments = graphQLRefund.orderAdjustments?.edges?.map(edge => {
    const adjustment = edge.node;
    const amount = adjustment.amountSet?.shopMoney?.amount || '0';
    
    
    return {
      id: adjustment.id,
      amount: amount,
      reason: adjustment.reason,
    };
  }) || [];

  return {
    id: graphQLRefund.id,
    created_at: graphQLRefund.createdAt,
    note: graphQLRefund.note,
    refund_line_items,
    refund_shipping_lines,
    order_adjustments
  };
}

/**
 * Calculate refund amount using subtotal + tax + shipping + other adjustments
 * Formula: subtotal (from refund line items) + tax (from refund line items) + shipping (from refundShippingLines) + other adjustments
 */
export function getRefundAmountFromGraphQL(refund) {

  const subtotal = refund?.refund_line_items
    ? refund.refund_line_items.reduce((sum, item) => {
        const itemSubtotal = Number(item.subtotal || 0);
        return sum + itemSubtotal;
      }, 0)
    : 0;

  const tax = refund?.refund_line_items
    ? refund.refund_line_items.reduce((sum, item) => {
        const itemTax = Number(item.total_tax || 0);
        return sum + itemTax;
      }, 0)
    : 0;

  const shipping = refund?.refund_shipping_lines
    ? refund.refund_shipping_lines.reduce((sum, shippingLine) => {
        const shippingAmount = Number(shippingLine.amount || 0);
        const shippingTax = Number(shippingLine.tax || 0);
        return sum + shippingAmount + shippingTax;
      }, 0)
    : 0;

  let otherAdjustments = 0;
  if (refund?.order_adjustments) {
    otherAdjustments = refund.order_adjustments.reduce((sum, adjustment) => {
      const amount = Number(adjustment.amount || 0);
      return sum + amount;
    }, 0);
  }

  
  const totalReturn = subtotal + tax + shipping + otherAdjustments;

  return {
    totalReturn
  };
}

/**
 * Convert GraphQL order to REST-like format for compatibility with processOrderForDay
 */
export function convertGraphQLOrderToRESTFormat(graphQLOrder) {
  const orderId = Number.parseInt(graphQLOrder.legacyResourceId, 10);
  const createdAt = graphQLOrder.createdAt;
  
  
  const line_items = graphQLOrder.lineItems?.edges?.map(edge => {
    const item = edge.node;
    const unitPrice = item.discountedUnitPriceSet?.shopMoney?.amount || 
                     item.originalUnitPriceSet?.shopMoney?.amount || '0';
    
    return {
      id: item.id,
      quantity: item.quantity,
      price: unitPrice,
      original_price: item.originalUnitPriceSet?.shopMoney?.amount || unitPrice,
      price_set: {
        shop_money: {
          amount: unitPrice,
          currency_code: item.originalUnitPriceSet?.shopMoney?.currencyCode || 'USD'
        }
      },
    
      tax_lines: item.taxLines?.map(tax => ({
        price: tax.priceSet?.shopMoney?.amount || '0',
        title: tax.title,
        rate: tax.rate,
      })) || [],
    };
  }) || [];

  const refunds = graphQLOrder.refunds?.map(refund => 
    convertGraphQLRefundToRESTFormat(refund)
  ) || [];

  return {
    id: orderId,
    created_at: createdAt,
    test: graphQLOrder.test,
    tags: graphQLOrder.tags,
    cancelled_at: graphQLOrder.cancelledAt,
    total_price: graphQLOrder.totalPriceSet?.shopMoney?.amount || '0',
    subtotal_price: graphQLOrder.subtotalPriceSet?.shopMoney?.amount || '0',
    total_discounts: graphQLOrder.totalDiscountsSet?.shopMoney?.amount || '0',
    total_tax: graphQLOrder.totalTaxSet?.shopMoney?.amount || '0',
    payment_gateway_names: graphQLOrder.paymentGatewayNames || [],
    line_items,
    refunds,
  };
}

/**
 * Calculate gross sales and taxes from line items
 */
export function calculateGrossSalesAndTaxes(order, hasRefunds) {
  let grossSales = 0;
  let totalTaxes = 0;

  if (order.line_items && Array.isArray(order.line_items) && order.line_items.length > 0) {
    const result = order.line_items.reduce((acc, item) => {
      const unitPrice = item.price_set 
        ? Number(item.price_set.shop_money?.amount) 
        : Number(item.original_price ?? item.price);
      const unitTotal = unitPrice * Number(item.quantity);
      let taxTotal = 0;
      
      // Only include taxes if the order has no refunds
      if (!hasRefunds && item.tax_lines && Array.isArray(item.tax_lines)) {
        taxTotal = item.tax_lines.reduce((taxSum, tax) => taxSum + Number(tax.price || 0), 0);
      }
      
      acc.totalTaxes += taxTotal;
      const netItemTotal = unitTotal - taxTotal;
      acc.grossSales += netItemTotal;
      return acc;
    }, { grossSales: 0, totalTaxes: 0 });

    grossSales = result.grossSales;
    totalTaxes = result.totalTaxes;
  } else {
    const subtotalPrice = Number(order.subtotal_price || 0);
    const discountAmount = Number(order.total_discounts || 0);
    grossSales = subtotalPrice + discountAmount;
  }

  return { grossSales, totalTaxes };
}

/**
 * Calculate refund amount and count from order refunds
 */
export function calculateRefundAmount(order) {
  const hasRefunds = order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0;
  
  if (!hasRefunds) {
    return { refundAmount: 0, refundCount: 0 };
  }

  let refundAmount = 0;
  let refundCount = 0;

  for (const refund of order.refunds) {
    const { totalReturn } = getRefundAmountFromGraphQL(refund);
    refundAmount += totalReturn;
    refundCount += 1;
  }

  return { refundAmount, refundCount };
}

/**
 * Store refund data in database
 */
async function storeRefundData(brandId, order, refundAmount, refundCount) {
  if (!brandId || refundAmount <= 0) {
    return;
  }

  try {
    await ensureOrderRefundExists(brandId, order.id, order.created_at);
    await setOrderRefund(brandId, order.id, refundAmount, refundCount);
  } catch (error) {
    console.error(`Error storing order refund info for order ${order.id}:`, error);
  }
}

/**
 * Process order for daily sales calculation
 */
async function processOrderForDay(order, acc, storeTimezone, brandId) {
  const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
  
  // Only process orders that are in the target date range
  if (!acc[orderDate]) {
    return;
  }

  const totalPrice = Number(order.total_price || 0);
  const subtotalPrice = Number(order.subtotal_price || 0);
  const discountAmount = Number(order.total_discounts || 0);
  
  const hasRefunds = order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0;
  const { grossSales, totalTaxes } = calculateGrossSalesAndTaxes(order, hasRefunds);
  const { refundAmount, refundCount } = calculateRefundAmount(order);



  if (hasRefunds) {
    console.log(`Order ${order.id} has refunds - deducting ${refundAmount} from ${orderDate}`);
  }

  // Store refund data
  await storeRefundData(brandId, order, refundAmount, refundCount);
  
  // Track payment gateway types (COD and Prepaid)
  const paymentGateways = order.payment_gateway_names || [];
  const isCOD = paymentGateways.some(gateway => 
    gateway && (gateway.toLowerCase().includes('cod') || 
                gateway.toLowerCase().includes('cash on delivery') ||
                gateway.toLowerCase().includes('cash_on_delivery'))
  );
  const isPrepaid = !isCOD && paymentGateways.length > 0;
  
  // Log payment gateway detection to debug file
  writeDebugLog(
    `Order ${order.id} (Date: ${orderDate}): Payment Gateways: [${paymentGateways.join(', ')}] | isCOD: ${isCOD} | isPrepaid: ${isPrepaid} | Cancelled: ${!!order.cancelled_at}`,
    orderDate
  );
  
  // Update daily sales map
  acc[orderDate].grossSales += grossSales;
  acc[orderDate].totalTaxes += totalTaxes;
  acc[orderDate].discountAmount += discountAmount;
  acc[orderDate].subtotalPrice += subtotalPrice;
  acc[orderDate].totalPrice += totalPrice;
  acc[orderDate].refundAmount += refundAmount;
  acc[orderDate][order.cancelled_at ? 'cancelledOrderCount' : 'orderCount']++;
  
  // Track COD and prepaid orders (only count non-cancelled orders)
  if (!order.cancelled_at) {
    if (isCOD) {
      acc[orderDate].codOrderCount++;
    } else if (isPrepaid) {
      acc[orderDate].prepaidOrderCount++;
    }
  }
  
  if (hasRefunds) {
    console.log(`Order ${order.id} has refunds - excluded taxes from calculation`);
  }
}


/**
 * Retry wrapper for GraphQL requests
 */
async function fetchWithRetries(shopName, accessToken, query, variables, maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await makeGraphQLRequest(shopName, accessToken, query, variables);
    } catch (error) {
      attempt++;
      console.error(
        `Attempt ${attempt} failed for ${variables.query || variables.after}:`,
        error.message
      );

      if (attempt >= maxRetries) throw error;
      const wait = 2000 * attempt; // exponential backoff
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

/**
 * Process a single chunk of orders
 */
async function processOrderChunk(shopName, accessToken, startTime, endTime, isTestOrder) {
  // Use exclusive end boundary (< instead of <=) to prevent overlap between chunks
  // endTime is already set to start of next day, so we use < to exclude it
  const queryString = `created_at:>=${startTime} AND created_at:<${endTime}`;
  console.log(`🔄 Fetching orders from ${startTime} to ${endTime} (exclusive end)...`);

  let hasNextPage = true;
  let cursor = null;
  const chunkOrders = [];
  const seenOrderIds = new Set(); // Track order IDs in this chunk to detect duplicates from GraphQL

  while (hasNextPage) {
    const variables = {
      first: 50, // GraphQL typically allows 50-250, using 50 for safety
      after: cursor,
      query: queryString,
    };

    const data = await fetchWithRetries(shopName, accessToken, ORDERS_QUERY, variables, 7);

    if (!data?.orders?.edges || data.orders.edges.length === 0) {
      break;
    }

    // Process orders
    for (const edge of data.orders.edges) {
      const graphQLOrder = edge.node;
      const orderId = Number.parseInt(graphQLOrder.legacyResourceId, 10);
      
      // Check for duplicates within this chunk (from GraphQL pagination)
      if (seenOrderIds.has(orderId)) {
        console.log(`⚠️  GraphQL returned duplicate order ${orderId} in same chunk (${startTime} to ${endTime}). This is a GraphQL API issue.`);
        continue;
      }
      seenOrderIds.add(orderId);
      
      // Skip test orders
      if (isTestOrder({ test: graphQLOrder.test })) {
        continue;
      }

      // Convert GraphQL order to REST-like format
      const restOrder = convertGraphQLOrderToRESTFormat(graphQLOrder);
      chunkOrders.push(restOrder);
    }

    // Check pagination
    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;

    // Rate limiting - wait between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (chunkOrders.length !== seenOrderIds.size) {
    console.log(`⚠️  Chunk ${startTime} to ${endTime}: Found ${chunkOrders.length} orders but ${seenOrderIds.size} unique IDs`);
  }

  return chunkOrders;
}

/**
 * Fetch all orders using GraphQL with pagination
 */
async function fetchAllOrdersGraphQL(shopName, accessToken, startDate, endDate, storeTimezone, isTestOrder) {
  const CHUNK_SIZE_DAYS = 7; // Process in 7-day chunks to avoid query complexity
  const allOrders = [];
  let currentStart = moment.tz(startDate, storeTimezone);
  const finalEnd = moment.tz(endDate, storeTimezone);
  const chunkBoundaries = []; // Track chunk boundaries for debugging

  while (currentStart.isSameOrBefore(finalEnd)) {
    const chunkEnd = moment.min(
      currentStart.clone().add(CHUNK_SIZE_DAYS - 1, 'days'),
      finalEnd
    );

    // Use exclusive end boundary to avoid overlap: startTime inclusive, endTime exclusive (by using start of next day)
    // This prevents orders from appearing in multiple chunks
    const startTime = currentStart.clone().startOf('day').utc().toISOString();
    // Use start of next day (exclusive) instead of end of current day (inclusive) to avoid boundary overlap
    const endTime = chunkEnd.clone().add(1, 'day').startOf('day').utc().toISOString();
    
    chunkBoundaries.push({ start: startTime, end: endTime, chunkStart: currentStart.format('YYYY-MM-DD'), chunkEnd: chunkEnd.format('YYYY-MM-DD') });

    try {
      const chunkOrders = await processOrderChunk(
        shopName,
        accessToken,
        startTime,
        endTime,
        isTestOrder
      );

      // Log chunk details for debugging
      const orderIds = chunkOrders.map(o => o.id).join(', ');
      console.log(`✅ Fetched ${chunkOrders.length} orders for chunk ${currentStart.format('YYYY-MM-DD')} to ${chunkEnd.format('YYYY-MM-DD')} (UTC: ${startTime} to ${endTime})`);
      if (chunkOrders.length > 0) {
        console.log(`   Order IDs: ${orderIds.substring(0, 100)}${orderIds.length > 100 ? '...' : ''}`);
      }

      allOrders.push(...chunkOrders);

    } catch (error) {
      console.error(`❌ Error fetching chunk ${startTime} to ${endTime}:`, error.message);
      // Continue with next chunk instead of failing completely
    }

    currentStart = chunkEnd.clone().add(1, 'day');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Log chunk boundaries for debugging
  console.log(`📊 Chunk boundaries used:`, chunkBoundaries.map(c => `${c.chunkStart} to ${c.chunkEnd} (UTC: ${c.start} to ${c.end})`).join('\n'));

  return allOrders;
}

/**
 * Main function to fetch total sales using GraphQL
 * This is a drop-in replacement for monthlyFetchTotalSales in MonthlyReport.js
 */
export const monthlyFetchTotalSalesGraphQL = async (brandId, startDate, endDate) => {
  try {
    console.log('🔄 Fetching orders using GraphQL...');
    console.log('Date range:', { startDate, endDate });
    
    const brand = await Brand.findById(brandId);
    if (!brand) throw new Error('Brand not found.');
    
    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) throw new Error('Access token is missing or invalid.');
    
    const shopName = brand.shopifyAccount?.shopName;
    if (!shopName) throw new Error('Shop name is missing or invalid.');
    
    // Test connection by fetching shop data
    let shopData;
    const apiVersion = '2024-04';
    let lastError = null;
    
    // Ensure shopName doesn't have protocol
    const cleanShopName = shopName.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    try {
      const shopResponse = await axios.get(
        `https://${cleanShopName}/admin/api/${apiVersion}/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': access_token,
          },
          timeout: 30000, // 30 second timeout
          validateStatus: (status) => status < 500, // Don't throw for 4xx errors
        }
      );
      
      if (shopResponse.status === 200) {
        shopData = shopResponse.data.shop;
        console.log(`✅ Shopify connection successful with API version ${apiVersion}`);
      } else {
        lastError = new Error(`Shopify API returned status ${shopResponse.status}: ${JSON.stringify(shopResponse.data)}`);
        console.log(`API version ${apiVersion} returned ${shopResponse.status}`);
      }
    } catch (shopError) {
      lastError = shopError;
      console.log(`API version ${apiVersion} failed: ${shopError.message}`);
    }
    
    // If we still don't have shopData, throw error
    if (!shopData) {
      console.error('❌ Shopify connection failed:', {
        message: lastError?.message,
        response: lastError?.response ? {
          status: lastError.response.status,
          statusText: lastError.response.statusText,
          data: lastError.response.data,
        } : null,
        code: lastError?.code,
      });
      
      // Provide more helpful error message
      if (lastError?.response) {
        const status = lastError.response.status;
        if (status === 401) {
          throw new Error('Shopify connection failed: Invalid or expired access token. Please reconnect your Shopify store.');
        } else if (status === 500 || status === 502 || status === 503) {
          throw new Error(`Shopify connection failed: Shopify server error (${status}). This might be temporary. Please try again later.`);
        } else {
          throw new Error(`Shopify connection failed: HTTP ${status} - ${JSON.stringify(lastError.response.data)}`);
        }
      } else if (lastError?.code === 'ECONNREFUSED' || lastError?.code === 'ENOTFOUND') {
        throw new Error(`Shopify connection failed: Cannot connect to ${cleanShopName}. Please check the shop name.`);
      } else if (lastError?.code === 'ETIMEDOUT') {
        throw new Error('Shopify connection failed: Request timeout. Please try again.');
      } else {
        throw new Error(`Shopify connection failed: ${lastError?.message || 'Unknown error'}`);
      }
    }
    
    const storeTimezone = shopData.iana_timezone || 'UTC';
    const storeCurrency = shopData.currency || 'USD';
    
    const originalStartDate = moment.tz(startDate, storeTimezone);
    const originalEndDate = moment.tz(endDate, storeTimezone);
    
    // Initialize daily sales map for target date range
    const dailySalesMap = {};
    let currentDay = originalStartDate.clone().startOf('day');
    const endMoment = originalEndDate.clone().endOf('day');
    while (currentDay.isSameOrBefore(endMoment)) {
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
        totalTaxes: 0,
        codOrderCount: 0,
        prepaidOrderCount: 0
      };
      currentDay.add(1, 'day');
    }
    
    // Test order check
    const isTestOrder = (order) => order.test;
    
    console.log('🔄 Starting to fetch orders from Shopify using GraphQL...');
    
    // Fetch all orders from the target date range
    let orders = [];
    try {
      orders = await fetchAllOrdersGraphQL(
        shopName,
        access_token,
        originalStartDate,
        originalEndDate,
        storeTimezone,
        isTestOrder
      );
      console.log('✅ Orders fetched successfully:', orders.length);
    } catch (ordersError) {
      console.error('❌ Error fetching orders:', {
        error: ordersError.message,
        code: ordersError.code,
        statusCode: ordersError.response?.status,
      });
      throw new Error(`Failed to fetch orders from Shopify: ${ordersError.message}`);
    }
    
    console.log('Total orders fetched:', orders.length);
    console.log('Test orders filtered out:', orders.filter(order => order.test).length);
    
    // Deduplicate orders by order ID to avoid processing the same order twice
    // This can happen if orders appear in multiple date chunks or pagination results
    const uniqueOrdersMap = new Map();
    for (const order of orders) {
      if (uniqueOrdersMap.has(order.id)) {
        console.log(`⚠️  Duplicate order detected: ${order.id} (created: ${order.created_at}). Skipping duplicate.`);
        continue;
      }
      uniqueOrdersMap.set(order.id, order);
    }
    
    const uniqueOrders = Array.from(uniqueOrdersMap.values());
    console.log(`Total unique orders after deduplication: ${uniqueOrders.length} (removed ${orders.length - uniqueOrders.length} duplicates)`);
    
    // Process orders for sales data, refunds, and COGS
    let totalRefundsProcessed = 0;
    for (const order of uniqueOrders) {
      await processOrderForDay(order, dailySalesMap, storeTimezone, brandId);
      
      if (order.refunds && order.refunds.length > 0) {
        totalRefundsProcessed += order.refunds.length;
      }
    }
    
    console.log(`Total refunds processed: ${totalRefundsProcessed}`);
    
    // Log summary of data processing
    const ordersInRange = orders.filter(order => {
      const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
      return originalStartDate.isSameOrBefore(moment.tz(orderDate, storeTimezone)) && 
             originalEndDate.isSameOrAfter(moment.tz(orderDate, storeTimezone));
    }).length;
    
    console.log(`Orders in target range: ${ordersInRange}/${orders.length}`);
    
    return Object.values(dailySalesMap).map(day => {
      const grossSales = Number(day.grossSales);
      const discountAmount = Number(day.discountAmount);
      const refundAmount = Number(day.refundAmount);
      const totalPrice = Number(day.totalPrice);
      const subtotalPrice = Number(day.subtotalPrice);
      const totalTaxes = Number(day.totalTaxes || 0);

      console.log(`Day: ${day.date}, Gross Sales: ${grossSales}, Discount Amount: ${discountAmount}, Refund Amount: ${refundAmount}, Total Price: ${totalPrice}, Subtotal Price: ${subtotalPrice}, Total Taxes: ${totalTaxes}`);
      
  
      
      return {
        date: day.date,
        grossSales: grossSales.toFixed(2),
        totalSales: (totalPrice - refundAmount).toFixed(2),
        subtotalSales: subtotalPrice.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        totalTaxes: totalTaxes.toFixed(2),
        orderCount: day.orderCount,
        cancelledOrderCount: day.cancelledOrderCount,
        codOrderCount: day.codOrderCount || 0,
        prepaidOrderCount: day.prepaidOrderCount || 0,
        currency: storeCurrency
      };
    });
  } catch (error) {
    console.error('❌ Error in monthlyFetchTotalSalesGraphQL:', {
      error: error.message,
      stack: error.stack,
      brandId: brandId,
      startDate: startDate,
      endDate: endDate
    });
    throw new Error(`Failed to fetch total sales: ${error.message}`);
  }
};

