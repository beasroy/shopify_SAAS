import { config } from "dotenv";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
import axios from 'axios'
import { OAuth2Client } from 'google-auth-library';
import { GoogleAdsApi } from "google-ads-api";

config();

const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
});

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

    // Calculate date ranges
    const today = new Date();
    const yesterday = new Date(today); 
    yesterday.setDate(yesterday.getDate() - 1);

    // Calculate last 7 days range
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    const previous7DaysStart = new Date(last7DaysStart);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);

    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);
    // Function to fetch analytics data
    async function fetchAnalyticsData(startDate, endDate) {
      const requestBody = {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
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

    // Fetch all required data
    const [
      todayMetrics,
      yesterdayMetrics,
      last7DaysMetrics,
      previous7DaysMetrics,
      last30DaysMetrics,
      previous30DaysMonthMetrics
    ] = await Promise.all([
      fetchAnalyticsData(today, today),
      fetchAnalyticsData(yesterday, yesterday),
      fetchAnalyticsData(last7DaysStart, today),
      fetchAnalyticsData(previous7DaysStart, last7DaysStart),
      fetchAnalyticsData(last30DaysStart, today),
      fetchAnalyticsData(previous30DaysStart, previous30DaysEnd)
    ]);

    // Calculate percentage changes
    function getPercentageChange(current, previous) {
      if (!previous) return 0;
      const change = ((current - previous) / previous) * 100;
      return Number(change.toFixed(2));
    }

    // Generate summaries with trends
    const summaries = {
      "Today": {
        title: "Today vs Yesterday",
        sessions: {
          current: todayMetrics.sessions,
          previous: yesterdayMetrics.sessions,
          change: getPercentageChange(todayMetrics.sessions, yesterdayMetrics.sessions),
          trend: todayMetrics.sessions >= yesterdayMetrics.sessions ? 'up' : 'down'
        },
        addToCarts: {
          current: todayMetrics.addToCarts,
          previous: yesterdayMetrics.addToCarts,
          change: getPercentageChange(todayMetrics.addToCarts, yesterdayMetrics.addToCarts),
          trend: todayMetrics.addToCarts >= yesterdayMetrics.addToCarts ? 'up' : 'down'
        },
        checkouts: {
          current: todayMetrics.checkouts,
          previous: yesterdayMetrics.checkouts,
          change: getPercentageChange(todayMetrics.checkouts, yesterdayMetrics.checkouts),
          trend: todayMetrics.checkouts >= yesterdayMetrics.checkouts ? 'up' : 'down'
        },
        purchases: {
          current: todayMetrics.purchases,
          previous: yesterdayMetrics.purchases,
          change: getPercentageChange(todayMetrics.purchases, yesterdayMetrics.purchases),
          trend: todayMetrics.purchases >= yesterdayMetrics.purchases ? 'up' : 'down'
        }
      },
      "Last 7 Days": {
        title: "Last 7 Days vs Previous 7 Days",
        sessions: {
          current: last7DaysMetrics.sessions,
          previous: previous7DaysMetrics.sessions,
          change: getPercentageChange(last7DaysMetrics.sessions, previous7DaysMetrics.sessions),
          trend: last7DaysMetrics.sessions >= previous7DaysMetrics.sessions ? 'up' : 'down'
        },
        addToCarts: {
          current: last7DaysMetrics.addToCarts,
          previous: previous7DaysMetrics.addToCarts,
          change: getPercentageChange(last7DaysMetrics.addToCarts, previous7DaysMetrics.addToCarts),
          trend: last7DaysMetrics.addToCarts >= previous7DaysMetrics.addToCarts ? 'up' : 'down'
        },
        checkouts: {
          current: last7DaysMetrics.checkouts,
          previous: previous7DaysMetrics.checkouts,
          change: getPercentageChange(last7DaysMetrics.checkouts, previous7DaysMetrics.checkouts),
          trend: last7DaysMetrics.checkouts >= previous7DaysMetrics.checkouts ? 'up' : 'down'
        },
        purchases: {
          current: last7DaysMetrics.purchases,
          previous: previous7DaysMetrics.purchases,
          change: getPercentageChange(last7DaysMetrics.purchases, previous7DaysMetrics.purchases),
          trend: last7DaysMetrics.purchases >= previous7DaysMetrics.purchases ? 'up' : 'down'
        }
      },
      "Last 30 Days": {
        title: "This Month vs Last Month",
        sessions: {
          current: last30DaysMetrics.sessions,
          previous: previous30DaysMonthMetrics.sessions,
          change: getPercentageChange(last30DaysMetrics.sessions, previous30DaysMonthMetrics.sessions),
          trend: last30DaysMetrics.sessions >= previous30DaysMonthMetrics.sessions ? 'up' : 'down'
        },
        addToCarts: {
          current: last30DaysMetrics.addToCarts,
          previous: previous30DaysMonthMetrics.addToCarts,
          change: getPercentageChange(last30DaysMetrics.addToCarts, previous30DaysMonthMetrics.addToCarts),
          trend: last30DaysMetrics.addToCarts >= previous30DaysMonthMetrics.addToCarts ? 'up' : 'down'
        },
        checkouts: {
          current: last30DaysMetrics.checkouts,
          previous: previous30DaysMonthMetrics.checkouts,
          change: getPercentageChange(last30DaysMetrics.checkouts, previous30DaysMonthMetrics.checkouts),
          trend: last30DaysMetrics.checkouts >= previous30DaysMonthMetrics.checkouts ? 'up' : 'down'
        },
        purchases: {
          current: last30DaysMetrics.purchases,
          previous: previous30DaysMonthMetrics.purchases,
          change: getPercentageChange(last30DaysMetrics.purchases, previous30DaysMonthMetrics.purchases),
          trend: last30DaysMetrics.purchases >= previous30DaysMonthMetrics.purchases ? 'up' : 'down'
        }
      }
    };
    res.status(200).json({
      success: true,
      summaries,
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

    const brand = await Brand.findById(brandId).lean();
    const user = await User.findById(userId).lean();

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

    // Calculate date ranges
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Calculate last 7 days range
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    const previous7DaysStart = new Date(last7DaysStart);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);

    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);

    // Function to fetch Facebook Ads data
    async function fetchAdsData(startDate, endDate) {
      const batchRequests = adAccountIds.flatMap((accountId) => [
        {
          method: 'GET',
          relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,clicks,impressions,cpm,ctr,account_name,action_values&time_range={'since':'${startDate.toISOString().split('T')[0]}','until':'${endDate.toISOString().split('T')[0]}'}`,
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

    // Fetch all required data
    const [
      todayMetrics,
      yesterdayMetrics,
      last7DaysMetrics,
      previous7DaysMetrics,
      last30DayMetrics,
      previous30DayMetrics
    ] = await Promise.all([
      fetchAdsData(today, today),
      fetchAdsData(yesterday, yesterday),
      fetchAdsData(last7DaysStart, today),
      fetchAdsData(previous7DaysStart, last7DaysStart),
      fetchAdsData(last30DaysStart, today),
      fetchAdsData(previous30DaysStart, previous30DaysEnd)
    ]);

    // Calculate percentage changes
    function getPercentageChange(current, previous) {
      if (!previous) return 0;
      const change = ((current - previous) / previous) * 100;
      return Number(change.toFixed(2));
    }

    const formatDate = (date) => date.toISOString().split('T')[0];

    const dateRanges = {
      "Today": {
        current: {
          start: formatDate(today),
          end: formatDate(today)
        },
        previous: {
          start: formatDate(yesterday),
          end: formatDate(yesterday)
        }
      },
      "Last 7 Days": {
        current: {
          start: formatDate(last7DaysStart),
          end: formatDate(today)
        },
        previous: {
          start: formatDate(previous7DaysStart),
          end: formatDate(last7DaysStart)
        }
      },
      "Last 30 Days": {
        current: {
          start: formatDate(last30DaysStart),
          end: formatDate(today)
        },
        previous: {
          start: formatDate(previous30DaysStart),
          end: formatDate(previous30DaysEnd)
        }
      }
    };


    // Generate summaries with trends
    const summaries = {
      "Today": {
        title: "Today vs Yesterday",
        dateRanges: dateRanges["Today"],
        spend: {
          current: Math.round(todayMetrics.spend),
          previous: Math.round(yesterdayMetrics.spend),
          change: getPercentageChange(todayMetrics.spend, yesterdayMetrics.spend),
          trend: Number(todayMetrics.spend) >= Number(yesterdayMetrics.spend) ? 'up' : 'down'
        },
        roas: {
          current: Number(todayMetrics.roas),
          previous: Math.round(yesterdayMetrics.roas),
          change: getPercentageChange(todayMetrics.roas, yesterdayMetrics.roas),
          trend: Number(todayMetrics.roas) >= Number(yesterdayMetrics.roas) ? 'up' : 'down'
        }
      },
      "Last 7 Days": {
        title: "Last 7 Days vs Previous 7 Days",
        dateRanges: dateRanges["Last 7 Days"],
        spend: {
          current: Math.round(last7DaysMetrics.spend),
          previous: Math.round(previous7DaysMetrics.spend),
          change: getPercentageChange(last7DaysMetrics.spend, previous7DaysMetrics.spend),
          trend: Number(last7DaysMetrics.spend) >= Number(previous7DaysMetrics.spend) ? 'up' : 'down'
        },
        roas: {
          current: Number(last7DaysMetrics.roas),
          previous: Math.round(previous7DaysMetrics.roas),
          change: getPercentageChange(last7DaysMetrics.roas, previous7DaysMetrics.roas),
          trend: Number(last7DaysMetrics.roas) >= Number(previous7DaysMetrics.roas) ? 'up' : 'down'
        },
      },
      "Last 30 Days": {
        title: "Last 30 Days vs Previous Last 30 Days",
        dateRanges: dateRanges["Last 30 Days"],
        spend: {
          current: Math.round(last30DayMetrics.spend),
          previous: Math.round(previous30DayMetrics.spend),
          change: getPercentageChange(last30DayMetrics.spend, previous30DayMetrics.spend),
          trend: Number(last30DayMetrics.spend) >= Number(previous30DayMetrics.spend) ? 'up' : 'down'
        },
        roas: {
          current: Number(last30DayMetrics.roas),
          previous: Math.round(previous30DayMetrics.roas),
          change: getPercentageChange(last30DayMetrics.roas, previous30DayMetrics.roas),
          trend: Number(last30DayMetrics.roas) >= Number(previous30DayMetrics.roas) ? 'up' : 'down'
        },
      }
    };


    res.status(200).json({
      success: true,
      summaries,
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

    const brand = await Brand.findById(brandId).lean();
    const user = await User.findById(userId).lean();

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

    const adAccountId = brand.googleAdAccount;

    if (!adAccountId || adAccountId.length === 0) {
      return res.json({
        success: true,
        summaries: {},
        message: "No Google ads account found for this brand"
      });
    }

    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Calculate last 7 days range
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    const previous7DaysStart = new Date(last7DaysStart);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);

    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const previous30DaysStart = new Date(last30DaysStart);
    previous30DaysStart.setDate(previous30DaysStart.getDate() - 30);
    const previous30DaysEnd = new Date(last30DaysStart);
    previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1);

    const customer = client.Customer({
      customer_id: adAccountId,
      refresh_token: refreshToken,
      login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
  });

    // Function to fetch Google Ads data for a specific date range
    async function fetchAdsData(startDate, endDate) {
      const report = await customer.report({
        entity: "customer",
        attributes: ["customer.descriptive_name"],
        metrics: [
          "metrics.cost_micros",
          "metrics.conversions_value",
        ],
        from_date: startDate.toISOString().split('T')[0],
        to_date: endDate.toISOString().split('T')[0],
      });

      let totalSpend = 0;
      let totalConversionsValue = 0;

      for (const row of report) {
        const costMicros = row.metrics.cost_micros || 0;
        const spend = costMicros / 1_000_000;
        totalSpend += spend;
        totalConversionsValue += row.metrics.conversions_value || 0;
      }

      return {
        spend: Number(totalSpend.toFixed(2)),
        roas: totalSpend > 0 ? Number((totalConversionsValue / totalSpend).toFixed(2)) : 0
      };
    }

    // Fetch all required data
    const [
      todayMetrics,
      yesterdayMetrics,
      last7DaysMetrics,
      previous7DaysMetrics,
      last30DaysMetrics,
      previous30DaysMetrics
    ] = await Promise.all([
      fetchAdsData(today, today),
      fetchAdsData(yesterday, yesterday),
      fetchAdsData(last7DaysStart, today),
      fetchAdsData(previous7DaysStart, last7DaysStart),
      fetchAdsData(last30DaysStart, today),
      fetchAdsData(previous30DaysStart, previous30DaysEnd)
    ]);

    // Calculate percentage changes
    function getPercentageChange(current, previous) {
      if (!previous) return 0;
      const change = ((current - previous) / previous) * 100;
      return Number(change.toFixed(2));
    }

    const formatDate = (date) => date.toISOString().split('T')[0];

    const dateRanges = {
      "Today": {
        current: {
          start: formatDate(today),
          end: formatDate(today)
        },
        previous: {
          start: formatDate(yesterday),
          end: formatDate(yesterday)
        }
      },
      "Last 7 Days": {
        current: {
          start: formatDate(last7DaysStart),
          end: formatDate(today)
        },
        previous: {
          start: formatDate(previous7DaysStart),
          end: formatDate(last7DaysStart)
        }
      },
      "Last 30 Days": {
        current: {
          start: formatDate(last30DaysStart),
          end: formatDate(today)
        },
        previous: {
          start: formatDate(previous30DaysStart),
          end: formatDate(previous30DaysEnd)
        }
      }
    };

    // Generate summaries with trends
    const summaries = {
      "Today": {
        title: "Today vs Yesterday",
        dateRanges: dateRanges["Today"],
        spend: {
          current: todayMetrics.spend,
          previous: yesterdayMetrics.spend,
          change: getPercentageChange(todayMetrics.spend, yesterdayMetrics.spend),
          trend: todayMetrics.spend >= yesterdayMetrics.spend ? 'up' : 'down'
        },
        roas: {
          current: todayMetrics.roas,
          previous: yesterdayMetrics.roas,
          change: getPercentageChange(todayMetrics.roas, yesterdayMetrics.roas),
          trend: todayMetrics.roas >= yesterdayMetrics.roas ? 'up' : 'down'
        }
      },
      "Last 7 Days": {
        title: "Last 7 Days vs Previous 7 Days",
        dateRanges: dateRanges["Last 7 Days"],
        spend: {
          current: last7DaysMetrics.spend,
          previous: previous7DaysMetrics.spend,
          change: getPercentageChange(last7DaysMetrics.spend, previous7DaysMetrics.spend),
          trend: last7DaysMetrics.spend >= previous7DaysMetrics.spend ? 'up' : 'down'
        },
        roas: {
          current: last7DaysMetrics.roas,
          previous: previous7DaysMetrics.roas,
          change: getPercentageChange(last7DaysMetrics.roas, previous7DaysMetrics.roas),
          trend: last7DaysMetrics.roas >= previous7DaysMetrics.roas ? 'up' : 'down'
        }
      },
      "Last 30 Days": {
        title: "Last 30 Days vs Previous 30 Days",
        dateRanges: dateRanges["Last 30 Days"],
        spend: {
          current: last30DaysMetrics.spend,
          previous: previous30DaysMetrics.spend,
          change: getPercentageChange(last30DaysMetrics.spend, previous30DaysMetrics.spend),
          trend: last30DaysMetrics.spend >= previous30DaysMetrics.spend ? 'up' : 'down'
        },
        roas: {
          current: last30DaysMetrics.roas,
          previous: previous30DaysMetrics.roas,
          change: getPercentageChange(last30DaysMetrics.roas, previous30DaysMetrics.roas),
          trend: last30DaysMetrics.roas >= previous30DaysMetrics.roas ? 'up' : 'down'
        }
      }
    };

    return res.status(200).json({
      success: true,
      summaries
    });

  } catch (error) {
    console.error("Failed to fetch Google Ads summary:", error);
    if (error.response?.status === 403) {
      return res.status(403).json({ error: 'Access to Google Ads API is forbidden.' });
    }
    res.status(500).json({ error: 'Failed to fetch Google Ads summary.' });
  }
}