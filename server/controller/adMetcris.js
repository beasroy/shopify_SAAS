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
    refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
});

export const fetchFBAdAccountAndCampaignData = async (req, res) => {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    let { startDate, endDate } = req.body;
    const { brandId } = req.params;

    try {
        // Find the brand by ID
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found.',
            });
        }

        const adAccountIds = brand.fbAdAccounts;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        // Set default date range to current month if not provided
        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD'); // First day of the current month
            endDate = moment().format('YYYY-MM-DD'); // Current date
        }

        // Create batch requests for each ad account
        const batchRequests = adAccountIds.flatMap((accountId) => [
            {
                method: 'GET',
                relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,clicks,impressions,cpm,ctr,account_name,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
            },
            {
                method: 'GET',
                relative_url: `${accountId}/campaigns?fields=insights.time_range({'since':'${startDate}','until':'${endDate}'}){campaign_name,spend,purchase_roas,account_name}`,
            },
        ]);

        // Send batch request to Facebook Graph API
        const response = await axios.post(
            `https://graph.facebook.com/v21.0/`,
            { batch: batchRequests },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                params: {
                    access_token: accessToken,
                },
            }
        );

        // Process the batch response
        const results = [];
        for (let i = 0; i < adAccountIds.length; i++) {
            const accountId = adAccountIds[i];

            // Ad Account Insights Response
            const accountResponse = response.data[i * 2];
            let accountData = {
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
                campaigns: [],
            };

            if (accountResponse.code === 200) {
                const accountBody = JSON.parse(accountResponse.body);
                if (accountBody.data && accountBody.data.length > 0) {
                    const insight = accountBody.data[0];
                    const purchase = insight.actions?.find((action) => action.action_type === 'purchase');

                    accountData = {
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
            }

            // Campaign Data Response
            const campaignResponse = response.data[i * 2 + 1];
            if (campaignResponse.code === 200) {
                const campaignBody = JSON.parse(campaignResponse.body);
                if (Array.isArray(campaignBody.data)) {
                    const filteredCampaigns = campaignBody.data.filter((campaign) => campaign.insights);
                    accountData.campaigns = filteredCampaigns.flatMap((campaign) => {
                        return campaign.insights.data.map((insight) => ({
                            campaign_name: insight.campaign_name,
                            spend: insight.spend,
                            purchase_roas: insight.purchase_roas,
                        }));
                    });
                }
            }

            results.push(accountData);
        }

        // Return the combined results
        return res.status(200).json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error('Error fetching Facebook Ad Account and Campaign Data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account and Campaign data.',
            error: error.message,
        });
    }
};

export async function fetchGoogleAdAndCampaignMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, userId } = req.body;

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

        const refreshToken = user.googleRefreshToken;
        if (!refreshToken) {
            return res.status(200).json([]);
        }

        const adAccountId = brand.googleAdAccount;

        if (!adAccountId || adAccountId.length === 0) {
            return res.json({
                success: true,
                data: {},
                message: "No Google ads account found for this brand"
            });
        }

        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
            endDate = moment().format('YYYY-MM-DD');
        }

        const customer = client.Customer({
            customer_id: adAccountId,
            refresh_token: refreshToken,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        // Fetch both reports in parallel
        const [adLevelReport, campaignLevelReport] = await Promise.all([
            customer.report({
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
            }),

            customer.report({
                entity: "campaign",
                attributes: ["campaign.id", "campaign.name", "customer.descriptive_name"],
                metrics: [
                    "metrics.cost_micros",
                    "metrics.conversions_value",
                    "metrics.impressions",
                    "metrics.clicks"
                ],
                from_date: startDate,
                to_date: endDate,
            })
        ]);

        // Process ad-level metrics
        let totalSpend = 0;
        let totalClicks = 0;
        let totalConversionsValue = 0;
        let totalConversions = 0;
        let totalImpressions = 0;
        let adAccountName = "";

        for (const row of adLevelReport) {
            const costMicros = row.metrics.cost_micros || 0;
            const spend = costMicros / 1_000_000;
            const impressions = row.metrics.impressions || 0;

            totalSpend += spend;
            totalConversionsValue += row.metrics.conversions_value || 0;
            totalConversions += row.metrics.conversions || 0;
            totalClicks += row.metrics.clicks || 0;
            totalImpressions += impressions;

            if (!adAccountName && row.customer && row.customer.descriptive_name) {
                adAccountName = row.customer.descriptive_name;
            }
        }

        // Calculate aggregated ad-level metrics
        const adMetrics = {
            totalSpend: totalSpend.toFixed(2),
            roas: totalSpend > 0 ? (totalConversionsValue / totalSpend).toFixed(2) : 0,
            totalConversionsValue: totalConversionsValue.toFixed(2),
            totalConversions: totalConversions.toFixed(2),
            totalCPC: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0,
            totalCPM: totalImpressions > 0 ? ((totalSpend * 1000) / totalImpressions).toFixed(2) : 0,
            totalCTR: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
            totalCostPerConversion: totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : 0,
            totalClicks,
            totalImpressions,
        };

        // Process campaign-level metrics
        const campaignData = campaignLevelReport
            .map(row => {
                const costMicros = row.metrics.cost_micros || 0;
                const spend = costMicros / 1_000_000;
                const conversionsValue = row.metrics.conversions_value || 0;

                return {
                    campaign_name: row.campaign.name,
                    spend: spend.toFixed(2),
                    purchase_roas: spend > 0 ? (conversionsValue / spend).toFixed(2) : 0,
                };
            })
            .filter(campaign => parseFloat(campaign.spend) > 0 || parseFloat(campaign.roas) > 0);

        // Return combined response
        return res.json({
            success: true,
            data: {
                adAccountName,
                adMetrics,
                campaignData
            }
        });

    } catch (error) {
        console.error("Failed to fetch Google Ads metrics:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}

export const fetchFBAdAccountData = async (req, res) => {
    let { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        // Find the brand by ID
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ])

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            });
        }

        const adAccountIds = brand.fbAdAccounts;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        const accessToken = user.fbAccessToken;
        if (!accessToken) {
            return res.status(403).json({
                success: false,
                message: 'User does not have a valid Facebook access token.',
            });
        }

        // Set default date range to current month if not provided
        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD'); // First day of the current month
            endDate = moment().format('YYYY-MM-DD'); // Current date
        }

        // Create batch requests for each ad account
        const batchRequests = adAccountIds.flatMap((accountId) => [
            {
                method: 'GET',
                relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,clicks,impressions,cpm,ctr,account_name,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
            },
        ]);

        // Send batch request to Facebook Graph API
        const response = await axios.post(
            `https://graph.facebook.com/v21.0/`,
            { batch: batchRequests },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                params: {
                    access_token: accessToken,
                },
            }
        );

        // Process the batch response
        const results = [];
        for (let i = 0; i < adAccountIds.length; i++) {
            const accountId = adAccountIds[i];

            // Ad Account Insights Response
            const accountResponse = response.data[i];
            let accountData = {
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
                impressions: 0
            };

            if (accountResponse.code === 200) {
                const accountBody = JSON.parse(accountResponse.body);
                if (accountBody.data && accountBody.data.length > 0) {
                    const insight = accountBody.data[0];
                    const purchase = insight.actions?.find((action) => action.action_type === 'purchase');

                    accountData = {
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
            }
            results.push(accountData);

        }
        // Return the combined results
        return res.status(200).json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error('Error fetching Facebook Ad Account Data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account data.',
            error: error.message,
        });
    }
};

export const fetchFBCampaignData = async (req, res) => {
    let { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        // Find the brand by ID
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ])

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            });
        }

        const adAccountIds = brand.fbAdAccounts;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        const accessToken = user.fbAccessToken;
        if (!accessToken) {
            return res.status(403).json({
                success: false,
                message: 'User does not have a valid Facebook access token.',
            });
        }

        // Set default date range to current month if not provided
        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
            endDate = moment().format('YYYY-MM-DD');
        }

        // Create batch requests for each ad account
        const batchRequests = adAccountIds.flatMap((accountId) => [
            {
                method: 'GET',
                relative_url: `${accountId}/campaigns?fields=insights.time_range({'since':'${startDate}','until':'${endDate}'}){campaign_name,account_id,spend,reach,purchase_roas,frequency,cpm,account_name,actions,action_values,clicks,impressions,outbound_clicks_ctr,unique_inline_link_clicks,video_p50_watched_actions},status`,
            },
        ]);

        // Send batch request to Facebook Graph API
        const response = await axios.post(
            `https://graph.facebook.com/v21.0/`,
            { batch: batchRequests },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                params: {
                    access_token: accessToken,
                },
            }
        );

        // Process the batch response
        const results = [];
        for (let i = 0; i < adAccountIds.length; i++) {
            const accountResponse = response.data[i];
            let campaignData = {
                account_name: '',
                account_id: '',
                campaigns: [],
            };
            if (accountResponse.code === 200) {
                const accountBody = JSON.parse(accountResponse.body);
                if (accountBody.data && accountBody.data.length > 0) {


                    // Process each campaign
                    accountBody.data.forEach(campaign => {
                        const insights = campaign.insights?.data?.[0];
                        const status = campaign.status;
                        if (insights) {
                            campaignData.account_name = insights.account_name || '';
                            campaignData.account_id = insights.account_id || '';
                            const content_view = insights.actions?.find(action => action.action_type === 'view_content')?.value || 0;
                            const purchase = insights.actions?.find(action => action.action_type === 'purchase')?.value || 0;
                            const addToCart = Number(insights.actions?.find(action => action.action_type === 'add_to_cart')?.value) || 0;
                            const checkoutInitiated = Number(insights.actions?.find(action => action.action_type === 'initiate_checkout')?.value) || 0;
                            const linkClick = insights.actions?.find(action => action.action_type === 'link_click')?.value || 0;
                            const landingPageView = Number(insights.actions?.find(action => action.action_type === 'landing_page_view')?.value) || 0;
                            const totalClicks = insights.clicks ||0;
                            const cvToatcRate = content_view > 0 ? (addToCart / content_view) * 100 : 0;
                            const atcToCIRate = addToCart > 0 ? (checkoutInitiated / addToCart) * 100 : 0;
                            const ciToPurchaseRate = checkoutInitiated > 0 ? (purchase / checkoutInitiated) * 100 : 0;
                            const conversionRate = linkClick > 0 ? (purchase / linkClick) * 100 : 0;

                            const HighIntentClickRate = Number(parseFloat((((landingPageView + addToCart + checkoutInitiated) / totalClicks)*100).toFixed(2)));


                            const spend = parseFloat(insights.spend) || 0;
                            const frequency = Number(parseFloat(insights.frequency).toFixed(2));
                            const outboundCTR =  insights.outbound_clicks_ctr && insights.outbound_clicks_ctr.length > 0
                            ? Number(parseFloat(insights.outbound_clicks_ctr[0].value).toFixed(2))
                            : 0.00
                            const uniqueLinkClicks = Number(insights.unique_inline_link_clicks) || 0;
                            const reach =Number(insights.reach) || 0;

                            const cpmReachBased = spend / (insights.reach / 1000) || 0;
                            const cpa = {
                                content_view: content_view > 0 ? spend / content_view : 0,
                                add_to_cart: addToCart > 0 ? spend / addToCart : 0,
                                checkout_initiated: checkoutInitiated > 0 ? spend / checkoutInitiated : 0,
                                purchase: purchase > 0 ? spend / purchase : 0
                            };

                            const roas = parseFloat(parseFloat(insights.purchase_roas?.[0]?.value || 0).toFixed(2));

                            const threeSecondsView = Number(insights.actions?.find(action => action.action_type === 'video_view')?.value) || 0;
                            const HookRate = insights.impressions > 0 ? Number(parseFloat((threeSecondsView / insights.impressions) * 100).toFixed(2)) : 0;
                            
                            const video50Watched =  insights.video_p50_watched_actions&& insights.video_p50_watched_actions.length > 0
                            ? Number(parseFloat(insights.video_p50_watched_actions[0].value).toFixed(2))
                            : 0.00

                            const HoldRate = insights.impressions > 0 ? Number(parseFloat((video50Watched / insights.impressions) * 100).toFixed(2)) : 0;
                            campaignData.campaigns.push({
                                "Campaign": insights.campaign_name || "",
                                "Status": status || "",
                                "Amount spent": spend || 0,
                                "Conversion Rate": parseFloat(conversionRate.toFixed(2)) || 0.00,
                                "ROAS": roas || 0.00,
                                "Frequency": frequency || 0.00,
                                "CPM": Number(parseFloat(insights.cpm).toFixed(2)) || 0.00,
                                "CPM (Reach Based)": Number(parseFloat(cpmReachBased).toFixed(2)) || 0.00,
                                "Link Click": Number(linkClick),
                                "Outbound CTR":outboundCTR,
                                "Audience Saturation Score" : outboundCTR > 0 ? Number(parseFloat((frequency / outboundCTR).toFixed(2))) * 100 : 0.00,
                                "Reach v/s Unique Click" : uniqueLinkClicks > 0 ? Number(parseFloat((reach / uniqueLinkClicks).toFixed(2))) : 0.00,
                                "High-Intent Click Rate": HighIntentClickRate || 0.00,
                                "Hook Rate": HookRate || 0.00,
                                "Hold Rate":HoldRate || 0.00,
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
                            });
                        }
                    });
                }
            }

            results.push(campaignData);
        }

        // Return the combined results
        return res.status(200).json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error('Error fetching Facebook Ad Account and Campaign Data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account and Campaign data.',
            error: error.message,
        });
    }
};







