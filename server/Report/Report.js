import { config } from "dotenv";
import Brand from "../models/Brands.js";
import Shopify from 'shopify-api-node'
import moment from "moment";
import axios from "axios";
import Metrics from "../models/Metrics.js";
import logger from "../utils/logger.js";


config();

const getAccestoken = (brandId) => {
  switch (brandId) {
    case '671b68bed3c4f462d681ef45':
      return process.env.SHOPIFY_ACCESS_TOKEN_UDDSTUDIO;
    case '671b6925d3c4f462d681ef47':
      return process.env.SHOPIFY_ACCESS_TOKEN_FISHERMANHUB;
    case '671b7d85f99634509a5f2693':
      return process.env.SHOPIFY_ACCESS_TOKEN_REPRISE;
    case '671b90c83aee55a69981a0c9':
      return process.env.SHOPIFY_ACCESS_TOKEN_KOLORTHERAPI;
    case '671cd209fc16e7d6a19da1fd':
      return process.env.SHOPIFY_ACCESS_TOKEN_KASHMIRVILLA;
    case '671cc01d00989c5fdf2dcb11':
      return process.env.SHOPIFY_ACCESS_TOKEN_MAYINCLOTHING;
    case '671ccd765d652cf6efc21eda':
      return process.env.SHOPIFY_ACCESS_TOKEN_HOUSEOFAWADH;
    case '671cceb19b58dac9e4e23280':
      return process.env.SHOPIFY_ACCESS_TOKEN_FIBERWORLD;
    default:
      throw new Error('Invalid brand ID: No credentials path found');
  }
};

export const fetchTotalSales = async (brandId) => {
  try {
    console.log('Fetching orders...');

    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found.');
    }

    const access_token = getAccestoken(brandId);
    if (!access_token) {
      throw new Error('Access token is missing or invalid.');
    }

    const shopify = new Shopify({
      shopName: brand.shopifyAccount?.shopName,
      accessToken: access_token,
    });


    // const Yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const yesterdayIST = moment().subtract(1, 'days');

    // Calculate the start and end of yesterday in IST, converted to UTC
    const startOfYesterday = new Date(yesterdayIST.clone().startOf('day').subtract(5, 'hours').subtract(30, 'minutes')).toISOString();
    const endOfYesterday = new Date(yesterdayIST.clone().endOf('day').subtract(5, 'hours').subtract(30, 'minutes')).toISOString();
    
    console.log(startOfYesterday); // Expected output: 2024-10-29T18:30:00.000Z
    console.log(endOfYesterday);   // Expected output: 2024-10-30T18:29:59.999Z



    const queryParams = {
      status: 'any',
      created_at_min: startOfYesterday,
      created_at_max: endOfYesterday,
      limit: 250, // Fetch 250 orders per request
    };


    let hasNextPage = true;
    let pageInfo;
    let orders = [];

    while (hasNextPage) {
      if (pageInfo) {
        queryParams.page_info = pageInfo;
      } else {
        delete queryParams.page_info;
      }

      try {
        const response = await shopify.order.list(queryParams);
        if (!response || response.length === 0) {
          break; // Exit the loop if no orders are found
        }

        orders = orders.concat(response);
        pageInfo = response.nextPageParameters?.page_info || null;
        hasNextPage = !!pageInfo; // Continue fetching if there are more pages
      } catch (error) {
        console.error('Error while fetching orders:', error);
        throw new Error(`Error fetching orders: ${error.message}`);
      }
    }

    console.log(`Successfully fetched a total of ${orders.length} orders`);

    const totalSales = calculateTotalSales(orders, startOfYesterday, endOfYesterday);
    return totalSales; // Return only the total sales


    // const startDate = moment('2024-11-01').startOf('day');
    // const endDate = moment('2024-11-29').endOf('day');
    // const dailySales = [];
    // let currentDay = startDate.clone();
    // while (currentDay.isSameOrBefore(endDate)) {
    //   const startOfDay = new Date(currentDay.clone().startOf('day')).toISOString();
    //   const endOfDay = new Date(currentDay.clone().endOf('day')).toISOString();

    //   // console.log(startOfDay, endOfDay);

    //   const queryParams = {
    //     status: 'any',
    //     created_at_min: startOfDay,
    //     created_at_max: endOfDay,
    //     limit: 250, // Fetch 250 orders per request
    //   };

    //   let hasNextPage = true;
    //   let pageInfo;
    //   let orders = [];

    //   while (hasNextPage) {
    //     if (pageInfo) {
    //       queryParams.page_info = pageInfo;
    //     } else {
    //       delete queryParams.page_info;
    //     }

    //     try {
    //       const response = await shopify.order.list(queryParams);
    //       if (!response || response.length === 0) {
    //         break; // Exit the loop if no orders are found
    //       }

    //       orders = orders.concat(response);
    //       pageInfo = response.nextPageParameters?.page_info || null;
    //       hasNextPage = !!pageInfo; // Continue fetching if there are more pages
    //     } catch (error) {
    //       console.error('Error while fetching orders:', error);
    //       throw new Error(`Error fetching orders: ${error.message}`);
    //     }
    //   }

    //   // console.log(`Successfully fetched ${orders.length} orders for ${currentDay.format('YYYY-MM-DD')}`);

    //   const totalSalesForDay = calculateTotalSales(orders, startOfDay, endOfDay);
    //   dailySales.push({
    //     date: currentDay.format('YYYY-MM-DD'),
    //     totalSales: totalSalesForDay,
    //   });

    //   currentDay.add(1, 'day'); // Move to the next day
    // }
    // console.log(dailySales); //

    // return dailySales;

  } catch (error) {
    console.error('Error in fetchTotalSales:', error);
    throw new Error(`Failed to fetch total sales: ${error.message}`);
  }
};

function calculateTotalSales(orders, startDate, endDate) {
  let startUTC, endUTC;
  if (startDate && endDate) {// Parse start and end dates as
    startUTC = new Date(startDate).getTime();
    endUTC = new Date(endDate).getTime();
  } else {
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

export const fetchFBAdReport = async (brandId) => {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  try {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return {
        success: false,
        message: 'Brand not found.',
      };
    }

    const adAccountIds = brand.fbAdAccounts;
    if (!adAccountIds || adAccountIds.length === 0) {
      return {
        success: false,
        message: 'No Facebook Ads accounts found for this brand.',
        data: [],
      };
    }

    //Set start and end date to yesterday
    const startDate = moment().subtract(1, 'days').startOf('day').format('YYYY-MM-DD');
    const endDate = moment().subtract(1, 'days').endOf('day').format('YYYY-MM-DD');


    //Prepare batch requests
    const batchRequests = adAccountIds.map((accountId) => ({
      method: 'GET',
      relative_url: `${accountId}/insights?fields=spend,purchase_roas&time_range={'since':'${startDate}','until':'${endDate}'}`,
    }));

    const response = await axios.post(
      `https://graph.facebook.com/v21.0/`,
      { batch: batchRequests },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          access_token: accessToken,
        },
      }
    );


    const results = response.data.map((res, index) => {
      const accountId = adAccountIds[index];

      if (res.code === 200) {
        const result = JSON.parse(res.body);
        if (result.data && result.data.length > 0) {
          const insight = result.data[0]; // Get the first entry of insights
          const formattedResult = {
            adAccountId: accountId,
            spend: insight.spend || '0',
            purchase_roas: (insight.purchase_roas && insight.purchase_roas.length > 0)
              ? insight.purchase_roas.map(roas => ({
                action_type: roas.action_type || 'N/A', // Fallback for missing data
                value: roas.value || '0', // Fallback for missing data
              }))
              : [], // Return an empty array if no ROAS data
          };

          return formattedResult;
        }
      }

      // If no data or error occurred, return a message for that account
      return {
        adAccountId: accountId,
        message: `Ad Account ${accountId} has no data for the given date.`,
      };
    });


    const finalResponse = {
      success: true,
      data: results
    };
    return finalResponse;

    // const startDate = moment('2024-11-01').startOf('day');
    // const endDate = moment('2024-11-29').endOf('day');

    // const batchRequests = [];
    // const results = [];
    // const requestDates = []; // Array to store dates for each batch request

    // // Iterate through the date range in chunks of 8 days
    // let currentChunkStartDate = startDate.clone();
    // while (currentChunkStartDate.isBefore(endDate)) {
    //   const currentChunkEndDate = moment.min(currentChunkStartDate.clone().add(15, 'days'), endDate); // 8-day chunk

    //   // Iterate day by day within the 8-day chunk
    //   let currentDay = currentChunkStartDate.clone();
    //   while (currentDay.isSameOrBefore(currentChunkEndDate)) {
    //     // Prepare batch requests for each ad account for the current day
    //     adAccountIds.forEach((accountId) => {
    //       const requestUrl = `${accountId}/insights?fields=spend,purchase_roas&time_range={"since":"${currentDay.format('YYYY-MM-DD')}","until":"${currentDay.format('YYYY-MM-DD')}"}`;
    //       batchRequests.push({
    //         method: 'GET',
    //         relative_url: requestUrl,
    //       });
    //       requestDates.push({ accountId, date: currentDay.clone() }); // Store the date for each request
    //       // console.log(`Generated request for account ${accountId} on date ${currentDay.format('YYYY-MM-DD')}: ${requestUrl}`);
    //     });

    //     // Send the batch request if the limit is reached or if it's the last set of requests
    //     if (batchRequests.length >= 50 || currentDay.isSame(currentChunkEndDate)) {
    //       // console.log(`Sending batch request with ${batchRequests.length} requests...`);

    //       try {
    //         const response = await axios.post(
    //           `https://graph.facebook.com/v21.0/`,
    //           { batch: batchRequests },
    //           {
    //             headers: {
    //               'Content-Type': 'application/json',
    //             },
    //             params: {
    //               access_token: accessToken,
    //             },
    //           }
    //         );

    //         // console.log('Batch request response:', response.data);

    //         // Process the response
    //         response.data.forEach((res, index) => {
    //           const { accountId, date } = requestDates[index];
    //           if (res.code === 200) {
    //             const result = JSON.parse(res.body);
    //             // console.log(`Success response for account ${accountId} on ${date.format('YYYY-MM-DD')}:`, result);

    //             if (result.data && result.data.length > 0) {
    //               const insight = result.data[0];
    //               const formattedResult = {
    //                 adAccountId: accountId,
    //                 date: date.format('YYYY-MM-DD'),
    //                 spend: insight.spend || '0',
    //                 purchase_roas: (insight.purchase_roas && insight.purchase_roas.length > 0)
    //                   ? insight.purchase_roas.map(roas => ({
    //                     action_type: roas.action_type || 'N/A',
    //                     value: roas.value || '0',
    //                   }))
    //                   : [],
    //               };

    //               results.push(formattedResult);
    //             } else {
    //               results.push({
    //                 adAccountId: accountId,
    //                 date: date.format('YYYY-MM-DD'),
    //                 message: `No data for this date.`,
    //               });
    //             }
    //           } else {
    //             results.push({
    //               adAccountId: accountId,
    //               date: date.format('YYYY-MM-DD'),
    //               message: `Error fetching data: ${res.body}`,
    //             });
    //             console.log(`Error for account ${accountId} on ${date.format('YYYY-MM-DD')}: ${res.body}`);
    //           }
    //         });
    //       } catch (error) {
    //         console.error('Error during batch request:', error);
    //       } finally {
    //         batchRequests.length = 0;
    //         requestDates.length = 0; // Reset requestDates for the next round
    //       }
    //     }

    //     // Move to the next day within the chunk
    //     currentDay.add(1, 'days');
    //   }

    //   // Move to the next 8-day chunk
    //   currentChunkStartDate = currentChunkEndDate.clone().add(1, 'days');
    // }

    // // After the main loop completes, check for any remaining requests that need to be sent
    // if (batchRequests.length > 0) {
    //   // console.log(`Sending final batch request with ${batchRequests.length} requests...`);

    //   try {
    //     const response = await axios.post(
    //       `https://graph.facebook.com/v21.0/`,
    //       { batch: batchRequests },
    //       {
    //         headers: {
    //           'Content-Type': 'application/json',
    //         },
    //         params: {
    //           access_token: accessToken,
    //         },
    //       }
    //     );

    //     // console.log('Final batch request response:', response.data);

    //     // Process the response for the final batch
    //     response.data.forEach((res, index) => {
    //       const { accountId, date } = requestDates[index];

    //       if (res.code === 200) {
    //         const result = JSON.parse(res.body);
    //         console.log(`Success response for account ${accountId} on ${date.format('YYYY-MM-DD')}:`, result);

    //         if (result.data && result.data.length > 0) {
    //           const insight = result.data[0];
    //           const formattedResult = {
    //             adAccountId: accountId,
    //             date: date.format('YYYY-MM-DD'),
    //             spend: insight.spend || '0',
    //             purchase_roas: (insight.purchase_roas && insight.purchase_roas.length > 0)
    //               ? insight.purchase_roas.map(roas => ({
    //                 action_type: roas.action_type || 'N/A',
    //                 value: roas.value || '0',
    //               }))
    //               : [],
    //           };

    //           results.push(formattedResult);
    //         } else {
    //           results.push({
    //             adAccountId: accountId,
    //             date: date.format('YYYY-MM-DD'),
    //             message: `No data for this date.`,
    //           });
    //         }
    //       } else {
    //         results.push({
    //           adAccountId: accountId,
    //           date: date.format('YYYY-MM-DD'),
    //           message: `Error fetching data: ${res.body}`,
    //         });
    //         console.log(`Error for account ${accountId} on ${date.format('YYYY-MM-DD')}: ${res.body}`);
    //       }
    //     });
    //   } catch (error) {
    //     console.error('Error during final batch request:', error);
    //   }
    // }

    // const fbmetrics = {
    //   success: true,
    //   data: results,
    // };
    // console.log(fbmetrics);
  


  } catch (error) {
    console.error('Error fetching Facebook Ad Account data:', error);
    return {
      success: false,
      message: 'An error occurred while fetching Facebook Ad Account data.',
      error: error.message,
    };
  }
};


export const addReportData = async (brandId) => {
  try {

    const fbDataResult = await fetchFBAdReport(brandId);

    const fbData = fbDataResult.data;

    // Initialize totals
    let totalMetaSpend = 0;
    let totalMetaROAS = 0;

    if (fbData.length > 0) {
      fbData.forEach(account => {
        totalMetaSpend += parseFloat(account.spend) || 0;
        totalMetaROAS += account.purchase_roas
          ? account.purchase_roas.reduce((acc, roas) => acc + (parseFloat(roas.value) || 0), 0)
          : 0;
      });
    } else {
      // If no ad accounts, set values to zero
      totalMetaSpend = 0;
      totalMetaROAS = 0;
    }
    // Fetch Shopify sales data
    const shopifySales = await fetchTotalSales(brandId);
    console.log(shopifySales)

    // Calculate metrics
    const metaSpend = parseFloat(totalMetaSpend.toFixed(2));
    const metaROAS = parseFloat(totalMetaROAS.toFixed(2));
    const googleSpend = 0;
    const googleROAS = 0;
    const totalSpend = metaSpend + googleSpend;
    const metaSales = metaSpend * metaROAS;
    const googleSales = 0;
    const totalSales = metaSales + googleSales;
    const grossROI = totalSpend > 0 ? totalSales / totalSpend : 0;
    const netROI = totalSpend > 0 ? shopifySales / totalSpend : 0;

    // Create a new Metrics document
    const metricsEntry = new Metrics({
      brandId,
      date: moment().subtract(1, "days").toDate(),
      metaSpend,
      metaROAS,
      googleSpend,
      googleROAS,
      shopifySales,
      totalSpend: totalSpend.toFixed(2),
      grossROI: grossROI.toFixed(2),
      netROI: netROI.toFixed(2),
    });

    // Save the document
    await metricsEntry.save();

    console.log('Metrics entry saved:', metricsEntry);

    // Return success response
    return {
      success: true,
      message: 'Metrics saved successfully.',
      data: metricsEntry,
    };
  } catch (error) {
    console.error('Error calculating and saving metrics:', error);
    return {
      success: false,
      message: 'An error occurred while calculating and saving metrics.',
      error: error.message,
    };
  }
};


// export const addReportData = async (brandId) => {
//   try {
//     const fbDataResult = await fetchFBAdReport(brandId);
//     const fbData = fbDataResult.data;

//     // Fetch Shopify sales data for all relevant dates at once
//     const shopifySalesData = await fetchTotalSales(brandId); // Assume this returns an array of { date: 'YYYY-MM-DD', totalSales: number }

//     // Initialize an object to accumulate metrics by date
//     const metricsByDate = {};

//     // Create a map for easy lookup of Shopify sales by date
//     const shopifySalesMap = {};
//     shopifySalesData.forEach(sale => {
//       shopifySalesMap[sale.date] = sale.totalSales; // Map date to total sales
//     });

//     // Iterate over the fbData to accumulate metrics
//     fbData.forEach(account => {
//       const date = account.date;

//       // Initialize the metrics entry for the date if it doesn't exist
//       if (!metricsByDate[date]) {
//         metricsByDate[date] = {
//           totalMetaSpend: 0,
//           totalMetaROAS: 0,
//           shopifySales: 0, // Initialize shopify sales
//         };
//       }

//       // Accumulate the data for the current account
//       metricsByDate[date].totalMetaSpend += parseFloat(account.spend) || 0;
//       if (account.purchase_roas && account.purchase_roas.length > 0) {
//         metricsByDate[date].totalMetaROAS += account.purchase_roas.reduce(
//           (acc, roas) => acc + (parseFloat(roas.value) || 0),
//           0
//         );
//       }
//     });

//     // Now iterate over the accumulated metrics to save them
//     for (const date in metricsByDate) {
//       const { totalMetaSpend, totalMetaROAS } = metricsByDate[date];

//       // Fetch shopify sales for the current date
//       const shopifySales = shopifySalesMap[date] || 0; // Default to 0 if no sales for that date

//       // Calculate metrics for the current date
//       const metaSpend = parseFloat(totalMetaSpend.toFixed(2));
//       const metaROAS = parseFloat(totalMetaROAS.toFixed(2));
//       const googleSpend = 0; // Assuming no Google data for now
//       const googleROAS = 0; // Assuming no Google data for now
//       const totalSpend = metaSpend + googleSpend;
//       const metaSales = metaSpend * metaROAS;
//       const googleSales = 0; // Assuming no Google data for now
//       const totalSales = metaSales + googleSales;
//       const grossROI = totalSpend > 0 ? totalSales / totalSpend : 0;
//       const netROI = totalSpend > 0 ? shopifySales / totalSpend : 0;

//       // Create a new Metrics document for the current date
//       const metricsEntry = new Metrics({
//         brandId,
//         date: moment(date).toDate(), // Ensure date is in the correct format
//         metaSpend,
//         metaROAS,
//         googleSpend,
//         googleROAS,
//         shopifySales,
//         totalSpend: totalSpend.toFixed(2),
//         grossROI: grossROI.toFixed(2),
//         netROI: netROI.toFixed(2),
//       });

//       // Save the document
//       await metricsEntry.save();
//       console.log('Metrics entry saved for date', date, ':', metricsEntry);
//     }

//     // Return success response with metrics by date
//     return {
//       success: true,
//       message: 'Metrics saved successfully.',
//       data: metricsByDate,
//     };
//   } catch (error) {
//     console.error('Error calculating and saving metrics:', error);
//     return {
//       success: false,
//       message: 'An error occurred while calculating and saving metrics.',
//       error: error.message,
//     };
//   }
// }

export const calculateMetricsForAllBrands = async () => {
  try {
    const brands = await Brand.find({});
    logger.info(`Found ${brands.length} brands for metrics calculation.`);

    const metricsPromises = brands.map(async (brand) => {
      const brandIdString = brand._id.toString();
      logger.info(`Processing metrics for brand: ${brandIdString}`);
      
      try {
        const result = await addReportData(brandIdString);
        if (result.success) {
          logger.info(`Metrics successfully saved for brand ${brandIdString}`);
        } else {
          logger.error(`Failed to save metrics for brand ${brandIdString}: ${result.message}`);
        }
      } catch (error) {
        logger.error(`Error in addReportData for brand ${brandIdString}: ${error.message}`);
      }
    });

    await Promise.allSettled(metricsPromises); // Using Promise.allSettled to catch all results
    logger.info("Completed metrics calculation for all brands.");
  } catch (error) {
    logger.error('Error processing metrics for all brands:', error);
  }
};





