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
    let orders;

    if (startDate && endDate) {
      const response = await client.get({
        path: 'orders',
        query: {
          status: 'any',
          created_at_min: new Date(startDate).toISOString(),
          created_at_max: new Date(endDate).toISOString()
        }
      });
      orders = response.body.orders;
    } else {
      const response = await client.get({
        path: 'orders',
        query: { status: 'any' }
      });
      orders = response.body.orders;
    }

    console.log(`Successfully fetched ${orders.length} orders`);


    // Existing data processing
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const topSellingProducts = getTopSellingProducts(orders);
    const salesByTimeOfDay = getSalesByTimeOfDay(orders);
    const conversionRate = calculateConversionRate(orders);
    const tenMonthsAgoOrder = getLast10MonthOrder(orders);
    const MonthlyAverageOrderValue = getMonthlyAverageOrderValue(orders);
    const MonthlyCustomerReturnRate = calculateMonthlyReturningCustomerRate(orders);
    const customers = await fetchCustomers();
    const citiesData = processCities(customers)
    const referringChannelsData = processReferringChannels(orders)

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
      MonthlyCustomerReturnRate,
      citiesData,
      referringChannelsData,
   
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


function calculateMonthlyReturningCustomerRate(orders) {
  const monthlyData = {};

  // Loop through all orders to group by month and count customer occurrences
  orders.forEach(order => {
    const createdAt = new Date(order.created_at);
    const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        customerCount: {}
      };
    }

    // Count customer occurrences
    if (order.customer && order.customer.id) {
      const customerId = order.customer.id;

      if (!monthlyData[monthKey].customerCount[customerId]) {
        monthlyData[monthKey].customerCount[customerId] = 0;
      }
      monthlyData[monthKey].customerCount[customerId]++;
    }
  });

  // Calculate returning customer rates per month
  const returningCustomerRates = {};
  for (const month in monthlyData) {
    const customerCount = monthlyData[month].customerCount;
    const totalCustomers = Object.keys(customerCount).length;
    const returningCustomers = Object.values(customerCount).filter(count => count > 1).length;

    returningCustomerRates[month] = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
  }

  return returningCustomerRates;
}


const fetchCustomers = async () => {
  const response = await client.get({
    path: 'customers',
    query: { status: 'any' }
  });
  return response.body.customers;
};

const processCities = (customers) => {
  const citiesData = {};

  customers.forEach(customer => {
    const city = customer.default_address?.city || 'Unknown';

    if (!citiesData[city]) {
      citiesData[city] = { customerCount: 0 };
    }
    // Sum orders for each city
    citiesData[city].customerCount += 1; // Count unique customers
  });

  return citiesData;
};

const processReferringChannels = (orders) => {
  const referringChannelsData = {};

  orders.forEach(order => {
    const source = order.source_name || 'Direct'; // Modify based on your actual data structure

    if (!referringChannelsData[source]) {
      referringChannelsData[source] = 0;
    }

    referringChannelsData[source] += 1; // Count orders per referring channel
  });

  return referringChannelsData;
};





