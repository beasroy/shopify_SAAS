import { fetchGoogleAdsData, fetchAnalyticsData, fetchMetaAdsData, buildMetricObject } from "./summary.js";
import { getGoogleAccessToken } from "./summary.js";
import nodemailer from "nodemailer"
import User from "../models/User.js";
import Brands from "../models/Brands.js";
import { client } from "./summary.js";

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

export async function getPlatformSummary(
  propertyId,
  metaAdsAccessToken,
  adAccountIds,
  googleAdsCustomer,
  googleAdsRefreshToken
) {
  try {
    // Get Google Ads access token
    const accessToken = await getGoogleAccessToken(googleAdsRefreshToken);

    // Array to store all platform metrics
    const allMetrics = [];

    // Fetch data for all date ranges
    for (let i = 0; i < 3; i++) {
      // Process each time period (yesterday, last 7 days, last 30 days)
      const currentStart = i === 0 ? dateRanges[0].start : i === 1 ? dateRanges[2].start : dateRanges[4].start;
      const currentEnd = i === 0 ? dateRanges[0].end : i === 1 ? dateRanges[2].end : dateRanges[4].end;
      const prevStart = i === 0 ? dateRanges[1].start : i === 1 ? dateRanges[3].start : dateRanges[5].start;
      const prevEnd = i === 0 ? dateRanges[1].end : i === 1 ? dateRanges[3].end : dateRanges[5].end;

      const periodLabel = i === 0 ? 'yesterday' : i === 1 ? 'week' : 'month';

      // Fetch data in parallel
      const [
        currentAnalyticsData,
        prevAnalyticsData,
        currentMetaAdsData,
        prevMetaAdsData,
        currentGoogleAdsData,
        prevGoogleAdsData
      ] = await Promise.all([
        // Google Analytics
        fetchAnalyticsData(currentStart, currentEnd, propertyId, accessToken),
        fetchAnalyticsData(prevStart, prevEnd, propertyId, accessToken),

        // Meta Ads
        fetchMetaAdsData(currentStart, currentEnd, metaAdsAccessToken, adAccountIds),
        fetchMetaAdsData(prevStart, prevEnd, metaAdsAccessToken, adAccountIds),

        // Google Ads
        fetchGoogleAdsData(currentStart, currentEnd, googleAdsCustomer),
        fetchGoogleAdsData(prevStart, prevEnd, googleAdsCustomer)
      ]);

      // Build combined platform metrics for the current period
      const platformMetrics = {
        period: periodLabel,
        analytics: {
          sessions: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            currentAnalyticsData.sessions, prevAnalyticsData.sessions
          ),
          addToCarts: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            currentAnalyticsData.addToCarts, prevAnalyticsData.addToCarts
          ),
          checkouts: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            currentAnalyticsData.checkouts, prevAnalyticsData.checkouts
          ),
          purchases: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            currentAnalyticsData.purchases, prevAnalyticsData.purchases
          )
        },
        metaAds: {
          spend: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            currentMetaAdsData.spend, prevMetaAdsData.spend
          ),
          roas: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            currentMetaAdsData.roas, prevMetaAdsData.roas
          )
        },
        googleAds: {
          spend: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            currentGoogleAdsData.spend, prevGoogleAdsData.spend
          ),
          roas: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            currentGoogleAdsData.roas, prevGoogleAdsData.roas
          )
        },
      };

      allMetrics.push(platformMetrics);
    }
    return {
      success: true,
      data: {
        yesterday: allMetrics[0],
        week: allMetrics[1],
        month: allMetrics[2]
      }
    };
  } catch (error) {
    console.error('Error fetching platform summary:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch platform summary'
    };
  }
}

const smtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'team@messold.com',
    pass: 'hqik hgtm bcbr eign'
  }
};

export async function sendAllBrandMetricsReports() {
  try {
    // Create transporter with SMTP configuration
    const transporter = nodemailer.createTransport(smtpConfig);

    // Fetch all users with their brands populated
    const users = await User.find().populate('brands');
    console.log(`Found ${users.length} users to process`);

    const results = {
      totalUsers: users.length,
      totalBrands: 0,
      totalEmailsSent: 0,
      failedEmails: []
    };

    // Process each user
    for (const user of users) {
      if (!user.email) {
        console.warn(`User ${user.username || user._id} has no email address, skipping`);
        continue;
      }

      if (!user.brands || user.brands.length === 0) {
        console.log(`User ${user.username} has no brands, skipping`);
        continue;
      }

      // Get the tokens from user
      const googleRefreshToken = user.googleRefreshToken;
      const metaAccessToken = user.fbAccessToken;

      // Fetch full brand details for each brand ID
      for (const brandId of user.brands) {
        try {
          // Fetch the brand details from the database
          const brand = await Brands.findById(brandId);

          if (!brand) {
            console.warn(`Brand with ID ${brandId} not found, skipping`);
            continue;
          }

          results.totalBrands++;

          // Extract necessary information from the brand
          const propertyId = brand.ga4Account.PropertyID;
          const adAccountIds = brand.fbAdAccounts || [];
          const googleAdsCustomerId = brand.googleAdAccount.clientId;
          const googleAdsManagerId = brand.googleAdAccount.managerId;

          const customer = client.Customer({
            customer_id: googleAdsCustomerId,
            refresh_token: googleRefreshToken,
            login_customer_id: googleAdsManagerId
          });



          // Skip if essential data is missing
          if (!propertyId || !googleRefreshToken || !metaAccessToken) {
            console.warn(`Missing required tokens for brand ${brand.name}, skipping`);
            continue;
          }

          // Fetch the platform metrics for this brand
          const metricsData = await getPlatformSummary(
            propertyId,
            metaAccessToken,
            adAccountIds,
            customer,
            googleRefreshToken
          );

          if (!metricsData.success) {
            console.error(`Failed to fetch metrics for brand ${brand.name}: ${metricsData.error}`);
            results.failedEmails.push({
              user: user.email,
              brand: brand.name,
              error: metricsData.error
            });
            continue;
          }

          // Send email for this brand
          const emailResult = await sendBrandMetricsEmail(
            transporter,
            user.email,
            brand.name,
            metricsData
          );

          if (emailResult.success) {
            results.totalEmailsSent++;
            console.log(`Sent email for brand ${brand.name} to user ${user.email}`);
          } else {
            results.failedEmails.push({
              user: user.email,
              brand: brand.name,
              error: emailResult.error
            });
          }
        } catch (brandError) {
          console.error(`Error processing brand ID ${brandId}:`, brandError);
          results.failedEmails.push({
            user: user.email,
            brandId: brandId,
            error: brandError.message
          });
        }
      }
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error in sendAllBrandMetricsReports:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function sendBrandMetricsEmail(transporter, userEmail, brandName, metricsData) {
  try {
    // Format numbers and percentages for display
    const formatNumber = (num) => {
      if (num === undefined || num === null) return 'N/A';
      return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
    };

    const formatPercentage = (num) => {
      if (num === undefined || num === null) return 'N/A';
      return `${(Number(num) * 100).toFixed(2)}%`;
    };

    const formatCurrency = (num) => {
      if (num === undefined || num === null) return 'N/A';
      return `$${Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Build the HTML for a single period's metrics
    const buildPeriodMetricsHTML = (periodData, periodName) => {
      const { analytics, metaAds, googleAds } = periodData;

      return `
        <div class="period-container">
          <h2>${periodName.charAt(0).toUpperCase() + periodName.slice(1)} Performance</h2>
          
          <h3>Analytics</h3>
          <table>
            <tr>
              <th>Metric</th>
              <th>Current</th>
              <th>Previous</th>
              <th>Change</th>
            </tr>
            <tr>
              <td>Sessions</td>
              <td>${formatNumber(analytics.sessions.current)}</td>
              <td>${formatNumber(analytics.sessions.previous)}</td>
              <td class="${analytics.sessions.percentChange >= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(analytics.sessions.percentChange)}
              </td>
            </tr>
            <tr>
              <td>Add to Carts</td>
              <td>${formatNumber(analytics.addToCarts.current)}</td>
              <td>${formatNumber(analytics.addToCarts.previous)}</td>
              <td class="${analytics.addToCarts.percentChange >= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(analytics.addToCarts.percentChange)}
              </td>
            </tr>
            <tr>
              <td>Checkouts</td>
              <td>${formatNumber(analytics.checkouts.current)}</td>
              <td>${formatNumber(analytics.checkouts.previous)}</td>
              <td class="${analytics.checkouts.percentChange >= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(analytics.checkouts.percentChange)}
              </td>
            </tr>
            <tr>
              <td>Purchases</td>
              <td>${formatNumber(analytics.purchases.current)}</td>
              <td>${formatNumber(analytics.purchases.previous)}</td>
              <td class="${analytics.purchases.percentChange >= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(analytics.purchases.percentChange)}
              </td>
            </tr>
          </table>
          
          <h3>Meta Ads</h3>
          <table>
            <tr>
              <th>Metric</th>
              <th>Current</th>
              <th>Previous</th>
              <th>Change</th>
            </tr>
            <tr>
              <td>Spend</td>
              <td>${formatCurrency(metaAds.spend.current)}</td>
              <td>${formatCurrency(metaAds.spend.previous)}</td>
              <td class="${metaAds.spend.percentChange <= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(metaAds.spend.percentChange)}
              </td>
            </tr>
            <tr>
              <td>ROAS</td>
              <td>${formatNumber(metaAds.roas.current)}</td>
              <td>${formatNumber(metaAds.roas.previous)}</td>
              <td class="${metaAds.roas.percentChange >= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(metaAds.roas.percentChange)}
              </td>
            </tr>
          </table>
          
          <h3>Google Ads</h3>
          <table>
            <tr>
              <th>Metric</th>
              <th>Current</th>
              <th>Previous</th>
              <th>Change</th>
            </tr>
            <tr>
              <td>Spend</td>
              <td>${formatCurrency(googleAds.spend.current)}</td>
              <td>${formatCurrency(googleAds.spend.previous)}</td>
              <td class="${googleAds.spend.percentChange <= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(googleAds.spend.percentChange)}
              </td>
            </tr>
            <tr>
              <td>ROAS</td>
              <td>${formatNumber(googleAds.roas.current)}</td>
              <td>${formatNumber(googleAds.roas.previous)}</td>
              <td class="${googleAds.roas.percentChange >= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(googleAds.roas.percentChange)}
              </td>
            </tr>
          </table>
        </div>
      `;
    };

    // Generate the complete HTML template
    const yesterday = metricsData.data.yesterday;
    const week = metricsData.data.week;
    const month = metricsData.data.month;

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${brandName} Performance Metrics</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
          }
          h2 {
            color: #2980b9;
            margin-top: 30px;
          }
          h3 {
            color: #3498db;
            margin-top: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          .period-container {
            margin-bottom: 40px;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .positive {
            color: #27ae60;
          }
          .negative {
            color: #e74c3c;
          }
          .summary {
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
          }
          .brand-header {
            background-color: #2c3e50;
            color: white;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
          }
          .date {
            color: #7f8c8d;
            font-style: italic;
          }
          @media only screen and (max-width: 600px) {
            table, th, td {
              font-size: 14px;
            }
            th, td {
              padding: 8px;
            }
          }
        </style>
      </head>
      <body>
        <div class="brand-header">
          <h1>${brandName} Platform Performance</h1>
          <p class="date">Report generated on ${formattedDate}</p>
        </div>
        
        <div class="summary">
          <p>This report provides a summary of performance metrics for ${brandName} across three time periods.
          All metrics include comparison to the previous equivalent period.</p>
        </div>
        
        ${buildPeriodMetricsHTML(yesterday, 'Yesterday')}
        ${buildPeriodMetricsHTML(week, 'Last 7 Days')}
        ${buildPeriodMetricsHTML(month, 'Last 30 Days')}
        
        <p>This is an automated report. Please do not reply to this email.</p>
      </body>
      </html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: '"Analytics Reports" <team@messold.com>',
      to: userEmail,
      subject: `${brandName} Performance Metrics Report`,
      html: emailHTML
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error(`Error sending metrics email for brand ${brandName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}
