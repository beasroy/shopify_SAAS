// import { config } from 'dotenv';
// import Shopify from 'shopify-api-node'
// import Brand from '../models/Brands.js';
// import moment from 'moment-timezone';

// config();





// export const getReturningCustomerRates = async (req, res) => {
//   try {
//     const { brandId } = req.params;
//     const { startDate, endDate } = req.body;

//     const brand = await Brand.findById(brandId);
//     if (!brand) {
//       return res.status(404).json({ success: false, message: 'Brand not found.' });
//     }

//     const access_token = brand.shopifyAccount?.shopifyAccessToken;
//     if (!access_token) {
//       return res.status(403).json({ success: false, message: 'Access token is missing or invalid.' });
//     }

//     const shopify = new Shopify({
//       shopName: brand.shopifyAccount?.shopName,
//       accessToken: access_token
//     });

//     const shopData = await shopify.shop.get();
//     const storeTimezone = shopData.iana_timezone || 'UTC';

//     let startDateTime, endDateTime;
//     if (startDate && endDate) {
//       startDateTime = moment.tz(startDate, storeTimezone).startOf('day');
//       endDateTime = moment.tz(endDate, storeTimezone).endOf('day');
//     } else {
//       const now = moment().tz(storeTimezone);
//       startDateTime = moment(now).startOf('month');
//       endDateTime = moment(now).endOf('month');
//     }

//     const   CHUNK_SIZE_DAYS = 31; 
//     let allOrders = [];
//     let currentStart = startDateTime.clone();
//     const finalEnd = endDateTime.clone();
    
//     while (currentStart.isSameOrBefore(finalEnd)) {
//       const chunkEnd = moment.min(currentStart.clone().add(CHUNK_SIZE_DAYS - 1, 'days'), finalEnd);
//       const startTime = currentStart.startOf('day').toISOString();
//       const endTime = chunkEnd.endOf('day').toISOString();

//       console.log(`Fetching orders from ${currentStart.format('YYYY-MM-DD')} to ${chunkEnd.format('YYYY-MM-DD')}`);
      
//       let pageInfo = null;
//       let chunkOrders = [];

//       do {
//         try {
//           let params = {
//             status: 'any',
//             limit: 250,
//             fields: 'id,customer,created_at,test',
//             created_at_min: startTime,
//             created_at_max: endTime
//           };

//           if (pageInfo) {
//             params.page_info = pageInfo;
//             delete params.created_at_min;
//             delete params.created_at_max;
//           }

//           const orders = await shopify.order.list(params);

//           if (!orders || orders.length === 0) {
//             pageInfo = null;
//             break;
//           }

//           chunkOrders = chunkOrders.concat(orders);

//           if (orders.length === 250) {
//             pageInfo = Buffer.from(orders[orders.length - 1].id.toString()).toString('base64');
//             await new Promise(resolve => setTimeout(resolve, 300));
//           } else {
//             pageInfo = null;
//           }

//         } catch (error) {
//           if (error.statusCode === 429) {
//             console.log('  Rate limited, waiting 2 seconds...');
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             continue;
//           } else if (error.statusCode === 400) {
//             console.error(`  Error fetching chunk (${currentStart.format('YYYY-MM-DD')} to ${chunkEnd.format('YYYY-MM-DD')}):`, error.message);
//             break;
//           } else {
//             throw error;
//           }
//         }

//       } while (pageInfo);
      
//       allOrders = allOrders.concat(chunkOrders);
//       console.log(`  Fetched ${chunkOrders.length} orders for this chunk`);
      
//       currentStart = chunkEnd.clone().add(1, 'day');
//       await new Promise(resolve => setTimeout(resolve, 500));
//     }
    
//     console.log(`Successfully fetched a total of ${allOrders.length} orders`);

//     // Get unique customers who ordered in the date range
//     const validOrders = allOrders.filter(order => !order.test && order.customer);
//     const customerIdsInRange = [...new Set(validOrders.map(order => order.customer.id))];
    
//     console.log(`Found ${customerIdsInRange.length} unique customers in the date range`);

//     // Create a map of customer IDs to their creation dates from the orders
//     const customerCreationDates = new Map();
    
//     validOrders.forEach(order => {
//       const customerId = order.customer.id;
//       if (order.customer && order.customer.created_at) {
//         // Store the earliest creation date for each customer
//         if (!customerCreationDates.has(customerId)) {
//           customerCreationDates.set(customerId, order.customer.created_at);
//         }
//       }
//     });

//     // Now categorize customers based on their creation date
//     let returningCustomers = 0;

//     customerIdsInRange.forEach(customerId => {
//       const customerCreatedAt = customerCreationDates.get(customerId);
      
//       if (customerCreatedAt) {
//         const createdAtMoment = moment.tz(customerCreatedAt, storeTimezone);
        
//         // If customer was created before the date range, they're returning
//         if (createdAtMoment.isBefore(startDateTime)) {
//           returningCustomers++;
//         } 
//       } 
//     });

//     const totalCustomers = customerIdsInRange.length;

//     console.log(`Total customers: ${totalCustomers}`);
//     console.log(`Returning customers (created before date range): ${returningCustomers}`);


//     res.json({
//       success: true,
//       data: {
//         totalCustomers,
//         returningCustomers,
//         returningCustomerRate: totalCustomers > 0
//           ? parseFloat(((returningCustomers / totalCustomers) * 100).toFixed(2))
//           : 0,
  
//       },
//       periodInfo: {
//         startDate: startDateTime.format('YYYY-MM-DD'),
//         endDate: endDateTime.format('YYYY-MM-DD'),
//         timezone: storeTimezone
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching returning customer rates:', error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };



