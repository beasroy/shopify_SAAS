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


export const dateRanges = [
  { start: yesterday, end: yesterday },
  { start: dayBeforeYesterday, end: dayBeforeYesterday },
  { start: last7DaysStart, end: yesterday },
  { start: previous7DaysStart, end: previous7DaysEnd },
  { start: last30DaysStart, end: yesterday },
  { start: previous30DaysStart, end: previous30DaysEnd }
];



// Function to fetch analytics data
export async function fetchAnalyticsData(startDate, endDate,propertyId,accessToken) {
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

  // Sum up all rows for the date range
  const rows = response?.data?.rows || [];
  return rows.reduce((acc, row) => ({
    sessions: acc.sessions + Number(row.metricValues[0]?.value || 0),
    addToCarts: acc.addToCarts + Number(row.metricValues[1]?.value || 0),
    checkouts: acc.checkouts + Number(row.metricValues[2]?.value || 0),
    purchases: acc.purchases + Number(row.metricValues[3]?.value || 0)
  }), { sessions: 0, addToCarts: 0, checkouts: 0, purchases: 0 });
}
// Function to fetch Facebook Ads data
export async function fetchMetaAdsData(startDate, endDate,accessToken,adAccountIds) {
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
    spend: 0,
    revenue: 0,
    roas: 0,
  };

  // Process and aggregate data from all ad accounts
  for (let i = 0; i < adAccountIds.length; i++) {
    const accountResponse = response.data[i];

    if (accountResponse.code === 200) {
      const accountBody = JSON.parse(accountResponse.body);
      if (accountBody.data && accountBody.data.length > 0) {
        const insight = accountBody.data[0];
        const revenue = insight.action_values?.find((action) => action.action_type === 'purchase')?.value || 0;

        aggregatedData.spend += Number(insight.spend || 0);
        aggregatedData.revenue += Number(revenue);
      }
    }
  }
  aggregatedData.roas = aggregatedData.spend > 0 ? (aggregatedData.revenue / aggregatedData.spend).toFixed(2) : 0;

  return aggregatedData;
}

export async function fetchGoogleAdsData(startDate, endDate,customer) {
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

    const brand = await Brand.findById(brandId).lean();
    const user = await User.findById(userId).lean();

    if (!brand || !user) {
      return res.status(404).json({ success: false, message: !brand ? 'Brand not found.' : 'User not found' });
    }

    const propertyId = brand.ga4Account?.PropertyID;
    const refreshToken = user.googleRefreshToken;

    if (!refreshToken || refreshToken.trim() === '') {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden.' });
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const results = await Promise.all(
      dateRanges.map(range => fetchAnalyticsData(range.start, range.end,propertyId,accessToken))
    );

    // Destructure the results
    const [
      yesterdayMetrics,
      dayBeforeYesterdayMetrics,
      last7DaysMetrics,
      previous7DaysMetrics,
      last30DayMetrics,
      previous30DayMetrics
    ] = results;

    // Build the response structure
    const metricsSummary = {
      sessions: [
        buildMetricObject(
          "Yesterday",
          yesterday, yesterday,
          dayBeforeYesterday, dayBeforeYesterday,
          yesterdayMetrics.sessions,
          dayBeforeYesterdayMetrics.sessions
        ),
        buildMetricObject(
          "Last 7 Days",
          last7DaysStart, yesterday,
          previous7DaysStart, previous7DaysEnd,
          last7DaysMetrics.sessions,
          previous7DaysMetrics.sessions
        ),
        buildMetricObject(
          "Last 30 Days",
          last30DaysStart, yesterday,
          previous30DaysStart, previous30DaysEnd,
          last30DayMetrics.sessions,
          previous30DayMetrics.sessions
        )
      ],
      addToCarts: [
        buildMetricObject(
          "Yesterday",
          yesterday, yesterday,
          dayBeforeYesterday, dayBeforeYesterday,
          yesterdayMetrics.addToCarts,
          dayBeforeYesterdayMetrics.addToCarts
        ),
        buildMetricObject(
          "Last 7 Days",
          last7DaysStart, yesterday,
          previous7DaysStart, previous7DaysEnd,
          last7DaysMetrics.addToCarts,
          previous7DaysMetrics.addToCarts
        ),
        buildMetricObject(
          "Last 30 Days",
          last30DaysStart, yesterday,
          previous30DaysStart, previous30DaysEnd,
          last30DayMetrics.addToCarts,
          previous30DayMetrics.addToCarts
        )
      ],
      checkouts: [
        buildMetricObject(
          "Yesterday",
          yesterday, yesterday,
          dayBeforeYesterday, dayBeforeYesterday,
          yesterdayMetrics.checkouts,
          dayBeforeYesterdayMetrics.checkouts
        ),
        buildMetricObject(
          "Last 7 Days",
          last7DaysStart, yesterday,
          previous7DaysStart, previous7DaysEnd,
          last7DaysMetrics.checkouts,
          previous7DaysMetrics.checkouts
        ),
        buildMetricObject(
          "Last 30 Days",
          last30DaysStart, yesterday,
          previous30DaysStart, previous30DaysEnd,
          last30DayMetrics.checkouts,
          previous30DayMetrics.checkouts
        )
      ],
      purchases: [
        buildMetricObject(
          "Yesterday",
          yesterday, yesterday,
          dayBeforeYesterday, dayBeforeYesterday,
          yesterdayMetrics.purchases,
          dayBeforeYesterdayMetrics.purchases
        ),
        buildMetricObject(
          "Last 7 Days",
          last7DaysStart, yesterday,
          previous7DaysStart, previous7DaysEnd,
          last7DaysMetrics.purchases,
          previous7DaysMetrics.purchases
        ),
        buildMetricObject(
          "Last 30 Days",
          last30DaysStart, yesterday,
          previous30DaysStart, previous30DaysEnd,
          last30DayMetrics.purchases,
          previous30DayMetrics.purchases
        )
      ]
    };


    res.status(200).json({
      success: true,
      metricsSummary,
    });

  } catch (error) {
    console.error('Error fetching analytics summary:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden.' });
    }
    res.status(500).json({ error: 'Failed to fetch analytics summary.' });
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

    const dateRanges = [
      { start: yesterday, end: yesterday },
      { start: dayBeforeYesterday, end: dayBeforeYesterday },
      { start: last7DaysStart, end: yesterday },
      { start: previous7DaysStart, end: previous7DaysEnd },
      { start: last30DaysStart, end: yesterday },
      { start: previous30DaysStart, end: previous30DaysEnd }
    ];

    // Run all API calls in parallel
    const results = await Promise.all(
      dateRanges.map(range => fetchMetaAdsData(range.start, range.end,accessToken,adAccountIds))
    );

    // Destructure the results
    const [
      yesterdayMetrics,
      dayBeforeYesterdayMetrics,
      last7DaysMetrics,
      previous7DaysMetrics,
      last30DayMetrics,
      previous30DayMetrics
    ] = results;

    // Build the response structure
    const metricsSummary = {
      spend: [
        buildMetricObject(
          "Yesterday",
          yesterday, yesterday,
          dayBeforeYesterday, dayBeforeYesterday,
          yesterdayMetrics.spend,
          dayBeforeYesterdayMetrics.spend
        ),
        buildMetricObject(
          "Last 7 Days",
          last7DaysStart, yesterday,
          previous7DaysStart, previous7DaysEnd,
          last7DaysMetrics.spend,
          previous7DaysMetrics.spend
        ),
        buildMetricObject(
          "Last 30 Days",
          last30DaysStart, yesterday,
          previous30DaysStart, previous30DaysEnd,
          last30DayMetrics.spend,
          previous30DayMetrics.spend
        )
      ],
      roas: [
        buildMetricObject(
          "Yesterday",
          yesterday, yesterday,
          dayBeforeYesterday, dayBeforeYesterday,
          yesterdayMetrics.roas,
          dayBeforeYesterdayMetrics.roas
        ),
        buildMetricObject(
          "Last 7 Days",
          last7DaysStart, yesterday,
          previous7DaysStart, previous7DaysEnd,
          last7DaysMetrics.roas,
          previous7DaysMetrics.roas
        ),
        buildMetricObject(
          "Last 30 Days",
          last30DaysStart, yesterday,
          previous30DaysStart, previous30DaysEnd,
          last30DayMetrics.roas,
          previous30DayMetrics.roas
        )
      ]
    };

    res.status(200).json({
      success: true,
      metricsSummary,
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
        metricsSummary: {},
        message: "No Google ads account found for this brand"
      });
    }

    // Create empty objects to store aggregated metrics
    const aggregatedResults = {
      yesterdayMetrics: { spend: 0, roas: 0, totalConversionValue: 0 },
      dayBeforeYesterdayMetrics: { spend: 0, roas: 0, totalConversionValue: 0 },
      last7DaysMetrics: { spend: 0, roas: 0, totalConversionValue: 0 },
      previous7DaysMetrics: { spend: 0, roas: 0, totalConversionValue: 0 },
      last30DayMetrics: { spend: 0, roas: 0, totalConversionValue: 0 },
      previous30DayMetrics: { spend: 0, roas: 0, totalConversionValue: 0 }
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

      // Run all API calls in parallel for this account
      const results = await Promise.all(
        dateRanges.map(range => fetchGoogleAdsData(range.start, range.end, customer))
      );

      // Add results to aggregated metrics
      const [
        yesterdayMetrics,
        dayBeforeYesterdayMetrics,
        last7DaysMetrics,
        previous7DaysMetrics,
        last30DayMetrics,
        previous30DayMetrics
      ] = results;

      // Aggregate metrics
      aggregatedResults.yesterdayMetrics.spend += yesterdayMetrics.spend;
      aggregatedResults.yesterdayMetrics.totalConversionValue += yesterdayMetrics.spend * yesterdayMetrics.roas;
      
      aggregatedResults.dayBeforeYesterdayMetrics.spend += dayBeforeYesterdayMetrics.spend;
      aggregatedResults.dayBeforeYesterdayMetrics.totalConversionValue += dayBeforeYesterdayMetrics.spend * dayBeforeYesterdayMetrics.roas;
      
      aggregatedResults.last7DaysMetrics.spend += last7DaysMetrics.spend;
      aggregatedResults.last7DaysMetrics.totalConversionValue += last7DaysMetrics.spend * last7DaysMetrics.roas;
      
      aggregatedResults.previous7DaysMetrics.spend += previous7DaysMetrics.spend;
      aggregatedResults.previous7DaysMetrics.totalConversionValue += previous7DaysMetrics.spend * previous7DaysMetrics.roas;
      
      aggregatedResults.last30DayMetrics.spend += last30DayMetrics.spend;
      aggregatedResults.last30DayMetrics.totalConversionValue += last30DayMetrics.spend * last30DayMetrics.roas;
      
      aggregatedResults.previous30DayMetrics.spend += previous30DayMetrics.spend;
      aggregatedResults.previous30DayMetrics.totalConversionValue += previous30DayMetrics.spend * previous30DayMetrics.roas;
    }

    // Calculate final ROAS values
    for (const period in aggregatedResults) {
      const metrics = aggregatedResults[period];
      metrics.roas = metrics.spend > 0 ? Number((metrics.totalConversionValue / metrics.spend).toFixed(2)) : 0;
      metrics.spend = Number(metrics.spend.toFixed(2));
    }

    // Build the response structure with aggregated metrics
    const metricsSummary = {
      spend: [
        buildMetricObject(
          "Yesterday",
          yesterday, yesterday,
          dayBeforeYesterday, dayBeforeYesterday,
          aggregatedResults.yesterdayMetrics.spend,
          aggregatedResults.dayBeforeYesterdayMetrics.spend
        ),
        buildMetricObject(
          "Last 7 Days",
          last7DaysStart, yesterday,
          previous7DaysStart, previous7DaysEnd,
          aggregatedResults.last7DaysMetrics.spend,
          aggregatedResults.previous7DaysMetrics.spend
        ),
        buildMetricObject(
          "Last 30 Days",
          last30DaysStart, yesterday,
          previous30DaysStart, previous30DaysEnd,
          aggregatedResults.last30DayMetrics.spend,
          aggregatedResults.previous30DayMetrics.spend
        )
      ],
      roas: [
        buildMetricObject(
          "Yesterday",
          yesterday, yesterday,
          dayBeforeYesterday, dayBeforeYesterday,
          aggregatedResults.yesterdayMetrics.roas,
          aggregatedResults.dayBeforeYesterdayMetrics.roas
        ),
        buildMetricObject(
          "Last 7 Days",
          last7DaysStart, yesterday,
          previous7DaysStart, previous7DaysEnd,
          aggregatedResults.last7DaysMetrics.roas,
          aggregatedResults.previous7DaysMetrics.roas
        ),
        buildMetricObject(
          "Last 30 Days",
          last30DaysStart, yesterday,
          previous30DaysStart, previous30DaysEnd,
          aggregatedResults.last30DayMetrics.roas,
          aggregatedResults.previous30DayMetrics.roas
        )
      ]
    };

    return res.status(200).json({
      success: true,
      metricsSummary
    });

  } catch (error) {
    console.error("Failed to fetch Google Ads summary:", error);
    if (error.response?.status === 403) {
      return res.status(403).json({ error: 'Access to Google Ads API is forbidden.' });
    }
    res.status(500).json({ error: 'Failed to fetch Google Ads summary.' });
  }
} 