import { config } from "dotenv";
import Brand from "../models/Brands.js";
import axios from 'axios'
import { OAuth2Client } from 'google-auth-library';
import { GoogleAdsApi } from "google-ads-api";

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

// Function to fetch Facebook Ads data
export async function fetchMetaAdsData(startDate, endDate, accessToken, adAccountIds) {
  return retryWithBackoff(async () => {
  const batchRequests = adAccountIds.flatMap((accountId) => [
    {
      method: 'GET',
      relative_url: `${accountId}/insights?fields=spend,purchase_roas,action_values&time_range={'since':'${formatDate(startDate)}','until':'${formatDate(endDate)}'}`,
    },
  ]);

  const response = await axios.post(
    `https://graph.facebook.com/v22.0/`,
    { batch: batchRequests },
    {
      headers: { 'Content-Type': 'application/json' },
      params: { access_token: accessToken },
        timeout: 15000, // 15 second timeout per request
    }
  );

  // Initialize aggregated metrics
  let aggregatedData = {
    metaspend: 0,
    metarevenue: 0,
    metaroas: 0,
  };

  // Process and aggregate data from all ad accounts
  for (let i = 0; i < adAccountIds.length; i++) {
    const accountResponse = response.data[i];

    if (accountResponse.code === 200) {
      const accountBody = JSON.parse(accountResponse.body);
      if (accountBody.data && accountBody.data.length > 0) {
        const insight = accountBody.data[0];
        const revenue = insight.action_values?.find((action) => action.action_type === 'purchase')?.value || 0;

        aggregatedData.metaspend += Number(insight.spend || 0);
        aggregatedData.metarevenue += Number(revenue);
      }
    }
  }
  aggregatedData.metaroas = aggregatedData.metaspend > 0 ? (aggregatedData.metarevenue / aggregatedData.metaspend).toFixed(2) : 0;

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
    return acc;
  }, { totalSpend: 0, totalConversionsValue: 0 });

  return {
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



// Individual endpoint for Meta/Facebook Ads data
export async function getMetaSummary(req, res) {
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
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);

    console.log(`[Meta API] Starting fetch for brand ${brandId} with ${brand.fbAdAccounts.length} accounts`);
    const startTime = Date.now();

    // Fetch all Meta data in parallel
    const [metaYesterday, metaDayBefore, metaLast7, metaPrev7, metaLast30, metaPrev30] = await Promise.all([
      fetchMetaAdsData(yesterday, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(dayBeforeYesterday, dayBeforeYesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(last7DaysStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(previous7DaysStart, previous7DaysEnd, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(last30DaysStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
      fetchMetaAdsData(previous30DaysStart, previous30DaysEnd, brand.fbAccessToken, brand.fbAdAccounts)
    ]);

    const periodData = {
      yesterday: {
        metaspend: calculateMetrics(metaYesterday.metaspend, metaDayBefore.metaspend),
        metaroas: calculateMetrics(metaYesterday.metaroas, metaDayBefore.metaroas),
      },
      last7Days: {
        metaspend: calculateMetrics(metaLast7.metaspend, metaPrev7.metaspend),
        metaroas: calculateMetrics(metaLast7.metaroas, metaPrev7.metaroas),
      },
      last30Days: {
        metaspend: calculateMetrics(metaLast30.metaspend, metaPrev30.metaspend),
        metaroas: calculateMetrics(metaLast30.metaroas, metaPrev30.metaroas),
      }
    };

    console.log(`[Meta API] Successfully fetched in ${Date.now() - startTime}ms`);

    res.status(200).json({
      success: true,
      periodData,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error(`[Meta API Error]`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Meta summary.',
      message: error.message
    });
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
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);

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
        fetchGoogleAdsData(last30DaysStart, yesterday, customer),
        fetchGoogleAdsData(previous30DaysStart, previous30DaysEnd, customer)
      ]);
    });

    const googleAccountsData = await Promise.all(googleAdsPromises);

    // Aggregate data from all accounts
    const aggregatedData = [
      { spend: 0, roas: 0 },
      { spend: 0, roas: 0 },
      { spend: 0, roas: 0 },
      { spend: 0, roas: 0 },
      { spend: 0, roas: 0 },
      { spend: 0, roas: 0 }
    ];

    googleAccountsData.forEach(accountData => {
      if (accountData) {
        accountData.forEach((periodData, index) => {
          aggregatedData[index].spend += periodData.spend;
          aggregatedData[index].roas += periodData.roas;
        });
      }
    });

    const periodData = {
      yesterday: {
        googlespend: calculateMetrics(aggregatedData[0].spend, aggregatedData[1].spend),
        googleroas: calculateMetrics(aggregatedData[0].roas, aggregatedData[1].roas),
      },
      last7Days: {
        googlespend: calculateMetrics(aggregatedData[2].spend, aggregatedData[3].spend),
        googleroas: calculateMetrics(aggregatedData[2].roas, aggregatedData[3].roas),
      },
      last30Days: {
        googlespend: calculateMetrics(aggregatedData[4].spend, aggregatedData[5].spend),
        googleroas: calculateMetrics(aggregatedData[4].roas, aggregatedData[5].roas),
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
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);

    console.log(`[Analytics API] Starting fetch for brand ${brandId}`);
    const startTime = Date.now();

    // Get access token and fetch all analytics data
    const accessToken = await getGoogleAccessToken(brand.googleAnalyticsRefreshToken);
    const [analyticsYesterday, analyticsDayBefore, analyticsLast7, analyticsPrev7, analyticsLast30, analyticsPrev30] = await Promise.all([
      fetchAnalyticsData(yesterday, yesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(dayBeforeYesterday, dayBeforeYesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(last7DaysStart, yesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(previous7DaysStart, previous7DaysEnd, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(last30DaysStart, yesterday, brand.ga4Account.PropertyID, accessToken),
      fetchAnalyticsData(previous30DaysStart, previous30DaysEnd, brand.ga4Account.PropertyID, accessToken)
    ]);

    const periodData = {
      yesterday: {
        sessions: calculateMetrics(analyticsYesterday.sessions, analyticsDayBefore.sessions),
        addToCarts: calculateMetrics(analyticsYesterday.addToCarts, analyticsDayBefore.addToCarts),
        checkouts: calculateMetrics(analyticsYesterday.checkouts, analyticsDayBefore.checkouts),
        purchases: calculateMetrics(analyticsYesterday.purchases, analyticsDayBefore.purchases),
        addToCartRate: calculateMetrics(analyticsYesterday.addToCartRate, analyticsDayBefore.addToCartRate),
        purchaseRate: calculateMetrics(analyticsYesterday.purchaseRate, analyticsDayBefore.purchaseRate),
        checkoutRate: calculateMetrics(analyticsYesterday.checkoutRate, analyticsDayBefore.checkoutRate),
      },
      last7Days: {
        sessions: calculateMetrics(analyticsLast7.sessions, analyticsPrev7.sessions),
        addToCarts: calculateMetrics(analyticsLast7.addToCarts, analyticsPrev7.addToCarts),
        checkouts: calculateMetrics(analyticsLast7.checkouts, analyticsPrev7.checkouts),
        purchases: calculateMetrics(analyticsLast7.purchases, analyticsPrev7.purchases),
        addToCartRate: calculateMetrics(analyticsLast7.addToCartRate, analyticsPrev7.addToCartRate),
        purchaseRate: calculateMetrics(analyticsLast7.purchaseRate, analyticsPrev7.purchaseRate),
        checkoutRate: calculateMetrics(analyticsLast7.checkoutRate, analyticsPrev7.checkoutRate),
      },
      last30Days: {
        sessions: calculateMetrics(analyticsLast30.sessions, analyticsPrev30.sessions),
        addToCarts: calculateMetrics(analyticsLast30.addToCarts, analyticsPrev30.addToCarts),
        checkouts: calculateMetrics(analyticsLast30.checkouts, analyticsPrev30.checkouts),
        purchases: calculateMetrics(analyticsLast30.purchases, analyticsPrev30.purchases),
        addToCartRate: calculateMetrics(analyticsLast30.addToCartRate, analyticsPrev30.addToCartRate),
        purchaseRate: calculateMetrics(analyticsLast30.purchaseRate, analyticsPrev30.purchaseRate),
        checkoutRate: calculateMetrics(analyticsLast30.checkoutRate, analyticsPrev30.checkoutRate),
      }
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
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);

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
      last30Days: createEmptyPeriodData()
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
            fetchMetaAdsData(last30DaysStart, yesterday, brand.fbAccessToken, brand.fbAdAccounts),
            fetchMetaAdsData(previous30DaysStart, previous30DaysEnd, brand.fbAccessToken, brand.fbAdAccounts)
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
            fetchGoogleAdsData(last30DaysStart, yesterday, customer),
            fetchGoogleAdsData(previous30DaysStart, previous30DaysEnd, customer)
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Google Ads API timeout - exceeded ${API_TIMEOUT/1000}s`)), API_TIMEOUT))
        ]);
      });

      apiCalls.push(
        Promise.all(googleAdsPromises).then(googleAccountsData => {
          const aggregatedData = [
            { spend: 0, roas: 0 },
            { spend: 0, roas: 0 },
            { spend: 0, roas: 0 },
            { spend: 0, roas: 0 },
            { spend: 0, roas: 0 },
            { spend: 0, roas: 0 }
          ];

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
              fetchAnalyticsData(last30DaysStart, yesterday, brand.ga4Account.PropertyID, accessToken),
              fetchAnalyticsData(previous30DaysStart, previous30DaysEnd, brand.ga4Account.PropertyID, accessToken)
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
          periodData.yesterday.metaspend = calculateMetrics(metaData[0].metaspend, metaData[1].metaspend);
          periodData.yesterday.metaroas = calculateMetrics(metaData[0].metaroas, metaData[1].metaroas);
          periodData.last7Days.metaspend = calculateMetrics(metaData[2].metaspend, metaData[3].metaspend);
          periodData.last7Days.metaroas = calculateMetrics(metaData[2].metaroas, metaData[3].metaroas);
          periodData.last30Days.metaspend = calculateMetrics(metaData[4].metaspend, metaData[5].metaspend);
          periodData.last30Days.metaroas = calculateMetrics(metaData[4].metaroas, metaData[5].metaroas);
          break;
        }

        case 'google': {
          const googleData = result.data;
          periodData.yesterday.googlespend = calculateMetrics(googleData[0].spend, googleData[1].spend);
          periodData.yesterday.googleroas = calculateMetrics(googleData[0].roas, googleData[1].roas);
          periodData.last7Days.googlespend = calculateMetrics(googleData[2].spend, googleData[3].spend);
          periodData.last7Days.googleroas = calculateMetrics(googleData[2].roas, googleData[3].roas);
          periodData.last30Days.googlespend = calculateMetrics(googleData[4].spend, googleData[5].spend);
          periodData.last30Days.googleroas = calculateMetrics(googleData[4].roas, googleData[5].roas);
          break;
        }

        case 'analytics': {
          const analyticsData = result.data;
          periodData.yesterday.sessions = calculateMetrics(analyticsData[0].sessions, analyticsData[1].sessions);
          periodData.yesterday.addToCarts = calculateMetrics(analyticsData[0].addToCarts, analyticsData[1].addToCarts);
          periodData.yesterday.checkouts = calculateMetrics(analyticsData[0].checkouts, analyticsData[1].checkouts);
          periodData.yesterday.purchases = calculateMetrics(analyticsData[0].purchases, analyticsData[1].purchases);
          periodData.yesterday.addToCartRate = calculateMetrics(analyticsData[0].addToCartRate, analyticsData[1].addToCartRate);
          periodData.yesterday.purchaseRate = calculateMetrics(analyticsData[0].purchaseRate, analyticsData[1].purchaseRate);
          periodData.yesterday.checkoutRate = calculateMetrics(analyticsData[0].checkoutRate, analyticsData[1].checkoutRate);

          periodData.last7Days.sessions = calculateMetrics(analyticsData[2].sessions, analyticsData[3].sessions);
          periodData.last7Days.addToCarts = calculateMetrics(analyticsData[2].addToCarts, analyticsData[3].addToCarts);
          periodData.last7Days.checkouts = calculateMetrics(analyticsData[2].checkouts, analyticsData[3].checkouts);
          periodData.last7Days.purchases = calculateMetrics(analyticsData[2].purchases, analyticsData[3].purchases);
          periodData.last7Days.addToCartRate = calculateMetrics(analyticsData[2].addToCartRate, analyticsData[3].addToCartRate);
          periodData.last7Days.purchaseRate = calculateMetrics(analyticsData[2].purchaseRate, analyticsData[3].purchaseRate);
          periodData.last7Days.checkoutRate = calculateMetrics(analyticsData[2].checkoutRate, analyticsData[3].checkoutRate);

          periodData.last30Days.sessions = calculateMetrics(analyticsData[4].sessions, analyticsData[5].sessions);
          periodData.last30Days.addToCarts = calculateMetrics(analyticsData[4].addToCarts, analyticsData[5].addToCarts);
          periodData.last30Days.checkouts = calculateMetrics(analyticsData[4].checkouts, analyticsData[5].checkouts);
          periodData.last30Days.purchases = calculateMetrics(analyticsData[4].purchases, analyticsData[5].purchases);
          periodData.last30Days.addToCartRate = calculateMetrics(analyticsData[4].addToCartRate, analyticsData[5].addToCartRate);
          periodData.last30Days.purchaseRate = calculateMetrics(analyticsData[4].purchaseRate, analyticsData[5].purchaseRate);
          periodData.last30Days.checkoutRate = calculateMetrics(analyticsData[4].checkoutRate, analyticsData[5].checkoutRate);
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
