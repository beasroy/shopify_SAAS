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

export const fetchFBAdAccountAndCampaignData = async (req, res) => {
    let { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        // Find the brand by ID
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ]);

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
            // Account insights request
            {
                method: 'GET',
                relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,clicks,impressions,cpm,ctr,account_name,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
            },
            // Campaigns request
            {
                method: 'GET',
                relative_url: `${accountId}/campaigns?fields=insights.time_range({'since':'${startDate}','until':'${endDate}'}){campaign_name,account_id,spend,reach,purchase_roas,frequency,cpm,account_name,actions,action_values,clicks,impressions,outbound_clicks_ctr,unique_inline_link_clicks,video_p50_watched_actions},status`,
            },
            // Ad sets request (for interest targeting data)
            {
                method: 'GET',
                relative_url: `${accountId}/adsets?fields=id,name,targeting&time_range={'since':'${startDate}','until':'${endDate}'}`,
            }
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
            const baseIndex = i * 3; // Each account now has 3 requests

            // Ad Account Insights Response
            const accountResponse = response.data[baseIndex];
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
                interestMetrics: {} // Add interest metrics to the account data
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
            const campaignResponse = response.data[baseIndex + 1];
            if (campaignResponse.code === 200) {
                const campaignBody = JSON.parse(campaignResponse.body);
                if (Array.isArray(campaignBody.data)) {
                    // Process campaigns
                    campaignBody.data.forEach(campaign => {
                        const insights = campaign.insights?.data?.[0];
                        const status = campaign.status;
                        
                        if (insights) {
                            accountData.account_name = insights.account_name || accountData.account_name;
                            
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

                            const HighIntentClickRate = Number(parseFloat((((landingPageView + addToCart + checkoutInitiated) / totalClicks) * 100).toFixed(2)));

                            const spend = parseFloat(insights.spend) || 0;
                            const frequency = Number(parseFloat(insights.frequency).toFixed(2));
                            const outboundCTR = insights.outbound_clicks_ctr && insights.outbound_clicks_ctr.length > 0
                                ? Number(parseFloat(insights.outbound_clicks_ctr[0].value).toFixed(2))
                                : 0.00;
                            const uniqueLinkClicks = Number(insights.unique_inline_link_clicks) || 0;
                            const reach = Number(insights.reach) || 0;

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

                            const video50Watched = insights.video_p50_watched_actions && insights.video_p50_watched_actions.length > 0
                                ? Number(parseFloat(insights.video_p50_watched_actions[0].value).toFixed(2))
                                : 0.00;

                            const HoldRate = insights.impressions > 0 ? Number(parseFloat((video50Watched / insights.impressions) * 100).toFixed(2)) : 0;

                            accountData.campaigns.push({
                                "Campaign": insights.campaign_name || "",
                                "Status": status || "",
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
                            });
                        }
                    });
                }
            }

            // Ad Sets Response (for interest targeting)
            const adSetsResponse = response.data[baseIndex + 2];
            if (adSetsResponse.code === 200) {
                const adSetsBody = JSON.parse(adSetsResponse.body);
                
                if (adSetsBody.data && adSetsBody.data.length > 0) {
                    // Process ad sets for interest data
                    const adSets = adSetsBody.data;
                    
                    // First, extract interests from each ad set
                    const adSetInterests = adSets.map(adSet => {
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
                    
                    // For each ad set with interests, get performance metrics
                    const metricsPromises = adSetInterests.map(async (adSetData) => {
                        try {
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
                            
                            const metrics = metricsResponse.data.data[0] || { spend: 0 };
                            
                            const purchaseValue = metrics.action_values ? 
                                metrics.action_values.find(action => action.action_type === 'purchase') : 
                                { value: 0 };
                            
                            const spend = parseFloat(metrics.spend || 0);
                            const revenue = parseFloat(purchaseValue?.value || 0);
                            const roas = spend > 0 ? revenue / spend : 0;
                            
                            return {
                                ...adSetData,
                                metrics: {
                                    spend,
                                    revenue,
                                    roas,
                                }
                            };
                        } catch (error) {
                            console.error(`Error fetching metrics for ad set ${adSetData.adSetId}:`, error);
                            return {
                                ...adSetData,
                                metrics: {
                                    spend: 0,
                                    revenue: 0,
                                    roas: 0,
                                },
                                error: error.message
                            };
                        }
                    });
                    
                    // Wait for all metrics to be fetched
                    const adSetResults = await Promise.all(metricsPromises);
                    
                    // Group by interest and calculate metrics
                    const interestMetrics = {};
                    
                    adSetResults.forEach(result => {
                        result.interests.forEach(interest => {
                            const interestName = interest.name;
                            
                            if (!interestMetrics[interestName]) {
                                interestMetrics[interestName] = {
                                    totalSpend: 0,
                                    totalRevenue: 0,
                                };
                            }
                            
                            interestMetrics[interestName].totalSpend += result.metrics.spend;
                            interestMetrics[interestName].totalRevenue += result.metrics.revenue;
                        });
                    });
                    
                    // Calculate ROAS for each interest
                    Object.keys(interestMetrics).forEach(interestName => {
                        const interest = interestMetrics[interestName];
                        
                        interest.roas = interest.totalSpend > 0 ? 
                            interest.totalRevenue / interest.totalSpend : 0;
                    });
                    
                    // Add to account data
                    accountData.interestMetrics = interestMetrics;
                }
            }

            results.push(accountData);
        }

        // Calculate aggregated metrics
        const aggregatedMetrics = getAggregatedFbMetrics(results);

        // Also aggregate interest metrics across all accounts
        const aggregatedInterestMetrics = {};
        
        results.forEach(account => {
            Object.entries(account.interestMetrics).forEach(([interestName, metrics]) => {
                if (!aggregatedInterestMetrics[interestName]) {
                    aggregatedInterestMetrics[interestName] = {
                        totalSpend: 0,
                        totalRevenue: 0,
                    };
                }
                
                aggregatedInterestMetrics[interestName].totalSpend += metrics.totalSpend;
                aggregatedInterestMetrics[interestName].totalRevenue += metrics.totalRevenue;
            });
        });
        
        // Calculate overall ROAS for each interest
        Object.keys(aggregatedInterestMetrics).forEach(interestName => {
            const interest = aggregatedInterestMetrics[interestName];
            interest.roas = interest.totalSpend > 0 ? 
                interest.totalRevenue / interest.totalSpend : 0;
        });

        // Return the combined results with aggregated metrics
        return res.status(200).json({
            success: true,
            data: results,
            aggregatedMetrics,
            aggregatedInterestMetrics
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
        let allCampaignData = [];
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

                // Process campaign-level metrics for this account
                const accountCampaignData = campaignLevelReport
                    .map(row => {
                        const costMicros = row.metrics.cost_micros || 0;
                        const spend = costMicros / 1_000_000;
                        const conversionsValue = row.metrics.conversions_value || 0;

                        return {
                            account_id: adAccountId,
                            account_name: adAccountName,
                            campaign_name: row.campaign.name,
                            spend: spend.toFixed(2),
                            purchase_roas: spend > 0 ? (conversionsValue / spend).toFixed(2) : 0,
                        };
                    })
                    .filter(campaign => parseFloat(campaign.spend) > 0 || parseFloat(campaign.roas) > 0);

                // Store data for this account
                allAdAccountsData.push({
                    accountId: adAccountId,
                    adAccountName,
                    adMetrics: accountAdMetrics
                });

                // Add campaign data to combined list
                allCampaignData = [...allCampaignData, ...accountCampaignData];

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
                    campaignData: allCampaignData
                },
                aggregatedMetrics: null // No aggregation needed for single account
            });
        } else {
            // Return all accounts data with aggregated metrics
            return res.json({
                success: true,
                data: {
                    accounts: allAdAccountsData,
                    campaignData: allCampaignData
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
                            const totalClicks = insights.clicks || 0;
                            const cvToatcRate = content_view > 0 ? (addToCart / content_view) * 100 : 0;
                            const atcToCIRate = addToCart > 0 ? (checkoutInitiated / addToCart) * 100 : 0;
                            const ciToPurchaseRate = checkoutInitiated > 0 ? (purchase / checkoutInitiated) * 100 : 0;
                            const conversionRate = linkClick > 0 ? (purchase / linkClick) * 100 : 0;

                            const HighIntentClickRate = Number(parseFloat((((landingPageView + addToCart + checkoutInitiated) / totalClicks) * 100).toFixed(2)));


                            const spend = parseFloat(insights.spend) || 0;
                            const frequency = Number(parseFloat(insights.frequency).toFixed(2));
                            const outboundCTR = insights.outbound_clicks_ctr && insights.outbound_clicks_ctr.length > 0
                                ? Number(parseFloat(insights.outbound_clicks_ctr[0].value).toFixed(2))
                                : 0.00
                            const uniqueLinkClicks = Number(insights.unique_inline_link_clicks) || 0;
                            const reach = Number(insights.reach) || 0;

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

                            const video50Watched = insights.video_p50_watched_actions && insights.video_p50_watched_actions.length > 0
                                ? Number(parseFloat(insights.video_p50_watched_actions[0].value).toFixed(2))
                                : 0.00

                            const HoldRate = insights.impressions > 0 ? Number(parseFloat((video50Watched / insights.impressions) * 100).toFixed(2)) : 0;
                            campaignData.campaigns.push({
                                "Campaign": insights.campaign_name || "",
                                "Status": status || "",
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

export const getBlendedMetrics = async (req, res) => {
    let { startDate, endDate, userId, dataSource = 'all' } = req.body;
    const { brandId } = req.params;

    try {
        // Find the brand by ID
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            });
        }

        // Set default date range to current month if not provided
        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
            endDate = moment().format('YYYY-MM-DD');
        }

        let fbAggregatedMetrics = {
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

        let googleAggregatedMetrics = {
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

        // Fetch Facebook metrics if needed
        if (dataSource === 'all' || dataSource === 'facebook') {
            const adAccountIds = brand.fbAdAccounts;
            
            if (adAccountIds && adAccountIds.length > 0 && user.fbAccessToken) {
                const accessToken = user.fbAccessToken;
                
                // Create batch requests for each ad account
                const batchRequests = adAccountIds.flatMap((accountId) => [
                    {
                        method: 'GET',
                        relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,clicks,impressions,cpm,ctr,account_name,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
                    }
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

                const fbResults = [];
                for (let i = 0; i < adAccountIds.length; i++) {
                    const accountId = adAccountIds[i];
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
                    fbResults.push(accountData);
                }

                // Calculate aggregated metrics for Facebook
                fbAggregatedMetrics = getAggregatedFBMetrics(fbResults);
            }
        }

        // Fetch Google metrics if needed
        if (dataSource === 'all' || dataSource === 'google') {
            const refreshToken = user.googleRefreshToken;
            const adAccountId = brand.googleAdAccount?.clientId;
            const managerId = brand.googleAdAccount?.managerId;
            
            if (refreshToken && adAccountId) {
                const customer = client.Customer({
                    customer_id: adAccountId,
                    refresh_token: refreshToken,
                    login_customer_id: managerId
                });

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
                });

                let totalSpend = 0;
                let totalClicks = 0;
                let totalConversionsValue = 0;
                let totalConversions = 0;
                let totalImpressions = 0;

                for (const row of adLevelReport) {
                    const costMicros = row.metrics.cost_micros || 0;
                    const spend = costMicros / 1_000_000;
                    const impressions = row.metrics.impressions || 0;

                    totalSpend += spend;
                    totalConversionsValue += row.metrics.conversions_value || 0;
                    totalConversions += row.metrics.conversions || 0;
                    totalClicks += row.metrics.clicks || 0;
                    totalImpressions += impressions;
                }

                googleAggregatedMetrics = {
                    totalSpent: totalSpend,
                    totalRevenue: totalConversionsValue,
                    totalROAS: totalSpend > 0 ? (totalConversionsValue / totalSpend) : 0,
                    totalPurchases: totalConversions,
                    totalCTR: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100) : 0,
                    totalCPC: totalClicks > 0 ? (totalSpend / totalClicks) : 0,
                    totalCPM: totalImpressions > 0 ? ((totalSpend * 1000) / totalImpressions) : 0,
                    totalCPP: totalConversions > 0 ? (totalSpend / totalConversions) : 0,
                    totalClicks,
                    totalImpressions,
                };
            }
        }

        // Calculate the blended metrics based on the data source
        let blendedMetrics;
        if (dataSource === 'all') {
            blendedMetrics = {
                totalSpent: fbAggregatedMetrics.totalSpent + googleAggregatedMetrics.totalSpent,
                totalRevenue: fbAggregatedMetrics.totalRevenue + googleAggregatedMetrics.totalRevenue,
                totalPurchases: fbAggregatedMetrics.totalPurchases + googleAggregatedMetrics.totalPurchases,
                totalClicks: fbAggregatedMetrics.totalClicks + googleAggregatedMetrics.totalClicks,
                totalImpressions: fbAggregatedMetrics.totalImpressions + googleAggregatedMetrics.totalImpressions,
            };

            // Calculate derived metrics
            const totalSpent = blendedMetrics.totalSpent;
            const totalRevenue = blendedMetrics.totalRevenue;
            const totalClicks = blendedMetrics.totalClicks;
            const totalImpressions = blendedMetrics.totalImpressions;
            const totalPurchases = blendedMetrics.totalPurchases;

            blendedMetrics = {
                ...blendedMetrics,
                totalROAS: totalSpent > 0 ? (totalRevenue / totalSpent) : 0,
                totalCTR: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100) : 0,
                totalCPC: totalClicks > 0 ? (totalSpent / totalClicks) : 0,
                totalCPM: totalImpressions > 0 ? ((totalSpent * 1000) / totalImpressions) : 0,
                totalCPP: totalPurchases > 0 ? (totalSpent / totalPurchases) : 0,
            };
        } else if (dataSource === 'facebook') {
            blendedMetrics = fbAggregatedMetrics;
        } else if (dataSource === 'google') {
            blendedMetrics = googleAggregatedMetrics;
        }

        // Return the calculated blended metrics
        return res.status(200).json({
            success: true,
            dataSource,
            blendedMetrics
        });
        
    } catch (error) {
        console.error('Error calculating blended metrics:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while calculating blended metrics.',
            error: error.message
        });
    }
};







