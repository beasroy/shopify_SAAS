import Shopify from 'shopify-api-node';
import { config } from 'dotenv';
config();

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const shopName = new URL(SHOPIFY_STORE_URL).hostname.split('.')[0];

const shopify = new Shopify({
  shopName: shopName,
  accessToken: SHOPIFY_ACCESS_TOKEN,
  apiVersion: '2023-04',
  timeout: 60000,
});


export const fetchShopifyData = async (req, res) => {
  try {
    console.log('Fetching all orders...');
    const orders = await shopify.order.list({status :'any'});
    console.log(`Successfully fetched ${orders.length} orders`);

    
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    
    const topSellingProducts = getTopSellingProducts(orders);

    
    const salesByTimeOfDay = getSalesByTimeOfDay(orders);

    
    const conversionRate = calculateConversionRate(orders);

    
    res.json({
      orders,
      totalOrders,
      totalSales,
      conversionRate,
      averageOrderValue,
      topSellingProducts,
      salesByTimeOfDay,
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


// import axios from "axios";
// import { config } from "dotenv";
// config();

// const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
// const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;


// export const fetchShopifyData = async (req, res) => {
//   try {
//     const response = await axios.get(SHOPIFY_STORE_URL, {
//       headers: {
//         'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
//       }
//     });

//     const orders = response.data.orders;
//     const totalOrders = orders.length;
//     const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    
   
//     const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
 
//     const topSellingProducts = getTopSellingProducts(orders);
    
  
//     const salesByTimeOfDay = getSalesByTimeOfDay(orders);
    

//     const conversionRate = calculateConversionRate(orders);

//     res.json({
//       orders,
//       totalOrders,
//       totalSales,
//       conversionRate,
//       averageOrderValue,
//       topSellingProducts,
//       salesByTimeOfDay,
    
//     });
//   } catch (error) {
//     console.error('Error fetching Shopify data:', error);
//     res.status(500).json({ error: 'Failed to fetch Shopify data' });
//   }
// };

// function getTopSellingProducts(orders) {
//   const productCounts = {};
//   orders.forEach(order => {
//     order.line_items.forEach(item => {
//       const productName = item.name;
//       productCounts[productName] = (productCounts[productName] || 0) + item.quantity;
//     });
//   });
//   return Object.entries(productCounts)
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 5)
//     .map(([name, count]) => ({ name, count }));
// }

// function getSalesByTimeOfDay(orders) {
//   const salesByHour = Array(24).fill(0);
//   orders.forEach(order => {
//     const hour = new Date(order.created_at).getHours();
//     salesByHour[hour] += parseFloat(order.total_price);
//   });
//   return salesByHour;
// }


// function calculateConversionRate(orders) {
//   return (orders.length / 100) * 100; 
// }