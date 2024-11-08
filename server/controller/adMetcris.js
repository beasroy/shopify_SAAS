import axios from 'axios';
import { config } from 'dotenv';
import moment from 'moment';
import Brand from '../models/Brands.js';
import { GoogleAdsApi } from "google-ads-api";

config();

//FB ADS API DATA HERE

export const fetchFBAdAccountData = async(req,res)=>{

    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const { startDate, endDate } = req.body;
    const {brandId} = req.params;
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
            return {
                success: false,
                message: 'No Facebook Ads accounts found for this brand.'
            };
        }


        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD'); // First day of the current month
            endDate = moment().format('YYYY-MM-DD'); // Current date
        }


        const batchRequests = adAccountIds.map((accountId) => ({
            method: 'GET',
            relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,cpc,cpm,ctr,cpp,account_name,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
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
                    const insight = result.data[0]; // Get the first entry of insights
                    return {
                        adAccountId: accountId,
                        spend: insight.spend,
                        purchase_roas: insight.purchase_roas ? insight.purchase_roas.map(roas => ({
                            action_type: roas.action_type,
                            value: roas.value,
                        })) : [],
                        Revenue: insight.action_values ? insight.action_values.find(action => action.action_type === 'purchase') : null,
                        purchases: insight.actions ? insight.actions.find(action => action.action_type === 'purchase') : null, // Extract action_type and value into an array of objects
                        cpm: insight.cpm || 0,
                        ctr: insight.ctr || 0,
                        cpc: insight.cpc || 0,
                        cpp: insight.cpp || 0,
                        account_name:insight.account_name || "",
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



// Google ADS API DATA



const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_AD_CLIENT_ID,
  client_secret: process.env.GOOGLE_AD_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
  refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
});



export async function getAdLevelSpendAndROAS(customerId, managerId,startDate,endDate) {
  try {
    // Initialize the customer with the given credentials
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
      login_customer_id: managerId,
    });

    // Fetch the ad-level report using the ad_group_ad entity
    const adsReport = await customer.report({
      entity: "ad_group_ad",
      attributes: ["ad_group.id", "ad_group_ad.ad.id", "ad_group_ad.ad.name"],
      metrics: [
        "metrics.cost_micros",
        "metrics.conversions_value",
        "metrics.conversions",
        "metrics.clicks",
        "metrics.active_view_cpm",
        "metrics.active_view_ctr",
        "metrics.cost_per_conversion"
      ],
      segments: ["segments.date"],
      from_date: startDate,
      to_date: endDate, 
    });


    let totalSpend = 0;
    let totalConversionsValue = 0;
    let totalConversions = 0;
    let totalClicks = 0;
    let totalActiveViewCPM = 0;
    let totalActiveViewCTR = 0;
    let totalCostPerConversion = 0;

    // Loop through the report rows and process the data
    for (const row of adsReport) {
      const costMicros = row.metrics.cost_micros || 0;
      const conversionsValue = row.metrics.conversions_value || 0;
      const conversions = row.metrics.conversions || 0;
      const clicks = row.metrics.clicks || 0;
      const activeViewCPM = row.metrics.active_view_cpm || 0;
      const activeViewCTR = row.metrics.active_view_ctr || 0;
      const costPerConversion = row.metrics.cost_per_conversion || 0;

      const spend = costMicros / 1_000_000;

      totalSpend += spend;
      totalConversionsValue += conversionsValue;
      totalConversions += conversions;
      totalClicks += clicks;
      totalActiveViewCPM += activeViewCPM;
      totalActiveViewCTR += activeViewCTR;
      

      // Log individual ad metrics
      console.log(`Ad ID: ${row.ad_group_ad.ad.id}`);
      console.log(`Spend: ${spend.toFixed(2)} (Currency Units)`);
      console.log(`Conversions Value: ${conversionsValue.toFixed(2)}`);
      console.log(`conversions: ${conversions}`);
      console.log('----------------------------------');
    }

    const roas = totalSpend > 0 ? (totalConversionsValue / totalSpend) : 0;

    console.log(`Total Spend: ${totalSpend.toFixed(2)} (Currency Units)`);
    console.log(`Total Conversions Value: ${totalConversionsValue.toFixed(2)}`);
    console.log(`Total ROAS: ${roas.toFixed(2)}`);
    console.log(`Total Conversions: ${totalConversions.toFixed(2)}`);

    return { totalSpend, roas, totalConversionsValue, totalConversions};

  } catch (error) {
    console.error("Failed to fetch ad-level spend and ROAS:", error);
  }
}

