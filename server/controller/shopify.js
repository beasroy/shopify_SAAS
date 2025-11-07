
import Shopify from 'shopify-api-node'
import Brand from '../models/Brands.js';
import AdMetrics from '../models/AdMetrics.js';
import moment from 'moment-timezone';

export const calculateMonthlyAOV = async (brandId, startDate, endDate) => {
    try {
        if (!brandId || !startDate || !endDate) {
            throw new Error('Missing required parameters: brandId, startDate, and endDate are required');
        }

        // Validate date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            throw new Error('Invalid date format. Please use YYYY-MM-DD format');
        }

        console.log(`Calculating Monthly AOV (Fast) for brand ${brandId} from ${startDate} to ${endDate}`);

        // Get brand to access Shopify credentials
        const brand = await Brand.findById(brandId);
        if (!brand) {
            throw new Error('Brand not found.');
        }

        const access_token = brand.shopifyAccount?.shopifyAccessToken;
        if (!access_token) {
            throw new Error('Access token is missing or invalid.');
        }

        const shopName = brand.shopifyAccount?.shopName;
        if (!shopName) {
            throw new Error('Shop name is missing or invalid.');
        }

        const shopify = new Shopify({
            shopName: shopName,
            accessToken: access_token,
            apiVersion: '2024-04'
        });

        // Get store timezone
        let shopData;
        try {
            shopData = await shopify.shop.get();
        } catch (shopError) {
            if (shopError.statusCode === 404) {
                const shopifyFallback = new Shopify({
                    shopName: shopName,
                    accessToken: access_token,
                    apiVersion: '2024-01'
                });
                shopData = await shopifyFallback.shop.get();
            } else {
                throw shopError;
            }
        }

        const storeTimezone = shopData.iana_timezone || 'UTC';

        // Convert dates to moment objects
        const startMoment = moment.tz(startDate, storeTimezone).startOf('day');
        const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

        // Get today's date in store timezone
        const today = moment.tz(storeTimezone).startOf('day');
        const yesterday = today.clone().subtract(1, 'day').endOf('day');

        // Determine date range for AdMetrics (up to yesterday)
        const adMetricsEndDate = moment.min(yesterday, endMoment);
        
        // Fetch AdMetrics data for revenue (up to yesterday - already calculated and cached)
        const adMetrics = await AdMetrics.find({
            brandId,
            date: {
                $gte: startMoment.toDate(),
                $lte: adMetricsEndDate.toDate()
            }
        }).sort({ date: 1 });

        // Check if we need to fetch today's data from Shopify
        const needsTodayData = endMoment.isSameOrAfter(today);

        // Fetch order counts, today's sales, and item counts from Shopify
        const orderCountsByMonth = new Map();
        const todaySalesByMonth = new Map(); // For today's revenue if needed
        const totalItemsByMonth = new Map(); // Total items ordered per month
        let currentDate = startMoment.clone();

        // Process in chunks to avoid API limits
        const CHUNK_SIZE_DAYS = 30;
        
        while (currentDate.isSameOrBefore(endMoment)) {
            const chunkEnd = moment.min(currentDate.clone().add(CHUNK_SIZE_DAYS - 1, 'days'), endMoment);
            const startTime = currentDate.clone().startOf('day').tz(storeTimezone).utc().format();
            const endTime = chunkEnd.clone().endOf('day').tz(storeTimezone).utc().format();

            try {
                // Fetch orders with minimal fields - count and get today's sales
                let pageInfo = null;
                
                do {
                    const params = {
                        limit: 250,
                        // Fetch line_items for item count calculation, and total_price/refunds for today's sales
                        fields: needsTodayData && currentDate.isSameOrAfter(today, 'day') 
                            ? 'id,created_at,test,total_price,refunds,line_items' 
                            : 'id,created_at,test,line_items', // Include line_items for item counting
                        status: 'any'
                    };

                    if (pageInfo) {
                        params.page_info = pageInfo;
                    } else {
                        params.created_at_min = startTime;
                        params.created_at_max = endTime;
                    }

                    const orders = await shopify.order.list(params);
                    
                    if (!orders || orders.length === 0) break;

                    // Process orders
                    for (const order of orders) {
                        if (!order.test) {
                            const orderDate = moment.tz(order.created_at, storeTimezone);
                            const monthKey = orderDate.format('YYYY-MM');
                            
                            // Count orders
                            if (!orderCountsByMonth.has(monthKey)) {
                                orderCountsByMonth.set(monthKey, 0);
                            }
                            orderCountsByMonth.set(monthKey, orderCountsByMonth.get(monthKey) + 1);

                            // Calculate total items in this order
                            let orderItems = 0;
                            if (order.line_items && Array.isArray(order.line_items)) {
                                orderItems = order.line_items.reduce((sum, item) => {
                                    return sum + Number(item.quantity || 0);
                                }, 0);
                            }
                            
                            // Add to total items count for the month
                            if (!totalItemsByMonth.has(monthKey)) {
                                totalItemsByMonth.set(monthKey, 0);
                            }
                            totalItemsByMonth.set(monthKey, totalItemsByMonth.get(monthKey) + orderItems);

                            // Calculate today's sales if needed
                            if (needsTodayData && orderDate.isSameOrAfter(today, 'day')) {
                                let orderTotal = Number(order.total_price || 0);
                                
                                // Subtract refunds if any
                                if (order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0) {
                                    let refundAmount = 0;
                                    for (const refund of order.refunds) {
                                        if (refund.refund_line_items) {
                                            refundAmount += refund.refund_line_items.reduce((sum, item) => {
                                                return sum + Number(item.subtotal || 0) + Number(item.total_tax || 0);
                                            }, 0);
                                        }
                                        if (refund.order_adjustments) {
                                            refundAmount -= refund.order_adjustments.reduce((sum, adj) => {
                                                return sum + Number(adj.amount || 0);
                                            }, 0);
                                        }
                                    }
                                    orderTotal -= refundAmount;
                                }
                                
                                if (!todaySalesByMonth.has(monthKey)) {
                                    todaySalesByMonth.set(monthKey, 0);
                                }
                                todaySalesByMonth.set(monthKey, todaySalesByMonth.get(monthKey) + orderTotal);
                            }
                        }
                    }

                    // Parse pagination
                    const linkHeader = orders.headers?.link;
                    if (linkHeader) {
                        const match = linkHeader.match(/<[^>]*page_info=([^&>]*)[^>]*>; rel="next"/);
                        pageInfo = match ? match[1] : null;
                    } else {
                        pageInfo = null;
                    }

                    await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
                } while (pageInfo);

            } catch (error) {
                console.error(`Error fetching order data for chunk ${startTime} to ${endTime}:`, error.message);
                // Continue with next chunk
            }

            currentDate = chunkEnd.clone().add(1, 'day');
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting between chunks
        }

        // Group AdMetrics by month and aggregate revenue (up to yesterday)
        const monthlyData = new Map();

        adMetrics.forEach(metric => {
            const metricDate = moment.tz(metric.date, storeTimezone);
            const monthKey = metricDate.format('YYYY-MM');

            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, {
                    month: monthKey,
                    totalRevenue: 0,
                    orderCount: 0,
                    totalItems: 0
                });
            }

            const monthData = monthlyData.get(monthKey);
            // totalSales already has refunds deducted in AdMetrics
            monthData.totalRevenue += Number(metric.totalSales) || 0;
        });

        // Add today's sales data if needed (from Shopify)
        todaySalesByMonth.forEach((revenue, monthKey) => {
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, {
                    month: monthKey,
                    totalRevenue: 0,
                    orderCount: 0,
                    totalItems: 0
                });
            }
            monthlyData.get(monthKey).totalRevenue += revenue;
        });

        // Add order counts and total items from Shopify (includes today)
        orderCountsByMonth.forEach((count, monthKey) => {
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, {
                    month: monthKey,
                    totalRevenue: 0,
                    orderCount: 0,
                    totalItems: 0
                });
            }
            monthlyData.get(monthKey).orderCount = count;
        });

        // Add total items count from Shopify
        totalItemsByMonth.forEach((items, monthKey) => {
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, {
                    month: monthKey,
                    totalRevenue: 0,
                    orderCount: 0,
                    totalItems: 0
                });
            }
            monthlyData.get(monthKey).totalItems = items;
        });

        // Calculate AOV and Average Items Per Order for each month and format response
        const monthlyAOV = Array.from(monthlyData.entries())
            .map(([monthKey, monthData]) => {
                const { totalRevenue, orderCount, totalItems } = monthData;
                
                // Calculate AOV: Total Revenue ÷ Number of Orders
                const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
                
                // Calculate Average Items Per Order: Total Items ÷ Number of Orders
                const averageItemsPerOrder = orderCount > 0 ? totalItems / orderCount : 0;

                return {
                    month: monthKey,
                    monthName: moment(monthKey + '-01').format('MMM-YYYY'),
                    totalRevenue: Number(totalRevenue.toFixed(2)),
                    orderCount: orderCount,
                    totalItems: totalItems,
                    aov: Math.round(aov),
                    averageItemsPerOrder: Math.round(averageItemsPerOrder)
                };
            })
            .sort((a, b) => a.month.localeCompare(b.month));

        console.log(`✅ Calculated Monthly AOV (Fast) for ${monthlyAOV.length} month(s)`);

        return monthlyAOV;

    } catch (error) {
        console.error('❌ Error calculating Monthly AOV (Fast):', {
            error: error.message,
            stack: error.stack,
            brandId: brandId,
            startDate: startDate,
            endDate: endDate
        });
        throw new Error(`Failed to calculate Monthly AOV: ${error.message}`);
    }
};


export const getAov = async( req,res)=>{
  try {
    const { brandId } = req.params;
    const { startDate, endDate } = req.body;

    const aov = await calculateMonthlyAOV(brandId, startDate, endDate);
    res.status(200).json({ success: true, data: aov });
  } catch (error) {
    console.error('Error fetching AOV:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get total revenue for D2C calculator
export const getTotalRevenue = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { startDate, endDate } = req.body;

    if (!brandId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: brandId, startDate, and endDate are required' 
      });
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date format. Please use YYYY-MM-DD format' 
      });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found.' });
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access token is missing or invalid.' 
      });
    }

    const shopName = brand.shopifyAccount?.shopName;
    if (!shopName) {
      return res.status(403).json({ 
        success: false, 
        error: 'Shop name is missing or invalid.' 
      });
    }

    const shopify = new Shopify({
      shopName: shopName,
      accessToken: access_token,
      apiVersion: '2024-04'
    });

    // Get store timezone
    let shopData;
    try {
      shopData = await shopify.shop.get();
    } catch (shopError) {
      if (shopError.statusCode === 404) {
        const shopifyFallback = new Shopify({
          shopName: shopName,
          accessToken: access_token,
          apiVersion: '2024-01'
        });
        shopData = await shopifyFallback.shop.get();
      } else {
        throw shopError;
      }
    }

    const storeTimezone = shopData.iana_timezone || 'UTC';
    const startMoment = moment.tz(startDate, storeTimezone).startOf('day');
    const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

    // Fetch AdMetrics data for revenue (up to yesterday - already calculated and cached)
    const today = moment.tz(storeTimezone).startOf('day');
    const yesterday = today.clone().subtract(1, 'day').endOf('day');
    const adMetricsEndDate = moment.min(yesterday, endMoment);
    
    const adMetrics = await AdMetrics.find({
      brandId,
      date: {
        $gte: startMoment.toDate(),
        $lte: adMetricsEndDate.toDate()
      }
    }).sort({ date: 1 });

    // Calculate total revenue from AdMetrics (up to yesterday)
    let totalRevenue = 0;
    adMetrics.forEach(metric => {
      // totalSales already has refunds deducted in AdMetrics
      totalRevenue += Number(metric.totalSales) || 0;
    });

    // If end date includes today, fetch today's sales from Shopify
    if (endMoment.isSameOrAfter(today)) {
      const startTime = today.clone().startOf('day').tz(storeTimezone).utc().format();
      const endTime = endMoment.clone().endOf('day').tz(storeTimezone).utc().format();

      let pageInfo = null;
      do {
        const params = {
          limit: 250,
          fields: 'id,created_at,test,total_price,refunds',
          status: 'any',
          created_at_min: startTime,
          created_at_max: endTime
        };

        if (pageInfo) {
          params.page_info = pageInfo;
          delete params.created_at_min;
          delete params.created_at_max;
        }

        const orders = await shopify.order.list(params);
        
        if (!orders || orders.length === 0) break;

        // Process orders
        for (const order of orders) {
          if (!order.test) {
            let orderTotal = Number(order.total_price || 0);
            
            // Subtract refunds if any
            if (order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0) {
              let refundAmount = 0;
              for (const refund of order.refunds) {
                if (refund.refund_line_items) {
                  refundAmount += refund.refund_line_items.reduce((sum, item) => {
                    return sum + Number(item.subtotal || 0) + Number(item.total_tax || 0);
                  }, 0);
                }
                if (refund.order_adjustments) {
                  refundAmount -= refund.order_adjustments.reduce((sum, adj) => {
                    return sum + Number(adj.amount || 0);
                  }, 0);
                }
              }
              orderTotal -= refundAmount;
            }
            
            totalRevenue += orderTotal;
          }
        }

        // Parse pagination
        const linkHeader = orders.headers?.link;
        if (linkHeader) {
          const match = linkHeader.match(/<[^>]*page_info=([^&>]*)[^>]*>; rel="next"/);
          pageInfo = match ? match[1] : null;
        } else {
          pageInfo = null;
        }

        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
      } while (pageInfo);
    }

    res.status(200).json({ 
      success: true, 
      data: { 
        totalRevenue: Number(totalRevenue.toFixed(2)),
        currency: shopData.currency || 'USD'
      } 
    });
  } catch (error) {
    console.error('Error fetching total revenue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}




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



