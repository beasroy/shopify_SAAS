import Order from '../models/Order.js';
import AdMetrics from '../models/AdMetrics.js';
import Brand from '../models/Brands.js';
import moment from 'moment-timezone';
import axios from 'axios';


export const calculateRefundAmount = (refundPayload) => {
  let subtotal = 0;
  if (Array.isArray(refundPayload.refund_line_items)) {
    refundPayload.refund_line_items.forEach(item => {
      subtotal += Number(item.subtotal || 0);
    });
  }

  let tax = 0;
  if (Array.isArray(refundPayload.refund_line_items)) {
    refundPayload.refund_line_items.forEach(item => {
      tax += Number(item.total_tax || 0);
    });
  }

  
  let discount = 0;
  let shipping = 0;

  const totalRefund = subtotal + discount + tax + shipping;

  return Math.max(0, totalRefund); // Ensure non-negative
};


export const setOrderRefund = async (brandId, orderId, totalRefundAmount, refundCount = 1) => {
  try {
    
    const order = await Order.findOne({
      brandId,
      orderId
    });

    if (!order) {
      throw new Error(`OrderRefund entry not found for order ${orderId}. Order must be synced first.`);
    }

    // Set the total refund amount (don't add, replace)
    order.refundAmount = totalRefundAmount;
    order.refundCount = refundCount;
    order.lastRefundAt = new Date();
    await order.save();
    console.log(`✅ Set OrderRefund for order ${orderId}: Total refund = ${order.refundAmount}`);
    
    return order;
  } catch (error) {
    console.error(`Error setting OrderRefund for order ${orderId}:`, error);
    throw error;
  }
};


async function fetchAndCreateOrder(brandId, orderId) {
  try {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new Error(`Brand not found: ${brandId}`);
    }

    const shopName = brand.shopifyAccount?.shopName;
    const accessToken = brand.shopifyAccount?.shopifyAccessToken;

    if (!shopName || !accessToken) {
      throw new Error(`Shopify credentials missing for brand ${brandId}`);
    }

    // Fetch order from Shopify REST API
    const response = await axios.get(
      `https://${shopName}/admin/api/2024-10/orders/${orderId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken
        }
      }
    );

    const shopifyOrder = response.data.order;
    if (!shopifyOrder) {
      throw new Error(`Order ${orderId} not found in Shopify`);
    }

    // Create Order document
    const order = await Order.create({
      orderId: Number(orderId),
      orderCreatedAt: new Date(shopifyOrder.created_at),
      brandId: brandId,
      city: shopifyOrder.shipping_address?.city || null,
      state: shopifyOrder.shipping_address?.province || null,
      country: shopifyOrder.shipping_address?.country || null
    });

    console.log(`✅ Created Order document for order ${orderId} from Shopify`);
    return order;
  } catch (error) {
    if (error.code === 11000) {
      // Order already exists (race condition), fetch it
      return await Order.findOne({ brandId, orderId: Number(orderId) });
    }
    console.error(`Error fetching/creating order ${orderId}:`, error);
    throw error;
  }
}


export const updateOrderRefund = async (brandId, orderId, refundAmount) => {
  try {
    // Find existing order entry
    let order = await Order.findOne({
      brandId,
      orderId: Number(orderId)
    });

    // If order doesn't exist, fetch it from Shopify and create it
    if (!order) {
      console.log(`⚠️  Order ${orderId} not found in database. Fetching from Shopify...`);
      order = await fetchAndCreateOrder(brandId, orderId);
      
      if (!order) {
        throw new Error(`Could not fetch or create order ${orderId} from Shopify`);
      }
    }

    // Update existing: add new refund amount and increment count
    order.refundAmount = refundAmount;
    order.refundCount = (order.refundCount || 0) + 1;
    order.lastRefundAt = new Date();
    await order.save();
    console.log(`✅ Updated OrderRefund for order ${orderId}: Total refund = ${order.refundAmount}`);
    
    return order;
  } catch (error) {
    console.error(`Error updating OrderRefund for order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Get total refund amount for a specific date from OrderRefund model
 */
export const getRefundsForDate = async (brandId, orderDate, storeTimezone = 'UTC') => {
  try {
    // Convert order date to start and end of day in store timezone
    const dateMoment = moment.tz(orderDate, storeTimezone);
    const startOfDay = dateMoment.clone().startOf('day').toDate();
    const endOfDay = dateMoment.clone().endOf('day').toDate();

    // Sum all refunds for this date
    const refundsForDate = await Order.find({
      brandId,
      orderCreatedAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    const totalRefundAmount = refundsForDate.reduce((sum, refund) => sum + refund.refundAmount, 0);
    return totalRefundAmount;
  } catch (error) {
    console.error(`Error getting refunds for date ${orderDate}:`, error);
    return 0;
  }
};

/**
 * Get total refund amounts for a date range from OrderRefund model
 * Returns a Map of date string -> refund amount
 */
export const getRefundsForDateRange = async (brandId, startDate, endDate, storeTimezone = 'UTC') => {
  try {
    const startMoment = moment.tz(startDate, storeTimezone).startOf('day');
    const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

    // Find all refunds in the date range
    const refunds = await Order.find({
      brandId,
      orderCreatedAt: {
        $gte: startMoment.toDate(),
        $lte: endMoment.toDate()
      }
    });

    // Group refunds by date (convert from UTC to store timezone)
    const refundsByDate = new Map();
    refunds.forEach(refund => {
      // orderCreatedAt is stored as UTC in database
      // If storeTimezone is UTC, no conversion needed; otherwise convert to store timezone
      const refundDate = storeTimezone === 'UTC' 
        ? moment.utc(refund.orderCreatedAt).format('YYYY-MM-DD')
        : moment.utc(refund.orderCreatedAt).tz(storeTimezone).format('YYYY-MM-DD');
      const currentAmount = refundsByDate.get(refundDate) || 0;
      refundsByDate.set(refundDate, currentAmount + refund.refundAmount);
    });
    console.log(refundsByDate);

    return refundsByDate;
  } catch (error) {
    console.error(`Error getting refunds for date range ${startDate} to ${endDate}:`, error);
    return new Map();
  }
};

/**
 * Update AdMetrics for a specific date by recalculating refunds
 * This should be called after updating OrderRefund
 */
export const updateAdMetricsForDate = async (brandId, orderRefund) => {
  try {
    if (!orderRefund || !orderRefund.orderCreatedAt) {
      throw new Error('Invalid orderRefund entry');
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new Error(`Brand not found: ${brandId}`);
    }

    // Get store timezone or default to UTC
    const storeTimezone = brand?.shopifyAccount?.timezone || 'UTC';
    const orderDate = orderRefund.orderCreatedAt;
    
    // Get total refunds from OrderRefund model for this date
    const totalRefundAmount = await getRefundsForDate(brandId, orderDate, storeTimezone);

    // Convert order date to start and end of day in store timezone
    const dateMoment = moment.tz(orderDate, storeTimezone);
    const startOfDay = dateMoment.clone().startOf('day').toDate();
    const endOfDay = dateMoment.clone().endOf('day').toDate();

    // Update AdMetrics for this date
    const adMetrics = await AdMetrics.findOneAndUpdate(
      { 
        brandId, 
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      },
      {
        $set: {
          refundAmount: totalRefundAmount
        }
      },
      { 
        upsert: false, // Don't create if it doesn't exist
        new: true 
      }
    );

    if (adMetrics) {
      console.log(`✅ Updated AdMetrics for ${dateMoment.format('YYYY-MM-DD')}: Refund = ${totalRefundAmount}`);
      return adMetrics;
    } else {
      console.log(`⚠️  No AdMetrics found for ${dateMoment.format('YYYY-MM-DD')} - skipping refund update`);
      return null;
    }
  } catch (error) {
    console.error(`Error updating AdMetrics for date:`, error);
    throw error;
  }
};


export const processRefundWebhook = async (refundPayload, shopDomain) => {
  try {
    // Find brand
    const brand = await Brand.findOne({ 'shopifyAccount.shopName': shopDomain });
    if (!brand) {
      throw new Error(`Brand not found for shop: ${shopDomain}`);
    }

    const brandId = brand._id;
    const orderId = refundPayload.order_id;

    // Calculate refund amount
    const refundAmount = calculateRefundAmount(refundPayload);
    
    if (refundAmount <= 0) {
      console.log(`⚠️  Refund amount is 0 or negative for order ${orderId}, skipping`);
      return;
    }

    // Update OrderRefund (aggregates multiple refunds per order)
    // This assumes the OrderRefund entry was created during historical order sync
    const orderRefund = await updateOrderRefund(brandId, orderId, refundAmount);

    if (!orderRefund) {
      throw new Error(`Could not update OrderRefund for order ${orderId}`);
    }

    // Update AdMetrics for the order's creation date
    await updateAdMetricsForDate(brandId, orderRefund);

    console.log(`✅ Successfully processed refund for order ${orderId}: ${refundAmount} on order date ${orderRefund.orderCreatedAt}`);
    
    return {
      success: true,
      orderId,
      orderCreatedAt: orderRefund.orderCreatedAt,
      refundAmount
    };
  } catch (error) {
    console.error('Error processing refund webhook:', error);
    throw error;
  }
};

