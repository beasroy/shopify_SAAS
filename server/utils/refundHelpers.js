import OrderRefund from '../models/OrderRefund.js';
import AdMetrics from '../models/AdMetrics.js';
import Brand from '../models/Brands.js';
import moment from 'moment-timezone';

/**
 * Calculate total refund amount from refund payload
 * Based on the refunds/create webhook payload structure
 * Formula: subtotal + discount + tax + shipping
 */
export const calculateRefundAmount = (refundPayload) => {
  // 1. Calculate subtotal from refund line items (product price after discount, before tax)
  let subtotal = 0;
  if (Array.isArray(refundPayload.refund_line_items)) {
    refundPayload.refund_line_items.forEach(item => {
      subtotal += Number(item.subtotal || 0);
    });
  }

  // 2. Calculate tax from refund line items
  let tax = 0;
  if (Array.isArray(refundPayload.refund_line_items)) {
    refundPayload.refund_line_items.forEach(item => {
      tax += Number(item.total_tax || 0);
    });
  }

  // 3. Calculate discount and shipping from order adjustments
  // Order adjustments can include discount refunds and shipping refunds
  // Amounts are typically negative, so we subtract to add them
  let discount = 0;
  let shipping = 0;
  
  if (Array.isArray(refundPayload.order_adjustments)) {
    refundPayload.order_adjustments.forEach(adjustment => {
      const amount = Number(adjustment.amount || 0);
      const reason = (adjustment.reason || '').toLowerCase();
      
      // Shipping adjustments are typically negative, so subtract to add
      if (reason.includes('shipping') || reason.includes('delivery')) {
        shipping -= amount; // Subtract negative to add positive
      } else {
        // Other adjustments (discounts, etc.) - subtract negative to add positive
        discount -= amount;
      }
    });
  }

  // 4. Total refund = subtotal + discount + tax + shipping
  const totalRefund = subtotal + discount + tax + shipping;

  return Math.max(0, totalRefund); // Ensure non-negative
};

/**
 * Ensure OrderRefund entry exists for an order
 * Creates entry with order_id and order_created_at if it doesn't exist
 * Used during historical order sync to pre-populate order data
 */
export const ensureOrderRefundExists = async (brandId, orderId, orderCreatedAt) => {
  try {
    const existingRefund = await OrderRefund.findOne({
      brandId,
      orderId
    });

    if (!existingRefund) {
      // Create entry with zero refund amount (will be updated later if refunds come)
      const orderRefund = new OrderRefund({
        brandId,
        orderId,
        orderCreatedAt: new Date(orderCreatedAt),
        refundAmount: 0,
        refundCount: 0,
        lastRefundAt: null
      });
      await orderRefund.save();
      console.log(`✅ Created OrderRefund entry for order ${orderId} (no refunds yet)`);
    }

  } catch (error) {
    console.error(`Error ensuring OrderRefund exists for order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Set OrderRefund entry for an order (used during historical sync)
 * Sets the total refund amount from all refunds in the order
 * This should be used when processing historical orders where we have the complete refund picture
 */
export const setOrderRefund = async (brandId, orderId, totalRefundAmount, refundCount = 1) => {
  try {
    // Find existing refund entry for this order
    const orderRefund = await OrderRefund.findOne({
      brandId,
      orderId
    });

    if (!orderRefund) {
      throw new Error(`OrderRefund entry not found for order ${orderId}. Order must be synced first.`);
    }

    // Set the total refund amount (don't add, replace)
    orderRefund.refundAmount = totalRefundAmount;
    orderRefund.refundCount = refundCount;
    orderRefund.lastRefundAt = new Date();
    await orderRefund.save();
    console.log(`✅ Set OrderRefund for order ${orderId}: Total refund = ${orderRefund.refundAmount}`);
    
    return orderRefund;
  } catch (error) {
    console.error(`Error setting OrderRefund for order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Update OrderRefund entry for an order (used for webhook refunds)
 * Aggregates multiple refunds per order - ADDS to existing amount
 * Note: This assumes the OrderRefund entry already exists (created during historical sync)
 * Use this for incremental webhook updates, not for historical sync
 */
export const updateOrderRefund = async (brandId, orderId, refundAmount) => {
  try {
    // Find existing refund entry for this order
    const orderRefund = await OrderRefund.findOne({
      brandId,
      orderId
    });

    if (!orderRefund) {
      throw new Error(`OrderRefund entry not found for order ${orderId}. Order must be synced first.`);
    }

    // Update existing: add new refund amount and increment count
    orderRefund.refundAmount += refundAmount;
    orderRefund.refundCount += 1;
    orderRefund.lastRefundAt = new Date();
    await orderRefund.save();
    console.log(`✅ Updated OrderRefund for order ${orderId}: Total refund = ${orderRefund.refundAmount}`);
    
    return orderRefund;
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
    const refundsForDate = await OrderRefund.find({
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
    const refunds = await OrderRefund.find({
      brandId,
      orderCreatedAt: {
        $gte: startMoment.toDate(),
        $lte: endMoment.toDate()
      }
    });

    // Group refunds by date
    const refundsByDate = new Map();
    refunds.forEach(refund => {
      const refundDate = moment.tz(refund.orderCreatedAt, storeTimezone).format('YYYY-MM-DD');
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

