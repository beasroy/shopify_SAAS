import axios from 'axios';
import { config } from 'dotenv';
import moment from 'moment';
import Brand from '../models/Brands.js';
import User from '../models/User.js';
import { GoogleAdsApi } from "google-ads-api";


config();

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
});

export const getAggregatedFbMetrics = (fbAdAccounts) => {
  if (!fbAdAccounts || fbAdAccounts.length === 0) {
    return {
      totalSpent: 0,
      totalRevenue: 0,
      totalROAS: 0,
      totalPurchases: 0,
      totalCTR: 0,
      totalCPC: 0,
      totalCPM: 0,
      totalCPP: 0,
      totalClicks: 0,
      totalImpressions: 0,
    };
  }

  let totalSpent = 0;
  let totalRevenue = 0;
  let totalPurchases = 0;
  let totalClicks = 0;
  let totalImpressions = 0;

  fbAdAccounts.forEach(account => {
    totalSpent += parseFloat(account.spend || '0');
    totalRevenue += parseFloat(account.Revenue?.value || '0');
    totalPurchases += parseFloat(account.purchases?.value || '0');
    totalClicks += parseFloat(account.clicks || '0');
    totalImpressions += parseFloat(account.impressions || '0');
  });

  return {
    totalSpent,
    totalRevenue,
    totalROAS: totalRevenue / totalSpent || 0,
    totalPurchases,
    totalCTR: (totalClicks / totalImpressions) * 100 || 0,
    totalCPC: totalSpent / totalClicks || 0,
    totalCPM: (totalSpent * 1000) / totalImpressions || 0,
    totalCPP: totalPurchases > 0 ? (totalSpent / totalPurchases) : 0,
    totalClicks,
    totalImpressions,
  };
};

const splitDateRangeIntoBatches = (startDate, endDate, monthsPerBatch = 3) => {
  const batches = [];
  let currentStart = moment(startDate);
  const finalEnd = moment(endDate);

  while (currentStart.isBefore(finalEnd)) {
    // Calculate batch end date (3 months from start or the final end date, whichever is earlier)
    let batchEnd = moment(currentStart).add(monthsPerBatch, 'months').subtract(1, 'day');
    if (batchEnd.isAfter(finalEnd)) {
      batchEnd = moment(finalEnd);
    }

    batches.push({
      start: currentStart.format('YYYY-MM-DD'),
      end: batchEnd.format('YYYY-MM-DD')
    });

    // Move to next batch start
    currentStart = moment(batchEnd).add(1, 'day');
  }

  return batches;
};

const fetchAdAccountInsights = async (adAccountIds, accessToken, startDate, endDate) => {

  const batchRequests = adAccountIds.map((accountId) => ({
    method: 'GET',
    relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,clicks,impressions,cpm,ctr,account_name,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
  }));

  const response = await axios.post(
    `https://graph.facebook.com/v21.0/`,
    { batch: batchRequests },
    {
      headers: { 'Content-Type': 'application/json' },
      params: { access_token: accessToken },
    }
  );

  const accountsData = adAccountIds.map((accountId, index) => {
    const accountResponse = response.data[index];
    const accountData = {
      adAccountId: accountId,
      account_name: '',
      spend: 0,
      purchase_roas: [],
      Revenue: null,
      purchases: null,
      cpm: 0,
      ctr: 0,
      cpc: 0,
      cpp: 0,
      clicks: 0,
      impressions: 0,
    };

    if (accountResponse.code === 200) {
      const accountBody = JSON.parse(accountResponse.body);

      if (accountBody.data && accountBody.data.length > 0) {
        const insight = accountBody.data[0];
        const purchase = insight.actions?.find((action) => action.action_type === 'purchase');

        return {
          ...accountData,
          account_name: insight.account_name || '',
          spend: insight.spend,
          purchase_roas: insight.purchase_roas?.map((roas) => ({
            action_type: roas.action_type,
            value: roas.value,
          })) || [],
          Revenue: insight.action_values?.find((action) => action.action_type === 'purchase') || null,
          purchases: purchase,
          cpm: insight.cpm || 0,
          ctr: insight.ctr || 0,
          cpc: insight.clicks ? (insight.spend / insight.clicks).toFixed(2) : 0,
          cpp: purchase?.value ? (insight.spend / purchase.value).toFixed(2) : 0,
          clicks: insight.clicks,
          impressions: insight.impressions,
        };
      }
    } else {
      console.log(`[ERROR] Failed to fetch insights for account ${accountId}: HTTP ${accountResponse.code}`);
    }

    return accountData;
  });

  return accountsData;
};



const fetchInterestData = async (adAccountIds, accessToken, startDate, endDate) => {
  try {
    // First, get all ad sets
    const batchRequests = adAccountIds.map((accountId) => ({
      method: 'GET',
      relative_url: `${accountId}/adsets?fields=id,name,targeting&time_range={'since':'${startDate}','until':'${endDate}'}`,
    }));

    const response = await axios.post(
      `https://graph.facebook.com/v21.0/`,
      { batch: batchRequests },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: accessToken },
      }
    );
    // Process ad sets and extract interests
    const accountInterestsData = await Promise.all(adAccountIds.map(async (accountId, index) => {
      const adSetsResponse = response.data[index];
      const interestMetrics = [];

      if (!adSetsResponse) {
        console.log(`[ERROR] No response data for account ${accountId} at index ${index}`);
        return { adAccountId: accountId, interestMetrics: [] };
      }

      if (adSetsResponse.code === 200) {
        const adSetsBody = JSON.parse(adSetsResponse.body);

        if (adSetsBody.data && adSetsBody.data.length > 0) {
          // Extract interests from each ad set
          const adSetInterests = adSetsBody.data.map(adSet => {
            const interests = adSet.targeting &&
              adSet.targeting.flexible_spec &&
              adSet.targeting.flexible_spec[0] &&
              adSet.targeting.flexible_spec[0].interests
              ? adSet.targeting.flexible_spec[0].interests
              : [];

            return {
              adSetId: adSet.id,
              adSetName: adSet.name,
              interests: interests
            };
          });

          if (adSetInterests.every(adSet => adSet.interests.length === 0)) {
            return { adAccountId: accountId, interestMetrics: [] };
          }

          // For each ad set with interests, get performance metrics
          const metricsPromises = adSetInterests.map(async (adSetData) => {
            try {
              if (adSetData.interests.length === 0) return null;

              const metricsResponse = await axios.get(
                `https://graph.facebook.com/v21.0/${adSetData.adSetId}/insights`,
                {
                  params: {
                    fields: 'spend,action_values',
                    time_range: JSON.stringify({ since: startDate, until: endDate }),
                    access_token: accessToken
                  }
                }
              );

              if (!metricsResponse.data.data || metricsResponse.data.data.length === 0) {
                return null;
              }

              const metrics = metricsResponse.data.data[0] || { spend: 0 };
              const purchaseValue = metrics.action_values ?
                metrics.action_values.find(action => action.action_type === 'purchase') :
                { value: 0 };

              const spend = parseFloat(metrics.spend || 0);
              const revenue = parseFloat(purchaseValue?.value || 0);

              return {
                ...adSetData,
                metrics: {
                  spend,
                  revenue,
                  roas: spend > 0 ? revenue / spend : 0,
                }
              };
            } catch (error) {
              console.error(`[ERROR] Error fetching metrics for ad set ${adSetData.adSetId}:`, error.message);
              if (error.response) {
                console.error(`[ERROR] Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
              }
              return null;
            }
          });

          const adSetResults = (await Promise.all(metricsPromises)).filter(Boolean);

          // Group by interest and calculate metrics
          const interestMetricsMap = {};

          adSetResults.forEach(result => {
            result.interests.forEach(interest => {
              const interestName = interest.name;

              if (!interestMetricsMap[interestName]) {
                interestMetricsMap[interestName] = {
                  Interest: interestName,
                  InterestId: interest.id,
                  Spend: 0,
                  Revenue: 0,
                };
              }

              interestMetricsMap[interestName].Spend += result.metrics.spend;
              interestMetricsMap[interestName].Revenue += result.metrics.revenue;
            });
          });

          // Convert the map to array and calculate ROAS for each interest
          Object.values(interestMetricsMap).forEach(interest => {
            interestMetrics.push({
              ...interest,
              Roas: interest.Spend > 0 ? interest.Revenue / interest.Spend : 0
            });
          });
        } else {
          console.log(`[INTEREST] Account ${accountId}: No ad sets found in response`);
        }
      } else {
        console.log(`[ERROR] Failed to fetch ad sets for account ${accountId}: HTTP ${adSetsResponse.code}`);
        console.log(`[ERROR] Response body: ${JSON.stringify(adSetsResponse.body || {})}`);
      }

      return {
        adAccountId: accountId,
        interestMetrics: interestMetrics
      };
    }));

    console.log(`[INTEREST] Summary: Retrieved interest data for ${accountInterestsData.filter(d => d.interestMetrics.length > 0).length} accounts out of ${adAccountIds.length}`);

    return accountInterestsData;
  } catch (error) {
    console.error(`[INTEREST] Error in fetchInterestData: ${error.message}`);
    console.error(`[INTEREST] Stack: ${error.stack}`);
    if (error.response) {
      console.error(`[INTEREST] Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
};

export const fetchFBAdAccountData = async (req, res) => {
  let { startDate, endDate, userId } = req.body;
  const { brandId } = req.params;

  console.log(`[API] Request received for brandId: ${brandId}, userId: ${userId}`);
  console.log(`[API] Date range: ${startDate} to ${endDate}`);

  try {
    // Set default date range if not provided
    if (!startDate || !endDate) {
      startDate = moment().startOf('month').format('YYYY-MM-DD');
      endDate = moment().format('YYYY-MM-DD');
      console.log(`[API] Using default date range: ${startDate} to ${endDate}`);
    }

    // Find brand and user
    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean()
    ]);

    if (!brand || !user) {
      console.log(`[API] ${!brand ? 'Brand' : 'User'} not found: ${!brand ? brandId : userId}`);
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.',
      });
    }

    const adAccountIds = brand.fbAdAccounts;

    if (!adAccountIds || adAccountIds.length === 0) {
      console.log(`[API] No Facebook Ads accounts found for brand ${brandId}`);
      return res.status(404).json({
        success: false,
        message: 'No Facebook Ads accounts found for this brand.',
      });
    }

    console.log(`[API] Found ${adAccountIds.length} ad accounts: ${adAccountIds.join(', ')}`);

    const accessToken = user.fbAccessToken;
    if (!accessToken) {
      console.log(`[API] User ${userId} does not have a valid Facebook access token`);
      return res.status(403).json({
        success: false,
        message: 'User does not have a valid Facebook access token.',
      });
    }

    // Validate the access token before proceeding
    try {
      console.log(`[API] Validating Facebook access token...`);
      const tokenValidationResponse = await axios.get(
        `https://graph.facebook.com/v21.0/debug_token`,
        {
          params: {
            input_token: accessToken,
            access_token: accessToken
          }
        }
      );

      const tokenData = tokenValidationResponse.data?.data;
      if (tokenData) {
        console.log(`[API] Token validation: Is valid: ${tokenData.is_valid}, Expires: ${new Date(tokenData.expires_at * 1000).toISOString()}`);
        if (!tokenData.is_valid) {
          console.log(`[API] Token is invalid: ${tokenData.error?.message || 'No error message'}`);
          return res.status(403).json({
            success: false,
            message: 'Facebook access token is invalid.',
          });
        }
      }
    } catch (tokenError) {
      console.error(`[API] Error validating token: ${tokenError.message}`);
      // Continue anyway, as the main request will fail if the token is invalid
    }

    // Calculate if the date range is large and needs to be batched
    const startMoment = moment(startDate);
    const endMoment = moment(endDate);
    const monthsDifference = endMoment.diff(startMoment, 'months');
    const isLongDateRange = monthsDifference >= 3;

    let results = [];

    if (isLongDateRange) {
      console.log(`[BATCH] Date range is ${monthsDifference} months, using batch processing`);
      const batches = splitDateRangeIntoBatches(startDate, endDate);
      console.log(`[BATCH] Split into ${batches.length} batches: ${JSON.stringify(batches)}`);

      // Process batches in parallel
      const batchResults = await Promise.all(batches.map(async (batch, batchIndex) => {
        console.log(`[BATCH] Processing batch ${batchIndex + 1}/${batches.length} from ${batch.start} to ${batch.end}`);

        try {
          const accountsData = await fetchAdAccountInsights(adAccountIds, accessToken, batch.start, batch.end)
          // Merge the data for each account
          return accountsData.map((accountData, index) => {
            return {
              ...accountData,
              dateRange: { start: batch.start, end: batch.end }
            };
          });
        } catch (batchError) {
          console.error(`[BATCH] Error processing batch ${batchIndex + 1}: ${batchError.message}`);
          return adAccountIds.map(accountId => ({
            adAccountId: accountId,
            dateRange: { start: batch.start, end: batch.end },
            error: batchError.message
          }));
        }
      }));

      // Merge all batch results into a single dataset
      results = mergeAccountDataAcrossBatches(batchResults.flat());
    } else {
      const accountsData = await fetchAdAccountInsights(adAccountIds, accessToken, startDate, endDate)
       
      // Merge the data for each account
      results = accountsData.map((accountData, index) => {
        return {
          ...accountData,
        };
      });
    }

    // Calculate aggregated metrics
    const aggregatedMetrics = getAggregatedFbMetrics(results);

   
    return res.status(200).json({
      success: true,
      data: results,
      aggregatedMetrics,
    });
  } catch (error) {
    console.error('[ERROR] Error fetching Facebook Ad Account :', error);
    if (error.response) {
      console.log(`[ERROR] API response status: ${error.response.status}`);
      console.log(`[ERROR] API response data:`, error.response.data);
    }
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching Facebook Ad Account  data.',
      error: error.message,
    });
  }
};

// Utility function to merge account data across batches
const mergeAccountDataAcrossBatches = (batchedAccounts) => {
  const accountMap = {};

  // Group by account ID
  batchedAccounts.forEach(account => {
    if (!accountMap[account.adAccountId]) {
      accountMap[account.adAccountId] = {
        adAccountId: account.adAccountId,
        account_name: account.account_name,
        spend: 0,
        purchase_roas: [],
        Revenue: { action_type: 'purchase', value: 0 },
        purchases: { action_type: 'purchase', value: 0 },
        cpm: 0,
        ctr: 0,
        clicks: 0,
        impressions: 0,
        batches: []
      };
    }

    // Add this batch's data to the account
    const currentAccount = accountMap[account.adAccountId];
    currentAccount.spend += parseFloat(account.spend || 0);
    currentAccount.clicks += parseFloat(account.clicks || 0);
    currentAccount.impressions += parseFloat(account.impressions || 0);

    // Merge Revenue and purchases
    if (account.Revenue) {
      currentAccount.Revenue.value += parseFloat(account.Revenue.value || 0);
    }

    if (account.purchases) {
      currentAccount.purchases.value += parseFloat(account.purchases.value || 0);
    }

    // Save batch information
    if (account.dateRange) {
      currentAccount.batches.push(account.dateRange);
    }
  });

  // Recalculate averages for each account
  Object.values(accountMap).forEach(account => {
    // Calculate CPM, CTR, CPC
    account.cpm = account.impressions > 0 ?
      ((account.spend / account.impressions) * 1000).toFixed(2) : 0;

    account.ctr = account.impressions > 0 ?
      ((account.clicks / account.impressions) * 100).toFixed(2) : 0;

    account.cpc = account.clicks > 0 ?
      (account.spend / account.clicks).toFixed(2) : 0;

    account.cpp = account.purchases?.value > 0 ?
      (account.spend / account.purchases.value).toFixed(2) : 0;

    // Recalculate ROAS
    account.purchase_roas = account.spend > 0 && account.Revenue ? [{
      action_type: 'purchase',
      value: (account.Revenue.value / account.spend).toFixed(2)
    }] : [];
  });

  return Object.values(accountMap);
};
export async function fetchGoogleAdAndCampaignMetrics(req, res) {
  const { brandId } = req.params;
  let { startDate, endDate } = req.body;

  const userId = req.user._id;

  try {
    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.',
      });
    }

    const refreshToken = user.googleAdsRefreshToken;
    if (!refreshToken) {
      return res.status(200).json({
        success: true,
        data: {},
        aggregatedMetrics: null
      });
    }

    // Access googleAdAccount as an array
    const googleAdAccounts = brand.googleAdAccount || [];

    if (!googleAdAccounts || googleAdAccounts.length === 0) {
      return res.json({
        success: true,
        data: {},
        aggregatedMetrics: null,
        message: "No Google ads accounts found for this brand"
      });
    }

    if (!startDate || !endDate) {
      startDate = moment().startOf('month').format('YYYY-MM-DD');
      endDate = moment().format('YYYY-MM-DD');
    }

    // Initialize arrays to store data from all accounts
    let allAdAccountsData = [];
    let combinedTotalSpend = 0;
    let combinedTotalClicks = 0;
    let combinedTotalConversionsValue = 0;
    let combinedTotalConversions = 0;
    let combinedTotalImpressions = 0;

    // Process each ad account
    for (const adAccount of googleAdAccounts) {
      const adAccountId = adAccount.clientId;
      const managerId = adAccount.managerId;

      if (!adAccountId || !managerId) {
        console.warn("Skipping ad account due to missing clientId or managerId");
        continue;
      }

      const customer = client.Customer({
        customer_id: adAccountId,
        refresh_token: refreshToken,
        login_customer_id: managerId
      });

      try {
        // Fetch reports for this account
        const adLevelReport = await customer.report({
          entity: "customer",
          attributes: ["customer.descriptive_name"],
          metrics: [
              "metrics.cost_micros",
              "metrics.conversions_value",
              "metrics.conversions",
              "metrics.clicks",
              "metrics.impressions"
            ],
            from_date: startDate,
            to_date: endDate,
          })

        // Process ad-level metrics for this account
        let accountTotalSpend = 0;
        let accountTotalClicks = 0;
        let accountTotalConversionsValue = 0;
        let accountTotalConversions = 0;
        let accountTotalImpressions = 0;
        let adAccountName = "";

        for (const row of adLevelReport) {
          const costMicros = row.metrics.cost_micros || 0;
          const spend = costMicros / 1_000_000;
          const impressions = row.metrics.impressions || 0;

          accountTotalSpend += spend;
          accountTotalConversionsValue += row.metrics.conversions_value || 0;
          accountTotalConversions += row.metrics.conversions || 0;
          accountTotalClicks += row.metrics.clicks || 0;
          accountTotalImpressions += impressions;

          if (!adAccountName && row.customer && row.customer.descriptive_name) {
            adAccountName = row.customer.descriptive_name;
          }
        }

        // Calculate metrics for this account
        const accountAdMetrics = {
          totalSpend: accountTotalSpend.toFixed(2),
          roas: accountTotalSpend > 0 ? (accountTotalConversionsValue / accountTotalSpend).toFixed(2) : 0,
          totalConversionsValue: accountTotalConversionsValue.toFixed(2),
          totalConversions: accountTotalConversions.toFixed(2),
          totalCPC: accountTotalClicks > 0 ? (accountTotalSpend / accountTotalClicks).toFixed(2) : 0,
          totalCPM: accountTotalImpressions > 0 ? ((accountTotalSpend * 1000) / accountTotalImpressions).toFixed(2) : 0,
          totalCTR: accountTotalImpressions > 0 ? ((accountTotalClicks / accountTotalImpressions) * 100).toFixed(2) : 0,
          totalCostPerConversion: accountTotalConversions > 0 ? (accountTotalSpend / accountTotalConversions).toFixed(2) : 0,
          totalClicks: accountTotalClicks,
          totalImpressions: accountTotalImpressions,
        };



        // Store data for this account
        allAdAccountsData.push({
          accountId: adAccountId,
          adAccountName,
          adMetrics: accountAdMetrics
        });


        // Add to combined totals for potential aggregation
        combinedTotalSpend += accountTotalSpend;
        combinedTotalClicks += accountTotalClicks;
        combinedTotalConversionsValue += accountTotalConversionsValue;
        combinedTotalConversions += accountTotalConversions;
        combinedTotalImpressions += accountTotalImpressions;

      } catch (accountError) {
        console.error(`Error processing ad account ${adAccountId}:`, accountError);
        // Continue with other accounts even if one fails
      }
    }

    // Determine if we need to calculate aggregated metrics
    let aggregatedMetrics = null;
    if (googleAdAccounts.length > 1 && allAdAccountsData.length > 1) {
      // Only calculate aggregated metrics if there are multiple accounts
      aggregatedMetrics = {
        totalSpent: parseFloat(combinedTotalSpend.toFixed(2)),
        totalRevenue: parseFloat(combinedTotalConversionsValue.toFixed(2)),
        totalROAS: combinedTotalSpend > 0 ? parseFloat((combinedTotalConversionsValue / combinedTotalSpend).toFixed(2)) : 0,
        totalPurchases: parseFloat(combinedTotalConversions.toFixed(2)),
        totalCTR: combinedTotalImpressions > 0 ? parseFloat(((combinedTotalClicks / combinedTotalImpressions) * 100).toFixed(2)) : 0,
        totalCPC: combinedTotalClicks > 0 ? parseFloat((combinedTotalSpend / combinedTotalClicks).toFixed(2)) : 0,
        totalCPM: combinedTotalImpressions > 0 ? parseFloat(((combinedTotalSpend * 1000) / combinedTotalImpressions).toFixed(2)) : 0,
        totalCPP: combinedTotalConversions > 0 ? parseFloat((combinedTotalSpend / combinedTotalConversions).toFixed(2)) : 0,
        totalClicks: combinedTotalClicks,
        totalImpressions: combinedTotalImpressions,
      };
    }

    // Return appropriate response based on number of accounts
    if (allAdAccountsData.length === 1) {
      // If only one account was processed, return its data directly
      const singleAccount = allAdAccountsData[0];
      return res.json({
        success: true,
        data: {
          adAccountName: singleAccount.adAccountName,
          adMetrics: singleAccount.adMetrics,
        },
        aggregatedMetrics: null // No aggregation needed for single account
      });
    } else {
      // Return all accounts data with aggregated metrics
      return res.json({
        success: true,
        data: {
          accounts: allAdAccountsData,
        },
        aggregatedMetrics
      });
    }

  } catch (error) {
    console.error("Failed to fetch Google Ads metrics:", error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: error.message,
      aggregatedMetrics: null
    });
  }
}





