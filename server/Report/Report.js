import { config } from "dotenv";
import Brand from "../models/Brands.js";
import moment from "moment-timezone";
import axios from "axios";
import logger from "../utils/logger.js";
import { GoogleAdsApi } from "google-ads-api";
import AdMetrics from "../models/AdMetrics.js";
import { ensureOrderRefundExists, setOrderRefund } from '../utils/refundHelpers.js';
import { 
  ORDERS_QUERY, 
  makeGraphQLRequest,
  convertGraphQLOrderToRESTFormat,
  calculateGrossSalesAndTaxes,
  calculateRefundAmount
} from './MonthlyReportGraphQL.js';




config();

export const fetchTotalSales = async (brandId) => {
  try {
    console.log('Fetching yesterday\'s orders using GraphQL...');
    const brand = await Brand.findById(brandId);
    if (!brand) throw new Error('Brand not found.');
    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) throw new Error('Access token is missing or invalid.');
    const shopName = brand.shopifyAccount?.shopName;
    if (!shopName) throw new Error('Shop name is missing or invalid.');
    
    // Ensure shopName doesn't have protocol
    const cleanShopName = shopName.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const apiVersion = '2024-04';
    
    // Get store timezone and data
    let shopData;
    try {
      const shopResponse = await axios.get(
        `https://${cleanShopName}/admin/api/${apiVersion}/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': access_token,
          },
          timeout: 30000,
        }
      );
      shopData = shopResponse.data.shop;
    } catch (error) {
      console.error('Error fetching shop data:', error);
      throw new Error(`Failed to connect to Shopify: ${error.message}`);
    }
    
    const storeTimezone = shopData.iana_timezone || 'UTC';
    
    // Calculate yesterday range in store's timezone
    const yesterday = moment.tz(storeTimezone).subtract(1, 'days');
    const startOfYesterday = yesterday.clone().startOf('day');
    const endOfYesterday = yesterday.clone().endOf('day');
    
    // Prepare sales map for yesterday
    const dateStr = yesterday.format('YYYY-MM-DD');
    const yesterdaySales = {
      date: dateStr,
      grossSales: 0,
      refundAmount: 0,
      orderCount: 0,
    };
    
    // Fetch orders using GraphQL with pagination
    let hasNextPage = true;
    let cursor = null;
    const seenOrderIds = new Set();
    
    while (hasNextPage) {
      const startTime = startOfYesterday.utc().toISOString();
      const endTime = endOfYesterday.clone().add(1, 'day').startOf('day').utc().toISOString();
      const queryString = `created_at:>=${startTime} AND created_at:<${endTime}`;
      
      const variables = {
        first: 50,
        after: cursor,
        query: queryString,
      };
      
      try {
        const data = await makeGraphQLRequest(cleanShopName, access_token, ORDERS_QUERY, variables);
        
        if (!data?.orders?.edges || data.orders.edges.length === 0) {
          break;
        }
        
        // Process orders
        for (const edge of data.orders.edges) {
          const graphQLOrder = edge.node;
          const orderId = Number.parseInt(graphQLOrder.legacyResourceId, 10);
          
          // Skip test orders
          if (graphQLOrder.test) {
            continue;
          }
          
          // Check for duplicates
          if (seenOrderIds.has(orderId)) {
            console.log(`⚠️  Duplicate order detected: ${orderId}. Skipping.`);
            continue;
          }
          seenOrderIds.add(orderId);
          
          // Convert GraphQL order to REST-like format
          const order = convertGraphQLOrderToRESTFormat(graphQLOrder);
          
          // Calculate gross sales and taxes
          const hasRefunds = order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0;
          const { grossSales } = calculateGrossSalesAndTaxes(order, hasRefunds);
          
          // Calculate refund amount
          const { refundAmount, refundCount } = calculateRefundAmount(order);
          
          // Update orderRefund table
          try {
            await ensureOrderRefundExists(brandId, order.id, order.created_at);
            if (refundAmount > 0) {
              await setOrderRefund(brandId, order.id, refundAmount, refundCount);
            }
          } catch (error) {
            console.error(`Error storing order refund info for order ${order.id}:`, error);
          }
          
          // Accumulate sales data
          yesterdaySales.grossSales += grossSales;
          yesterdaySales.refundAmount += refundAmount;
          yesterdaySales.orderCount++;
        }
        
        // Check pagination
        hasNextPage = data.orders.pageInfo.hasNextPage;
        cursor = data.orders.pageInfo.endCursor;
        
        // Rate limiting - wait between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Error fetching orders via GraphQL:', error);
        throw error;
      }
    }
    
    // Return array for compatibility
    return [{
      grossSales: yesterdaySales.grossSales,
      totalSales: yesterdaySales.grossSales - yesterdaySales.refundAmount,
      refundAmount: yesterdaySales.refundAmount,
      orderCount: yesterdaySales.orderCount,
      date: yesterdaySales.date,
    }];
  } catch (error) {
    console.error('Error in fetchTotalSales:', error);
    throw error;
  }
};

export const fetchFBAdReport = async (brandId) => {
  try {
    const brand = await Brand.findById(brandId).lean();
    if (!brand) {
      return {
        success: false,
        message: 'Brand not found.',
      };
    }

    const accessToken = brand.fbAccessToken;
    if (!accessToken) {
      return {
        success: false,
        message: 'No Facebook accesstoken found for this brand.',
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
      relative_url: `${accountId}/insights?fields=spend,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
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
            revenue: insight.action_values?.find((action) => action.action_type === 'purchase')?.value || '0',
          };
          return formattedResult;
        }
      } else {
        return {
          adAccountId: accountId,
          spend: '0',
          revenue: '0',
        };
      }
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
export const getGoogleAdData = async (brandId) => {
  try {
    const brand = await Brand.findById(brandId).lean();

    if (!brand) {
      return {
        success: false,
        message: 'Brand not found.',
      };
    }

    const refreshToken = brand.googleAdsRefreshToken;
    if (!refreshToken) {
      return {
        success: false,
        message: 'No Google refreshtoken found for this brand.',
        data: [],
      };
    }

    // Check if brand has Google Ad accounts
    if (!brand.googleAdAccount || brand.googleAdAccount.length === 0) {
      return {
        success: false,
        message: 'No Google Ads accounts found for this brand.',
        data: [],
      };
    }



    const startDate = moment().subtract(1, 'days').startOf('day').format('YYYY-MM-DD');
    const endDate = moment().subtract(1, 'days').endOf('day').format('YYYY-MM-DD');

    let totalSpendAll = 0;
    let totalConversionsValueAll = 0;
    let accountResults = [];

    // Process each client ID
    for (const adAccount of brand.googleAdAccount) {
      const adAccountId = adAccount.clientId;
      const managerId = adAccount.managerId;

      try {
        const customer = client.Customer({
          customer_id: adAccountId,
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
          accountName = row.customer?.descriptive_name || `Account ${adAccountId}`;
          const costMicros = row.metrics.cost_micros || 0;
          const spend = costMicros / 1_000_000;
          accountSpend += spend;
          accountConversionsValue += row.metrics.conversions_value || 0;
        }

        // Calculate metrics for this account
        const accountRoas = accountSpend > 0 ? (accountConversionsValue / accountSpend).toFixed(2) : "0";
        const accountSales = parseFloat(accountRoas) * accountSpend || 0;

        // Add this account's data to the total
        totalSpendAll += accountSpend;
        totalConversionsValueAll += accountConversionsValue;


        // Store individual account data
        accountResults.push({
          accountId: adAccountId,
          accountName,
          googleSpend: accountSpend.toFixed(2),
          googleRoas: accountRoas,
          googleSales: accountSales.toFixed(2),
        });
      } catch (error) {
        console.error(`Error fetching data for account ${adAccountId}:`, error);
        accountResults.push({
          accountId: adAccountId,
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


export const addReportData = async (brandId) => {
  try {
    const fbDataResult = await fetchFBAdReport(brandId);
    const fbData = fbDataResult.data ? fbDataResult.data : [];

    const googleDataResult = await getGoogleAdData(brandId);
    const googleData = googleDataResult.data ? googleDataResult.data : [];

    // Initialize totals
    let totalMetaSpend = 0;
    let totalMetaRevenue = 0;

    if (fbData.length > 0) {
      fbData.forEach(account => {
        totalMetaSpend += parseFloat(account.spend) || 0;
        totalMetaRevenue += parseFloat(account.revenue) || 0;
      });
    } else {
      totalMetaSpend = 0;
      totalMetaRevenue = 0;
    }

    // Fetch Shopify sales data
    const salesData = await fetchTotalSales(brandId);

    if (!salesData || salesData.length === 0) {
      throw new Error('No sales data returned from fetchTotalSales');
    }

    // Destructure the sales data - using direct array access since we expect one day of data
    const { totalSales, refundAmount } = salesData[0];

    // Calculate metrics
    const metaSpend = parseFloat(totalMetaSpend.toFixed(2));
    const metaRevenue = parseFloat(totalMetaRevenue.toFixed(2));
    const googleSpend = parseFloat(googleData.googleSpend) || 0;
    const googleROAS = parseFloat(googleData.googleRoas) || 0;
    const totalSpend = metaSpend + googleSpend;

    const googleSales = parseFloat(googleData.googleSales) || 0;
    const adSales = metaRevenue + googleSales; // Total sales from ads
    const grossROI = totalSpend > 0 ? adSales / totalSpend : 0;



    const metricsEntry = new AdMetrics({
      brandId,
      date: moment().subtract(1, "days").toDate(),
      metaSpend,
      metaRevenue,
      googleSpend,
      googleROAS,
      totalSales,
      refundAmount,
      totalSpend: totalSpend.toFixed(2),
      grossROI: grossROI.toFixed(2),
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
        const result = await addReportData(brandIdString);

        if (result.success) {
          logger.info(`Successfully processed brand ${brandIdString}`);
          return {
            brandId: brandIdString,
            status: 'success',
            message: result.message
          };
        } else {
          logger.warn(`Failed to process brand ${brandIdString}: ${result.message}`);
          return {
            brandId: brandIdString,
            status: 'failed',
            error: result.message
          };
        }

      } catch (error) {
        logger.error(`Error processing brand ${brandIdString}: ${error.message}`);
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
    return {
      success: false,
      error: error.message
    };
  }
};






