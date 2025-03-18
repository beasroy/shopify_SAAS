import { fetchGoogleAdsData, fetchAnalyticsData, fetchMetaAdsData, buildMetricObject, dateRanges } from "./summary.js";
import { getGoogleAccessToken } from "./summary.js";
import nodemailer from "nodemailer"
import User from "../models/User.js";
import Brands from "../models/Brands.js";
import { client } from "./summary.js";



const smtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: 'team@messold.com',
    pass: 'hqik hgtm bcbr eign'
  },
  tls: {
    rejectUnauthorized: false
  }
};

export async function getPlatformSummaryWithPartialData(
  propertyId,
  metaAdsAccessToken,
  adAccountIds,
  googleAdAccounts,
  googleAdsRefreshToken
) {
  try {
    // Get Google Ads access token if we have Google Ad accounts
    const hasGoogleAdsAccounts = googleAdAccounts && googleAdAccounts.length > 0 ;
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

      // Initialize analytics and Meta Ads promises
      const dataPromises = [
        // Google Analytics - always fetch
        fetchAnalyticsData(currentStart, currentEnd, propertyId, accessToken),
        fetchAnalyticsData(prevStart, prevEnd, propertyId, accessToken),

        // Meta Ads - fetch if adAccountIds exist
        adAccountIds && adAccountIds.length > 0 && metaAdsAccessToken
          ? fetchMetaAdsData(currentStart, currentEnd, metaAdsAccessToken, adAccountIds)
          : Promise.resolve(null),
        adAccountIds && adAccountIds.length > 0 && metaAdsAccessToken
          ? fetchMetaAdsData(prevStart, prevEnd, metaAdsAccessToken, adAccountIds)
          : Promise.resolve(null)
      ];

      // Execute analytics and Meta Ads promises
      const [
        currentAnalyticsData,
        prevAnalyticsData,
        currentMetaAdsData,
        prevMetaAdsData
      ] = await Promise.all(dataPromises);

      // Handle Google Ads data - we only fetch if accounts exist
      let aggregatedCurrentGoogleAdsData = { spend: 0, roas: 0, totalConversionValue: 0 };
      let aggregatedPrevGoogleAdsData = { spend: 0, roas: 0, totalConversionValue: 0 };

      if (hasGoogleAdsAccounts) {
        // Process each Google Ad Account
        for (const adAccount of googleAdAccounts) {
          if (!adAccount.clientId || adAccount.clientId.length === 0) {
            continue; // Skip invalid accounts
          }

          // Initialize customer for each account
          const customer = client.Customer({
            customer_id: adAccount.clientId,
            refresh_token: googleAdsRefreshToken,
            login_customer_id: adAccount.managerId
          });

          // Fetch data for this account
          const [currentData, prevData] = await Promise.all([
            fetchGoogleAdsData(currentStart, currentEnd, customer),
            fetchGoogleAdsData(prevStart, prevEnd, customer)
          ]);

          // Aggregate the data
          if (currentData) {
            aggregatedCurrentGoogleAdsData.spend += currentData.spend;
            aggregatedCurrentGoogleAdsData.totalConversionValue += currentData.spend * currentData.roas;
          }

          if (prevData) {
            aggregatedPrevGoogleAdsData.spend += prevData.spend;
            aggregatedPrevGoogleAdsData.totalConversionValue += prevData.spend * prevData.roas;
          }
        }

        // Calculate final ROAS values
        if (aggregatedCurrentGoogleAdsData.spend > 0) {
          aggregatedCurrentGoogleAdsData.roas = Number((aggregatedCurrentGoogleAdsData.totalConversionValue /
            aggregatedCurrentGoogleAdsData.spend).toFixed(2));
        }

        if (aggregatedPrevGoogleAdsData.spend > 0) {
          aggregatedPrevGoogleAdsData.roas = Number((aggregatedPrevGoogleAdsData.totalConversionValue /
            aggregatedPrevGoogleAdsData.spend).toFixed(2));
        }

        // Round spend values
        aggregatedCurrentGoogleAdsData.spend = Number(aggregatedCurrentGoogleAdsData.spend.toFixed(2));
        aggregatedPrevGoogleAdsData.spend = Number(aggregatedPrevGoogleAdsData.spend.toFixed(2));
      }

      // Default empty data for missing platforms
      const emptyMetaData = { spend: 0, roas: 0 };

      // Check if Meta data is available
      const hasMetaData = !!(adAccountIds && adAccountIds.length > 0 && metaAdsAccessToken && currentMetaAdsData);

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
            hasMetaData ? currentMetaAdsData.spend : emptyMetaData.spend,
            hasMetaData ? prevMetaAdsData.spend : emptyMetaData.spend
          ),
          roas: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            hasMetaData ? currentMetaAdsData.roas : emptyMetaData.roas,
            hasMetaData ? prevMetaAdsData.roas : emptyMetaData.roas
          ),
          dataAvailable: hasMetaData
        },
        googleAds: {
          spend: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            aggregatedCurrentGoogleAdsData.spend, aggregatedPrevGoogleAdsData.spend
          ),
          roas: buildMetricObject(
            periodLabel,
            currentStart, currentEnd, prevStart, prevEnd,
            aggregatedCurrentGoogleAdsData.roas, aggregatedPrevGoogleAdsData.roas
          ),
          dataAvailable: hasGoogleAdsAccounts
        }
      };

      allMetrics.push(platformMetrics);
    }

    console.log(allMetrics[0])

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
export async function sendAllBrandMetricsReports() {
  try {
    // Create transporter with SMTP configuration
    const transporter = nodemailer.createTransport(smtpConfig);

    const slackChannelMapping = {
      "Udd Studio": "uddstudio-aaaaglc336lhdjxxxckkhmuvya@messold-india.slack.com",
      "Theme My Party": "thememyparty-aaaagkvp77vveitk5ojzxwjaya@messold-india.slack.com",
      "House of Nitya": "house-of-nitya-aaaaock7yx7bitu43at4dawqaq@messold-india.slack.com",
      "The Oakery": "theoakery-aaaapegzoi3fhaahviptegy7pi@messold-india.slack.com",
      "The weaving cult": "theweavingcult-aaaapgs6j4yybz4oz4iqq2miau@messold-india.slack.com",
      "Kraftsmiths": "kraftsmiths-aaaagqabimb4faacblc3w6nghe@messold-india.slack.com",
      "Litlmeu": "litlemeu-aaaaofzywanliwgxizzhhupcpa@messold-india.slack.com",
      "Ethnic Trends By Shaheen": "ethnictrendsbyshaheen-aaaaolcjqr2dm7tyb2yfllpvna@messold-india.slack.com"
    };

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
          const googleAdAccounts = brand.googleAdAccount || [];

          // Skip if essential GA4 data is missing
          if (!propertyId || !googleRefreshToken) {
            console.warn(`Missing required GA4 tokens for brand ${brand.name}, skipping`);
            continue;
          }

          // Modified to handle Google Ads accounts array
          const metricsData = await getPlatformSummaryWithPartialData(
            propertyId,
            metaAccessToken,
            adAccountIds,
            googleAdAccounts,
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

          // Determine the recipient email based on user and brand
          let recipientEmail = user.email;

           if (user.email === 'team@messold.com') {
           //Check if there's a Slack channel mapping for this brand
            const slackChannelEmail = slackChannelMapping[brand.name];
             if (slackChannelEmail) {
              recipientEmail = slackChannelEmail;
               console.log(`Routing ${brand.name} email to Slack channel: ${slackChannelEmail}`);
             }
          }

          // Send email for this brand
          const emailResult = await sendBrandMetricsEmail(
            transporter,
            recipientEmail,
            brand.name,
            metricsData
          );

          if (emailResult.success) {
            results.totalEmailsSent++;
            console.log(`Sent email for brand ${brand.name} to ${recipientEmail}`);
          } else {
            results.failedEmails.push({
              user: recipientEmail,
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
export async function sendBrandMetricsEmail(transporter, userEmail, brandName, metricsData) {
  try {
    // Format numbers and percentages for display
    const formatNumber = (num) => {
      if (num === undefined || num === null) return 'N/A';
      return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    };

    const formatPercentage = (num) => {
      if (num === undefined || num === null) return 'N/A';
      return `${(Number(num))}%`;
    };

    const formatCurrency = (num) => {
      if (num === undefined || num === null) return 'N/A';
      return `₹${Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Get change indicator arrow with color
    const getChangeIndicator = (trend, value) => {
      if (trend === null || trend === undefined) return '';
      const absValue = (Number(value)).toFixed(1) + '%';
      if (trend === 'up') {
        return `<span style="color: #27ae60; font-weight: bold;">↑ ${absValue}</span>`;
      } else {
        return `<span style="color: #e74c3c; font-weight: bold;">↓ ${absValue}</span>`;
      }
    };

    // Build HTML for a single period's metrics in a point-wise format
    const buildPeriodMetricsHTML = (periodData, periodName) => {
      const { analytics, metaAds, googleAds } = periodData;
      // Check if googleAds is an array or doesn't exist
      // Create arrays for improvements and attention items
      const improvements = [];
      const attentionItems = [];

      // Check and add analytics metrics
      if (analytics.sessions.trend === 'up')
        improvements.push(`Sessions increased by ${formatPercentage(analytics.sessions.change)}`);
      else if (analytics.sessions.trend === 'down')
        attentionItems.push(`Sessions decreased by ${formatPercentage(analytics.sessions.change)}`);

      if (analytics.addToCarts.trend === 'up')
        improvements.push(`Add to Carts increased by ${formatPercentage(analytics.addToCarts.change)}`);
      else if (analytics.addToCarts.trend === 'down')
        attentionItems.push(`Add to Carts decreased by ${formatPercentage(analytics.addToCarts.change)}`);

      if (analytics.checkouts.trend === 'up')
        improvements.push(`Checkouts increased by ${formatPercentage(analytics.checkouts.change)}`);
      else if (analytics.checkouts.trend === 'down')
        attentionItems.push(`Checkouts decreased by ${formatPercentage(analytics.checkouts.change)}`);

      if (analytics.purchases.trend === 'up')
        improvements.push(`Purchases increased by ${formatPercentage(analytics.purchases.change)}`);
      else if (analytics.purchases.trend === 'down')
        attentionItems.push(`Purchases decreased by ${formatPercentage(analytics.purchases.change)}`);

      // Check and add Meta ads metrics
      if (metaAds && metaAds.spend && metaAds.spend.trend === 'up')
        improvements.push(`Meta Ads Spend improved by ${formatPercentage(metaAds.spend.change)}`);
      else if (metaAds && metaAds.spend && metaAds.spend.trend === 'down')
        attentionItems.push(`Meta Ads Spend decreased by ${formatPercentage(metaAds.spend.change)}`);

      if (metaAds && metaAds.roas && metaAds.roas.trend === 'up')
        improvements.push(`Meta Ads ROAS improved by ${formatPercentage(metaAds.roas.change)}`);
      else if (metaAds && metaAds.roas && metaAds.roas.trend === 'down')
        attentionItems.push(`Meta Ads ROAS decreased by ${formatPercentage(metaAds.roas.change)}`);

      if (googleAds && googleAds.dataAvailable && googleAds.spend && googleAds.spend.trend === 'up')
        improvements.push(`Google Ads Spend improved by ${formatPercentage(googleAds.spend.change)}`);
    else if (googleAds && googleAds.dataAvailable && googleAds.spend && googleAds.spend.trend === 'down')
        attentionItems.push(`Google Ads Spend decreased by ${formatPercentage(googleAds.spend.change)}`);
    
    // For Google Ads ROAS
    if (googleAds && googleAds.dataAvailable && googleAds.roas && googleAds.roas.trend === 'up')
        improvements.push(`Google Ads ROAS improved by ${formatPercentage(googleAds.roas.change)}`);
    else if (googleAds && googleAds.dataAvailable && googleAds.roas && googleAds.roas.trend === 'down')
        attentionItems.push(`Google Ads ROAS decreased by ${formatPercentage(googleAds.roas.change)}`);
    
    const googleAdsDataAvailable = googleAds && 
    googleAds.dataAvailable && 
    googleAds.spend && 
    googleAds.spend.current !== null && 
    googleAds.spend.current !== undefined;
    // Create the Google Ads HTML based on whether data is available
    const googleAdsHTML = googleAdsDataAvailable ? 
    `<li>
        <span class="metric-label">Google:</span> 
        <span class="current-value">${formatCurrency(googleAds.spend.current)}</span> spend
        <span class="previous-value">(prev: ${formatCurrency(googleAds.spend.previous)})</span>
        ${getChangeIndicator(googleAds.spend.trend, googleAds.spend.change)}
        with 
        <span class="current-value">${formatNumber(googleAds.roas.current)}x</span> ROAS
        <span class="previous-value">(prev: ${formatNumber(googleAds.roas.previous)}x)</span>
        ${getChangeIndicator(googleAds.roas.trend, googleAds.roas.change)}
      </li>` :
    `<li>
        <span class="metric-label">Google:</span> 
        <span class="unavailable-data">No data available</span>
      </li>`;

    return `
        <div class="period-section">
          <h2>${periodName.charAt(0).toUpperCase() + periodName.slice(1)} Performance Highlights</h2>
          <div class="insights-container">
            ${improvements.length > 0 ? `
            <div class="improvements">
              <h3>✓ What's Working Well</h3>
              <ul>
                ${improvements.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            ${attentionItems.length > 0 ? `
            <div class="attention-items">
              <h3>⚠ Areas for Improvement</h3>
              <ul>
                ${attentionItems.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
          </div>
          
          <!-- Metric Details After -->
          <div class="metrics-container">
            <div class="section-title">
              <h3>Detailed Metrics</h3>
            </div>
            
            <div class="metrics-summary">
              <p><strong>Website Traffic:</strong> 
                <span class="current-value">${formatNumber(analytics.sessions.current)}</span> sessions
                <span class="previous-value">(prev: ${formatNumber(analytics.sessions.previous)})</span>
                ${getChangeIndicator(analytics.sessions.trend, analytics.sessions.change)}
              </p>
              
              <p><strong>Conversion Funnel:</strong></p>
              <ul class="metrics-list">
                <li>
                  <span class="metric-label">Add to Carts:</span> 
                  <span class="current-value">${formatNumber(analytics.addToCarts.current)}</span>
                  <span class="previous-value">(prev: ${formatNumber(analytics.addToCarts.previous)})</span>
                  ${getChangeIndicator(analytics.addToCarts.trend, analytics.addToCarts.change)}
                </li>
                <li>
                  <span class="metric-label">Checkouts:</span> 
                  <span class="current-value">${formatNumber(analytics.checkouts.current)}</span>
                  <span class="previous-value">(prev: ${formatNumber(analytics.checkouts.previous)})</span>
                  ${getChangeIndicator(analytics.checkouts.trend, analytics.checkouts.change)}
                </li>
                <li>
                  <span class="metric-label">Purchases:</span> 
                  <span class="current-value">${formatNumber(analytics.purchases.current)}</span>
                  <span class="previous-value">(prev: ${formatNumber(analytics.purchases.previous)})</span>
                  ${getChangeIndicator(analytics.purchases.trend, analytics.purchases.change)}
                </li>
              </ul>
              
              <p><strong>Advertising:</strong></p>
              <ul class="metrics-list">
                <li>
                  <span class="metric-label">Meta:</span> 
                  <span class="current-value">${formatCurrency(metaAds.spend.current)}</span> spend
                  <span class="previous-value">(prev: ${formatCurrency(metaAds.spend.previous)})</span>
                  ${getChangeIndicator(metaAds.spend.trend, metaAds.spend.change)}
                  with 
                  <span class="current-value">${formatNumber(metaAds.roas.current)}x</span> ROAS
                  <span class="previous-value">(prev: ${formatNumber(metaAds.roas.previous)}x)</span>
                  ${getChangeIndicator(metaAds.roas.trend, metaAds.roas.change)}
                </li>
                ${googleAdsHTML}
              </ul>
            </div>
          </div>
        </div>
        <div class="divider"></div>
      `;
  };

  // Generate the complete HTML template
  const yesterday = metricsData.data.yesterday;
  const week = metricsData.data.week;
  const month = metricsData.data.month;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-IN', {
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
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>${brandName} Performance Metrics</title>
      <style>
        :root {
          color-scheme: light;
          supported-color-schemes: light;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f7fa;
          max-width: 650px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #2c3e50, #3498db);
          color: #ffffff;
          padding: 25px 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          text-align: center;
        }
        h1 {
          margin: 0 0 10px 0;
          font-weight: 600;
        }
        h2 {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 8px;
          margin-top: 0;
          font-size: 22px;
        }
        h3 {
          margin-top: 0;
          margin-bottom: 12px;
          font-size: 18px;
        }
        .section-title {
          margin-top: 25px;
          margin-bottom: 15px;
          border-bottom: 1px solid #eaeaea;
        }
        .section-title h3 {
          color: #2c3e50;
          font-size: 18px;
          margin: 0;
          padding-bottom: 8px;
        }
        .date-display {
          color: #f0f0f0;
          font-size: 14px;
        }
        .period-section {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 25px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .metrics-container {
          margin-top: 20px;
        }
        .metrics-summary {
          background-color: #f8f9fb;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #3498db;
        }
        .metrics-summary p {
          margin: 8px 0;
          font-size: 16px;
        }
        .metrics-list {
          list-style-type: none;
          padding-left: 10px;
          margin: 10px 0;
        }
        .metrics-list li {
          margin-bottom: 12px;
          padding-left: 10px;
          border-left: 2px solid #eaeaea;
        }
        .metric-label {
          font-weight: 500;
          color: #555;
          display: inline-block;
          width: 100px;
        }
        .current-value {
          font-weight: 700;
          color: #2c3e50;
          font-size: 16px;
        }
        .previous-value {
          color: #7f8c8d;
          font-size: 14px;
          margin-left: 5px;
        }
        .insights-container {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          margin-bottom: 20px;
        }

        .improvements, .attention-items {
          width: calc(50% - 5px); /* 5px on each side makes 10px gap total */
          box-sizing: border-box;
          padding: 15px;
          border-radius: 6px;
        }

        .improvements {
          background-color: rgba(39, 174, 96, 0.1);
          border-left: 6px solid #27ae60;
        }

        .attention-items {
          background-color: rgba(231, 76, 60, 0.1);
          border-left: 6px solid #e74c3c;
        }

        .improvements h3, .attention-items h3 {
          margin-top: 0;
          margin-bottom: 12px;
          font-size: 18px;
        }
        .improvements h3 {
          color: #27ae60;
        }
        .attention-items h3 {
          color: #e74c3c;
        }
        ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        li {
          margin-bottom: 8px;
        }
        .divider {
          height: 1px;
          background-color: #e0e0e0;
          margin: 0 0 25px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding: 20px;
          font-size: 14px;
          color: #7f8c8d;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 10px;
          }
          .insights-container {
            flex-direction: column;
            gap: 15px;
          } 
          .improvements, .attention-items {
            width: 100%;
          }
          .metrics-summary {
            padding: 12px;
          }
          .metrics-list li {
            padding-left: 5px;
          }
          .metric-label {
            width: auto;
            margin-right: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${brandName} Performance Report</h1>
        <div class="date-display">${formattedDate}</div>
      </div>
      
      ${buildPeriodMetricsHTML(yesterday, 'yesterday')}
      ${buildPeriodMetricsHTML(week, 'Last 7 Days')}
      ${buildPeriodMetricsHTML(month, 'Last 30 Days')}
      
      <div class="footer">
        <p>This is an automated report generated for ${brandName}.</p>
      </div>
    </body>
    </html>
    `;

  // Send the email
  const info = await transporter.sendMail({
    from: '"Brand Analytics" <team@messold.com>',
    to: userEmail,
    subject: `${brandName} Performance Metrics - ${formattedDate}`,
    html: emailHTML,
  });

  console.log('Email sent successfully:', info.messageId);
  return { success: true, messageId: info.messageId };
} catch (error) {
  console.error('Error sending brand metrics email:', error);
  return { success: false, error: error.message };
}
}

