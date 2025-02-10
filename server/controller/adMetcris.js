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
    let { startDate, endDate , userId } = req.body;

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









