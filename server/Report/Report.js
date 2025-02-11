import { config } from "dotenv";
import Brand from "../models/Brands.js";
import Shopify from 'shopify-api-node'
import moment from "moment";
import axios from "axios";
import logger from "../utils/logger.js";
import { GoogleAdsApi } from "google-ads-api";
import AdMetrics from "../models/AdMetrics.js";
import User from "../models/User.js";
import mongoose from "mongoose";


config();


export const fetchTotalSales = async (brandId) => {
  try {
    console.log('Fetching orders...');

    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found.');
    }

    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) {
      return res.status(403).json({ success: false, message: 'Access token is missing or invalid.' });
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

    const dailySales = [];

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
    const { totalSales, refundAmount, shopifySales } = calculateTotalSales(orders, startOfYesterday, endOfYesterday);
    dailySales.push({
        totalSales,
        refundAmount,
        shopifySales
    });
    console.log(dailySales);
    return dailySales; 

  } catch (error) {
    console.error('Error in fetchTotalSales:', error);
    throw new Error(`Failed to fetch total sales: ${error.message}`);
  }
};

function calculateTotalSales(orders, startDate, endDate) {
  let startUTC, endUTC;
  if (startDate && endDate) {
      startUTC = new Date(startDate).getTime();
      endUTC = new Date(endDate).getTime();
  }

  let totalRefunds = 0;
  let grossSales = 0;

  orders.forEach((order) => {
      const orderDate = new Date(order.created_at).getTime();
      if (orderDate >= startUTC && orderDate <= endUTC) {
          const totalPrice = Number(order.total_price || 0);
          grossSales += totalPrice;
          const orderRefunds = order.refunds.reduce((refundSum, refund) => {
              const refundDateUTC = new Date(refund.created_at).getTime();

              if (refundDateUTC >= startUTC && refundDateUTC <= endUTC) {
                  const lineItemRefunds = refund.refund_line_items.reduce((lineSum, lineItem) => {
                      return lineSum + Number(lineItem.subtotal_set.shop_money.amount || 0);
                  }, 0);

                  return refundSum + lineItemRefunds;
              }
              return refundSum;
          }, 0);

          totalRefunds += orderRefunds;
      }
  });

  return {
      totalSales: grossSales,
      refundAmount: totalRefunds,
      shopifySales: grossSales - totalRefunds
  };
}

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
    ])
    if (!brand || !user) {
      return {
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.',
      };
    }

    const adAccountId = brand.googleAdAccount;
    if (!adAccountId) {
      return {
        success: false,
        message: 'No Google Ads accounts found for this brand.',
        data: [],
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

    const startDate = moment().subtract(1, 'days').startOf('day').format('YYYY-MM-DD');
    const endDate = moment().subtract(1, 'days').endOf('day').format('YYYY-MM-DD');

    const customer = client.Customer({
      customer_id: adAccountId,
      refresh_token: refreshToken,
      login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
    });

    // Fetch the ad-level report using the ad_group_ad entity
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

    let totalSpend = 0;
    let totalConversionsValue = 0;

    // Process each row of the report
    for (const row of adsReport) {
      const costMicros = row.metrics.cost_micros || 0;
      const spend = costMicros / 1_000_000;
      totalSpend += spend;
      totalConversionsValue += row.metrics.conversions_value || 0;
    }

    // Calculate aggregated metrics
    const googleRoas = totalSpend > 0 ? (totalConversionsValue / totalSpend).toFixed(2) : 0;
    const totalSales = googleRoas * totalSpend || 0;

    const result = {
      googleSpend: totalSpend.toFixed(2),
      googleRoas,
      googleSales: totalSales.toFixed(2),
    }

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
    const fbData = fbDataResult.data;

    const googleDataResult = await getGoogleAdData(brandId, userId);
    const googleData = googleDataResult.data;

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
    const googleSpend = parseFloat(googleData.googleSpend);
    const googleROAS = parseFloat(googleData.googleRoas);
    const totalSpend = metaSpend + googleSpend;
    const metaSales = metaSpend * metaROAS;
    const googleSales = parseFloat(googleData.googleSales);
    const adSales = metaSales + googleSales; // Total sales from ads
    const grossROI = totalSpend > 0 ? adSales / totalSpend : 0;
    const netROI = totalSpend > 0 ? shopifySales / totalSpend : 0;

    const metricsEntry = new AdMetrics({
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

        // Use the first matching user if found
        const userWithAccess =  usersWithBrand[0];

        if (!userWithAccess) {
          logger.warn(`No user found for brand ${brandIdString}`);
          return {
            brandId: brandIdString,
            status: 'failed',
            error: 'No user with access found'
          };
        }

        const userId = userWithAccess._id.toString();
        logger.info(`Successfully found user ${userId} for brand ${brandIdString}`);

        const result = await addReportData(brandIdString, userId);
        
        logger.info(`Completed metrics processing for brand: ${brandIdString}`);
        
        return {
          brandId: brandIdString,
          status: result.success ? 'success' : 'failed',
          ...(result.success ? { userId } : { error: result.message, userId }),
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







