import axios from 'axios';
import { config } from 'dotenv';

config();

export default async function fetchAdAccountData(adAccountIds) {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

    // Create the batch requests array
    const batchRequests = adAccountIds.map((accountId) => ({
        method: 'GET',
        relative_url: `${accountId}/insights?fields=spend,purchase_roas&time_range={'since':'2024-10-17','until':'2024-10-17'}`,
    }));

    // Send batch request to Facebook Graph API
    const response = await axios.post(
        `https://graph.facebook.com/v21.0/`,
        { batch: batchRequests },
        {
            headers: {
                'Content-Type': 'application/json',
            },
            params: {
                access_token: accessToken, // Pass the access token as a query parameter
            },
        }
    );

    // Initialize an array to store results
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
                    })) : [], // Extract action_type and value into an array of objects
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
    return results;
}




