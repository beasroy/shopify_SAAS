import { config } from "dotenv";
import Brand from "../models/Brands.js";
import AdMetrics from "../models/AdMetrics.js";
import axios from 'axios'
import { OAuth2Client } from 'google-auth-library';
import { GoogleAdsApi } from "google-ads-api";
import { ApiError } from "../utils/ApiError.js";

config();

export const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
});

// Helper function for percentage change calculation
function getPercentageChange(current, previous) {
  if (!previous) return 0;
  return Number(((current - previous) / previous * 100).toFixed(2));
}
// Helper function for date formatting
export const formatDate = date => date.toISOString().split('T')[0];

export function buildMetricObject(period, currentStart, currentEnd, prevStart, prevEnd, currentValue, prevValue) {
  const isSpend = typeof currentValue === 'number' && currentValue % 1 !== 0;
  const value = isSpend ? Math.round(currentValue) : Number(currentValue);
  const prevValueFormatted = isSpend ? Math.round(prevValue) : Number(prevValue);

  return {
    period,
    dateRange: {
      current: {
        start: formatDate(currentStart),
        end: formatDate(currentEnd)
      },
      previous: {
        start: formatDate(prevStart),
        end: formatDate(prevEnd)
      }
    },
    current: value,
    previous: prevValueFormatted,
    change: getPercentageChange(value, prevValueFormatted),
    trend: currentValue >= prevValue ? 'up' : 'down'
  };
}
// Create date ranges more efficiently

// Function to fetch analytics data
export async function fetchAnalyticsData(startDate, endDate, propertyId, accessToken) {
  try {
    console.log(`Fetching analytics data: 
      Start: ${startDate}, 
      End: ${endDate}, 
      PropertyId: ${propertyId}`
    );

    const requestBody = {
      dateRanges: [{
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      }],
      metrics: [
        { name: 'sessions' },
        { name: 'addToCarts' },
        { name: 'checkouts' },
        { name: 'ecommercePurchases' },
      ]
    };

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout per request
      }
    );
    // Sum up all rows for the date range
    const rows = response?.data?.rows || [];
    const aggregatedData = rows.reduce((acc, row) => {
      // Ensure row and metricValues exist
      if (!row || !row.metricValues) {
        console.warn('Incomplete row data:', row);
        return acc;
      }

      return {
        sessions: acc.sessions + Number(row.metricValues[0]?.value || 0),
        addToCarts: acc.addToCarts + Number(row.metricValues[1]?.value || 0),
        checkouts: acc.checkouts + Number(row.metricValues[2]?.value || 0),
        purchases: acc.purchases + Number(row.metricValues[3]?.value || 0),
      };
    }, { sessions: 0, addToCarts: 0, checkouts: 0, purchases: 0 });

    // Calculate rates
    const calculateRate = (numerator, denominator) =>
      denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;

    const result = {
      sessions: aggregatedData.sessions,
      addToCarts: aggregatedData.addToCarts,
      checkouts: aggregatedData.checkouts,
      purchases: aggregatedData.purchases,
      addToCartRate: calculateRate(aggregatedData.addToCarts, aggregatedData.sessions),
      checkoutRate: calculateRate(aggregatedData.checkouts, aggregatedData.sessions),
      purchaseRate: calculateRate(aggregatedData.purchases, aggregatedData.sessions)
    };

    console.log('Processed Analytics Data:', result);

    return result;
  } catch (error) {
    console.error('Error fetching analytics data:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
}
// Helper function for retrying API calls with exponential backoff
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error?.retryable === false) {
        throw error;
      }
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Helper function to calculate metrics comparison between current and previous periods
export function calculateMetrics(current, previous) {
  const numCurrent = Number(current);
  const numPrevious = Number(previous);
  const roundedCurrent = Number(numCurrent.toFixed(2));
  const roundedPrevious = Number(numPrevious.toFixed(2));
  const change = roundedPrevious > 0
    ? Number((((roundedCurrent - roundedPrevious) / roundedPrevious) * 100).toFixed(2))
    : 0;
  let trend = 'neutral';
  if (roundedCurrent > roundedPrevious) trend = 'up';
  if (roundedCurrent < roundedPrevious) trend = 'down';
  return {
    current: roundedCurrent,
    previous: roundedPrevious,
    change,
    trend
  };
}

function parseMetaErrorPayload(payload) {
  if (!payload) return null;

  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return { message: payload };
    }
  }

  return payload;
}

function isMetaReconnectError(status, metaError = {}) {
  const code = metaError.code;
  const subcode = metaError.error_subcode;
  const message = String(metaError.message || '').toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    code === 190 ||
    subcode === 463 ||
    subcode === 467 ||
    message.includes('access token') ||
    message.includes('session has expired') ||
    message.includes('invalid oauth') ||
    message.includes('not authorized') ||
    message.includes('permission')
  );
}

function normalizeMetaSummaryError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  const status = error?.response?.status || error?.status || 500;
  const payload = parseMetaErrorPayload(error?.response?.data);
  const metaError = payload?.error || payload || {};

  if (isMetaReconnectError(status, metaError)) {
    return new ApiError(
      403,
      'Meta access expired or permission was denied. Please reconnect Facebook account.',
      {
        code: 'META_RECONNECT_REQUIRED',
        provider: 'meta',
        reconnectRequired: true,
        publicError: 'Meta authorization failed.',
        retryable: false
      }
    );
  }

  if (status === 400) {
    return new ApiError(
      400,
      metaError.message || 'Meta request was rejected.',
      {
        code: 'META_BAD_REQUEST',
        provider: 'meta',
        publicError: 'Failed to fetch Meta summary.',
        retryable: false
      }
    );
  }

  return new ApiError(
    500,
    metaError.message || error?.message || 'Unexpected error while fetching Meta summary.',
    {
      code: 'META_REQUEST_FAILED',
      provider: 'meta',
      publicError: 'Failed to fetch Meta summary.'
    }
  );
}

// Function to fetch Facebook Ads data
export async function fetchMetaAdsData(startDate, endDate, accessToken, adAccountIds) {
  return retryWithBackoff(async () => {
    const batchRequests = adAccountIds.map((accountId) => ({
      method: 'GET',
      relative_url: `${accountId}/insights?fields=spend,purchase_roas,action_values,clicks,impressions,actions&time_range={'since':'${formatDate(startDate)}','until':'${formatDate(endDate)}'}`,
    }));

    let response;

    try {
      response = await axios.post(
        `https://graph.facebook.com/v22.0/`,
        { batch: batchRequests },
        {
          headers: { 'Content-Type': 'application/json' },
          params: { access_token: accessToken },
          timeout: 15000, // 15 second timeout per request
        }
      );
    } catch (error) {
      throw normalizeMetaSummaryError(error);
    }

    let aggregatedData = {
      metaspend: 0,
      metarevenue: 0,
      metaclicks: 0,
      metaimpressions: 0,
      metapurchases: 0,
      metaroas: 0,
      metacpc: 0,
      metacpm: 0,
      metactr: 0,
      metacpp: 0,
    };

    for (let i = 0; i < adAccountIds.length; i++) {
      const accountResponse = response.data[i];

      if (!accountResponse) {
        throw new ApiError(
          500,
          'Meta returned an incomplete batch response.',
          {
            code: 'META_EMPTY_BATCH_RESPONSE',
            provider: 'meta',
            publicError: 'Failed to fetch Meta summary.'
          }
        );
      }

      if (accountResponse.code !== 200) {
        throw normalizeMetaSummaryError({
          response: {
            status: accountResponse.code,
            data: parseMetaErrorPayload(accountResponse.body)
          }
        });
      }

      const accountBody = parseMetaErrorPayload(accountResponse.body);

      if (accountBody?.error) {
        const normalizedStatus = isMetaReconnectError(accountResponse.code, accountBody.error) ? 403 : 400;
        throw normalizeMetaSummaryError({
          response: {
            status: normalizedStatus,
            data: accountBody
          }
        });
      }

      if (accountBody?.data?.length > 0) {
        const insight = accountBody.data[0];
        const revenue = insight.action_values?.find((action) => action.action_type === 'purchase')?.value || 0;
        const purchase = insight.actions?.find((action) => action.action_type === 'purchase')?.value || 0;

        aggregatedData.metaspend += Number(insight.spend || 0);
        aggregatedData.metarevenue += Number(revenue);
        aggregatedData.metaclicks += Number(insight.clicks || 0);
        aggregatedData.metaimpressions += Number(insight.impressions || 0);
        aggregatedData.metapurchases += Number(purchase);
      }
    }

    aggregatedData.metaroas = aggregatedData.metaspend > 0
      ? Number((aggregatedData.metarevenue / aggregatedData.metaspend).toFixed(2))
      : 0;
    
    aggregatedData.metacpc = aggregatedData.metaclicks > 0
      ? Number((aggregatedData.metaspend / aggregatedData.metaclicks).toFixed(2))
      : 0;

    aggregatedData.metacpm = aggregatedData.metaimpressions > 0
      ? Number(((aggregatedData.metaspend / aggregatedData.metaimpressions) * 1000).toFixed(2))
      : 0;

    aggregatedData.metactr = aggregatedData.metaimpressions > 0
      ? Number(((aggregatedData.metaclicks / aggregatedData.metaimpressions) * 100).toFixed(2))
      : 0;

    aggregatedData.metacpp = aggregatedData.metapurchases > 0
      ? Number((aggregatedData.metaspend / aggregatedData.metapurchases).toFixed(2))
      : 0;

    return aggregatedData;
  }, 2, 1500); // 2 retries with 1.5s initial delay
}

export async function fetchGoogleAdsData(startDate, endDate, customer) {
  // Format dates once outside the function call
  const formattedStartDate = startDate.toISOString().split('T')[0];
  const formattedEndDate = endDate.toISOString().split('T')[0];

  const report = await customer.report({
    entity: "customer",
    attributes: ["customer.descriptive_name"],
    metrics: [
      "metrics.cost_micros",
      "metrics.conversions_value",
      "metrics.clicks",
      "metrics.impressions",
      "metrics.conversions"
    ],
    from_date: formattedStartDate,
    to_date: formattedEndDate,
  });

  // Use reduce for better performance when aggregating
  const totals = report.reduce((acc, row) => {
    const costMicros = row.metrics.cost_micros || 0;
    const spend = costMicros / 1_000_000;
    acc.totalSpend += spend;
    acc.totalConversionsValue += row.metrics.conversions_value || 0;
    acc.totalClicks += row.metrics.clicks || 0;
    acc.totalImpressions += row.metrics.impressions || 0;
    acc.totalConversions += row.metrics.conversions || 0;
    return acc;
  }, { totalSpend: 0, totalConversionsValue: 0, totalClicks: 0, totalImpressions: 0, totalConversions: 0 });

  return {
    rawSpend: totals.totalSpend,
    rawConversionsValue: totals.totalConversionsValue,
    rawClicks: totals.totalClicks,
    rawImpressions: totals.totalImpressions,
    rawConversions: totals.totalConversions,
    spend: Number(totals.totalSpend.toFixed(2)),
    roas: totals.totalSpend > 0 ? Number((totals.totalConversionsValue / totals.totalSpend).toFixed(2)) : 0
  };
}
export async function getGoogleAccessToken(refreshToken) {
  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { token } = await oAuth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw new Error('Failed to generate access token.');
  }
}

// Aggregate Shopify metrics from AdMetrics table for a date range (for comparison)
export async function fetchShopifyMetricsFromAdMetrics(brandId, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const docs = await AdMetrics.find({
    brandId,
    date: { $gte: start, $lte: end }
  }).lean();

  const totalSales = docs.reduce((sum, d) => sum + (Number(d.totalSales) || 0), 0);
  const refundAmount = docs.reduce((sum, d) => sum + (Number(d.refundAmount) || 0), 0);
  const metaSpend = docs.reduce((sum, d) => sum + (Number(d.metaSpend) || 0), 0);
  const googleSpend = docs.reduce((sum, d) => sum + (Number(d.googleSpend) || 0), 0);
  const totalSpend = metaSpend + googleSpend;
  const roas = totalSpend > 0 ? Number((totalSales / totalSpend).toFixed(2)) : 0;

  return {
    totalSales: Number(totalSales.toFixed(2)),
    refundAmount: Number(refundAmount.toFixed(2)),
    roas
  };
}

// Individual endpoint for Meta/Facebook Ads data
export async function getMetaSummary(req, res, next) {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    const brand = await Brand.findById(brandId).lean();
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    // Check if Meta is configured
    if (!brand.fbAdAccounts?.length || !brand.fbAccessToken) {
      return res.status(200).json({
        success: false,
        message: 'Meta Ads not configured for this brand.',
        periodData: null
      });
    }

    // Calculate date ranges
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    const previous7DaysStart = new Date(last7DaysStart);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);
    const previous7DaysEnd = new Date(last7DaysStart);
    previous7DaysEnd.setDate(previous7DaysEnd.getDate() - 1);
    const last14DaysStart = new Date(today);
    last14DaysStart.setDate(last14DaysStart.getDate() - 14);
    const previous14DaysStart = new Date(last14DaysStart);
    previous14DaysStart.setDate(previous14DaysStart.getDate() - 14);
    const previous14DaysEnd = new Date(last14DaysStart);
    previous14DaysEnd.setDate(previous14DaysEnd.getDate() - 1);
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);
    const quarterStart = new Date(today);
    quarterStart.setDate(quarterStart.getDate() - 90);
    const previousQuarterStart = new Date(quarterStart);
    previousQuarterStart.setDate(previousQuarterStart.getDate() - 90);
    const previousQuarterEnd = new Date(quarterStart);
    previousQuarterEnd.setDate(previousQuarterEnd.getDate() - 1);

    console.log(`[Meta API] Starting fetch for brand ${brandId} with ${brand.fbAdAccounts.length} accounts`);
    const startTime = Date.now();

    // Fetch all Meta data in parallel
    const [metaYesterday, metaDayBefore, metaLast7, metaPrev7, metaLast14, metaPrev14, metaLast30, metaPrev30, metaQuarter, metaPrevQuarter] = await Promise.all([
      fetchMetaAdsData(yesterday, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(dayBeforeYesterday, dayBeforeYesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(last7DaysStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(previous7DaysStart, previous7DaysEnd, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(last14DaysStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(previous14DaysStart, previous14DaysEnd, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(last30DaysStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(previous30DaysStart, previous30DaysEnd, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(quarterStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(previousQuarterStart, previousQuarterEnd, brand.fbAccessToken, brand.fbAdAccounts)
    ]);

    const periodData = {
      yesterday: {
        metaspend: calculateMetrics(metaYesterday.metaspend, metaDayBefore.metaspend),
        metaroas: calculateMetrics(metaYesterday.metaroas, metaDayBefore.metaroas),
        metacpc: calculateMetrics(metaYesterday.metacpc, metaDayBefore.metacpc),
        metacpm: calculateMetrics(metaYesterday.metacpm, metaDayBefore.metacpm),
        metactr: calculateMetrics(metaYesterday.metactr, metaDayBefore.metactr),
        metacpp: calculateMetrics(metaYesterday.metacpp, metaDayBefore.metacpp),
      },
      last7Days: {
        metaspend: calculateMetrics(metaLast7.metaspend, metaPrev7.metaspend),
        metaroas: calculateMetrics(metaLast7.metaroas, metaPrev7.metaroas),
        metacpc: calculateMetrics(metaLast7.metacpc, metaPrev7.metacpc),
        metacpm: calculateMetrics(metaLast7.metacpm, metaPrev7.metacpm),
        metactr: calculateMetrics(metaLast7.metactr, metaPrev7.metactr),
        metacpp: calculateMetrics(metaLast7.metacpp, metaPrev7.metacpp),
      },
      last14Days: {
        metaspend: calculateMetrics(metaLast14.metaspend, metaPrev14.metaspend),
        metaroas: calculateMetrics(metaLast14.metaroas, metaPrev14.metaroas),
        metacpc: calculateMetrics(metaLast14.metacpc, metaPrev14.metacpc),
        metacpm: calculateMetrics(metaLast14.metacpm, metaPrev14.metacpm),
        metactr: calculateMetrics(metaLast14.metactr, metaPrev14.metactr),
        metacpp: calculateMetrics(metaLast14.metacpp, metaPrev14.metacpp),
      },
      last30Days: {
        metaspend: calculateMetrics(metaLast30.metaspend, metaPrev30.metaspend),
        metaroas: calculateMetrics(metaLast30.metaroas, metaPrev30.metaroas),
        metacpc: calculateMetrics(metaLast30.metacpc, metaPrev30.metacpc),
        metacpm: calculateMetrics(metaLast30.metacpm, metaPrev30.metacpm),
        metactr: calculateMetrics(metaLast30.metactr, metaPrev30.metactr),
        metacpp: calculateMetrics(metaLast30.metacpp, metaPrev30.metacpp),
      },
      quarterly: {
        metaspend: calculateMetrics(metaQuarter.metaspend, metaPrevQuarter.metaspend),
        metaroas: calculateMetrics(metaQuarter.metaroas, metaPrevQuarter.metaroas),
        metacpc: calculateMetrics(metaQuarter.metacpc, metaPrevQuarter.metacpc),
        metacpm: calculateMetrics(metaQuarter.metacpm, metaPrevQuarter.metacpm),
        metactr: calculateMetrics(metaQuarter.metactr, metaPrevQuarter.metactr),
        metacpp: calculateMetrics(metaQuarter.metacpp, metaPrevQuarter.metacpp),
      }
    };

    console.log(`[Meta API] Successfully fetched in ${Date.now() - startTime}ms`);

    return res.status(200).json({
      success: true,
      periodData,
      lastUpdated: new Date()
    });

  } catch (error) {
    const normalizedError = normalizeMetaSummaryError(error);

    console.error(`[Meta API Error]`, {
      status: normalizedError.status,
      code: normalizedError.code,
      message: normalizedError.message
    });

    return next(normalizedError);
  }
}

// Individual endpoint for Google Ads data
export async function getGoogleAdsSummary(req, res) {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    const brand = await Brand.findById(brandId).lean();
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    // Check if Google Ads is configured
    if (!brand.googleAdAccount?.length || !brand.googleAdsRefreshToken) {
      return res.status(200).json({
        success: false,
        message: 'Google Ads not configured for this brand.',
        periodData: null
      });
    }

    // Calculate date ranges
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    const previous7DaysStart = new Date(last7DaysStart);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);
    const previous7DaysEnd = new Date(last7DaysStart);
    previous7DaysEnd.setDate(previous7DaysEnd.getDate() - 1);
    const last14DaysStart = new Date(today);
    last14DaysStart.setDate(last14DaysStart.getDate() - 14);
    const previous14DaysStart = new Date(last14DaysStart);
    previous14DaysStart.setDate(previous14DaysStart.getDate() - 14);
    const previous14DaysEnd = new Date(last14DaysStart);
    previous14DaysEnd.setDate(previous14DaysEnd.getDate() - 1);
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);
    const quarterStart = new Date(today);
    quarterStart.setDate(quarterStart.getDate() - 90);
    const previousQuarterStart = new Date(quarterStart);
    previousQuarterStart.setDate(previousQuarterStart.getDate() - 90);
    const previousQuarterEnd = new Date(quarterStart);
    previousQuarterEnd.setDate(previousQuarterEnd.getDate() - 1);

    console.log(`[Google Ads API] Starting fetch for brand ${brandId} with ${brand.googleAdAccount.length} accounts`);
    const startTime = Date.now();

    // Fetch Google Ads data for all accounts
    const googleAdsPromises = brand.googleAdAccount.map(async (adAccount) => {
      const adAccountId = adAccount.clientId;
      const managerId = adAccount.managerId;
      if (!adAccountId) return null;

      const customer = client.Customer({
        customer_id: adAccountId,
        refresh_token: brand.googleAdsRefreshToken,
        login_customer_id: managerId
      });

      return Promise.all([
        fetchGoogleAdsData(yesterday, yesterday, customer),
        fetchGoogleAdsData(dayBeforeYesterday, dayBeforeYesterday, customer),
        fetchGoogleAdsData(last7DaysStart, yesterday, customer),
        fetchGoogleAdsData(previous7DaysStart, previous7DaysEnd, customer),
        fetchGoogleAdsData(last14DaysStart, yesterday, customer),
        fetchGoogleAdsData(previous14DaysStart, previous14DaysEnd, customer),
        fetchGoogleAdsData(last30DaysStart, yesterday, customer),
        fetchGoogleAdsData(previous30DaysStart, previous30DaysEnd, customer),
        fetchGoogleAdsData(quarterStart, yesterday, customer),
        fetchGoogleAdsData(previousQuarterStart, previousQuarterEnd, customer)
      ]);
    });

    const googleAccountsData = await Promise.all(googleAdsPromises);

    // Aggregate data from all accounts
    const aggregatedData = Array.from({ length: 10 }, () => ({
      rawSpend: 0, rawConversionsValue: 0, rawClicks: 0, rawImpressions: 0, rawConversions: 0
    }));

    googleAccountsData.forEach(accountData => {
      if (accountData) {
        accountData.forEach((periodData, index) => {
          aggregatedData[index].rawSpend += periodData.rawSpend || 0;
          aggregatedData[index].rawConversionsValue += periodData.rawConversionsValue || 0;
          aggregatedData[index].rawClicks += periodData.rawClicks || 0;
          aggregatedData[index].rawImpressions += periodData.rawImpressions || 0;
          aggregatedData[index].rawConversions += periodData.rawConversions || 0;
        });
      }
    });

    const calculateRates = (data) => {
      const spend = Number(data.rawSpend.toFixed(2));
      const roas = data.rawSpend > 0 ? Number((data.rawConversionsValue / data.rawSpend).toFixed(2)) : 0;
      const cpc = data.rawClicks > 0 ? Number((data.rawSpend / data.rawClicks).toFixed(2)) : 0;
      const cpm = data.rawImpressions > 0 ? Number(((data.rawSpend / data.rawImpressions) * 1000).toFixed(2)) : 0;
      const ctr = data.rawImpressions > 0 ? Number(((data.rawClicks / data.rawImpressions) * 100).toFixed(2)) : 0;
      const cpp = data.rawConversions > 0 ? Number((data.rawSpend / data.rawConversions).toFixed(2)) : 0;
      return { spend, roas, cpc, cpm, ctr, cpp };
    };

    const finalAggregated = aggregatedData.map(calculateRates);

    const periodData = {
      yesterday: {
        googlespend: calculateMetrics(finalAggregated[0].spend, finalAggregated[1].spend),
        googleroas: calculateMetrics(finalAggregated[0].roas, finalAggregated[1].roas),
        googlecpc: calculateMetrics(finalAggregated[0].cpc, finalAggregated[1].cpc),
        googlecpm: calculateMetrics(finalAggregated[0].cpm, finalAggregated[1].cpm),
        googlectr: calculateMetrics(finalAggregated[0].ctr, finalAggregated[1].ctr),
        googlecpp: calculateMetrics(finalAggregated[0].cpp, finalAggregated[1].cpp),
      },
      last7Days: {
        googlespend: calculateMetrics(finalAggregated[2].spend, finalAggregated[3].spend),
        googleroas: calculateMetrics(finalAggregated[2].roas, finalAggregated[3].roas),
        googlecpc: calculateMetrics(finalAggregated[2].cpc, finalAggregated[3].cpc),
        googlecpm: calculateMetrics(finalAggregated[2].cpm, finalAggregated[3].cpm),
        googlectr: calculateMetrics(finalAggregated[2].ctr, finalAggregated[3].ctr),
        googlecpp: calculateMetrics(finalAggregated[2].cpp, finalAggregated[3].cpp),
      },
      last14Days: {
        googlespend: calculateMetrics(finalAggregated[4].spend, finalAggregated[5].spend),
        googleroas: calculateMetrics(finalAggregated[4].roas, finalAggregated[5].roas),
        googlecpc: calculateMetrics(finalAggregated[4].cpc, finalAggregated[5].cpc),
        googlecpm: calculateMetrics(finalAggregated[4].cpm, finalAggregated[5].cpm),
        googlectr: calculateMetrics(finalAggregated[4].ctr, finalAggregated[5].ctr),
        googlecpp: calculateMetrics(finalAggregated[4].cpp, finalAggregated[5].cpp),
      },
      last30Days: {
        googlespend: calculateMetrics(finalAggregated[6].spend, finalAggregated[7].spend),
        googleroas: calculateMetrics(finalAggregated[6].roas, finalAggregated[7].roas),
        googlecpc: calculateMetrics(finalAggregated[6].cpc, finalAggregated[7].cpc),
        googlecpm: calculateMetrics(finalAggregated[6].cpm, finalAggregated[7].cpm),
        googlectr: calculateMetrics(finalAggregated[6].ctr, finalAggregated[7].ctr),
        googlecpp: calculateMetrics(finalAggregated[6].cpp, finalAggregated[7].cpp),
      },
      quarterly: {
        googlespend: calculateMetrics(finalAggregated[8].spend, finalAggregated[9].spend),
        googleroas: calculateMetrics(finalAggregated[8].roas, finalAggregated[9].roas),
        googlecpc: calculateMetrics(finalAggregated[8].cpc, finalAggregated[9].cpc),
        googlecpm: calculateMetrics(finalAggregated[8].cpm, finalAggregated[9].cpm),
        googlectr: calculateMetrics(finalAggregated[8].ctr, finalAggregated[9].ctr),
        googlecpp: calculateMetrics(finalAggregated[8].cpp, finalAggregated[9].cpp),
      }
    };

    console.log(`[Google Ads API] Successfully fetched in ${Date.now() - startTime}ms`);

    res.status(200).json({
      success: true,
      periodData,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error(`[Google Ads API Error]`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Google Ads summary.',
      message: error.message
    });
  }
}

// Individual endpoint for Shopify metrics (totalSales, refundAmount, ROAS from AdMetrics)
export async function getShopifySummary(req, res) {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    const brand = await Brand.findById(brandId).lean();
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    // Date ranges (same structure as Meta/Google for comparison)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    const previous7DaysStart = new Date(last7DaysStart);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);
    const previous7DaysEnd = new Date(last7DaysStart);
    previous7DaysEnd.setDate(previous7DaysEnd.getDate() - 1);
    const last14DaysStart = new Date(today);
    last14DaysStart.setDate(last14DaysStart.getDate() - 14);
    const previous14DaysStart = new Date(last14DaysStart);
    previous14DaysStart.setDate(previous14DaysStart.getDate() - 14);
    const previous14DaysEnd = new Date(last14DaysStart);
    previous14DaysEnd.setDate(previous14DaysEnd.getDate() - 1);
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);
    const quarterStart = new Date(today);
    quarterStart.setDate(quarterStart.getDate() - 90);
    const previousQuarterStart = new Date(quarterStart);
    previousQuarterStart.setDate(previousQuarterStart.getDate() - 90);
    const previousQuarterEnd = new Date(quarterStart);
    previousQuarterEnd.setDate(previousQuarterEnd.getDate() - 1);

    const brandIdObj = brand._id;
    const [
      shopifyYesterday, shopifyDayBefore,
      shopifyLast7, shopifyPrev7,
      shopifyLast14, shopifyPrev14,
      shopifyLast30, shopifyPrev30,
      shopifyQuarter, shopifyPrevQuarter
    ] = await Promise.all([
      fetchShopifyMetricsFromAdMetrics(brandIdObj, yesterday, yesterday),
      fetchShopifyMetricsFromAdMetrics(brandIdObj, dayBeforeYesterday, dayBeforeYesterday),
      fetchShopifyMetricsFromAdMetrics(brandIdObj, last7DaysStart, yesterday),
      fetchShopifyMetricsFromAdMetrics(brandIdObj, previous7DaysStart, previous7DaysEnd),
      fetchShopifyMetricsFromAdMetrics(brandIdObj, last14DaysStart, yesterday),
      fetchShopifyMetricsFromAdMetrics(brandIdObj, previous14DaysStart, previous14DaysEnd),
      fetchShopifyMetricsFromAdMetrics(brandIdObj, last30DaysStart, yesterday),
      fetchShopifyMetricsFromAdMetrics(brandIdObj, previous30DaysStart, previous30DaysEnd),
      fetchShopifyMetricsFromAdMetrics(brandIdObj, quarterStart, yesterday),
      fetchShopifyMetricsFromAdMetrics(brandIdObj, previousQuarterStart, previousQuarterEnd)
    ]);

    const periodData = {
      yesterday: {
        totalSales: calculateMetrics(shopifyYesterday.totalSales, shopifyDayBefore.totalSales),
        refundAmount: calculateMetrics(shopifyYesterday.refundAmount, shopifyDayBefore.refundAmount),
        roas: calculateMetrics(shopifyYesterday.roas, shopifyDayBefore.roas),
      },
      last7Days: {
        totalSales: calculateMetrics(shopifyLast7.totalSales, shopifyPrev7.totalSales),
        refundAmount: calculateMetrics(shopifyLast7.refundAmount, shopifyPrev7.refundAmount),
        roas: calculateMetrics(shopifyLast7.roas, shopifyPrev7.roas),
      },
      last14Days: {
        totalSales: calculateMetrics(shopifyLast14.totalSales, shopifyPrev14.totalSales),
        refundAmount: calculateMetrics(shopifyLast14.refundAmount, shopifyPrev14.refundAmount),
        roas: calculateMetrics(shopifyLast14.roas, shopifyPrev14.roas),
      },
      last30Days: {
        totalSales: calculateMetrics(shopifyLast30.totalSales, shopifyPrev30.totalSales),
        refundAmount: calculateMetrics(shopifyLast30.refundAmount, shopifyPrev30.refundAmount),
        roas: calculateMetrics(shopifyLast30.roas, shopifyPrev30.roas),
      },
      quarterly: {
        totalSales: calculateMetrics(shopifyQuarter.totalSales, shopifyPrevQuarter.totalSales),
        refundAmount: calculateMetrics(shopifyQuarter.refundAmount, shopifyPrevQuarter.refundAmount),
        roas: calculateMetrics(shopifyQuarter.roas, shopifyPrevQuarter.roas),
      }
    };

    res.status(200).json({
      success: true,
      periodData,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('[Shopify Summary API Error]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Shopify summary.',
      message: error.message
    });
  }
}

// Individual endpoint for Google Analytics data
export async function getAnalyticsSummary(req, res) {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    const brand = await Brand.findById(brandId).lean();
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    // Check if Analytics is configured
    if (!brand.ga4Account?.PropertyID || !brand.googleAnalyticsRefreshToken) {
      return res.status(200).json({
        success: false,
        message: 'Google Analytics not configured for this brand.',
        periodData: null
      });
    }

    // Calculate date ranges
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    const previous7DaysStart = new Date(last7DaysStart);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);
    const previous7DaysEnd = new Date(last7DaysStart);
    previous7DaysEnd.setDate(previous7DaysEnd.getDate() - 1);
    const last14DaysStart = new Date(today);
    last14DaysStart.setDate(last14DaysStart.getDate() - 14);
    const previous14DaysStart = new Date(last14DaysStart);
    previous14DaysStart.setDate(previous14DaysStart.getDate() - 14);
    const previous14DaysEnd = new Date(last14DaysStart);
    previous14DaysEnd.setDate(previous14DaysEnd.getDate() - 1);
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);
    const quarterStart = new Date(today);
    quarterStart.setDate(quarterStart.getDate() - 90);
    const previousQuarterStart = new Date(quarterStart);
    previousQuarterStart.setDate(previousQuarterStart.getDate() - 90);
    const previousQuarterEnd = new Date(quarterStart);
    previousQuarterEnd.setDate(previousQuarterEnd.getDate() - 1);

    console.log(`[Analytics API] Starting fetch for brand ${brandId}`);
    const startTime = Date.now();

    // Get access token and fetch all analytics data
    const accessToken = await getGoogleAccessToken(brand.googleAnalyticsRefreshToken);
    const [analyticsYesterday, analyticsDayBefore, analyticsLast7, analyticsPrev7, analyticsLast14, analyticsPrev14, analyticsLast30, analyticsPrev30, analyticsQuarter, analyticsPrevQuarter] = await Promise.all([
      fetchAnalyticsData(yesterday, yesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(dayBeforeYesterday, dayBeforeYesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(last7DaysStart, yesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(previous7DaysStart, previous7DaysEnd, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(last14DaysStart, yesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(previous14DaysStart, previous14DaysEnd, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(last30DaysStart, yesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(previous30DaysStart, previous30DaysEnd, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(quarterStart, yesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(previousQuarterStart, previousQuarterEnd, brand.ga4Account.PropertyID, accessToken)
    ]);

    const analyticsMetricKeys = ['sessions', 'addToCarts', 'checkouts', 'purchases', 'addToCartRate', 'purchaseRate', 'checkoutRate'];
    const buildAnalyticsPeriod = (current, previous) =>
      Object.fromEntries(analyticsMetricKeys.map(key => [key, calculateMetrics(current[key], previous[key])]));

    const periodData = {
      yesterday: buildAnalyticsPeriod(analyticsYesterday, analyticsDayBefore),
      last7Days: buildAnalyticsPeriod(analyticsLast7, analyticsPrev7),
      last14Days: buildAnalyticsPeriod(analyticsLast14, analyticsPrev14),
      last30Days: buildAnalyticsPeriod(analyticsLast30, analyticsPrev30),
      quarterly: buildAnalyticsPeriod(analyticsQuarter, analyticsPrevQuarter),
    };

    console.log(`[Analytics API] Successfully fetched in ${Date.now() - startTime}ms`);

    res.status(200).json({
      success: true,
      periodData,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error(`[Analytics API Error]`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Analytics summary.',
      message: error.message
    });
  }
}

// Optimized unified API endpoint that combines all three platforms
export async function getUnifiedSummary(req, res) {
  try {
    const { brandId } = req.params;

    // Validate input
    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    // Find brand
    const brand = await Brand.findById(brandId).lean();
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    // Calculate date ranges once
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    const previous7DaysStart = new Date(last7DaysStart);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);
    const previous7DaysEnd = new Date(last7DaysStart);
    previous7DaysEnd.setDate(previous7DaysEnd.getDate() - 1);
    const last14DaysStart = new Date(today);
    last14DaysStart.setDate(last14DaysStart.getDate() - 14);
    const previous14DaysStart = new Date(last14DaysStart);
    previous14DaysStart.setDate(previous14DaysStart.getDate() - 14);
    const previous14DaysEnd = new Date(last14DaysStart);
    previous14DaysEnd.setDate(previous14DaysEnd.getDate() - 1);
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);
    const quarterStart = new Date(today);
    quarterStart.setDate(quarterStart.getDate() - 90);
    const previousQuarterStart = new Date(quarterStart);
    previousQuarterStart.setDate(previousQuarterStart.getDate() - 90);
    const previousQuarterEnd = new Date(quarterStart);
    previousQuarterEnd.setDate(previousQuarterEnd.getDate() - 1);

    // Helper function to calculate metrics
    const calculateMetrics = (current, previous) => {
      const numCurrent = Number(current);
      const numPrevious = Number(previous);
      const roundedCurrent = Number(numCurrent.toFixed(2));
      const roundedPrevious = Number(numPrevious.toFixed(2));
      const change = roundedPrevious > 0
        ? Number((((roundedCurrent - roundedPrevious) / roundedPrevious) * 100).toFixed(2))
        : 0;
      let trend = 'neutral';
      if (roundedCurrent > roundedPrevious) trend = 'up';
      if (roundedCurrent < roundedPrevious) trend = 'down';
      return {
        current: roundedCurrent,
        previous: roundedPrevious,
        change,
        trend
      };
    };

    // Initialize period data structure
    const createEmptyPeriodData = () => ({
      metaspend: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      metaroas: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      googlespend: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      googleroas: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      sessions: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      addToCarts: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      checkouts: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      purchases: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      addToCartRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      purchaseRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      checkoutRate: { current: 0, previous: 0, change: 0, trend: 'neutral' }
    });

    const periodData = {
      yesterday: createEmptyPeriodData(),
      last7Days: createEmptyPeriodData(),
      last14Days: createEmptyPeriodData(),
      last30Days: createEmptyPeriodData(),
      quarterly: createEmptyPeriodData()
    };

    // Prepare all API calls in parallel with optimized timeouts
    const apiCalls = [];
    const API_TIMEOUT = 25000; // 25 seconds timeout per API call (allows for retries)

    // Meta Ads data
    if (brand.fbAdAccounts?.length > 0 && brand.fbAccessToken) {
      console.log(`[Meta API] Starting data fetch for brand ${brandId} with ${brand.fbAdAccounts.length} accounts`);
      const metaStartTime = Date.now();
      apiCalls.push(
        Promise.race([
          Promise.all([
            fetchMetaAdsData(yesterday, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(dayBeforeYesterday, dayBeforeYesterday, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(last7DaysStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(previous7DaysStart, previous7DaysEnd, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(last14DaysStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(previous14DaysStart, previous14DaysEnd, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(last30DaysStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(previous30DaysStart, previous30DaysEnd, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(quarterStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(previousQuarterStart, previousQuarterEnd, brand.fbAccessToken, brand.fbAdAccounts)
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Meta API timeout - exceeded ${API_TIMEOUT/1000}s for ${brand.fbAdAccounts.length} accounts`)), API_TIMEOUT))
        ]).then(metaData => {
          console.log(`[Meta API] Successfully fetched data in ${Date.now() - metaStartTime}ms`);
          return { type: 'meta', data: metaData };
        }).catch(error => {
          console.error(`[Meta API Error] Brand: ${brandId}, Accounts: ${brand.fbAdAccounts.length}, Duration: ${Date.now() - metaStartTime}ms, Error:`, error.message);
          return { type: 'meta', data: null };
        })
      );
    }

    // Google Ads data
    if (brand.googleAdAccount?.length > 0 && brand.googleAdsRefreshToken) {
      const googleAdsPromises = brand.googleAdAccount.map(async (adAccount) => {
        const adAccountId = adAccount.clientId;
        const managerId = adAccount.managerId;
        if (!adAccountId) return null;

        const customer = client.Customer({
          customer_id: adAccountId,
          refresh_token: brand.googleAdsRefreshToken,
          login_customer_id: managerId
        });

        return Promise.race([
          Promise.all([
            fetchGoogleAdsData(yesterday, yesterday, customer),
            fetchGoogleAdsData(dayBeforeYesterday, dayBeforeYesterday, customer),
            fetchGoogleAdsData(last7DaysStart, yesterday, customer),
            fetchGoogleAdsData(previous7DaysStart, previous7DaysEnd, customer),
            fetchGoogleAdsData(last14DaysStart, yesterday, customer),
            fetchGoogleAdsData(previous14DaysStart, previous14DaysEnd, customer),
            fetchGoogleAdsData(last30DaysStart, yesterday, customer),
            fetchGoogleAdsData(previous30DaysStart, previous30DaysEnd, customer),
            fetchGoogleAdsData(quarterStart, yesterday, customer),
            fetchGoogleAdsData(previousQuarterStart, previousQuarterEnd, customer)
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Google Ads API timeout - exceeded ${API_TIMEOUT/1000}s`)), API_TIMEOUT))
        ]);
      });

      apiCalls.push(
        Promise.all(googleAdsPromises).then(googleAccountsData => {
          const aggregatedData = Array.from({ length: 10 }, () => ({ spend: 0, roas: 0 }));

          googleAccountsData.forEach(accountData => {
            if (accountData) {
              accountData.forEach((periodData, index) => {
                aggregatedData[index].spend += periodData.spend;
                aggregatedData[index].roas += periodData.roas;
              });
            }
          });

          return { type: 'google', data: aggregatedData };
        }).catch(error => {
          console.error(`[Google Ads API Error] Brand: ${brandId}, Accounts: ${brand.googleAdAccount.length}, Error:`, error.message);
          return { type: 'google', data: null };
        })
      );
    }

    // Google Analytics data
    if (brand.ga4Account?.PropertyID && brand.googleAnalyticsRefreshToken) {
      apiCalls.push(
        Promise.race([
          getGoogleAccessToken(brand.googleAnalyticsRefreshToken).then(accessToken => 
            Promise.all([
              fetchAnalyticsData(yesterday, yesterday, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(dayBeforeYesterday, dayBeforeYesterday, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(last7DaysStart, yesterday, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(previous7DaysStart, previous7DaysEnd, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(last14DaysStart, yesterday, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(previous14DaysStart, previous14DaysEnd, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(last30DaysStart, yesterday, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(previous30DaysStart, previous30DaysEnd, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(quarterStart, yesterday, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(previousQuarterStart, previousQuarterEnd, brand.ga4Account.PropertyID, accessToken)
            ])
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Analytics API timeout - exceeded ${API_TIMEOUT/1000}s`)), API_TIMEOUT))
        ]).then(analyticsData => ({ type: 'analytics', data: analyticsData })).catch(error => {
          console.error(`[Analytics API Error] Brand: ${brandId}, PropertyID: ${brand.ga4Account.PropertyID}, Error:`, error.message);
          return { type: 'analytics', data: null };
        })
      );
    }

    // Execute all API calls in parallel with overall timeout
    const OVERALL_TIMEOUT = 50000; // 50 seconds total timeout
    const results = await Promise.race([
      Promise.all(apiCalls),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Overall API timeout - all API calls exceeded 50 seconds')), OVERALL_TIMEOUT))
    ]);

    // Process results
    results.forEach(result => {
      if (!result.data) return;

      switch (result.type) {
        case 'meta': {
          const metaData = result.data;
          const metaPeriods = [
            ['yesterday', 0, 1],
            ['last7Days', 2, 3],
            ['last14Days', 4, 5],
            ['last30Days', 6, 7],
            ['quarterly', 8, 9]
          ];
          metaPeriods.forEach(([period, cur, prev]) => {
            periodData[period].metaspend = calculateMetrics(metaData[cur].metaspend, metaData[prev].metaspend);
            periodData[period].metaroas = calculateMetrics(metaData[cur].metaroas, metaData[prev].metaroas);
          });
          break;
        }

        case 'google': {
          const googleData = result.data;
          const googlePeriods = [
            ['yesterday', 0, 1],
            ['last7Days', 2, 3],
            ['last14Days', 4, 5],
            ['last30Days', 6, 7],
            ['quarterly', 8, 9]
          ];
          googlePeriods.forEach(([period, cur, prev]) => {
            periodData[period].googlespend = calculateMetrics(googleData[cur].spend, googleData[prev].spend);
            periodData[period].googleroas = calculateMetrics(googleData[cur].roas, googleData[prev].roas);
          });
          break;
        }

        case 'analytics': {
          const analyticsData = result.data;
          const analyticsPeriods = [
            ['yesterday', 0, 1],
            ['last7Days', 2, 3],
            ['last14Days', 4, 5],
            ['last30Days', 6, 7],
            ['quarterly', 8, 9]
          ];
          const analyticsKeys = ['sessions', 'addToCarts', 'checkouts', 'purchases', 'addToCartRate', 'purchaseRate', 'checkoutRate'];
          analyticsPeriods.forEach(([period, cur, prev]) => {
            analyticsKeys.forEach(key => {
              periodData[period][key] = calculateMetrics(analyticsData[cur][key], analyticsData[prev][key]);
            });
          });
          break;
        }
      }
    });

    res.status(200).json({
      success: true,
      periodData,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error in getUnifiedSummary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unified summary.'
    });
  }
}
