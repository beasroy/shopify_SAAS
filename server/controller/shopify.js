import { shopifyApi, ApiVersion } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import { config } from 'dotenv';
import axios from 'axios';
config();

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const shopName = new URL(SHOPIFY_STORE_URL).hostname.replace('www.', '');
console.log(shopName);
console.log(SHOPIFY_ACCESS_TOKEN)

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  hostName: shopName,
  apiVersion: ApiVersion.October24,
  isEmbeddedApp: false,
});

console.log('Shopify API Client:', shopify ? 'Initialized' : 'Failed to initialize');
// console.log(shopify)

const client = new shopify.clients.Rest({
  session: {
    accessToken: SHOPIFY_ACCESS_TOKEN,
    shop: shopName
  }
});
// console.log(client)



export const fetchShopifyData = async (req, res) => {
  try {
    console.log('Fetching orders and session data...');
    const { startDate, endDate } = req.query;
    let orders = [];
    let queryParams = { status: 'any', limit: 250 }; // Set limit to max 250

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      queryParams.created_at_min = new Date(start.setHours(0, 0, 0, 0)).toISOString(); // Start of the day on startDate
      queryParams.created_at_max = new Date(end.setHours(23, 59, 59, 999)).toISOString(); // End of the day on endDate
    } else {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      queryParams.created_at_min = firstDayOfMonth.toISOString(); // Start of the month
      queryParams.created_at_max = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    }
    

    console.log('Query Parameters:', queryParams);

    let hasNextPage = true;
    let pageInfo; // For cursor pagination

    while (hasNextPage) {
      // Add page_info to queryParams if it exists
      if (pageInfo) {
        queryParams.page_info = pageInfo;
      }

      const response = await client.get({
        path: 'orders',
        query: queryParams,
      });

      orders = orders.concat(response.body.orders); // Append new orders to the list
      console.log(`Fetched ${response.body.orders.length} orders from this page`);

      // Check if there's a next page
      if (response.body.orders.length < queryParams.limit) {
        hasNextPage = false; // No more orders to fetch
      } else {
        // Update pageInfo for the next iteration
        pageInfo = response.headers['link'] ? extractPageInfo(response.headers['link']) : null;
        hasNextPage = !!pageInfo; // Continue if there's a next page
      }
    }

    console.log(`Successfully fetched a total of ${orders.length} orders`);

    // Existing data processing
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const topSellingProducts = getTopSellingProducts(orders);
    const salesByTimeOfDay = getSalesByTimeOfDay(orders);
    const conversionRate = calculateConversionRate(orders);
    const tenMonthsAgoOrder = getLast10MonthOrder(orders);
    const MonthlyAverageOrderValue = getMonthlyAverageOrderValue(orders);

    res.json({
      orders,
      totalOrders,
      totalSales,
      conversionRate,
      averageOrderValue,
      topSellingProducts,
      salesByTimeOfDay,
      tenMonthsAgoOrder,
      MonthlyAverageOrderValue,
    });

  } catch (error) {
    console.error('Error in fetchShopifyData:', error);

    let errorMessage = 'Failed to fetch Shopify data';
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection to Shopify API refused. Please check your network connection and Shopify store URL.';
    } else if (error.message.includes('Failed to fetch orders')) {
      errorMessage = `Error occurred while fetching orders: ${error.message}. Please verify your Shopify access token and API permissions.`;
    }

    res.status(500).json({ error: errorMessage });
  }
};


function getTopSellingProducts(orders) {
  const productCounts = {};
  orders.forEach(order => {
    order.line_items.forEach(item => {
      const productName = item.name;
      productCounts[productName] = (productCounts[productName] || 0) + item.quantity;
    });
  });
  return Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}


function getSalesByTimeOfDay(orders) {
  const salesByHour = Array(24).fill(0);
  orders.forEach(order => {
    const hour = new Date(order.created_at).getHours();
    salesByHour[hour] += parseFloat(order.total_price);
  });
  return salesByHour;
}

function calculateConversionRate(orders) {
  return (orders.length / 100) * 100;
}

function getLast10MonthOrder(orders) {
  const tenMonthsAgo = new Date();
  tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);

  const filteredOrders = orders.filter(order =>
    new Date(order.created_at) >= tenMonthsAgo
  );
  return filteredOrders;
}


function getMonthlyAverageOrderValue(orders) {
  // Object to hold totals for each month
  const monthlyData = {};

  orders.forEach(order => {
    const createdAt = new Date(order.created_at);
    // Format the date as 'YYYY-MM'
    const yearMonth = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1).toString().padStart(2, '0')}`;

    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = {
        totalSales: 0,
        orderCount: 0
      };
    }

    monthlyData[yearMonth].totalSales += parseFloat(order.total_price);
    monthlyData[yearMonth].orderCount += 1;
  });

  // Calculate the average order value for each month
  const monthlyAverageOrderValue = {};

  for (const [month, data] of Object.entries(monthlyData)) {
    monthlyAverageOrderValue[month] = data.totalSales / data.orderCount;
  }

  return monthlyAverageOrderValue;
}










