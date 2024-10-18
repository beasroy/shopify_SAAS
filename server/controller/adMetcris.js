import axios from 'axios';
import { config } from 'dotenv';
import moment from 'moment';

config();

export default async function fetchAdAccountData(adAccountIds, startDate, endDate) {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

    
    if (!startDate || !endDate) {
        startDate = moment().startOf('month').format('YYYY-MM-DD'); // First day of the current month
        endDate = moment().format('YYYY-MM-DD'); // Current date
    }

   
    const batchRequests = adAccountIds.map((accountId) => ({
        method: 'GET',
        relative_url:`${accountId}/insights?fields=spend,purchase_roas,actions,cpc,cpm,ctr,cpp,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
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
                    Revenue: insight.action_values ? insight.action_values.find(action=> action.action_type ==='purchase') : null,
                    purchases: insight.actions ? insight.actions.find(action => action.action_type === 'purchase') : null, // Extract action_type and value into an array of objects
                    cpm: insight.cpm || 0,
                    ctr: insight.ctr || 0,
                    cpc: insight.cpc || 0,
                    cpp:insight.cpp || 0,
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

export const handleFetchAdAccountData = async (req, res) => {
    const adAccountIds = [
        'act_1475581489568840',
        'act_578320240630885',
        'act_193585543386176',
        'act_241464625568212',
        'act_842266773171272',
        'act_3385044335100505',
      ];
    const { startDate, endDate } = req.body;
  
    try {
      const data = await fetchAdAccountData(adAccountIds, startDate, endDate);
      res.json(data);
    } catch (error) {
      console.error('Error fetching ad account data:', error.message);
      res.status(500).json({ error: 'Failed to fetch ad account data', details: error.message });
    }
  };
