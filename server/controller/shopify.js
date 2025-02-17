
import { config } from 'dotenv';
import Shopify from 'shopify-api-node'
import Brand from '../models/Brands.js';
import axios from 'axios';

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


    let orders = [];
    let queryParams = {
      status: 'any',
      limit: 250, // Fetch 250 orders per request
    };


    const utcOffset = 5.5 * 60 * 60 * 1000;


    const now = new Date();
    const specificDate = new Date(now.getFullYear(), 0, 9); // February 4th (month is 0-based)

    queryParams.created_at_min = new Date(specificDate).toISOString();
    queryParams.created_at_max = new Date(specificDate).toISOString();



    console.log('Query Parameters:', queryParams);

    // Pagination logic
    let hasNextPage = true;
    let pageInfo;

    while (hasNextPage) {
      // Add page_info to queryParams if it exists, otherwise remove it
      if (pageInfo) {
        queryParams = { page_info: pageInfo };
      } else {
        delete queryParams.page_info;
      }
      console.log('Query Parameters after pageInfo:', queryParams);

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
        hasNextPage = !!pageInfo; // No more pages to fetch
      } catch (error) {
        console.error('Error while fetching orders:', error);
        hasNextPage = false;
        return res.status(500).json({ error: `Error fetching orders: ${error.message}` });
      }
    }

    console.log(`Successfully fetched a total of ${orders.length} orders`);




    const { totalSales, totalRefunds, totalDiscounts, grossSales, totalTaxes } = calculateTotalSales(orders, queryParams.created_at_min, queryParams.created_at_max)

    // Respond with data including returns
    res.json({

      totalSales, totalRefunds,
      totalDiscounts, grossSales, totalTaxes

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


function calculateTotalSales(orders, startDate, endDate) {
  // Set up date range
  const startUTC = new Date(startDate).getTime();
  const endUTC = new Date(endDate).getTime();

  let totalRefunds = 0;
  let grossSales = 0;
  const orderSummaries = [];

  // Process orders
  orders.forEach((order) => {
    const orderDate = new Date(order.created_at).getTime();
    const totalPrice = Number(order.total_price || 0);

    // Calculate gross sales only for orders within date range
    if (orderDate >= startUTC && orderDate <= endUTC) {
      grossSales += totalPrice;
    }

    // Process refunds - consider all refunds that occurred within the date range,
    // regardless of when the original order was created
    const orderRefunds = order.refunds.reduce((refundSum, refund) => {
      const refundDateUTC = new Date(refund.created_at).getTime();

      // Only include refunds processed within the specified date range
      if (refundDateUTC <= endUTC) {
        const lineItemRefunds = refund.refund_line_items.reduce((lineSum, lineItem) => {
          return lineSum + Number(lineItem.subtotal_set.shop_money.amount || 0);
        }, 0);

        return refundSum + lineItemRefunds;
      }
      return refundSum;
    }, 0);

    // Only add to summaries if there were refunds in this period
    if (orderRefunds > 0) {
      const orderSummary = {
        orderId: order.id,
        orderDate: new Date(order.created_at).toLocaleString(),
        orderTotal: totalPrice,
        refundsInPeriod: orderRefunds,
        // Include refund dates for transparency
        refundDates: order.refunds
          .filter(refund => {
            const refundDate = new Date(refund.created_at).getTime();
            return refundDate >= startUTC && refundDate <= endUTC;
          })
          .map(refund => new Date(refund.created_at).toLocaleString())
      };

      orderSummaries.push(orderSummary);
      totalRefunds += orderRefunds;
    }
  });

  const shopifySales = grossSales - totalRefunds;

  // Debug logging
  console.log('Sales Calculation Breakdown:', {
    periodStart: new Date(startUTC).toLocaleString(),
    periodEnd: new Date(endUTC).toLocaleString(),
    grossSales: grossSales.toFixed(2),
    totalRefunds: totalRefunds.toFixed(2),
    shopifySales: shopifySales.toFixed(2),
    ordersWithRefunds: orderSummaries.length
  });

  if (orderSummaries.length > 0) {
    console.log('Orders with refunds in this period:', orderSummaries);
  }

  return {
    shopifySales: Number(shopifySales.toFixed(2)),
    refundAmount: Number(totalRefunds.toFixed(2)),
    totalSales: Number(grossSales.toFixed(2)),
    orderSummaries // Including this for detailed reporting if needed
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

