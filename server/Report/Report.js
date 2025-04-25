import { config } from "dotenv";
import Brand from "../models/Brands.js";
import Shopify from 'shopify-api-node'
import moment from "moment-timezone";
import axios from "axios";
import logger from "../utils/logger.js";
import { GoogleAdsApi } from "google-ads-api";
import AdMetrics from "../models/AdMetrics.js";
import User from "../models/User.js";



config();


export const fetchTotalSales = async (brandId) => {
  try {
      console.log('Fetching yesterday\'s orders...');

      const brand = await Brand.findById(brandId);
      if (!brand) {
          throw new Error('Brand not found.');
      }

      const access_token = brand.shopifyAccount?.shopifyAccessToken;
      if (!access_token) {
          throw new Error('Access token is missing or invalid.');
      }

      const shopify = new Shopify({
          shopName: brand.shopifyAccount?.shopName,
          accessToken: access_token,
          apiVersion: '2023-07' // Added API version to match the monthly function
      });

      // Get store timezone from Shopify shop data
      const shopData = await shopify.shop.get();
      const storeTimezone = shopData.iana_timezone || 'UTC';
      console.log('Store timezone:', storeTimezone);

      // Calculate yesterday's start and end in store's timezone
      const yesterday = moment.tz(storeTimezone).subtract(1, 'days');
      const startOfYesterday = yesterday.clone().startOf('day').toISOString();
      const endOfYesterday = yesterday.clone().endOf('day').toISOString();

      console.log('Fetching data for:', {
          startOfYesterday,
          endOfYesterday,
          storeTimezone
      });

      // Initialize yesterday's data structure
      const yesterdaySales = {
          date: yesterday.format('YYYY-MM-DD'),
          grossSales: 0,
          totalPrice: 0,
          refundAmount: 0,
          discountAmount: 0,
          orderCount: 0,
          cancelledOrderCount: 0
      };

      // Function to calculate refund amount (matching the monthly function)
      const calculateRefundAmount = (refund) => {
          if (!refund) return 0;
          
          const lineItemAmount = refund.refund_line_items?.reduce((sum, item) => {
              return sum + Number(item.subtotal_set?.shop_money?.amount || 0);
          }, 0) || 0;

          const transactionAmount = refund.transactions?.reduce((sum, trans) => {
              return sum + Number(trans.amount || 0);
          }, 0) || 0;

          return Math.max(lineItemAmount, transactionAmount);
      };

      // Process orders using a similar chunking approach as monthly function
      const processOrdersForTimeRange = async (startTime, endTime) => {
          let pageInfo = null;
          let retryCount = 0;
          const MAX_RETRIES = 3;
          const RETRY_DELAY = 5000;

          do {
              try {
                  // Add mandatory delay between requests
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  const params = {
                      status: 'any',
                      created_at_min: startTime,
                      created_at_max: endTime,
                      limit: 150, // Reduced limit for better stability
        
                  };

                  if (pageInfo) {
                      params.page_info = pageInfo;
                  }

                  const response = await shopify.order.list(params);
                  
                  if (!response || !Array.isArray(response)) {
                      console.warn('Unexpected response format:', response);
                      break;
                  }

                  // Process orders immediately
                  for (const order of response) {
                      const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
                      const isCancelled = (order.cancelled_at || order.cancel_reason) && order.test === true;
                      // Only process orders from yesterday
                      if (orderDate === yesterday.format('YYYY-MM-DD')) {

                        if (isCancelled) {
                          // Only increment cancelled order count, don't add to sales metrics
                          if (yesterdaySales) {
                            yesterdaySales.cancelledOrderCount += 1;
                          }
                      } else {
                          const totalPrice = Number(order.total_price || 0);
                          const discountAmount = Number(order.total_discounts || 0);
                          
                          // Calculate true gross sales from line items (before discounts)
                          let lineItemTotal = 0;
                          if (order.line_items && Array.isArray(order.line_items)) {
                              for (const item of order.line_items) {
                                  // Calculate pre-discount price: price × quantity
                                  const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
                                  lineItemTotal += itemTotal;
                              }
                          }
                          
                          // Fallback to subtotal_price + discounts if line items calculation is not available
                          const grossSales = lineItemTotal > 0 ? 
                              lineItemTotal : 
                              (Number(order.subtotal_price || 0) + discountAmount);
                          
                          yesterdaySales.grossSales += grossSales;
                          yesterdaySales.totalPrice += totalPrice;
                          yesterdaySales.discountAmount += discountAmount;
                          yesterdaySales.orderCount += 1;
                      }

                      // Process refunds
                      if (order.refunds?.length > 0) {
                          for (const refund of order.refunds) {
                              const refundDate = moment.tz(refund.created_at, storeTimezone).format('YYYY-MM-DD');
                              
                              // Only process refunds from yesterday
                              if (refundDate === yesterday.format('YYYY-MM-DD')) {
                                  const refundAmount = calculateRefundAmount(refund);
                                  yesterdaySales.refundAmount += refundAmount;
                              }
                          }
                       } }
                  }

                  console.log(`Processed ${response.length} orders`);

                  // Extract pagination info from headers
                  const linkHeader = response.headers?.link;
                  if (linkHeader) {
                      const nextLink = linkHeader.split(',').find(link => link.includes('rel="next"'));
                      pageInfo = nextLink ? nextLink.match(/page_info=([^&>]*)/)?.[1] : null;
                  } else {
                      pageInfo = null;
                  }

                  retryCount = 0; // Reset retry count on successful request

              } catch (error) {
                  console.error('Error fetching orders:', error);

                  if (error.statusCode === 429) {
                      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                      continue;
                  }

                  if (error.statusCode === 400 && pageInfo) {
                      console.log('Bad request with page_info, restarting chunk');
                      pageInfo = null;
                      retryCount++;
                      
                      if (retryCount >= MAX_RETRIES) {
                          console.error('Max retries reached for time range');
                          break;
                      }
                      
                      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                      continue;
                  }

                  throw error;
              }
          } while (pageInfo);
      };

      // Split day into 4 chunks as in the monthly function
      const timeChunks = Array.from({ length: 4 }, (_, i) => ({
          start: yesterday.clone().startOf('day').add(i * 6, 'hours').toISOString(),
          end: yesterday.clone().startOf('day').add((i + 1) * 6, 'hours').toISOString()
      }));

      for (const chunk of timeChunks) {
          await processOrdersForTimeRange(chunk.start, chunk.end);
      }

      // Calculate final amounts using the same formulas as in monthlyFetchTotalSales
      const dailySales = [{
          date: yesterdaySales.date,
          // Net product sales (excluding shipping, taxes, etc.)
          shopifySales: Number((yesterdaySales.grossSales - yesterdaySales.discountAmount).toFixed(2)),
          // Total customer payments including all charges, minus refunds
          totalSales: Number((yesterdaySales.totalPrice - yesterdaySales.refundAmount).toFixed(2)),
          refundAmount: Number(yesterdaySales.refundAmount.toFixed(2)),
          discountAmount: Number(yesterdaySales.discountAmount.toFixed(2)),
          orderCount: yesterdaySales.orderCount
      }];

      console.log('Yesterday\'s sales summary:', dailySales[0]);
      return dailySales;

  } catch (error) {
      console.error('Error in fetchTotalSales:', error);
      throw new Error(`Failed to fetch total sales: ${error.message}`);
  }
};

export const fetchFBAdReport = async (brandId, userId) => {
  try {
    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ])
    if (!brand || !user) {
      return {
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.',
      };
    }

    const accessToken = user.fbAccessToken;
    if (!accessToken) {
      return {
        success: false,
        message: 'No Facebook accesstoken found for this User.',
        data: [],
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

  } catch (error) {
    console.error('Error fetching Facebook Ad Account data:', error);
    return {
      success: false,
      message: 'An error occurred while fetching Facebook Ad Account data.',
      error: error.message,
    };
  }
};


const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
});
export const getGoogleAdData = async (brandId, userId) => {
  try {
    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean()
    ]);

    if (!brand || !user) {
      return {
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.',
      };
    }

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      return {
        success: false,
        message: 'No Google refreshtoken found for this User.',
        data: [],
      };
    }

    // Check if brand has Google Ad accounts
    if (!brand.googleAdAccount || !brand.googleAdAccount.clientId || brand.googleAdAccount.clientId.length === 0) {
      return {
        success: false,
        message: 'No Google Ads accounts found for this brand.',
        data: [],
      };
    }

    const clientIds = brand.googleAdAccount.clientId;
    const managerId = brand.googleAdAccount.managerId;
    
    const startDate = moment().subtract(1, 'days').startOf('day').format('YYYY-MM-DD');
    const endDate = moment().subtract(1, 'days').endOf('day').format('YYYY-MM-DD');

    let totalSpendAll = 0;
    let totalConversionsValueAll = 0;
    let accountResults = [];

    // Process each client ID
    for (const clientId of clientIds) {
      try {
        const customer = client.Customer({
          customer_id: clientId,
          refresh_token: refreshToken,
          login_customer_id: managerId,
        });

        // Fetch the report for this account
        const adsReport = await customer.report({
          entity: "customer",
          attributes: ["customer.descriptive_name"],
          metrics: [
            "metrics.cost_micros",
            "metrics.conversions_value",
          ],
          from_date: startDate,
          to_date: endDate,
        });

        let accountSpend = 0;
        let accountConversionsValue = 0;
        let accountName = "";

        // Process each row of the report
        for (const row of adsReport) {
          accountName = row.customer?.descriptive_name || `Account ${clientId}`;
          const costMicros = row.metrics.cost_micros || 0;
          const spend = costMicros / 1_000_000;
          accountSpend += spend;
          accountConversionsValue += row.metrics.conversions_value || 0;
        }

        // Calculate metrics for this account
        const accountRoas = accountSpend > 0 ? (accountConversionsValueAll / accountSpend).toFixed(2) : "0";
        const accountSales = parseFloat(accountRoas) * accountSpend || 0;

        // Add this account's data to the total
        totalSpendAll += accountSpend;
        totalConversionsValueAll += accountConversionsValue;

        // Store individual account data
        accountResults.push({
          accountId: clientId,
          accountName,
          googleSpend: accountSpend.toFixed(2),
          googleRoas: accountRoas,
          googleSales: accountSales.toFixed(2),
        });
      } catch (error) {
        console.error(`Error fetching data for account ${clientId}:`, error);
        accountResults.push({
          accountId: clientId,
          error: error.message || 'Failed to fetch data',
        });
      }
    }

    // Calculate aggregated metrics across all accounts
    const consolidatedRoas = totalSpendAll > 0 ? (totalConversionsValueAll / totalSpendAll).toFixed(2) : "0";
    const consolidatedSales = parseFloat(consolidatedRoas) * totalSpendAll || 0;

    const result = {
      // Consolidated results
      googleSpend: totalSpendAll.toFixed(2),
      googleRoas: consolidatedRoas,
      googleSales: consolidatedSales.toFixed(2),
      // Individual account results
      accounts: accountResults,
      // Date range for reference
      dateRange: {
        startDate,
        endDate
      }
    };

    console.log('Google Ad Data:', result, startDate, endDate);
    return {
      success: true,
      data: result,
    };
  } catch (e) {
    console.error('Error getting Google Ad data:', e);
    return {
      success: false,
      message: 'An error occurred while fetching Google Ad data.',
    };
  }
};


export const addReportData = async (brandId, userId) => {
  try {
    const fbDataResult = await fetchFBAdReport(brandId, userId);
    const fbData = fbDataResult.data ? fbDataResult.data  : [];

    const googleDataResult = await getGoogleAdData(brandId, userId);
    const googleData = googleDataResult.data? googleDataResult.data : [];

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
      totalMetaSpend = 0;
      totalMetaROAS = 0;
    }

    // Fetch Shopify sales data
    const salesData = await fetchTotalSales(brandId);
    
    if (!salesData || salesData.length === 0) {
      throw new Error('No sales data returned from fetchTotalSales');
    }

    // Destructure the sales data - using direct array access since we expect one day of data
    const { totalSales, refundAmount, shopifySales } = salesData[0];

    // Calculate metrics
    const metaSpend = parseFloat(totalMetaSpend.toFixed(2));
    const metaROAS = parseFloat(totalMetaROAS.toFixed(2));
    const googleSpend= parseFloat(googleData.googleSpend) || 0;
    const googleROAS = parseFloat(googleData.googleRoas) || 0;
    const totalSpend = metaSpend + googleSpend;
    const metaSales = metaSpend * metaROAS;
    const googleSales = parseFloat(googleData.googleSales) || 0;
    const adSales = metaSales + googleSales; // Total sales from ads
    const grossROI = totalSpend > 0 ? adSales / totalSpend : 0;
    const netROI = totalSpend > 0 ? shopifySales / totalSpend : 0;
    

    const metricsEntry =new AdMetrics ({
      brandId,
      date: moment().subtract(1, "days").toDate(),
      metaSpend,
      metaROAS,
      googleSpend,
      googleROAS,
      totalSales,
      refundAmount,
      shopifySales,
      totalSpend: totalSpend.toFixed(2),
      grossROI: grossROI.toFixed(2),
      netROI: netROI.toFixed(2),
    });

    // Save the document
    await metricsEntry.save();

    console.log('Metrics entry saved:', metricsEntry);
  
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



export const calculateMetricsForAllBrands = async () => {
  try {
    const brands = await Brand.find({});
    logger.info(`Found ${brands.length} brands for metrics calculation.`);

    const metricsPromises = brands.map(async (brand) => {
      const brandIdString = brand._id.toString();
      logger.info(`\n=== Processing brand: ${brandIdString} ===`);
      
      try {
        // Debug: Log the exact query we're about to make
        logger.info('Searching for user with brand ID (string):', brandIdString);
        // Get all users and manually check brands
        const allUsers = await User.find({});
        logger.info('Total users in database:', allUsers.length);
        
        const usersWithBrand = allUsers.filter(user => 
          user.brands && user.brands.includes(brandIdString)
        );
        logger.info('Users with matching brand (manual check):', usersWithBrand.length);
        
        if (usersWithBrand.length > 0) {
          logger.info('Found matching users brands arrays:');
          usersWithBrand.forEach(user => {
            logger.info(`User ${user._id}: ${JSON.stringify(user.brands)}`);
          });
        }

        if (usersWithBrand.length === 0) {
          logger.warn(`No user found for brand ${brandIdString}`);
          return {
            brandId: brandIdString,
            status: 'failed',
            error: 'No user with access found'
          };
        }

        // Try each user until one succeeds
        let lastError = null;
        for (const userWithAccess of usersWithBrand) {
          try {
            const userId = userWithAccess._id.toString();
            logger.info(`Attempting with user ${userId} for brand ${brandIdString}`);

            const result = await addReportData(brandIdString, userId);
            
            if (result.success) {
              logger.info(`Successfully processed brand ${brandIdString} with user ${userId}`);
              return {
                brandId: brandIdString,
                status: 'success',
                userId
              };
            }

            // If this user failed, store error and continue to next user
            lastError = result.message;
            logger.warn(`Failed with user ${userId}, trying next user if available. Error: ${result.message}`);

          } catch (error) {
            lastError = error.message;
            logger.warn(`Error with user ${userWithAccess._id}: ${error.message}`);
            continue;
          }
        }

        // If we get here, all users failed
        logger.error(`All users failed for brand ${brandIdString}. Last error: ${lastError}`);
        return {
          brandId: brandIdString,
          status: 'failed',
          error: `All available users failed. Last error: ${lastError}`,
          attemptedUsers: usersWithBrand.length
        };

      } catch (error) {
        logger.error(`Error processing brand ${brandIdString}: ${error.message}`);
        logger.error('Full error:', error);
        return {
          brandId: brandIdString,
          status: 'error',
          error: error.message
        };
      }
    });

    const settledResults = await Promise.allSettled(metricsPromises);
    
    const summary = settledResults.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        const value = result.value;
        acc[value.status] = (acc[value.status] || 0) + 1;
      } else {
        acc.rejected = (acc.rejected || 0) + 1;
      }
      return acc;
    }, {});

    logger.info("Metrics calculation summary:", summary);

    return {
      success: true,
      summary,
      details: settledResults
    };

  } catch (error) {
    logger.error('Error processing metrics for all brands:', error);
    logger.error('Full error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};







