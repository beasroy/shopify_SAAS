import axios from 'axios';
import User from '../models/User.js';
import Brand from '../models/Brands.js';

export async function getAdSetInterestsAndMetrics(accessToken, adAccountIds, startDate, endDate) {
  try {
    const accountIds = Array.isArray(adAccountIds) ? adAccountIds : [adAccountIds];
    const resultsByAccount = {};
    
    for (const adAccountId of accountIds) {
      try {
        const accountInfoResponse = await axios.get(
          `https://graph.facebook.com/v19.0/${adAccountId}`,
          {
            params: {
              fields: 'name',
              access_token: accessToken
            }
          }
        );
        
        const accountName = accountInfoResponse.data.name || adAccountId;
        resultsByAccount[accountName] = {
          adAccountId,
          interestMetrics: {}
        };
        
        // Step 1: Get ad sets with targeting information for this account
        const adSetsResponse = await axios.get(
          `https://graph.facebook.com/v19.0/${adAccountId}/adsets`,
          {
            params: {
              fields: 'id,name,targeting',
              time_range: JSON.stringify({ since: startDate, until: endDate }),
              access_token: accessToken
            }
          }
        );
        
        const adSets = adSetsResponse.data.data;
        
        // Step 2: Extract interests from each ad set
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
        
        // Step 3: Get performance metrics for each ad set
        const metricsPromises = adSetInterests.map(async (adSetData) => {
          const metricsResponse = await axios.get(
            `https://graph.facebook.com/v19.0/${adSetData.adSetId}/insights`,
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
        });
        
        const results = await Promise.all(metricsPromises);
        
        // Step 4: Group by interest and calculate metrics for each interest within this account
        const interestMetrics = {};
        
        results.forEach(result => {
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
        
        // Calculate metrics for each interest within this account
        Object.keys(interestMetrics).forEach(interestName => {
          const interest = interestMetrics[interestName];
          
          interest.roas = interest.totalSpend > 0 ? 
            interest.totalRevenue / interest.totalSpend : 0;
        });
        
        resultsByAccount[accountName].interestMetrics = interestMetrics;
        
      } catch (accountError) {
        console.error(`Error processing ad account ${adAccountId}:`, accountError);
        resultsByAccount[adAccountId] = {
          adAccountId,
          error: accountError.message,
          interestMetrics: {}
        };
        // Continue to next account instead of failing the entire request
      }
    }
    
    return resultsByAccount;
  } catch (error) {
    console.error('Error fetching ad set interests and metrics:', error);
    throw error;
  }
}

// Example usage in Express
export const fetchInterestData =  async (req, res) => {
  try {
    let { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;
    
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
    
    const results = await getAdSetInterestsAndMetrics(
      accessToken, 
      adAccountIds, 
      startDate, 
      endDate
    );
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'An error occurred while fetching ad interests and metrics data.',
      error: error.message 
    });
  }
};