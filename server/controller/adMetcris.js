import axios from 'axios';
import { config } from 'dotenv';
import moment from 'moment';
import Brand from '../models/Brands.js';
import { GoogleAdsApi } from "google-ads-api";

config();

//FB ADS API DATA HERE

export const fetchFBAdAccountData = async (req, res) => {

    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    let { startDate, endDate } = req.body;
    const { brandId } = req.params;
    try {
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return {
                success: false,
                message: 'Brand not found.'
            };
        }

        const adAccountIds = brand.fbAdAccounts;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.json({
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }


        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD'); // First day of the current month
            endDate = moment().format('YYYY-MM-DD'); // Current date
        }


        const batchRequests = adAccountIds.map((accountId) => ({
            method: 'GET',
            relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,clicks,impressions,cpm,ctr,account_name,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
        }));


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


        const results = response.data.map((res, index) => {
            const accountId = adAccountIds[index];

            if (res.code === 200) {
                const result = JSON.parse(res.body);
                if (result.data && result.data.length > 0) {
                    const insight = result.data[0];
                    const purchase = insight.actions ? insight.actions.find(action => action.action_type === 'purchase') : null;// Get the first entry of insights
                    return {
                        adAccountId: accountId,
                        spend: insight.spend,
                        purchase_roas: insight.purchase_roas ? insight.purchase_roas.map(roas => ({
                            action_type: roas.action_type,
                            value: roas.value,
                        })) : [],
                        Revenue: insight.action_values ? insight.action_values.find(action => action.action_type === 'purchase') : null,
                        purchases: purchase, // Extract action_type and value into an array of objects
                        cpm: insight.cpm || 0,
                        ctr: insight.ctr || 0,
                        cpc: (insight.spend / insight.clicks).toFixed(2) || 0,
                        cpp: purchase?.value ? (insight.spend / purchase.value).toFixed(2) : 0,
                        account_name: insight.account_name || "",
                        clicks: insight.clicks,
                        impressions: insight.impressions,
                        date_start: insight.date_start,
                        date_stop: insight.date_stop,
                    };
                }
            }

            // If no data or error occurred, return a message for that account
            return {
                adAccountId: accountId,
                message: `Ad Account ${accountId} has no data for the given date.`,
            };
        });

        console.log(JSON.stringify(results, null, 2)); // Log results in a formatted JSON string
        // Return the structured results
        return res.status(200).json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Error fetching Facebook Ad Account data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account data.',
            error: error.message
        });
    }

}


export const fetchFBCampaignData = async (req, res) => {

    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    let { startDate, endDate } = req.body;
    const { brandId } = req.params;
    try {
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return {
                success: false,
                message: 'Brand not found.'
            };
        }

        const adAccountIds = brand.fbAdAccounts;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.json({
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }


        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD'); // First day of the current month
            endDate = moment().format('YYYY-MM-DD'); // Current date
        }


        const batchRequests = adAccountIds.map((accountId) => ({
            method: 'GET',
            relative_url: `${accountId}/campaigns?fields=insights.time_range({'since':'${startDate}','until':'${endDate}'}){campaign_name,spend,purchase_roas,account_name}`,
        }));


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

        const results = adAccountIds.map((adAccountId, index) => {
            const adAccountResponse = response.data[index]; 
            console.log(`Fetching data for Ad Account ID: ${adAccountId}`);
        
            try {
                const parsedBody = JSON.parse(adAccountResponse.body);
        
                if (Array.isArray(parsedBody.data)) {
                    
                    const filteredData = parsedBody.data.filter(item => item.insights);
                    console.log(filteredData);
        
                    if (adAccountResponse.code === 200) {
                        // Initialize the account data structure
                        const accountData = {
                            account_name: filteredData[0]?.insights.data[0]?.account_name || `Unknown Account for ID ${adAccountId}`,
                            campaigns: []
                        };
        
                        // Map through filtered campaigns and add their insights to the campaigns array
                        accountData.campaigns = filteredData.map((campaign) => {
                            const insightsArray = campaign.insights.data; 
                            return insightsArray.map((insight) => ({
                                campaign_name: insight.campaign_name,
                                spend: insight.spend,
                                purchase_roas: insight.purchase_roas,
                            }));
                        }).flat(); 
        
                        return accountData;
                    } else {
                        console.error(`Failed to fetch data for ad account with ID ${adAccountId}`);
                        return {
                            account_name: `Unknown Account for ID ${adAccountId}`,
                            error: `Failed to fetch data for ad account with ID ${adAccountId}`
                        };
                    }
                } else {
                    console.error("Parsed body doesn't contain a 'data' array:", parsedBody);
                    return {
                        account_name: `Unknown Account for ID ${adAccountId}`,
                        error: `Parsed body doesn't contain valid data for ad account with ID ${adAccountId}`
                    };
                }
            } catch (error) {
                console.error("Error parsing the response body:", error);
                return {
                    account_name: `Unknown Account for ID ${adAccountId}`,
                    error: `Error parsing the response body for ad account with ID ${adAccountId}`
                };
            }
        });
        

        return res.status(200).json({
            success: true,
            data: results
        });

    } catch (e) {
        console.error('Error fetching Facebook Ad Account data:', e);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account data.',
            error: e.message
        });
    }
}


// Google ADS API DATA 

const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_AD_CLIENT_ID,
    client_secret: process.env.GOOGLE_AD_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
    refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
});

export async function getGoogleAdMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate } = req.body;

    try {
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found.',
            });
        }

        const adAccountId = brand.googleAdAccount;

        if (!adAccountId || adAccountId.length === 0) {
            // Return an empty response if no Google Ads account is found
            return res.json({
                success: true,
                data: {},
                message: "No Google ads account found for this brand"
            });
        }

        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD'); // First day of the current month
            endDate = moment().format('YYYY-MM-DD'); // Current date
        }

        // Initialize the customer with the given credentials
        const customer = client.Customer({
            customer_id: adAccountId,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        // Fetch the ad-level report using the ad_group_ad entity
        const adsReport = await customer.report({
            entity: "ad_group_ad",
            attributes: ["ad_group.id", "ad_group_ad.ad.id", "ad_group_ad.ad.name", "customer.descriptive_name"],
            metrics: [
                "metrics.cost_micros",
                "metrics.conversions_value",
                "metrics.conversions",
                "metrics.clicks",
                "metrics.impressions"
            ],
            segments: ["segments.date"],
            from_date: startDate,
            to_date: endDate,
        });

        let totalSpend = 0;
        let totalClicks = 0;
        let totalConversionsValue = 0;
        let totalConversions = 0;
        let totalImpressions = 0;
        let adAccountName = "";

        // Process each row of the report
        for (const row of adsReport) {
            const costMicros = row.metrics.cost_micros || 0;
            const spend = costMicros / 1_000_000;
            const impressions = row.metrics.impressions || 0;

            totalSpend += spend;
            totalConversionsValue += row.metrics.conversions_value || 0;
            totalConversions += row.metrics.conversions || 0;
            totalClicks += row.metrics.clicks || 0;
            totalImpressions += impressions;

            // Capture the ad account name from the first row
            if (!adAccountName && row.customer && row.customer.descriptive_name) {
                adAccountName = row.customer.descriptive_name;
            }
        }

        // Calculate aggregated metrics
        const roas = totalSpend > 0 ? (totalConversionsValue / totalSpend).toFixed(2) : 0;
        const totalCPC = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0;
        const totalCPM = totalImpressions > 0 ? ((totalSpend * 1000) / totalImpressions).toFixed(2) : 0;
        const totalCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
        const totalCostPerConversion = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : 0;

        // Return the response with ad account name included
        return res.json({
            success: true,
            data: {
                adAccountName,  // Include the ad account name
                totalSpend: totalSpend.toFixed(2),
                roas,
                totalConversionsValue: totalConversionsValue.toFixed(2),
                totalConversions: totalConversions.toFixed(2),
                totalCPC,
                totalCPM,
                totalCTR,
                totalCostPerConversion,
                totalClicks,
                totalImpressions,
            }
        });
    } catch (error) {
        console.error("Failed to fetch ad-level spend and ROAS:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}

export async function getGoogleCampaignMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate } = req.body;
    try {
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found.',
            });
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
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const adsReport = await customer.report({
            entity: "campaign",
            attributes: ["campaign.id", "campaign.name","customer.descriptive_name"],
            metrics: [
                "metrics.cost_micros",
                "metrics.conversions_value",
                "metrics.impressions",
                "metrics.clicks"
            ],
            segments: ["segments.date"],
            from_date: startDate,
            to_date: endDate,
        });

        let totalSpend = 0;
        let totalConversionsValue = 0;
        const campaignData = [];
        let adAccountName = "";

        // Process each row of the report
        for (const row of adsReport) {
            const costMicros = row.metrics.cost_micros || 0;
            const spend = costMicros / 1_000_000;
            const conversionsValue = row.metrics.conversions_value || 0;
            const impressions = row.metrics.impressions || 0;
            const clicks = row.metrics.clicks || 0;

            totalSpend += spend;
            totalConversionsValue += conversionsValue;

            // Calculate ROAS for each campaign
            const roas = spend > 0 ? (conversionsValue / spend).toFixed(2) : 0;
            if (!adAccountName && row.customer && row.customer.descriptive_name) {
                adAccountName = row.customer.descriptive_name;
            }

            // Add each campaign's data to the array
            campaignData.push({
                campaignName: row.campaign.name,
                spend: spend.toFixed(2),
                roas,
            });
        }

        return res.json({
            success: true,
            data: {adAccountName,campaignData},


        });
    } catch (error) {
        console.error("Failed to fetch campaign-level spend and ROAS:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}






