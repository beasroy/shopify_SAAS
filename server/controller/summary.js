import { config } from "dotenv";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
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
const formatDate = date => date.toISOString().split('T')[0];
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
      }
    );

    // Log raw response for debugging
    console.log('Raw Analytics Response:', JSON.stringify(response.data, null, 2));

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
      checkoutRate: calculateRate(aggregatedData.checkouts, aggregatedData.addToCarts),
      purchaseRate: calculateRate(aggregatedData.purchases, aggregatedData.checkouts)
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
// Function to fetch Facebook Ads data
export async function fetchMetaAdsData(startDate, endDate, accessToken, adAccountIds) {
  const batchRequests = adAccountIds.flatMap((accountId) => [
    {
      method: 'GET',
      relative_url: `${accountId}/insights?fields=spend,purchase_roas,action_values&time_range={'since':'${formatDate(startDate)}','until':'${formatDate(endDate)}'}`,
    },
  ]);

  const response = await axios.post(
    `https://graph.facebook.com/v21.0/`,
    { batch: batchRequests },
    {
      headers: { 'Content-Type': 'application/json' },
      params: { access_token: accessToken },
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
export async function getAnalyticsSummary(req, res) {
  try {
    const { brandId } = req.params;
    const { userId } = req.body;

    // Validate input
    if (!brandId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID and User ID are required.'
      });
    }

    // Find brand and user
    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean()
    ]);

    // Check if brand and user exist
    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found'
      });
    }

    // Get GA4 Property ID and Refresh Token
    const propertyId = brand.ga4Account?.PropertyID;
    const refreshToken = user.googleRefreshToken;

    // Validate Google Analytics access
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'GA4 Property ID is missing for this brand.'
      });
    }

    if (!refreshToken || refreshToken.trim() === '') {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(403).json({
        success: false,
        error: 'Access to Google Analytics API is forbidden.'
      });
    }

    const accessToken = await getGoogleAccessToken(refreshToken);
    const calculateDateRanges = () => {
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

      return [
        {
          start: yesterday,
          end: yesterday,
          period: 'yesterday',
          type: 'current'
        },
        {
          start: dayBeforeYesterday,
          end: dayBeforeYesterday,
          period: 'yesterday',
          type: 'previous'
        },
        {
          start: last7DaysStart,
          end: yesterday,
          period: 'last7Days',
          type: 'current'
        },
        {
          start: previous7DaysStart,
          end: previous7DaysEnd,
          period: 'last7Days',
          type: 'previous'
        },
        {
          start: last30DaysStart,
          end: yesterday,
          period: 'last30Days',
          type: 'current'
        },
        {
          start: previous30DaysStart,
          end: previous30DaysEnd,
          period: 'last30Days',
          type: 'previous'
        }
      ];
    };

    const dateRanges = calculateDateRanges();

    const periodData = {
      yesterday: {
        sessions: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        addToCarts: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        checkouts: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        purchases: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        addToCartRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        purchaseRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        checkoutRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      },
      last7Days: {
        sessions: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        addToCarts: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        checkouts: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        purchases: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        addToCartRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        purchaseRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        checkoutRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      },
      last30Days: {
        sessions: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        addToCarts: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        checkouts: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        purchases: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        addToCartRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        purchaseRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        checkoutRate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
      }
    };

    const results = await Promise.all(
      dateRanges.map(range => {
        console.log(`Fetching analytics data:
          Start: ${range.start.toString()},
          End: ${range.end.toString()},
          PropertyId: ${propertyId}
        `);

        return fetchAnalyticsData(range.start, range.end, propertyId, accessToken)
          .then(metrics => ({
            ...metrics,
            period: range.period,
            type: range.type
          }))
          .catch(error => {
            console.error(`Failed to fetch data for range:`, range, error);
            return null;
          });
      })
    );

    results.forEach(metrics => {
      if (!metrics) {
        console.warn(`No metrics found for range`);
        return;
      }

      // Explicitly map each metric
      const metricMap = {
        sessions: metrics.sessions || 0,
        addToCarts: metrics.addToCarts || 0,
        checkouts: metrics.checkouts || 0,
        purchases: metrics.purchases || 0,
        addToCartRate: metrics.addToCartRate || 0,
        checkoutRate: metrics.checkoutRate || 0,
        purchaseRate: metrics.purchaseRate || 0
      };

      // Update values for each metric
      Object.keys(metricMap).forEach(metricKey => {
        // Debug logging
        console.log(`Updating ${metricKey} for ${metrics.period} - ${metrics.type}:`, metricMap[metricKey]);

        periodData[metrics.period][metricKey][metrics.type] = Number(metricMap[metricKey]);
      });
    });

    const calculateMetrics = (current, previous) => {
      const numCurrent = Number(current);
      const numPrevious = Number(previous);

      const roundedCurrent = Number(numCurrent.toFixed(2));
      const roundedPrevious = Number(numPrevious.toFixed(2));

      const change = roundedPrevious > 0
        ? Number(((roundedCurrent - roundedPrevious) / roundedPrevious * 100).toFixed(2))
        : 0;

      // Determine trend
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

    // Define metrics explicitly
    const metrics = [
      'sessions',
      'addToCarts',
      'checkouts',
      'purchases',
      'addToCartRate',
      'checkoutRate',
      'purchaseRate'
    ];
    const periods = ['yesterday', 'last7Days', 'last30Days'];

    periods.forEach(period => {
      metrics.forEach(metric => {
        periodData[period][metric] = calculateMetrics(
          periodData[period][metric].current,
          periodData[period][metric].previous
        );
      });
    });

    res.status(200).json({
      success: true,
      periodData,
    });

  } catch (error) {
    console.error('Error in getAnalyticsSummary:', error);

    if (error.response) {
      if (error.response.status === 403) {
        return res.status(403).json({
          success: false,
          error: 'Access to Google Analytics API is forbidden.'
        });
      }
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data
      });
    } else if (error.request) {
      return res.status(500).json({
        success: false,
        error: 'No response received from Google Analytics API.'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics summary.'
      });
    }
  }
}
export async function getFacebookAdsSummary(req, res) {
  try {
    const { brandId } = req.params;
    const { userId } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean()
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found'
      });
    }

    const adAccountIds = brand.fbAdAccounts;
    const accessToken = user.fbAccessToken;

    if (!adAccountIds || adAccountIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Facebook Ads accounts found for this brand.',
      });
    }

    if (!accessToken) {
      return res.status(403).json({
        success: false,
        message: 'User does not have a valid Facebook access token.',
      });
    }

    const calculateDateRanges = () => {
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


      return [
        {
          start: yesterday,
          end: yesterday,
          period: 'yesterday',
          type: 'current',
          metric: 'metaspend'
        },
        {
          start: dayBeforeYesterday,
          end: dayBeforeYesterday,
          period: 'yesterday',
          type: 'previous',
          metric: 'metaspend'
        },
        {
          start: yesterday,
          end: yesterday,
          period: 'yesterday',
          type: 'current',
          metric: 'metaroas'
        },
        {
          start: dayBeforeYesterday,
          end: dayBeforeYesterday,
          period: 'yesterday',
          type: 'previous',
          metric: 'metaroas'
        },
        {
          start: last7DaysStart,
          end: yesterday,
          period: 'last7Days',
          type: 'current',
          metric: 'metaspend'
        },
        {
          start: previous7DaysStart,
          end: previous7DaysEnd,
          period: 'last7Days',
          type: 'previous',
          metric: 'metaspend'
        },
        {
          start: last7DaysStart,
          end: yesterday,
          period: 'last7Days',
          type: 'current',
          metric: 'metaroas'
        },
        {
          start: previous7DaysStart,
          end: previous7DaysEnd,
          period: 'last7Days',
          type: 'previous',
          metric: 'metaroas'
        },
        {
          start: last30DaysStart,
          end: yesterday,
          period: 'last30Days',
          type: 'current',
          metric: 'metaspend'
        },
        {
          start: previous30DaysStart,
          end: previous30DaysEnd,
          period: 'last30Days',
          type: 'previous',
          metric: 'metaspend'
        },
        {
          start: last30DaysStart,
          end: yesterday,
          period: 'last30Days',
          type: 'current',
          metric: 'metaroas'
        },
        {
          start: previous30DaysStart,
          end: previous30DaysEnd,
          period: 'last30Days',
          type: 'previous',
          metric: 'metaroas'
        }
      ];
    };

    const dateRanges = calculateDateRanges();

    // Initialize period data structure
    const periodData = {
      yesterday: {
        metaspend: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        },
        metaroas: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        }
      },
      last7Days: {
        metaspend: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        },
        metaroas: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        }
      },
      last30Days: {
        metaspend: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        },
        metaroas: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        }
      }
    };


    // Fetch all metrics
    const results = await Promise.all(
      dateRanges.map(range =>
        fetchMetaAdsData(range.start, range.end, accessToken, adAccountIds)
      )
    );

    // Process results
    dateRanges.forEach((range, index) => {
      const metrics = results[index];
      // Ensure we're adding numbers
      const value = Number(metrics[range.metric] || 0);
      periodData[range.period][range.metric][range.type] += value;
    });


    const calculateMetrics = (current, previous) => {
      const numCurrent = Number(current);
      const numPrevious = Number(previous);

      const roundedCurrent = Number(numCurrent.toFixed(2));
      const roundedPrevious = Number(numPrevious.toFixed(2));

      const change = roundedPrevious > 0
        ? Number(((roundedCurrent - roundedPrevious) / roundedPrevious * 100).toFixed(2))
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

    // Apply calculations to each period
    periodData.yesterday.metaspend = calculateMetrics(
      periodData.yesterday.metaspend.current,
      periodData.yesterday.metaspend.previous
    );
    periodData.yesterday.metaroas = calculateMetrics(
      periodData.yesterday.metaroas.current,
      periodData.yesterday.metaroas.previous
    );

    periodData.last7Days.metaspend = calculateMetrics(
      periodData.last7Days.metaspend.current,
      periodData.last7Days.metaspend.previous
    );
    periodData.last7Days.metaroas = calculateMetrics(
      periodData.last7Days.metaroas.current,
      periodData.last7Days.metaroas.previous
    );

    periodData.last30Days.metaspend = calculateMetrics(
      periodData.last30Days.metaspend.current,
      periodData.last30Days.metaspend.previous
    );
    periodData.last30Days.metaroas = calculateMetrics(
      periodData.last30Days.metaroas.current,
      periodData.last30Days.metaroas.previous
    );

    res.status(200).json({
      success: true,
      periodData,
    });

  } catch (error) {
    console.error('Error fetching Facebook Ads summary:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      return res.status(403).json({ error: 'Access to Facebook Ads API is forbidden.' });
    }
    res.status(500).json({ error: 'Failed to fetch Facebook Ads summary.' });
  }
}
export async function getGoogleAdsSummary(req, res) {
  try {
    const { brandId } = req.params;
    const { userId } = req.body;

    // Run these database queries in parallel
    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean()
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found'
      });
    }

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'User does not have a valid Google refresh token.'
      });
    }

    // Check if googleAdAccount is available and has at least one account
    if (!brand.googleAdAccount || brand.googleAdAccount.length === 0) {
      return res.json({
        success: true,
        periodData: {},
        message: "No Google ads account found for this brand"
      });
    }

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


    // Create empty objects to store period-wise data
    const periodData = {
      yesterday: {
        spend: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        },
        roas: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        }
      },
      last7Days: {
        spend: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        },
        roas: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        }
      },
      last30Days: {
        spend: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        },
        roas: {
          current: 0,
          previous: 0,
          change: 0,
          trend: 'neutral'
        }
      }
    };

    // Process each Google Ad Account
    for (const adAccount of brand.googleAdAccount) {
      const adAccountId = adAccount.clientId;
      const managerId = adAccount.managerId;

      if (!adAccountId || adAccountId.length === 0) {
        continue; // Skip invalid accounts
      }

      // Initialize customer
      const customer = client.Customer({
        customer_id: adAccountId,
        refresh_token: refreshToken,
        login_customer_id: managerId
      });

      // Fetch data for each period
      const yesterdayMetrics = await fetchGoogleAdsData(yesterday, yesterday, customer);
      const dayBeforeYesterdayMetrics = await fetchGoogleAdsData(dayBeforeYesterday, dayBeforeYesterday, customer);

      const last7DaysMetrics = await fetchGoogleAdsData(last7DaysStart, yesterday, customer);
      const previous7DaysMetrics = await fetchGoogleAdsData(previous7DaysStart, previous7DaysEnd, customer);

      const last30DaysMetrics = await fetchGoogleAdsData(last30DaysStart, yesterday, customer);
      const previous30DaysMetrics = await fetchGoogleAdsData(previous30DaysStart, previous30DaysEnd, customer);

      // Aggregate metrics for Yesterday
      periodData.yesterday.spend.current += yesterdayMetrics.spend;
      periodData.yesterday.spend.previous += dayBeforeYesterdayMetrics.spend;
      periodData.yesterday.roas.current += yesterdayMetrics.roas;
      periodData.yesterday.roas.previous += dayBeforeYesterdayMetrics.roas;

      // Aggregate metrics for Last 7 Days
      periodData.last7Days.spend.current += last7DaysMetrics.spend;
      periodData.last7Days.spend.previous += previous7DaysMetrics.spend;
      periodData.last7Days.roas.current += last7DaysMetrics.roas;
      periodData.last7Days.roas.previous += previous7DaysMetrics.roas;

      // Aggregate metrics for Last 30 Days
      periodData.last30Days.spend.current += last30DaysMetrics.spend;
      periodData.last30Days.spend.previous += previous30DaysMetrics.spend;
      periodData.last30Days.roas.current += last30DaysMetrics.roas;
      periodData.last30Days.roas.previous += previous30DaysMetrics.roas;
    }

    // Calculate metrics for each period
    const calculateMetrics = (current, previous) => {
      // Round to 2 decimal places
      const roundedCurrent = Number(current.toFixed(2));
      const roundedPrevious = Number(previous.toFixed(2));

      // Calculate change percentage
      const change = roundedPrevious > 0
        ? Number(((roundedCurrent - roundedPrevious) / roundedPrevious * 100).toFixed(2))
        : 0;

      // Determine trend
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

    // Apply calculations to each period
    periodData.yesterday.spend = calculateMetrics(
      periodData.yesterday.spend.current,
      periodData.yesterday.spend.previous
    );
    periodData.yesterday.roas = calculateMetrics(
      periodData.yesterday.roas.current,
      periodData.yesterday.roas.previous
    );

    periodData.last7Days.spend = calculateMetrics(
      periodData.last7Days.spend.current,
      periodData.last7Days.spend.previous
    );
    periodData.last7Days.roas = calculateMetrics(
      periodData.last7Days.roas.current,
      periodData.last7Days.roas.previous
    );

    periodData.last30Days.spend = calculateMetrics(
      periodData.last30Days.spend.current,
      periodData.last30Days.spend.previous
    );
    periodData.last30Days.roas = calculateMetrics(
      periodData.last30Days.roas.current,
      periodData.last30Days.roas.previous
    );

    return res.status(200).json({
      success: true,
      periodData
    });

  } catch (error) {
    console.error("Failed to fetch Google Ads summary:", error);
    if (error.response?.status === 403) {
      return res.status(403).json({ error: 'Access to Google Ads API is forbidden.' });
    }
    res.status(500).json({ error: 'Failed to fetch Google Ads summary.' });
  }
}