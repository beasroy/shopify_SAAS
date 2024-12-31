
import { config } from 'dotenv';
import Shopify from 'shopify-api-node'
import Brand from '../models/Brands.js';
import moment from 'moment';
import axios from 'axios';

config();



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

    const { startDate, endDate } = req.query;
    let orders = [];
    let queryParams = {
      status: 'any',
      limit: 250, // Fetch 250 orders per request
    };

 
    // if (startDate && endDate) {
    //   const start = new Date(startDate);
    //   const end = new Date(endDate);
    //   queryParams.created_at_min = new Date(start.setHours(0, 0, 0, 0)).toISOString(); 
    //   queryParams.created_at_max = new Date(end.setHours(23, 59, 59, 999)).toISOString(); 
    // } else {
    //   const now = new Date();
    //   const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    //   queryParams.created_at_min = firstDayOfMonth.toISOString(); 
    //   queryParams.created_at_max = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    // }

    const utcOffset = 5.5 * 60 * 60 * 1000; 
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Adjust for +5:30 timezone
        queryParams.created_at_min = new Date(start.setHours(0, 0, 0, 0) - utcOffset).toISOString(); // Start of the day at 6 AM in UTC
        queryParams.created_at_max = new Date(end.setHours(23, 59, 59, 999) - utcOffset).toISOString(); 
    }else{
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        queryParams.created_at_min = new Date(firstDayOfMonth.setHours(0, 0, 0, 0) - utcOffset).toISOString(); 
        queryParams.created_at_max = new Date(now.setHours(23, 59, 59, 999) - utcOffset).toISOString(); 
    }
  
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

    const totalOrders = orders.length;
   
    const totalsalesWithoutRefund = orders.reduce((sum,order)=>{
      return sum + parseFloat(order.total_price) ;
    },0)
    const averageOrderValue = totalOrders > 0 ? totalsalesWithoutRefund / totalOrders : 0;

 
    const totalSales = calculateTotalSales(orders,queryParams.created_at_min,queryParams.created_at_max)

    // Respond with data including returns
    res.json({
      orders,
      totalOrders,
      totalSales,
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
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    queryParams.created_at_min = new Date(firstDayOfMonth.setHours(0, 0, 0, 0) - utcOffset).toISOString(); 
    queryParams.created_at_max = new Date(now.setHours(23, 59, 59, 999) - utcOffset).toISOString(); 
    
  
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



   
    const totalSales = calculateTotalSales(orders,queryParams.created_at_min,queryParams.created_at_max)

    // Respond with data including returns
    res.json({
      
      totalSales,
    
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
  let startUTC, endUTC;
  if(startDate && endDate){// Parse start and end dates as
  startUTC = new Date(startDate).getTime();
  endUTC = new Date(endDate).getTime();
  }else{
    const now = new Date(); // Get the current date
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startUTC = firstDayOfMonth.getTime(); // Start of the month in milliseconds
    endUTC = now.getTime();// End of the month in milliseconds
  }

  const totalSales = orders.reduce((sum, order) => {
    const total_price = parseFloat(order.total_price) || 0;

    // Calculate total refund amount for the order
    const refundAmount = order.refunds.reduce((refundSum, refund) => {
      const refundDateUTC = new Date(refund.created_at).getTime();

      // Check if the refund date falls within the specified date range
      if (refundDateUTC >= startUTC && refundDateUTC <= endUTC) {
        const lineItemTotal = refund.refund_line_items.reduce((lineSum, lineItem) => {
          return lineSum + parseFloat(lineItem.subtotal_set.shop_money.amount || 0);
        }, 0);
        
        // Log the refund deduction
        console.log(`Refund of ${lineItemTotal} deducted for order ID: ${order.id} due to refund created on: ${refund.created_at}`);
        
        return refundSum + lineItemTotal;
      }
      
      // If the refund date is not in the date range, return the current sum
      return refundSum;
    }, 0);

    // Return the net sales for this order
    return sum + total_price - refundAmount;
  }, 0);

  return totalSales;
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

