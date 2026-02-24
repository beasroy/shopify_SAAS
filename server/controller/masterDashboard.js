
import AdMetrics from "../models/AdMetrics.js";
import Brand from "../models/Brands.js";
import pLimit from "p-limit";
import moment from "moment";
import axios from "axios";
import {  getAggregatedFbMetrics, splitDateRangeIntoBatches } from "./adMetcris.js";

const limit = pLimit(5);

export const getMarketingInsights = async (req, res) => {
    try {
        
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "startDate and endDate are required" });
        }

        const query = {};

        const today = new Date();
        const twoYearsAgo = new Date(today);
        twoYearsAgo.setFullYear(today.getFullYear() - 2);

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start < twoYearsAgo || end < twoYearsAgo) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select a date range within the last 2 years.'
                });
            }

            const dayStart = new Date(start);
            dayStart.setUTCHours(0, 0, 0, 0);

            const dayEnd = new Date(end);
            dayEnd.setUTCHours(23, 59, 59, 999);

            query.date = { $gte: dayStart, $lte: dayEnd };
        }

        console.log("Final query:", query);

        const metrics = await AdMetrics.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        brandId: "$brandId",
                        month: { $month: "$date" },
                        year: { $year: "$date" }
                    },
                    totalSales: { $sum: "$totalSales" },
                    refundAmount: { $sum: "$refundAmount" },
                    metaSpend: { $sum: "$metaSpend" },
                    googleSpend: { $sum: "$googleSpend" },
                    totalSpend: { $sum: "$totalSpend" },
                    // dailyMetrics: {
                    //     $push: {
                    //         date: "$date",
                    //         totalSales: "$totalSales",
                    //         refundAmount: "$refundAmount",
                    //         metaSpend: "$metaSpend",
                    //         googleSpend: "$googleSpend",
                    //         totalSpend: "$totalSpend",
                    //         metaRevenue: "$metaRevenue",
                    //         googleROAS: "$googleROAS",
                    //         grossROI: "$grossROI",
                    //     }
                    // }
                }
            },
            {
                $project: {
                    month: "$_id.month",
                    year: "$_id.year",
                    totalSales: 1,
                    refundAmount: 1,
                    metaSpend: 1,
                    googleSpend: 1,
                    totalSpend: 1,
                    dailyMetrics: {
                        $sortArray: {
                            input: "$dailyMetrics",
                            sortBy: { date: -1 }
                        }
                    }
                }
            },
            { $sort: { year: -1, month: -1 } }
        ]);

        if (!metrics || metrics.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No data found for the selected date range.'
            });
        }

        res.status(200).json({ success: true, data: metrics });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const mergeAccountDataAcrossBatches = (batchedAccounts) => {
  const accountMap = {};

  batchedAccounts.forEach(account => {
    const id = account.adAccountId;

    if (!accountMap[id]) {
      // Initialize with Zeros
      accountMap[id] = {
        adAccountId: id,
        account_name: account.account_name || '',
        spend: 0,
        clicks: 0,
        impressions: 0,
        revenueValue: 0,
        purchasesValue: 0,
      };
    }

    // ✅ FORCE ADDITION (The missing piece)
    accountMap[id].spend += parseFloat(account.spend || 0);
    accountMap[id].clicks += parseFloat(account.clicks || 0);
    accountMap[id].impressions += parseFloat(account.impressions || 0);
    
    // Handle nested Revenue object from fetchAdAccountInsights
    const rev = account.Revenue?.value || account.revenueValue || 0;
    accountMap[id].revenueValue += parseFloat(rev);

    const purch = account.purchases?.value || account.purchasesValue || 0;
    accountMap[id].purchasesValue += parseFloat(purch);
  });

  // Convert back to your display format
  return Object.values(accountMap).map(acc => ({
    ...acc,
    Revenue: { value: acc.revenueValue },
    purchases: { value: acc.purchasesValue },
    // Recalculate ratios based on the NEW total spend
    cpc: acc.clicks > 0 ? (acc.spend / acc.clicks).toFixed(2) : 0,
    ctr: acc.impressions > 0 ? ((acc.clicks / acc.impressions) * 100).toFixed(2) : 0,
    cpm: acc.impressions > 0 ? ((acc.spend * 1000) / acc.impressions).toFixed(2) : 0,
    cpp: acc.purchasesValue > 0 ? (acc.spend / acc.purchasesValue).toFixed(2) : 0
  }));
};

export const fetchAdAccountInsights = async (adAccountIds, accessToken, startDate, endDate) => {
  const batchRequests = adAccountIds.map((accountId) => ({
    method: 'GET',
    relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,clicks,impressions,cpm,ctr,account_name,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
  }));

  const response = await axios.post(
    `https://graph.facebook.com/v22.0/`,
    { batch: batchRequests },
    {
      headers: { 'Content-Type': 'application/json' },
      params: { access_token: accessToken },
    }
  );

  return adAccountIds.map((accountId, index) => {
    const accountResponse = response.data[index];
    const accountData = {
      adAccountId: accountId,
      account_name: '',
      spend: 0,
      clicks: 0,
      impressions: 0,
      revenueValue: 0,
      purchasesValue: 0,
    };

    if (accountResponse.code === 200) {
      const accountBody = JSON.parse(accountResponse.body);

      if (accountBody.data && accountBody.data.length > 0) {
        // ✅ CRITICAL FIX: Loop through ALL data entries, don't just take [0]
        accountBody.data.forEach((insight) => {
          accountData.account_name = insight.account_name || accountData.account_name;
          accountData.spend += parseFloat(insight.spend || 0);
          accountData.clicks += parseFloat(insight.clicks || 0);
          accountData.impressions += parseFloat(insight.impressions || 0);

          const rev = insight.action_values?.find((a) => a.action_type === 'purchase');
          accountData.revenueValue += parseFloat(rev?.value || 0);

          const purch = insight.actions?.find((a) => a.action_type === 'purchase');
          accountData.purchasesValue += parseFloat(purch?.value || 0);
        });
      }
    }

    // Return the structure expected by your merge/aggregator functions
    return {
      ...accountData,
      Revenue: { value: accountData.revenueValue },
      purchases: { value: accountData.purchasesValue },
      // Ratios will be recalculated by your merge function later
    };
  });
};

export const fbAllBrandsAdData = async (req, res) => {
  let { startDate, endDate } = req.body;

  try {
    // ============================
    // 1️⃣ Default Date Handling
    // ============================
    if (!startDate || !endDate) {
      startDate = moment().startOf('month').format('YYYY-MM-DD');
      endDate = moment().format('YYYY-MM-DD');
    }

    const startMoment = moment(startDate, 'YYYY-MM-DD', true);
    const endMoment = moment(endDate, 'YYYY-MM-DD', true);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    if (endMoment.isBefore(startMoment)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    // ============================
    // 2️⃣ Fetch Valid Brands
    // ============================
    const brands = await Brand.find({
      fbAccessToken: { $exists: true, $ne: "" },
      fbAdAccounts: { $exists: true, $not: { $size: 0 } }
    }).lean();

    if (!brands.length) {
      return res.status(404).json({
        success: false,
        message: 'No active FB brands found.'
      });
    }

    // ============================
    // 3️⃣ Process Brands (Limited)
    // ============================
    const brandDataPromises = brands.map((brand) =>
      limit(async () => {
        try {
          const { fbAdAccounts: adAccountIds, fbAccessToken: accessToken } = brand;

          const monthsDifference = endMoment.diff(startMoment, 'months');

          let accountResults = [];

          // If date range > 3 months → split into batches
          if (monthsDifference >= 3) {
            const batches = splitDateRangeIntoBatches(startDate, endDate);

            const batchResults = await Promise.all(
              batches.map(batch =>
                fetchAdAccountInsights(
                  adAccountIds,
                  accessToken,
                  batch.start,
                  batch.end
                )
              )
            );

            accountResults = mergeAccountDataAcrossBatches(batchResults.flat());
          } else {
            accountResults = await fetchAdAccountInsights(
              adAccountIds,
              accessToken,
              startDate,
              endDate
            );
          }

          return {
            brandId: brand._id,
            brandName: brand.name,
            status: 'success',
            adAccounts: accountResults,
            summary: getAggregatedFbMetrics(accountResults)
          };

        } catch (brandError) {
          console.error(`[LIMITER] Brand ${brand.name} failed:`, brandError.message);

          return {
            brandId: brand._id,
            brandName: brand.name,
            status: 'error',
            message: brandError.message
          };
        }
      })
    );

    const allBrandsResults = await Promise.all(brandDataPromises);

    // ============================
    // 4️⃣ Final Response
    // ============================
    return res.status(200).json({
      success: true,
      count: allBrandsResults.length,
      brands: allBrandsResults
    });

  } catch (error) {
    console.error('Controller error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};



export const getAllBrandsMetricsFromDB = async (req, res) => {
  let { startDate, endDate } = req.query;
  startDate = startDate?.toString();
  endDate = endDate?.toString();

  try {

    if (!startDate || !endDate) {
      startDate = moment().startOf('month').format('YYYY-MM-DD');
      endDate = moment().format('YYYY-MM-DD');
    }

    const start = moment(startDate, 'YYYY-MM-DD', true);
    const end = moment(endDate, 'YYYY-MM-DD', true);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    if (end.isBefore(start)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    // Convert to proper Date range
    const startDateObj = start.startOf('day').toDate();
    const endDateObj = end.endOf('day').toDate();


    const brandMetrics = await AdMetrics.aggregate([
      {
        $match: {
          date: {
            $gte: startDateObj,
            $lte: endDateObj
          }
        }
      },
      {
        $group: {
          _id: "$brandId",

          totalSales: { $sum: "$totalSales" },
          refundAmount: { $sum: "$refundAmount" },

          metaSpend: { $sum: "$metaSpend" },
          metaRevenue: { $sum: "$metaRevenue" },

          googleSpend: { $sum: "$googleSpend" },

          totalSpend: { $sum: "$totalSpend" }
        }
      },
      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brand"
        }
      },
      { $unwind: "$brand" },
      {
        $project: {
          _id: 0,
          brandId: "$_id",
          brandName: "$brand.name",

          totalSales: 1,
          refundAmount: 1,
          netSales: { $subtract: ["$totalSales", "$refundAmount"] },

          metaSpend: 1,
          metaRevenue: 1,
          googleSpend: 1,
          totalSpend: 1,

          // Meta ROAS
          metaROAS: {
            $cond: [
              { $gt: ["$metaSpend", 0] },
              { $divide: ["$metaRevenue", "$metaSpend"] },
              0
            ]
          },

          // Overall ROAS
          overallROAS: {
            $cond: [
              { $gt: ["$totalSpend", 0] },
              { $divide: ["$totalSales", "$totalSpend"] },
              0
            ]
          }
        }
      },
      {
        $sort: { totalSales: -1 }
      }
    ]);

    const overallSummary = brandMetrics.reduce(
      (acc, brand) => {
        acc.totalSales += brand.totalSales;
        acc.refundAmount += brand.refundAmount;
        acc.metaSpend += brand.metaSpend;
        acc.metaRevenue += brand.metaRevenue;
        acc.googleSpend += brand.googleSpend;
        acc.totalSpend += brand.totalSpend;
        return acc;
      },
      {
        totalSales: 0,
        refundAmount: 0,
        metaSpend: 0,
        metaRevenue: 0,
        googleSpend: 0,
        totalSpend: 0
      }
    );

    overallSummary.netSales =
      overallSummary.totalSales - overallSummary.refundAmount;

    overallSummary.metaROAS =
      overallSummary.metaSpend > 0
        ? overallSummary.metaRevenue / overallSummary.metaSpend
        : 0;

    overallSummary.overallROAS =
      overallSummary.totalSpend > 0
        ? overallSummary.totalSales / overallSummary.totalSpend
        : 0;


    return res.status(200).json({
      success: true,
      dateRange: {
        startDate,
        endDate
      },
      count: brandMetrics.length,
      summary: overallSummary,
      brands: brandMetrics
    });

  } catch (error) {
    console.error("Metrics fetch error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// export const fbAllBrandsAdData = async (req, res) => {
//   let { startDate, endDate } = req.body;

//   try {
//     if (!startDate || !endDate) {
//       startDate = moment().startOf('month').format('YYYY-MM-DD');
//       endDate = moment().format('YYYY-MM-DD');
//     }

//     const brands = await Brand.find({
//       fbAccessToken: { $exists: true, $ne: "" },
//       fbAdAccounts: { $exists: true, $not: { $size: 0 } }
//     }).lean();

//     if (!brands.length) {
//       return res.status(404).json({ success: false, message: 'No active FB brands found.' });
//     }

//     // Wrap our logic in the limit function
//     const brandDataPromises = brands.map((brand) => 
//       limit(async () => {
//         try {
//           const adAccountIds = brand.fbAdAccounts;
//           const accessToken = brand.fbAccessToken;
          
//           const startMoment = moment(startDate);
//           const endMoment = moment(endDate);
//           const monthsDifference = endMoment.diff(startMoment, 'months');
          
//           let accountResults = [];

//           if (monthsDifference >= 3) {
//             const batches = splitDateRangeIntoBatches(startDate, endDate);
            
//             // We can also throttle the internal batch requests 
//             // to ensure one brand doesn't hog the limit
//             const batchResults = await Promise.all(batches.map(batch => 
//               fetchAdAccountInsights(adAccountIds, accessToken, batch.start, batch.end)
//             ));
            
//             accountResults = mergeAccountDataAcrossBatches(batchResults.flat());
//           } else {
//             accountResults = await fetchAdAccountInsights(adAccountIds, accessToken, startDate, endDate);
//           }

//           return {
//             brandId: brand._id,
//             brandName: brand.name,
//             adAccounts: accountResults,
//             summary: getAggregatedFbMetrics(accountResults)
//           };
//         } catch (brandError) {
//           console.error(`[LIMITER] Brand ${brand.name} failed:`, brandError.message);
//           return {
//             brandId: brand._id,
//             brandName: brand.name,
//             status: 'error',
//             message: brandError.message
//           };
//         }
//       })
//     );

//     const allBrandsResults = await Promise.all(brandDataPromises);

//     return res.status(200).json({
//       success: true,
//       count: allBrandsResults.length,
//       brands: allBrandsResults
//     });

//   } catch (error) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// export const fetchFBAdAccountData = async (req, res) => {

//     let { startDate, endDate } = req.body;
//     const { brandId } = req.params;
  
//     console.log(`[API] Date range: ${startDate} to ${endDate}`);
  
//     try {
//       // Set default date range if not provided
//       if (!startDate || !endDate) {
//         startDate = moment().startOf('month').format('YYYY-MM-DD');
//         endDate = moment().format('YYYY-MM-DD');
//         console.log(`[API] Using default date range: ${startDate} to ${endDate}`);
//       }
  
//       // Find brand and user
//       const brand = await Brand.findById(brandId).populate('fbAdAccounts').lean();
  
//       if (!brand) {
//         console.log(`[API] Brand not found: ${brandId}`);
//         return res.status(404).json({
//           success: false,
//           message: !brand ? 'Brand not found.' : 'User not found.',
//         });
//       }
  
//       const adAccountIds = brand.fbAdAccounts.map(account => account.adAccountId);
  
//       if (!adAccountIds || adAccountIds.length === 0) {
//         console.log(`[API] No Facebook Ads accounts found for brand ${brandId}`);
//         return res.status(404).json({
//           success: false,
//           message: 'No Facebook Ads accounts found for this brand.',
//         });
//       }
  
//       console.log(`[API] Found ${adAccountIds.length} ad accounts: ${adAccountIds.join(', ')}`);
  
//       const accessToken = brand.fbAccessToken;
//       if (!accessToken) {
//         console.log(`[API] Brand ${brandId} does not have a valid Facebook access token`);
//         return res.status(403).json({
//           success: false,
//           message: 'Brand does not have a valid Facebook access token.',
//         });
//       }
  
//       // Validate the access token before proceeding
//       try {
//         console.log(`[API] Validating Facebook access token...`);
//         const tokenValidationResponse = await axios.get(
//           `https://graph.facebook.com/v22.0/debug_token`,
//           {
//             params: {
//               input_token: accessToken,
//               access_token: accessToken
//             }
//           }
//         );
  
//         const tokenData = tokenValidationResponse.data?.data;
//         if (tokenData) {
//           console.log(`[API] Token validation: Is valid: ${tokenData.is_valid}, Expires: ${new Date(tokenData.expires_at * 1000).toISOString()}`);
//           if (!tokenData.is_valid) {
//             console.log(`[API] Token is invalid: ${tokenData.error?.message || 'No error message'}`);
//             return res.status(403).json({
//               success: false,
//               message: 'Facebook access token is invalid.',
//             });
//           }
//         }
//       } catch (tokenError) {
//         console.error(`[API] Error validating token: ${tokenError.message}`);
//         // Continue anyway, as the main request will fail if the token is invalid
//       }
  
//       // Calculate if the date range is large and needs to be batched
//       const startMoment = moment(startDate);
//       const endMoment = moment(endDate);
//       const monthsDifference = endMoment.diff(startMoment, 'months');
//       const isLongDateRange = monthsDifference >= 3;
  
//       let results = [];
  
//       if (isLongDateRange) {
//         console.log(`[BATCH] Date range is ${monthsDifference} months, using batch processing`);
//         const batches = splitDateRangeIntoBatches(startDate, endDate);
//         console.log(`[BATCH] Split into ${batches.length} batches: ${JSON.stringify(batches)}`);
  
//         // Process batches in parallel
//         const batchResults = await Promise.all(batches.map(async (batch, batchIndex) => {
//           console.log(`[BATCH] Processing batch ${batchIndex + 1}/${batches.length} from ${batch.start} to ${batch.end}`);
  
//           try {
//             const accountsData = await fetchAdAccountInsights(adAccountIds, accessToken, batch.start, batch.end)
//             // Merge the data for each account
//             return accountsData.map((accountData, index) => {
//               return {
//                 ...accountData,
//                 dateRange: { start: batch.start, end: batch.end }
//               };
//             });
//           } catch (batchError) {
//             console.error(`[BATCH] Error processing batch ${batchIndex + 1}: ${batchError.message}`);
//             return adAccountIds.map(accountId => ({
//               adAccountId: accountId,
//               dateRange: { start: batch.start, end: batch.end },
//               error: batchError.message
//             }));
//           }
//         }));
  
//         // Merge all batch results into a single dataset
//         results = mergeAccountDataAcrossBatches(batchResults.flat());
//       } else {
//         const accountsData = await fetchAdAccountInsights(adAccountIds, accessToken, startDate, endDate)
         
//         // Merge the data for each account
//         results = accountsData.map((accountData, index) => {
//           return {
//             ...accountData,
//           };
//         });
//       }
  
//       // Calculate aggregated metrics
//       const aggregatedMetrics = getAggregatedFbMetrics(results);
  
     
//       return res.status(200).json({
//         success: true,
//         data: results,
//         aggregatedMetrics,
//       });
//     } catch (error) {
//       console.error('[ERROR] Error fetching Facebook Ad Account :', error);
//       if (error.response) {
//         console.log(`[ERROR] API response status: ${error.response.status}`);
//         console.log(`[ERROR] API response data:`, error.response.data);
//       }
//       return res.status(500).json({
//         success: false,
//         message: 'An error occurred while fetching Facebook Ad Account  data.',
//         error: error.message,
//       });
//     }
//   };