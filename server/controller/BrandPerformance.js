import BrandPerformance from "../models/BrandPerformance.js";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
import moment from "moment";
import axios from "axios";
 
export const addTarget = async (req, res) => {
    try {
        const brandTarget = new BrandPerformance(req.body);
        await brandTarget.save();
        res.status(201).json(brandTarget);
    } catch (error) {
        res.status(500).json({ error: error });
    }
}

export const getTargetByBrand = async (req, res) => {
    try {
        const brands = await BrandPerformance.find();
        res.json(brands);
    } catch (error) {
        res.status(500).json({ error: error });
    }
}
// Backend code (assumed to be in your controller)
export const updateBrandTarget = async (req, res) => {
    try {
        const brand = await BrandPerformance.findOneAndUpdate(
            { brandId: req.params.brandId }, // Find by brandId
            req.body,                        // Update with data from the request body
            { new: true }                    // Return the updated document
        );

        if (!brand) {
            return res.status(404).json({ error: 'Brand not found' });
        }
        res.json(brand);
    } catch (error) {
        console.error('Error updating brand:', error);
        res.status(500).json({ error: 'Failed to update brand' });
    }
};

export const deleteBrandTarget = async (req, res) => {
    try {
        const brand = await BrandPerformance.findOneAndDelete({ brandId: req.params.brandId });

        if (!brand) {
            return res.status(404).json({ error: 'Brand not found' });
        }

        res.json({ message: 'Brand deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete brand' });
    }
};

export const getMetaMetrics = async (req, res) => {
    let { userId } = req.body;
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

        const startDate = moment().startOf('month').format('YYYY-MM-DD'); // First day of the current month
        const endDate = moment().format('YYYY-MM-DD'); // Current date

        // Create batch requests for each ad account
        const batchRequests = adAccountIds.flatMap((accountId) => [
            {
                method: 'GET',
                relative_url: `${accountId}/insights?fields=spend,purchase_roas,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
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
        const individualResults = [];
        let totalSpend = 0;
        let totalRevenue = 0;
        
        for (let i = 0; i < adAccountIds.length; i++) {
            const accountId = adAccountIds[i];

            // Ad Account Insights Response
            const accountResponse = response.data[i];
            let accountData = {
                accountId: accountId,
                spend: 0,
                purchase_roas: 0,
                Revenue: 0,
            };

            if (accountResponse.code === 200) {
                const accountBody = JSON.parse(accountResponse.body);
                if (accountBody.data && accountBody.data.length > 0) {
                    const insight = accountBody.data[0];
                    const spend = parseFloat(insight.spend) || 0;
                    const roas = insight.purchase_roas && insight.purchase_roas.length > 0 ? 
                        parseFloat(insight.purchase_roas[0].value) : 0;
                    const revenue = insight.action_values?.find(
                        (action) => action.action_type === 'purchase'
                    )?.value || 0;

                    accountData = {
                        ...accountData,
                        spend: spend,
                        purchase_roas: roas.toFixed(2),
                        Revenue: revenue,
                    };
                    
                    // Add to totals for blended data
                    totalSpend += spend;
                    totalRevenue += parseFloat(revenue);
                }
                individualResults.push(accountData);
            }
        }
        
        // Create blended data for multiple accounts
        const blendedData = {
            spend: totalSpend,
            Revenue: totalRevenue,
            purchase_roas: totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0.00",
        };
        
        // Return the appropriate result based on number of ad accounts
        if (adAccountIds.length === 1) {
            // If only one ad account, return just that account's data
            return res.status(200).json({
                success: true,
                data: individualResults[0],
            });
        } else {
            // If multiple ad accounts, return the blended data
            return res.status(200).json({
                success: true,
                data: blendedData,
                individualAccounts: individualResults, // Optional: include individual account data too
            });
        }
    } catch (error) {
        console.error('Error fetching Facebook Ad Account Data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account data.',
            error: error.message,
        });
    }
}