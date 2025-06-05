import axios from 'axios';
import moment from 'moment';
import Brand from '../models/Brands.js';
import User from '../models/User.js';

export const divideDateRange = (startDate, endDate, chunks = 4) => {
  const start = moment(startDate);
  const end = moment(endDate);
  const totalDays = end.diff(start, 'days');
  const chunkSize = Math.ceil(totalDays / chunks);

  const dateRanges = [];
  for (let i = 0; i < chunks; i++) {
    const chunkStart = moment(start).add((i * chunkSize), 'days');
    const chunkEnd = i === chunks - 1
      ? moment(end)
      : moment(start).add((i + 1) * chunkSize - 1, 'days');

    dateRanges.push({
      startDate: chunkStart.format('YYYY-MM-DD'),
      endDate: chunkEnd.format('YYYY-MM-DD')
    });
  }

  console.log(`Date ranges created:`, dateRanges);
  return dateRanges;
};

const recalculateDerivedMetrics = (campaign) => {
  const spend = campaign["Amount spend"] || 0;
  const reach = campaign["Reach"] || 0;
  const linkClicks = campaign["Link Click"] || 0;
  const purchases = campaign["Purchases"] || 0;
  const contentViews = campaign["Content View (CV)"] || 0;
  const addToCart = campaign["Add To Cart (ATC)"] || 0;
  const checkoutInitiate = campaign["Checkout Initiate (CI)"] || 0;
  const impressions = campaign["Impressions"] || 0;
  const uniqueLinkClicks = campaign["Unique Link Click"] || 0;
  const clicks = impressions > 0 ? impressions * (campaign["Outbound CTR"] || 0) / 100 : 0;
  const landingPageViews = campaign["Landing Page View"] || 0;

  // Recalculate all derived metrics
  campaign["Conversion Rate"] = linkClicks > 0 ? 
    parseFloat(((purchases / linkClicks) * 100).toFixed(2)) : 0;
    
  campaign["CV to ATC Rate"] = contentViews > 0 ? 
    parseFloat(((addToCart / contentViews) * 100).toFixed(2)) : 0;
    
  campaign["ATC to CI Rate"] = addToCart > 0 ? 
    parseFloat(((checkoutInitiate / addToCart) * 100).toFixed(2)) : 0;
    
  campaign["CI to Purchase Rate"] = checkoutInitiate > 0 ? 
    parseFloat(((purchases / checkoutInitiate) * 100).toFixed(2)) : 0;
    
  campaign["CPM (Reach Based)"] = reach > 0 ? 
    parseFloat((spend / (reach / 1000)).toFixed(2)) : 0;
    
  campaign["Cost per CV"] = contentViews > 0 ? 
    parseFloat((spend / contentViews).toFixed(2)) : 0;
    
  campaign["Cost per ATC"] = addToCart > 0 ? 
    parseFloat((spend / addToCart).toFixed(2)) : 0;
    
  campaign["Cost per CI"] = checkoutInitiate > 0 ? 
    parseFloat((spend / checkoutInitiate).toFixed(2)) : 0;
    
  campaign["Cost per purchase"] = purchases > 0 ? 
    parseFloat((spend / purchases).toFixed(2)) : 0;
    
  campaign["Frequency"] = reach > 0 ? 
    parseFloat((impressions / reach).toFixed(2)) : 0;

  // Recalculate other derived metrics
  const highIntentClicks = landingPageViews + addToCart + checkoutInitiate;
  campaign["High-Intent Click Rate"] = clicks > 0 ? 
    parseFloat(((highIntentClicks / clicks) * 100).toFixed(2)) : 0;

  campaign["Reach v/s Unique Click"] = uniqueLinkClicks > 0 ? 
    parseFloat((reach / uniqueLinkClicks).toFixed(2)) : 0;

  const frequency = campaign["Frequency"];
  const outboundCTR = campaign["Outbound CTR"];
  campaign["Audience Saturation Score"] = outboundCTR > 0 ? 
    parseFloat(((frequency / outboundCTR) * 100).toFixed(2)) : 0;
};

export const mergeChunkResults = (chunkResults, adAccountIds) => {
  const accountMap = {};
  
  // Initialize account structure
  const mergedAccountData = adAccountIds.map(accountId => {
    const accountIdWithoutPrefix = accountId.replace('act_', '');
    const accountData = {
      account_id: accountId,  
      account_name: '',
      campaigns: []
    };
    accountMap[accountIdWithoutPrefix] = accountData;
    return accountData;
  });

  // Use a Map to track unique campaigns by their ID across all chunks
  const globalCampaignMap = new Map();

  chunkResults.forEach((chunkResult, chunkIndex) => {
    console.log(`Processing chunk ${chunkIndex + 1} with ${chunkResult.length} accounts...`);
    
    chunkResult.forEach(accountData => {
      const account = accountMap[accountData.account_id];
      if (!account) {
        console.log(`⚠️ Account map entry not found for ${accountData.account_id}`);
        return;
      }

      // Set account name if not already set
      if (!account.account_name && accountData.account_name) {
        account.account_name = accountData.account_name;
      }

      if (accountData.campaigns && accountData.campaigns.length > 0) {
        accountData.campaigns.forEach(campaign => {
          const campaignKey = `${accountData.account_id}_${campaign.campaignId}`;
          
          if (!globalCampaignMap.has(campaignKey)) {
            // First time seeing this campaign - add it to both map and account
            const campaignCopy = { ...campaign };
            globalCampaignMap.set(campaignKey, campaignCopy);
            account.campaigns.push(campaignCopy);
            console.log(`Added new campaign: ${campaign.campaignName} (${campaign.campaignId})`);
          } else {
            // Campaign exists - aggregate the metrics
            const existingCampaign = globalCampaignMap.get(campaignKey);
            
            console.log(`Aggregating data for campaign: ${campaign.campaignName}`);
            console.log(`Previous spend: ${existingCampaign["Amount spend"]}, Current spend: ${campaign["Amount spend"]}`);
            
            // Store original values for ROAS calculation
            const originalSpend = existingCampaign["Amount spend"] || 0;
            const originalROAS = existingCampaign["ROAS"] || 0;
            const newSpend = campaign["Amount spend"] || 0;
            const newROAS = campaign["ROAS"] || 0;
            
            // Aggregate raw metrics (these are additive)
            const additiveMetrics = [
              "Amount spend", "Link Click", "Content View (CV)", 
              "Add To Cart (ATC)", "Checkout Initiate (CI)", "Purchases", 
              "Unique Link Click", "Landing Page View", "Three Seconds View", "Impressions" , "Reach"
            ];
            
            additiveMetrics.forEach(metric => {
              existingCampaign[metric] = (existingCampaign[metric] || 0) + (campaign[metric] || 0);
            });

            // For Reach, take the maximum (reach doesn't add up across time periods)
            // existingCampaign["Reach"] = Math.max(`
            //   existingCampaign["Reach"] || 0, 
            //   campaign["Reach"] || 0
            // );

            // For ROAS, calculate weighted average based on spend
            const totalSpend = existingCampaign["Amount spend"];
            if (totalSpend > 0) {
              const weightedROAS = ((originalSpend * originalROAS) + (newSpend * newROAS)) / totalSpend;
              existingCampaign["ROAS"] = parseFloat(weightedROAS.toFixed(2));
            }

            // For CPM, calculate weighted average
            const originalCPM = campaign["CPM"] || 0;
            const existingCPM = existingCampaign["CPM"] || 0;
            const existingImpressions = existingCampaign["Impressions"] - (campaign["Impressions"] || 0);
            const totalImpressions = existingCampaign["Impressions"];
            
            if (totalImpressions > 0) {
              const weightedCPM = ((existingImpressions * existingCPM) + ((campaign["Impressions"] || 0) * originalCPM)) / totalImpressions;
              existingCampaign["CPM"] = parseFloat(weightedCPM.toFixed(2));
            }

            // For Outbound CTR, calculate weighted average based on impressions
            const originalOutboundCTR = campaign["Outbound CTR"] || 0;
            const existingOutboundCTR = existingCampaign["Outbound CTR"] || 0;
            
            if (totalImpressions > 0) {
              const weightedCTR = ((existingImpressions * existingOutboundCTR) + ((campaign["Impressions"] || 0) * originalOutboundCTR)) / totalImpressions;
              existingCampaign["Outbound CTR"] = parseFloat(weightedCTR.toFixed(6));
            }

            // For Hook Rate and Hold Rate, calculate weighted average based on impressions
            const originalHookRate = campaign["Hook Rate"] || 0;
            const existingHookRate = existingCampaign["Hook Rate"] || 0;
            const originalHoldRate = campaign["Hold Rate"] || 0;
            const existingHoldRate = existingCampaign["Hold Rate"] || 0;
            
            if (totalImpressions > 0) {
              const weightedHookRate = ((existingImpressions * existingHookRate) + ((campaign["Impressions"] || 0) * originalHookRate)) / totalImpressions;
              const weightedHoldRate = ((existingImpressions * existingHoldRate) + ((campaign["Impressions"] || 0) * originalHoldRate)) / totalImpressions;
              
              existingCampaign["Hook Rate"] = parseFloat(weightedHookRate.toFixed(2));
              existingCampaign["Hold Rate"] = parseFloat(weightedHoldRate.toFixed(2));
            }

            // Recalculate all derived metrics
            recalculateDerivedMetrics(existingCampaign);
            
            console.log(`After aggregation - Total spend: ${existingCampaign["Amount spend"]}, Aggregated ROAS: ${existingCampaign["ROAS"]}`);
          }
        });
      } else {
        console.log(`No campaigns found for account ${accountData.account_id}`);
      }
    });
  });

  return mergedAccountData;
};

const processCampaignInsights = (campaign, insights) => {
  // Get all action values
  const actionValues = insights.action_values || [];
  const actions = insights.actions || [];

  // Helper function to find action value
  const getActionValue = (actionType) => {
    const action = actionValues.find(a => a.action_type === actionType);
    return action ? parseFloat(action.value) : 0;
  };

  // Helper function to find action count
  const getActionCount = (actionType) => {
    const action = actions.find(a => a.action_type === actionType);
    return action ? parseInt(action.value) : 0;
  };

  // Get all required metrics
  const spend = parseFloat(insights.spend) || 0;
  const reach = parseFloat(insights.reach) || 0;
  const frequency = parseFloat(insights.frequency) || 0;
  const impressions = parseFloat(insights.impressions) || 0;
  const clicks = parseFloat(insights.clicks) || 0;
  const uniqueLinkClicks = parseFloat(insights.unique_inline_link_clicks) || 0;
  
  // Get outbound CTR
  const outboundCTR = insights.outbound_clicks_ctr?.[0]?.value 
    ? parseFloat(insights.outbound_clicks_ctr[0].value) 
    : 0;

  // Get video metrics
  const videoViews = getActionCount('video_view');
  const video50Watched = insights.video_p50_watched_actions?.[0]?.value 
    ? parseFloat(insights.video_p50_watched_actions[0].value) 
    : 0;

  // Get conversion metrics
  const contentViews = getActionCount('view_content');
  const addToCart = getActionCount('add_to_cart');
  const checkoutInitiated = getActionCount('initiate_checkout');
  const purchases = getActionCount('purchase');
  const linkClicks = getActionCount('link_click');
  const landingPageViews = getActionCount('landing_page_view');

  // Calculate derived metrics
  const cvToatcRate = contentViews > 0 ? (addToCart / contentViews) * 100 : 0;
  const atcToCIRate = addToCart > 0 ? (checkoutInitiated / addToCart) * 100 : 0;
  const ciToPurchaseRate = checkoutInitiated > 0 ? (purchases / checkoutInitiated) * 100 : 0;
  const conversionRate = linkClicks > 0 ? (purchases / linkClicks) * 100 : 0;
  const highIntentClickRate = clicks > 0 ? ((landingPageViews + addToCart + checkoutInitiated) / clicks) * 100 : 0;
  const cpmReachBased = reach > 0 ? spend / (reach / 1000) : 0;
  const hookRate = impressions > 0 ? (videoViews / impressions) * 100 : 0;
  const holdRate = impressions > 0 ? (video50Watched / impressions) * 100 : 0;

  // Calculate CPA metrics
  const cpa = {
    content_view: contentViews > 0 ? spend / contentViews : 0,
    add_to_cart: addToCart > 0 ? spend / addToCart : 0,
    checkout_initiated: checkoutInitiated > 0 ? spend / checkoutInitiated : 0,
    purchase: purchases > 0 ? spend / purchases : 0
  };

  // Fixed ROAS calculation - handle multiple ROAS values properly
  let roas = 0;
  if (insights.purchase_roas && insights.purchase_roas.length > 0) {
    // If there are multiple ROAS values, prioritize 'omni_purchase' or take the first one
    const omniROAS = insights.purchase_roas.find(r => r.action_type === 'omni_purchase');
    const purchaseROAS = insights.purchase_roas.find(r => r.action_type === 'purchase');
    
    if (omniROAS) {
      roas = parseFloat(omniROAS.value);
    } else if (purchaseROAS) {
      roas = parseFloat(purchaseROAS.value);
    } else {
      roas = parseFloat(insights.purchase_roas[0].value);
    }
  }

  return {
    "campaignId": campaign.id || "",
    "campaignName": insights.campaign_name || "",
    "Status": campaign.status || "",
    "Amount spend": spend,
    "Conversion Rate": parseFloat(conversionRate.toFixed(2)),
    "ROAS": parseFloat(roas.toFixed(2)),
    "Reach": reach,
    "Frequency": parseFloat(frequency.toFixed(2)),
    "CPM": parseFloat(insights.cpm || 0),
    "CPM (Reach Based)": parseFloat(cpmReachBased.toFixed(2)),
    "Link Click": linkClicks,
    "Outbound CTR": parseFloat(outboundCTR.toFixed(6)),
    "Audience Saturation Score": outboundCTR > 0 ? parseFloat(((frequency / outboundCTR) * 100).toFixed(2)) : 0,
    "Reach v/s Unique Click": uniqueLinkClicks > 0 ? parseFloat((reach / uniqueLinkClicks).toFixed(2)) : 0,
    "High-Intent Click Rate": parseFloat(highIntentClickRate.toFixed(2)),
    "Hook Rate": parseFloat(hookRate.toFixed(2)),
    "Hold Rate": parseFloat(holdRate.toFixed(2)),
    "Content View (CV)": contentViews,
    "Cost per CV": parseFloat(cpa.content_view.toFixed(2)),
    "Add To Cart (ATC)": addToCart,
    "Cost per ATC": parseFloat(cpa.add_to_cart.toFixed(2)),
    "CV to ATC Rate": parseFloat(cvToatcRate.toFixed(2)),
    "Checkout Initiate (CI)": checkoutInitiated,
    "Cost per CI": parseFloat(cpa.checkout_initiated.toFixed(2)),
    "ATC to CI Rate": parseFloat(atcToCIRate.toFixed(2)),
    "Purchases": purchases,
    "Cost per purchase": parseFloat(cpa.purchase.toFixed(2)),
    "CI to Purchase Rate": parseFloat(ciToPurchaseRate.toFixed(2)),
    "Unique Link Click": uniqueLinkClicks,
    "Landing Page View": landingPageViews,
    "Three Seconds View": videoViews,
    "Impressions": impressions
  };
};

const processCampaignResponse = (campaignResponse, accountId) => {
  let accountName = '';
  const campaigns = [];

  if (!campaignResponse) {
    console.log(`[ERROR] No response data for account ${accountId}`);
    return { account_name: '', account_id: accountId, campaigns: [] };
  }

  if (campaignResponse.code === 200) {
    const campaignBody = JSON.parse(campaignResponse.body);

    if (Array.isArray(campaignBody.data)) {
      campaignBody.data.forEach(campaign => {
        if (!campaign.insights?.data?.length) {
          console.log(`[CAMPAIGN] No insights data for campaign ${campaign.id} in account ${accountId}`);
          return;
        }

        const insights = campaign.insights.data[0];
        accountName = insights.account_name || '';
        
        const processedCampaign = processCampaignInsights(campaign, insights);
        campaigns.push(processedCampaign);
        
        console.log(`[CAMPAIGN] Processed campaign: ${processedCampaign.campaignName} - Spend: ${processedCampaign["Amount spend"]}, ROAS: ${processedCampaign.ROAS}`);
      });
    } else {
      console.log(`[CAMPAIGN] Account ${accountId}: No campaigns data array in response`);
    }
  } else {
    console.log(`[ERROR] Failed to fetch campaigns for account ${accountId}: HTTP ${campaignResponse.code}`);
    console.log(`[ERROR] Response body: ${JSON.stringify(campaignResponse.body || {})}`);
  }

  // Use account ID without 'act_' prefix for consistency
  const cleanAccountId = accountId.replace('act_', '');
  return { account_name: accountName, account_id: cleanAccountId, campaigns };
};

export const fetchCampaignData = async (adAccountIds, accessToken, startDate, endDate) => {
  const batchRequests = adAccountIds.map((accountId) => ({
    method: 'GET',
    relative_url: `${accountId}/campaigns?fields=insights.time_range({'since':'${startDate}','until':'${endDate}'}){campaign_name,account_id,spend,reach,purchase_roas,frequency,cpm,account_name,actions,action_values,clicks,impressions,outbound_clicks_ctr,unique_inline_link_clicks,video_p50_watched_actions},status`,
  }));

  try {
    console.log(`[API] Fetching campaign data for ${adAccountIds.length} accounts from ${startDate} to ${endDate}`);
    
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/`,
      { batch: batchRequests },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: accessToken },
      }
    );

    const results = adAccountIds.map((accountId, index) => 
      processCampaignResponse(response.data[index], accountId)
    );

    console.log(`[API] Successfully processed ${results.length} accounts`);
    return results;
  } catch (error) {
    console.error(`[CAMPAIGN] Error in fetchCampaignData: ${error.message}`);
    console.error(`[CAMPAIGN] Stack: ${error.stack}`);
    if (error.response) {
      console.error(`[CAMPAIGN] Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
};

export const createBlendedSummary = (accountData) => {
  const blendedCampaigns = [];

  accountData.forEach(account => {
    account.campaigns.forEach(campaign => {
      blendedCampaigns.push({
        ...campaign,
        accountName: account.account_name,
        accountId: account.account_id
      });
    });
  });

  console.log(`[BLEND] Created blended summary with ${blendedCampaigns.length} campaigns`);
  return blendedCampaigns;
};

// Add debugging function to help track data flow
export const debugCampaignData = (campaignData, label = "Campaign Data") => {
  console.log(`\n=== ${label} ===`);
  campaignData.forEach((account, accountIndex) => {
    console.log(`Account ${accountIndex + 1}: ID=${account.account_id}, Name=${account.account_name}`);
    account.campaigns.forEach((campaign, campaignIndex) => {
      console.log(`  Campaign ${campaignIndex + 1}: ${campaign.campaignName}`);
      console.log(`    Spend: ${campaign["Amount spend"]}, Reach: ${campaign["Reach"]}, ROAS: ${campaign["ROAS"]}`);
      console.log(`    Frequency: ${campaign["Frequency"]}, Impressions: ${campaign["Impressions"]}`);
    });
  });
  console.log("=".repeat(50));
};

export const fetchCampaignDataForLongPeriod = async (adAccountIds, accessToken, startDate, endDate) => {
  try {
    console.log(`[INFO] Fetching data for ${adAccountIds.length} accounts from ${startDate} to ${endDate}`);

    // Create a single batch request for all accounts
    const batchRequests = adAccountIds.map((accountId) => ({
      method: 'GET',
      relative_url: `${accountId}/campaigns?fields=insights.time_range({'since':'${startDate}','until':'${endDate}'}){campaign_name,account_id,spend,reach,purchase_roas,frequency,cpm,account_name,actions,action_values,clicks,impressions,outbound_clicks_ctr,unique_inline_link_clicks,video_p50_watched_actions},status`,
    }));

    // Implement rate limiting and retry logic
    const makeRequest = async (retryCount = 0) => {
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v21.0/`,
          { batch: batchRequests },
          {
            headers: { 'Content-Type': 'application/json' },
            params: { access_token: accessToken },
          }
        );

        // Process the response
        const results = adAccountIds.map((accountId, index) => 
          processCampaignResponse(response.data[index], accountId)
        );

        console.log(`[INFO] Successfully processed ${results.length} accounts`);
        return results;
      } catch (error) {
        if (error.response?.status === 429 && retryCount < 3) {
          // Rate limit hit, wait and retry
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`[RATE LIMIT] Waiting ${waitTime}ms before retry ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return makeRequest(retryCount + 1);
        }
        throw error;
      }
    };

    const results = await makeRequest();
    
    // Debug results
    debugCampaignData(results, "Final Results");

    let blendedSummary = [];
    if (adAccountIds.length > 1) {
      blendedSummary = createBlendedSummary(results);
    }

    return {
      accountData: results,
      blendedSummary
    };
  } catch (error) {
    console.error(`[ERROR] Error in fetchCampaignDataForLongPeriod: ${error.message}`);
    throw error;
  }
};

export const handleCampaignData = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const { brandId } = req.params;
    const userId = req.user.id;

    console.log(`[REQUEST] Processing campaign data request for brand ${brandId}, user ${userId}`);
    console.log(`[REQUEST] Date range: ${startDate} to ${endDate}`);

    if (!brandId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID and User ID are required.'
      });
    }

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

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const start = moment(startDate);
    const end = moment(endDate);
    const daysRange = end.diff(start, 'days');

    let chunks = 1;
    if (daysRange > 90) {
      chunks = Math.ceil(daysRange / 90);
    }

    console.log(`[REQUEST] Date range spans ${daysRange} days, using ${chunks} chunks`);

    const result = await fetchCampaignDataForLongPeriod(adAccountIds, accessToken, startDate, endDate, chunks);

    console.log(`[SUCCESS] Request completed successfully`);
    res.json(result);
  } catch (error) {
    console.error(`[ERROR] API error: ${error.message}`);
    console.error(`[ERROR] Stack trace: ${error.stack}`);
    res.status(500).json({ error: error.message });
  }
};