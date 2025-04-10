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

  return dateRanges;

}
export const mergeChunkResults = (chunkResults, adAccountIds) => {

  const accountMap = {};
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


  chunkResults.forEach((chunkResult, chunkIndex) => {

    chunkResult.forEach(accountData => {
   
      const account = accountMap[accountData.account_id];
      if (account) {
        if (!account.account_name && accountData.account_name) {
          account.account_name = accountData.account_name;
        }
        if (accountData.campaigns && accountData.campaigns.length > 0) {
          account.campaigns.push(...accountData.campaigns);
        } else {
          console.log(`No campaigns found for account ${accountData.account_id}`);
        }
      } else {
        console.log(`⚠️ Account map entry not found for ${accountData.account_id}`);
      }
    });
  });

  return mergedAccountData;
};
const processCampaignInsights = (campaign, insights) => {
  const content_view = insights.actions?.find(action => action.action_type === 'view_content')?.value || 0;
  const purchase = insights.actions?.find(action => action.action_type === 'purchase')?.value || 0;
  const addToCart = Number(insights.actions?.find(action => action.action_type === 'add_to_cart')?.value) || 0;
  const checkoutInitiated = Number(insights.actions?.find(action => action.action_type === 'initiate_checkout')?.value) || 0;
  const linkClick = insights.actions?.find(action => action.action_type === 'link_click')?.value || 0;
  const landingPageView = Number(insights.actions?.find(action => action.action_type === 'landing_page_view')?.value) || 0;
  const totalClicks = insights.clicks || 0;

  const cvToatcRate = content_view > 0 ? (addToCart / content_view) * 100 : 0;
  const atcToCIRate = addToCart > 0 ? (checkoutInitiated / addToCart) * 100 : 0;
  const ciToPurchaseRate = checkoutInitiated > 0 ? (purchase / checkoutInitiated) * 100 : 0;
  const conversionRate = linkClick > 0 ? (purchase / linkClick) * 100 : 0;
  const HighIntentClickRate = Number(parseFloat((((landingPageView + addToCart + checkoutInitiated) / totalClicks) * 100).toFixed(2))) || 0;

  const spend = parseFloat(insights.spend) || 0;
  const frequency = Number(parseFloat(insights.frequency).toFixed(2)) || 0;
  const outboundCTR = insights.outbound_clicks_ctr && insights.outbound_clicks_ctr.length > 0
    ? Number(parseFloat(insights.outbound_clicks_ctr[0].value).toFixed(2))
    : 0.00;
  const uniqueLinkClicks = Number(insights.unique_inline_link_clicks) || 0;
  const reach = Number(insights.reach) || 0;

  const cpmReachBased = reach > 0 ? spend / (reach / 1000) : 0;
  const cpa = {
    content_view: content_view > 0 ? spend / content_view : 0,
    add_to_cart: addToCart > 0 ? spend / addToCart : 0,
    checkout_initiated: checkoutInitiated > 0 ? spend / checkoutInitiated : 0,
    purchase: purchase > 0 ? spend / purchase : 0
  };

  const roas = parseFloat(parseFloat(insights.purchase_roas?.[0]?.value || 0).toFixed(2));

  const threeSecondsView = Number(insights.actions?.find(action => action.action_type === 'video_view')?.value) || 0;
  const HookRate = insights.impressions > 0 ? Number(parseFloat((threeSecondsView / insights.impressions) * 100).toFixed(2)) : 0;

  const video50Watched = insights.video_p50_watched_actions && insights.video_p50_watched_actions.length > 0
    ? Number(parseFloat(insights.video_p50_watched_actions[0].value).toFixed(2))
    : 0.00;

  const HoldRate = insights.impressions > 0 ? Number(parseFloat((video50Watched / insights.impressions) * 100).toFixed(2)) : 0;

  return {
    "campaignName": insights.campaign_name || "",
    "Status": campaign.status || "",
    "Amount spend": spend || 0,
    "Conversion Rate": parseFloat(conversionRate.toFixed(2)) || 0.00,
    "ROAS": roas || 0.00,
    "Reach": reach || 0.00,
    "Frequency": frequency || 0.00,
    "CPM": Number(parseFloat(insights.cpm).toFixed(2)) || 0.00,
    "CPM (Reach Based)": Number(parseFloat(cpmReachBased).toFixed(2)) || 0.00,
    "Link Click": Number(linkClick),
    "Outbound CTR": outboundCTR,
    "Audience Saturation Score": outboundCTR > 0 ? Number(parseFloat((frequency / outboundCTR) * 100).toFixed(2)) : 0.00,
    "Reach v/s Unique Click": uniqueLinkClicks > 0 ? Number(parseFloat((reach / uniqueLinkClicks).toFixed(2))) : 0.00,
    "High-Intent Click Rate": HighIntentClickRate || 0.00,
    "Hook Rate": HookRate || 0.00,
    "Hold Rate": HoldRate || 0.00,
    "Content View (CV)": Number(content_view),
    "Cost per CV": parseFloat(cpa.content_view.toFixed(2)),
    "Add To Cart (ATC)": Number(addToCart),
    "Cost per ATC": parseFloat(cpa.add_to_cart.toFixed(2)),
    "CV to ATC Rate": parseFloat(cvToatcRate.toFixed(2)),
    "Checkout Initiate (CI)": Number(checkoutInitiated),
    "Cost per CI": parseFloat(cpa.checkout_initiated.toFixed(2)),
    "ATC to CI Rate": parseFloat(atcToCIRate.toFixed(2)),
    "Purchases": Number(purchase),
    "Cost per purchase": parseFloat(cpa.purchase.toFixed(2)),
    "CI to Purchase Rate": parseFloat(ciToPurchaseRate.toFixed(2)),
    "Unique Link Click": uniqueLinkClicks || 0,
    "Landing Page View": landingPageView || 0,
    "Three Seconds View": threeSecondsView || 0,
    "Impressions": parseFloat(parseFloat(insights.impressions).toFixed(2))
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
        if (!campaign.insights?.data?.length) return;

        const insights = campaign.insights.data[0];
        accountName = insights.account_name || '';
        accountId = insights.account_id || '';

        campaigns.push(processCampaignInsights(campaign, insights));
      });
    } else {
      console.log(`[CAMPAIGN] Account ${accountId}: No campaigns data array in response`);
    }
  } else {
    console.log(`[ERROR] Failed to fetch campaigns for account ${accountId}: HTTP ${campaignResponse.code}`);
    console.log(`[ERROR] Response body: ${JSON.stringify(campaignResponse.body || {})}`);
  }

  return { account_name: accountName, account_id: accountId, campaigns };
};

export const fetchCampaignData = async (adAccountIds, accessToken, startDate, endDate) => {
  const batchRequests = adAccountIds.map((accountId) => ({
    method: 'GET',
    relative_url: `${accountId}/campaigns?fields=insights.time_range({'since':'${startDate}','until':'${endDate}'}){campaign_name,account_id,spend,reach,purchase_roas,frequency,cpm,account_name,actions,action_values,clicks,impressions,outbound_clicks_ctr,unique_inline_link_clicks,video_p50_watched_actions},status`,
  }));

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/`,
      { batch: batchRequests },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: accessToken },
      }
    );

    return adAccountIds.map((accountId, index) => 
      processCampaignResponse(response.data[index], accountId)
    );
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

  return blendedCampaigns;
};

export const fetchCampaignDataForLongPeriod = async (adAccountIds, accessToken, startDate, endDate, chunks = 4) => {
  const dateRanges = divideDateRange(startDate, endDate, chunks);

  try {
    console.log(`[INFO] Fetching data for ${adAccountIds.length} accounts over ${chunks} date chunks`);

    const chunkFetchPromises = dateRanges.map(range =>
      fetchCampaignData(adAccountIds, accessToken, range.startDate, range.endDate)
    );

    const allChunkResults = await Promise.all(chunkFetchPromises);

    const mergedResults = mergeChunkResults(allChunkResults, adAccountIds);

    let blendedSummary = [];
    if (adAccountIds.length > 1) {
        blendedSummary = createBlendedSummary(mergedResults);
    }

    return {
      accountData: mergedResults,
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

    const result = await fetchCampaignDataForLongPeriod(adAccountIds, accessToken, startDate, endDate, chunks);

    res.json(result);
  } catch (error) {
    console.error(`[ERROR] API error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};