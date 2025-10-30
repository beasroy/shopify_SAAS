import { config } from "dotenv";
import Brand from "../models/Brands.js";
import Shopify from 'shopify-api-node'
import moment from "moment-timezone";
import axios from "axios";
import logger from "../utils/logger.js";
import { GoogleAdsApi } from "google-ads-api";
import AdMetrics from "../models/AdMetrics.js";
import RefundCache from '../models/RefundCache.js';



config();

// Helper function to calculate refund amounts (same as MonthlyReport.js)
function getRefundAmount(refund) {
  // Product-only refund (for net sales)
  const productReturn = refund?.refund_line_items
    ? refund.refund_line_items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
    : 0;

  // Total return (product + adjustments, for total returns)
  let adjustmentsTotal = 0;
  if (refund?.order_adjustments) {
    adjustmentsTotal = refund.order_adjustments.reduce((sum, adjustment) => sum + Number(adjustment.amount || 0), 0);
  }
  const totalReturn = productReturn - adjustmentsTotal;

  return {
    totalReturn    // for total returns
  };
}

export const fetchTotalSales = async (brandId) => {
  try {
    console.log('Fetching yesterday\'s orders...');
    const brand = await Brand.findById(brandId);
    if (!brand) throw new Error('Brand not found.');
    const access_token = brand.shopifyAccount?.shopifyAccessToken;
    if (!access_token) throw new Error('Access token is missing or invalid.');
    const shopName = brand.shopifyAccount?.shopName;
    if (!shopName) throw new Error('Shop name is missing or invalid.');
    const shopify = new Shopify({
      shopName: shopName,
      accessToken: access_token,
      apiVersion: '2023-07',
    });
    // Get store timezone
    const shopData = await shopify.shop.get();
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
    // Shopify order fetch & pagination
    let pageInfo = null;
    do {
      const params = {
        status: 'any',
        created_at_min: startOfYesterday.toISOString(),
        created_at_max: endOfYesterday.toISOString(),
        limit: 250,
      };
      if (pageInfo) params.page_info = pageInfo;
      const response = await shopify.order.list(params);
      if (!response || !Array.isArray(response) || response.length === 0) break;
      for (const order of response) {
        let grossSales = 0;
        let totalTaxes = 0;
        let subtotalPrice = Number(order.subtotal_price || 0);
        let discountAmount = Number(order.total_discounts || 0);
        let refundAmount = 0;
        const hasRefunds = order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0;
        if (order.line_items && Array.isArray(order.line_items) && order.line_items.length > 0) {
          grossSales = order.line_items.reduce((sum, item) => {
            const unitPrice = item.price_set ? Number(item.price_set.shop_money?.amount) : Number(item.original_price ?? item.price);
            const unitTotal = unitPrice * Number(item.quantity);
            let taxTotal = 0;
            if (!hasRefunds && item.tax_lines && Array.isArray(item.tax_lines)) {
              taxTotal = item.tax_lines.reduce((taxSum, tax) => taxSum + Number(tax.price || 0), 0);
            }
            totalTaxes += taxTotal;
            const netItemTotal = unitTotal - taxTotal;
            return sum + netItemTotal;
          }, 0);
        } else {
          grossSales = subtotalPrice + discountAmount;
        }
        if (hasRefunds) {
          for (const refund of order.refunds) {
            const productReturn = refund?.refund_line_items
              ? refund.refund_line_items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
              : 0;
            let adjustmentsTotal = 0;
            if (refund?.order_adjustments) {
              adjustmentsTotal = refund.order_adjustments.reduce((sum, adjustment) => sum + Number(adjustment.amount || 0), 0);
            }
            const totalReturn = productReturn - adjustmentsTotal;
            refundAmount += totalReturn;
          }
        }
        yesterdaySales.grossSales += grossSales;
        yesterdaySales.refundAmount += refundAmount;
        yesterdaySales.orderCount++;
      }
      // Shopify pagination
      const linkHeader = response.headers?.link;
      if (linkHeader) {
        const nextLink = linkHeader.split(',').find(link => link.includes('rel="next"'));
        pageInfo = nextLink ? nextLink.match(/page_info=([^&>]*)/)?.[1] : null;
      } else {
        pageInfo = null;
      }
    } while (pageInfo);
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
    const { grossSales, totalSales, refundAmount } = salesData[0];

    // Calculate metrics
    const metaSpend = parseFloat(totalMetaSpend.toFixed(2));
    const metaROAS = parseFloat(totalMetaROAS.toFixed(2));
    const googleSpend = parseFloat(googleData.googleSpend) || 0;
    const googleROAS = parseFloat(googleData.googleRoas) || 0;
    const totalSpend = metaSpend + googleSpend;
    const metaSales = metaSpend * metaROAS;
    const googleSales = parseFloat(googleData.googleSales) || 0;
    const adSales = metaSales + googleSales; // Total sales from ads
    const grossROI = totalSpend > 0 ? adSales / totalSpend : 0;



    const metricsEntry = new AdMetrics({
      brandId,
      date: moment().subtract(1, "days").toDate(),
      metaSpend,
      metaROAS,
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





