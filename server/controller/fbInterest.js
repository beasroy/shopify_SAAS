import axios from 'axios';
import moment from 'moment';
import Brand from '../models/Brands.js';
import User from '../models/User.js';

// Create instance of axios with defaults for reuse
const fbApi = axios.create({
  baseURL: 'https://graph.facebook.com/v19.0',
  timeout: 10000
});

// Batch size for parallel API requests
const BATCH_SIZE = 5;

export const divideDateRange = (startDate, endDate, chunks = 4) => {
  const start = moment(startDate);
  const end = moment(endDate);
  const totalDays = end.diff(start, 'days');
  const chunkSize = Math.ceil(totalDays / chunks);

  const dateRanges = [];
  for (let i = 0; i < chunks; i++) {
    const chunkStart = moment(start).add((i * chunkSize), 'days');
    const chunkEnd = i === chunks - 1
      ? moment(end)
      : moment(start).add((i + 1) * chunkSize - 1, 'days');

    dateRanges.push({
      startDate: chunkStart.format('YYYY-MM-DD'),
      endDate: chunkEnd.format('YYYY-MM-DD')
    });
  }

  return dateRanges;
};

// Process ad sets in batches to limit concurrent requests
const processBatch = async (items, processFn) => {
  const results = [];
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
  }
  
  return results;
};

// Fetch ad sets and their metrics in a single call to reduce API requests
export async function getAdSetInterestsAndMetrics(accessToken, adAccountIds, startDate, endDate) {
  try {
    const accountIds = Array.isArray(adAccountIds) ? adAccountIds : [adAccountIds];
    const resultsByAccount = {};
    
    // Process accounts in batches to avoid too many parallel requests
    await processBatch(accountIds, async (adAccountId) => {
      try {
        // Get account info and ad sets with metrics in parallel
        const [accountInfoResponse, adSetsResponse] = await Promise.all([
          fbApi.get(`/${adAccountId}`, {
            params: {
              fields: 'name',
              access_token: accessToken
            }
          }),
          fbApi.get(`/${adAccountId}/adsets`, {
            params: {
              fields: 'id,name,targeting,insights.time_range({"since":"' + startDate + '","until":"' + endDate + '"}).fields(spend,action_values)',
              limit: 100, // Increase limit to reduce pagination
              time_range: JSON.stringify({ since: startDate, until: endDate }),
              access_token: accessToken
            }
          })
        ]);
        
        const accountName = accountInfoResponse.data.name || adAccountId;
        resultsByAccount[accountName] = {
          adAccountId,
          interestMetrics: {} // Temporary object for aggregation
        };
        
        const adSets = adSetsResponse.data.data || [];
        
        // Process ad sets and extract data in a single loop
        adSets.forEach(adSet => {
          // Extract interests
          const interests = adSet.targeting && 
                          adSet.targeting.flexible_spec && 
                          adSet.targeting.flexible_spec[0] &&
                          adSet.targeting.flexible_spec[0].interests
                          ? adSet.targeting.flexible_spec[0].interests
                          : [];
          
          if (interests.length === 0) return;
          
          // Extract metrics (directly from the insights edge we requested)
          const metrics = adSet.insights && adSet.insights.data && adSet.insights.data[0] 
            ? adSet.insights.data[0] 
            : { spend: '0' };
          
          const purchaseValue = metrics.action_values 
            ? metrics.action_values.find(action => action.action_type === 'purchase') 
            : null;
          
          const spend = parseFloat(metrics.spend || 0);
          const revenue = parseFloat(purchaseValue?.value || 0);
          
          // Update interest metrics
          interests.forEach(interest => {
            const interestName = interest.name;
            const interestId = interest.id;
            
            if (!resultsByAccount[accountName].interestMetrics[interestId]) {
              resultsByAccount[accountName].interestMetrics[interestId] = {
                Interest: interestName,
                InterestId: interestId,
                Spend: 0,
                Revenue: 0,
                Roas: 0
              };
            }
            
            resultsByAccount[accountName].interestMetrics[interestId].Spend += spend;
            resultsByAccount[accountName].interestMetrics[interestId].Revenue += revenue;
          });
        });
        
        // Calculate ROAS for each interest and convert to array
        Object.values(resultsByAccount[accountName].interestMetrics).forEach(interest => {
          interest.Roas = interest.Spend > 0 
            ? interest.Revenue / interest.Spend 
            : 0;
        });
        
        // Convert object to array as requested
        resultsByAccount[accountName].interestMetrics = Object.values(resultsByAccount[accountName].interestMetrics);
        
      } catch (accountError) {
        resultsByAccount[adAccountId] = {
          adAccountId,
          error: accountError.message,
          interestMetrics: []
        };
      }
    });
    
    return resultsByAccount;
  } catch (error) {
    console.error('Error fetching ad set interests and metrics:', error);
    throw error;
  }
}

export const fetchChunkedInterestData = async (accessToken, adAccountIds, startDate, endDate, chunks = 4) => {
  try {
    // Divide the date range into chunks
    const dateRanges = divideDateRange(startDate, endDate, chunks);
    
    // Fetch data for each chunk in parallel batches
    const chunkResults = await processBatch(dateRanges, async (range) => {
      return await getAdSetInterestsAndMetrics(
        accessToken, 
        adAccountIds, 
        range.startDate, 
        range.endDate
      );
    });
    
    // Merge chunk results
    const mergedResults = mergeChunkedResults(chunkResults);
    
    // Create blended summary
    const blendedSummary = createBlendedSummary(mergedResults);
    
    return {
      resultsByAccount: mergedResults,
      blendedSummary
    };
  } catch (error) {
    console.error('Error in fetchChunkedInterestData:', error);
    throw error;
  }
};

export const mergeChunkedResults = (chunkResults) => {
  const mergedResults = {};
  
  // Process each chunk
  chunkResults.forEach((chunkResult) => {
    // Process each account in the chunk
    Object.entries(chunkResult).forEach(([accountName, accountData]) => {
      // Initialize account if it doesn't exist in merged results
      if (!mergedResults[accountName]) {
        mergedResults[accountName] = {
          adAccountId: accountData.adAccountId,
          interestMetrics: {} // Temporary object for merging
        };
      }
      
      // Error handling
      if (accountData.error) {
        mergedResults[accountName].error = accountData.error;
        return;
      }
      
      // Merge interest metrics
      accountData.interestMetrics.forEach(interest => {
        const interestId = interest.InterestId;
        
        if (!mergedResults[accountName].interestMetrics[interestId]) {
          mergedResults[accountName].interestMetrics[interestId] = {
            Interest: interest.Interest,
            InterestId: interestId,
            Spend: 0,
            Revenue: 0,
            Roas: 0
          };
        }
        
        // Add metrics from this chunk
        mergedResults[accountName].interestMetrics[interestId].Spend += interest.Spend;
        mergedResults[accountName].interestMetrics[interestId].Revenue += interest.Revenue;
      });
    });
  });
  
  // Recalculate ROAS for merged results and convert to array
  Object.values(mergedResults).forEach(accountData => {
    if (!accountData.error) {
      Object.values(accountData.interestMetrics).forEach(interest => {
        interest.Roas = interest.Spend > 0 ? 
          interest.Revenue / interest.Spend : 0;
      });
      
      // Convert to array format
      accountData.interestMetrics = Object.values(accountData.interestMetrics);
    }
  });
  
  return mergedResults;
};

export const createBlendedSummary = (resultsByAccount) => {
  const blendedInterestsObj = {};
  
  // Combine all interests across all accounts in a single pass
  Object.entries(resultsByAccount).forEach(([accountName, accountData]) => {
    if (accountData.error) return;
    
    accountData.interestMetrics.forEach(interest => {
      const interestId = interest.InterestId;
      
      if (!blendedInterestsObj[interestId]) {
        blendedInterestsObj[interestId] = {
          Interest: interest.Interest,
          InterestId: interestId,
          Spend: 0,
          Revenue: 0,
          Roas: 0,
          accounts: []
        };
      }
      
      // Add metrics
      blendedInterestsObj[interestId].Spend += interest.Spend;
      blendedInterestsObj[interestId].Revenue += interest.Revenue;
      
      // Add account if not already included
      if (!blendedInterestsObj[interestId].accounts.includes(accountName)) {
        blendedInterestsObj[interestId].accounts.push(accountName);
      }
    });
  });
  
  // Calculate ROAS for blended interests
  Object.values(blendedInterestsObj).forEach(interest => {
    interest.Roas = interest.Spend > 0 ? 
      interest.Revenue / interest.Spend : 0;
  });
  
  // Convert to array format
  return Object.values(blendedInterestsObj);
};

// Express route handler
export const fetchInterestData = async (req, res) => {
  try { 
    const { startDate, endDate } = req.body;
    const { brandId } = req.params;
    const userId = req.user.id;

    if (!brandId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID and User ID are required.'
      });
    }

    // Fetch brand and user data in parallel
    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean()
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found'
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

    if (!accessToken) {
      return res.status(403).json({
        success: false,
        message: 'User does not have a valid Facebook access token.',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const start = moment(startDate);
    const end = moment(endDate);
    const daysRange = end.diff(start, 'days');
    
    // Use optimal chunking strategy
    const chunks = daysRange > 90 ? Math.ceil(daysRange / 90) : 1;
   
    const results = await fetchChunkedInterestData(
      accessToken, 
      adAccountIds, 
      startDate, 
      endDate,
      chunks
    );
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error in fetchInterestData:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred while fetching ad interests and metrics data',
      error: error.message 
    });
  }
};