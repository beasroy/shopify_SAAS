import axios from 'axios';

// Calculate refund amount from Shopify order
export const calculateRefundAmount = (order) => {
  // For cancelled COD orders (voided before payment)
  if (order.cancelled_at && order.financial_status === 'voided') {
    return parseFloat(order.total_price);
  }
  
  // For refunded orders (paid then refunded)
  let totalRefund = 0;
  
  if (order.refunds && order.refunds.length > 0) {
    order.refunds.forEach(refund => {
      // Sum refund line items (products)
      if (refund.refund_line_items) {
        refund.refund_line_items.forEach(item => {
          totalRefund += parseFloat(item.subtotal || 0);
          totalRefund += parseFloat(item.total_tax || 0);
        });
      }
      
      // Add order adjustments (shipping refunds, etc.)
      // Note: amounts are negative, so we subtract to add
      if (refund.order_adjustments) {
        refund.order_adjustments.forEach(adjustment => {
          totalRefund -= parseFloat(adjustment.amount || 0);
        });
      }
    });
  }
  
  // Cap at total_price (can't refund more than order total)
  return Math.min(totalRefund, parseFloat(order.total_price));
};

// Fetch single order from Shopify
export const fetchShopifyOrder = async (brand, orderId) => {
  try {
    const response = await axios.get(
      `https://${brand.shopifyDomain}/admin/api/2024-10/orders/${orderId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': brand.shopifyAccessToken
        }
      }
    );
    return response.data.order;
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error.message);
    throw error;
  }
};

// Fetch orders for a date range
export const fetchShopifyOrdersForDateRange = async (brand, startDate, endDate) => {
  try {
    let allOrders = [];
    let pageInfo = null;
    let hasMore = true;
    
    while (hasMore) {
      const params = {
        status: 'any',
        created_at_min: `${startDate}T00:00:00Z`,
        created_at_max: `${endDate}T23:59:59Z`,
        limit: 250
      };
      
      if (pageInfo) {
        params.page_info = pageInfo;
      }
      
      const response = await axios.get(
        `https://${brand.shopifyDomain}/admin/api/2024-10/orders.json`,
        {
          params,
          headers: {
            'X-Shopify-Access-Token': brand.shopifyAccessToken
          }
        }
      );
      
      const orders = response.data.orders || [];
      allOrders.push(...orders);
      
      // Check for next page
      const linkHeader = response.headers.link;
      if (!linkHeader || !linkHeader.includes('rel="next"')) {
        hasMore = false;
      } else {
        const nextMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
        if (nextMatch) {
          pageInfo = nextMatch[1];
        } else {
          hasMore = false;
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return allOrders;
  } catch (error) {
    console.error('Error fetching Shopify orders:', error.message);
    throw error;
  }
};

// Update AdMetrics for a specific date
export const updateAdMetricsForDate = async (brandId, dateStr) => {
  const ShopifyOrder = (await import('../models/ShopifyOrder.js')).default;
  const AdMetrics = (await import('../models/AdMetrics.js')).default;
  
  // Aggregate all orders for this date
  const orders = await ShopifyOrder.find({
    brand_id: brandId,
    order_date: dateStr
  });
  
  const totalSales = orders.reduce((sum, o) => sum + o.total_price, 0);
  const refundAmount = orders.reduce((sum, o) => sum + o.refund_amount, 0);
  
  // Update AdMetrics (keep existing ad platform data)
  await AdMetrics.findOneAndUpdate(
    { brandId, date: new Date(dateStr) },
    {
      $set: {
        totalSales,
        refundAmount
      }
    },
    { upsert: true }
  );
  
  const netSales = totalSales - refundAmount;
  console.log(`✅ Updated AdMetrics[${dateStr}]: Gross=₹${totalSales}, Refunds=₹${refundAmount}, Net=₹${netSales}`);
  
  return { totalSales, refundAmount, netSales };
};

