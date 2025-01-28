import Brand from '../models/Brands.js';
import User from "../models/User.js";
import axios from "axios";
import moment from 'moment';

export const fetchFBAgeReports = async (req, res) => {
    let { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

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

        const adAccountIds = brand.fbAdAccounts;
        const accessToken = user.fbAccessToken;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }
        if(!accessToken){
            return res.status(404).json({
                success: false,
                message: 'No Facebook accesstoken found for this user.',
            });
        }
        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
            endDate = moment().format('YYYY-MM-DD');
        }

        const batchRequests = adAccountIds.flatMap((accountId) => [
            {
                method: 'GET',
                relative_url: `${accountId}/insights?fields=spend,purchase_roas,action_values,account_name&time_range={'since':'${startDate}','until':'${endDate}'}&breakdowns=age&time_increment=monthly`,
            }
        ]);

        const response = await axios.post(
            `https://graph.facebook.com/v21.0/`,
            {batch: batchRequests},
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                params: {
                    access_token: accessToken,
                },
            }
        );

        // Process the batch response with new formatting
        const accountsMap = new Map();

        for (let i = 0; i < adAccountIds.length; i++) {
            const accountId = adAccountIds[i];
            const accountResponse = response.data[i];

            if (accountResponse.code === 200) {
                const accountBody = JSON.parse(accountResponse.body);
                
                if (accountBody.data && accountBody.data.length > 0) {
                    // Initialize account data structure
                    const accountData = {
                        adAccountId: accountId,
                        account_name: accountBody.data[0].account_name || '',
                        ageData: []
                    };

                    // First, group data by age
                    const ageGroups = {};
                    
                    accountBody.data.forEach(insight => {
                        if (!ageGroups[insight.age]) {
                            ageGroups[insight.age] = {
                                Age: insight.age,
                                MonthlyData: []
                            };
                        }

                        // Format month from date_start
                        const monthKey = moment(insight.date_start).format('YYYYMM');
                        
                        // Add monthly data for this age group
                        ageGroups[insight.age].MonthlyData.push({
                            Month: monthKey,
                            spend: parseFloat(insight.spend || 0),
                            purchase_roas: insight.purchase_roas?.find(
                                (action) => action.action_type === 'omni_purchase'
                            )?.value || 0,
                            purchase_conversion_value: insight.action_values?.find(
                                (action) => action.action_type === 'purchase'
                            )?.value || 0
                        });
                    });

                    // Convert age groups object to array and sort by age
                    accountData.ageData = Object.values(ageGroups).sort((a, b) => {
                        // Custom sorting for age ranges
                        const ageOrder = {
                            '13-17': 1, '18-24': 2, '25-34': 3, '35-44': 4,
                            '45-54': 5, '55-64': 6, '65+': 7, 'Unknown': 8
                        };
                        return (ageOrder[a.Age] || 99) - (ageOrder[b.Age] || 99);
                    });

                    // Sort MonthlyData arrays by Month
                    accountData.ageData.forEach(ageGroup => {
                        ageGroup.MonthlyData.sort((a, b) => a.Month.localeCompare(b.Month));
                    });

                    accountsMap.set(accountId, accountData);
                }
            }
        }

        const formattedResults = Array.from(accountsMap.values());

        return res.status(200).json({
            success: true,
            data: formattedResults,
        });
    } catch (error) {
        console.error('Error fetching Facebook Ad Account age data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account age data.',
            error: error.message,
        });
    }
};