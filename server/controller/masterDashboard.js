
import AdMetrics from "../models/AdMetrics.js";
import Brand from "../models/Brands.js";
import pLimit from "p-limit";
import moment from "moment";
import axios from "axios";
import mongoose from "mongoose";
import {  fetchAdAccountInsights, splitDateRangeIntoBatches } from "./adMetcris.js";
import { config } from 'dotenv';
import { GoogleAdsApi } from "google-ads-api";
import { calculateMetrics, formatDate, retryWithBackoff } from "./summary.js";


config();

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
});


const limit = pLimit(3);

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

// export const fetchAdAccountInsights = async (adAccountIds, accessToken, startDate, endDate) => {
//   const batchRequests = adAccountIds.map((accountId) => ({
//     method: 'GET',
//     relative_url: `${accountId}/insights?fields=spend,purchase_roas,actions,clicks,impressions,cpm,ctr,account_name,action_values&time_range={'since':'${startDate}','until':'${endDate}'}`,
//   }));

//   const response = await axios.post(
//     `https://graph.facebook.com/v22.0/`,
//     { batch: batchRequests },
//     {
//       headers: { 'Content-Type': 'application/json' },
//       params: { access_token: accessToken },
//     }
//   );

//   return adAccountIds.map((accountId, index) => {
//     const accountResponse = response.data[index];
//     const accountData = {
//       adAccountId: accountId,
//       account_name: '',
//       spend: 0,
//       clicks: 0,
//       impressions: 0,
//       revenueValue: 0,
//       purchasesValue: 0,
//     };

//     if (accountResponse.code === 200) {
//       const accountBody = JSON.parse(accountResponse.body);

//       if (accountBody.data && accountBody.data.length > 0) {
//         // ✅ CRITICAL FIX: Loop through ALL data entries, don't just take [0]
//         accountBody.data.forEach((insight) => {
//           accountData.account_name = insight.account_name || accountData.account_name;
//           accountData.spend += parseFloat(insight.spend || 0);
//           accountData.clicks += parseFloat(insight.clicks || 0);
//           accountData.impressions += parseFloat(insight.impressions || 0);

//           const rev = insight.action_values?.find((a) => a.action_type === 'purchase');
//           accountData.revenueValue += parseFloat(rev?.value || 0);

//           const purch = insight.actions?.find((a) => a.action_type === 'purchase');
//           accountData.purchasesValue += parseFloat(purch?.value || 0);
//         });
//       }
//     }

//     // Return the structure expected by your merge/aggregator functions
//     return {
//       ...accountData,
//       Revenue: { value: accountData.revenueValue },
//       purchases: { value: accountData.purchasesValue },
//       // Ratios will be recalculated by your merge function later
//     };
//   });
// };

export const fbAllBrandsAdData = async (req, res) => {
  let { startDate, endDate } = req.body;

  try {
    
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


const brandsList = [
  "68ca95ad548d518de4fca1af",
  "68cc2437e78884ea57ff5385",
  "68d3ca10e78884ea57ff6485",
  "68dd21f5e78884ea57ff762f",
  "6941510e2deb1bce03ca02a2",
  "695b86742d2fb7ad98fb57db",
  "695e30a0ff8894bc66d801c5",
  "6996c6db049176b75d224988",
]

const getAggregatedFbMetrics = (fbAdAccounts) => {
  if (!fbAdAccounts || fbAdAccounts.length === 0) {
    return {
      fbTotalSpent: 0,
      fbTotalRevenue: 0,
      fbTotalROAS: 0,
      fbTotalPurchases: 0,
      fbTotalCTR: 0,
      fbTotalCPC: 0,
      fbTotalCPM: 0,
      fbTotalCPP: 0,
      fbTotalClicks: 0,
      fbTotalImpressions: 0,
    };
  }

  let fbTotalSpent = 0;
  let fbTotalRevenue = 0;
  let fbTotalPurchases = 0;
  let fbTotalClicks = 0;
  let fbTotalImpressions = 0;

  fbAdAccounts.forEach(account => {
    fbTotalSpent += parseFloat(account.spend || '0');
    fbTotalRevenue += parseFloat(account.Revenue?.value || '0');
    fbTotalPurchases += parseFloat(account.purchases?.value || '0');
    fbTotalClicks += parseFloat(account.clicks || '0');
    fbTotalImpressions += parseFloat(account.impressions || '0');
  });

  return {
    fbTotalSpent,
    fbTotalRevenue,
    fbTotalROAS: fbTotalRevenue / fbTotalSpent || 0,
    fbTotalPurchases,
    fbTotalCTR: (fbTotalClicks / fbTotalImpressions) * 100 || 0,
    fbTotalCPC: fbTotalSpent / fbTotalClicks || 0,
    fbTotalCPM: (fbTotalSpent * 1000) / fbTotalImpressions || 0,
    fbTotalCPP: fbTotalPurchases > 0 ? (fbTotalSpent / fbTotalPurchases) : 0,
    fbTotalClicks,
    fbTotalImpressions,
  };
};

export const getAllBrandsMetricsFromDB = async (req, res) => {
  let { dateRangeFilter } = req.query;
  try {

    if (!dateRangeFilter) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }


    const startDate =
  dateRangeFilter === 'yesterday'
    ? moment().subtract(1, 'day').startOf('day').toDate()
    : dateRangeFilter === 'last_7d'
    ? moment().subtract(7, 'days').startOf('day').toDate()
    : dateRangeFilter === 'last_30d'
    ? moment().subtract(30, 'days').startOf('day').toDate()
    : null;

    const endDate = moment().subtract(1, 'day').endOf('day').toDate();


    const brandObjectIds = brandsList.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // const selectBrands = await Brand.find({ _id: { $in: brandObjectIds } });
    // console.log("selectBrands", selectBrands?.length);

    const brandMetrics = await AdMetrics.aggregate([
      {
        $match: {
          brandId: { $in: brandObjectIds },
          date: {
            $gte: startDate,
            $lte: endDate,
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


export const fetchFBAdAccountData = async (req, res) => {
  const { dateRangeFilter } = req.query;

  try {
    if (!dateRangeFilter) {
      return res.status(400).json({
        success: false,
        message: "dateRangeFilter is required (yesterday | last_7d | last_30d)",
      });
    }

   
    let startDate;
    let endDate;

    if (dateRangeFilter === "yesterday") {
      startDate = moment().subtract(1, "day").startOf("day").format("YYYY-MM-DD");
      endDate = moment().subtract(1, "day").endOf("day").format("YYYY-MM-DD");
    } 
    else if (dateRangeFilter === "last_7d") {
      startDate = moment().subtract(7, "days").startOf("day").format("YYYY-MM-DD");
      endDate = moment().format("YYYY-MM-DD");
    } 
    else if (dateRangeFilter === "last_30d") {
      startDate = moment().subtract(30, "days").startOf("day").format("YYYY-MM-DD");
      endDate = moment().format("YYYY-MM-DD");
    } 
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid dateRangeFilter",
      });
    }

    
    const brands = await Brand.find({
      _id: { $in: brandsList },
      fbAccessToken: { $exists: true, $ne: "" },
      fbAdAccounts: { $exists: true, $not: { $size: 0 } },
    }).lean();

    if (!brands.length) {
      return res.status(404).json({
        success: false,
        message: "No valid FB brands found.",
      });
    }

   
    const brandResults = await Promise.all(
      brands.map((brand) =>
        limit(async () => {
          try {
            const { fbAdAccounts: adAccountIds, fbAccessToken: accessToken } = brand;

            const accountsData = await fetchAdAccountInsights(
              adAccountIds,
              accessToken,
              startDate,
              endDate
            );

            const aggregatedMetrics = getAggregatedFbMetrics(accountsData);

            return {
              brandId: brand._id,
              brandName: brand.name,
              status: "success",
              data: accountsData,
              aggregatedMetrics,
            };
          } catch (brandError) {
            console.error(`Brand ${brand.name} failed:`, brandError.message);

            return {
              brandId: brand._id,
              brandName: brand.name,
              status: "error",
              message: brandError.message,
            };
          }
        })
      )
    );

    return res.status(200).json({
      success: true,
      dateRange: { startDate, endDate },
      totalBrandsProcessed: brandResults.length,
      results: brandResults,
    });

  } catch (error) {
    console.error("Error fetching FB data:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching Facebook Ad data.",
      error: error.message,
    });
  }
};

export async function fetchGoogleAdAndCampaignMetrics(req, res) {
  const { dateRangeFilter } = req.query;

  try {
    if (!dateRangeFilter) {
      return res.status(400).json({
        success: false,
        message: "dateRangeFilter is required (yesterday | last_7d | last_30d)",
      });
    }

    let startDate;
    let endDate;

    if (dateRangeFilter === "yesterday") {
      startDate = moment().subtract(1, "day").startOf("day").format("YYYY-MM-DD");
      endDate = moment().subtract(1, "day").endOf("day").format("YYYY-MM-DD");
    } 
    else if (dateRangeFilter === "last_7d") {
      startDate = moment().subtract(7, "days").startOf("day").format("YYYY-MM-DD");
      endDate = moment().format("YYYY-MM-DD");
    } 
    else if (dateRangeFilter === "last_30d") {
      startDate = moment().subtract(30, "days").startOf("day").format("YYYY-MM-DD");
      endDate = moment().format("YYYY-MM-DD");
    } 
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid dateRangeFilter",
      });
    }

   
    const brands = await Brand.find({
      _id: { $in: brandsList },
      googleAdsRefreshToken: { $exists: true, $ne: "" },
      googleAdAccount: { $exists: true, $not: { $size: 0 } },
    }).lean();

    if (!brands.length) {
      return res.status(404).json({
        success: false,
        message: "No valid Google Ads brands found.",
      });
    }

    const brandResults = await Promise.all(
      brands.map((brand) =>
        limit(async () => {
          try {
            const refreshToken = brand.googleAdsRefreshToken;
            const googleAdAccounts = brand.googleAdAccount || [];

            let combined = {
              spend: 0,
              revenue: 0,
              clicks: 0,
              impressions: 0,
              conversions: 0,
            };

            for (const account of googleAdAccounts) {
              const { clientId, managerId } = account;
              if (!clientId || !managerId) continue;

              const customer = client.Customer({
                customer_id: clientId,
                refresh_token: refreshToken,
                login_customer_id: managerId,
              });

              const report = await customer.report({
                entity: "customer",
                attributes: ["customer.descriptive_name"],
                metrics: [
                  "metrics.cost_micros",
                  "metrics.conversions_value",
                  "metrics.conversions",
                  "metrics.clicks",
                  "metrics.impressions",
                ],
                from_date: startDate,
                to_date: endDate,
              });


              for (const row of report) {
                combined.spend += (row.metrics.cost_micros || 0) / 1_000_000;
                combined.revenue += row.metrics.conversions_value || 0;
                combined.clicks += row.metrics.clicks || 0;
                combined.impressions += row.metrics.impressions || 0;
                combined.conversions += row.metrics.conversions || 0;
              }
            }

            const aggregatedMetrics = {
              // totalSpent: combined.spend,
              // totalRevenue: combined.revenue,
              // totalROAS: combined.spend > 0
              //   ? combined.revenue / combined.spend
              //   : 0,
              googleTotalCTR: combined.impressions > 0
                ? ((combined.clicks / combined.impressions) * 100).toFixed(2)
                : 0,
              googleTotalCPC: combined.clicks > 0
                ? (combined.spend / combined.clicks).toFixed(2)
                : 0,
              // googleTotalCPM: combined.impressions > 0
              //   ? (combined.spend * 1000) / combined.impressions
              //   : 0,
              googleTotalCPP: combined.conversions > 0
                ? (combined.spend / combined.conversions).toFixed(2)
                : 0,
              // totalClicks: combined.clicks,
              // totalImpressions: combined.impressions,
              // totalPurchases: combined.conversions,
            };

            return {
              brandId: brand._id,
              brandName: brand.name,
              status: "success",
              aggregatedMetrics,
            };
          } catch (err) {
            return {
              brandId: brand._id,
              brandName: brand.name,
              status: "error",
              message: err.message,
            };
          }
        })
      )
    );

    return res.json({
      success: true,
      dateRange: { startDate, endDate },
      totalBrandsProcessed: brandResults.length,
      brands: brandResults,
    });

  } catch (error) {
    console.error("Error fetching Google Ads metrics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Google Ads metrics.",
      error: error.message,
    });
  }
}


const getGoogleAccessToken = async (refreshToken) => {
  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    return response.data.access_token;
  } catch (error) {
    console.error("Token Refresh Error:", error.response?.data || error.message);
    throw new Error("Could not refresh Google Access Token");
  }
};


export async function getBrandWiseFunnelMetrics(req, res) {
  try {
    const { dateRangeFilter } = req.query;
    
    const yesterday = moment().subtract(1, "day").format("YYYY-MM-DD");
    let startDate, endDate;

    if (dateRangeFilter === "yesterday") {
      startDate = yesterday;
      endDate = yesterday;
    } else if (dateRangeFilter === "last_7d") {
      startDate = moment().subtract(7, "days").format("YYYY-MM-DD");
      endDate = yesterday;
    } else if (dateRangeFilter === "last_30d") {
      startDate = moment().subtract(30, "days").format("YYYY-MM-DD");
      endDate = yesterday;
    } else {
      return res.status(400).json({ success: false, message: "Invalid filter" });
    }

    const brands = await Brand.find({
      _id: { $in: brandsList },
      googleAnalyticsRefreshToken: { $exists: true, $ne: "" },
    }).lean();

    const brandResults = await Promise.all(
      brands.map((brand) =>
        limit(async () => {
          try {
            const propertyId = brand.ga4Account?.PropertyID;
            const refreshToken = brand.googleAnalyticsRefreshToken;
            const accessToken = await getGoogleAccessToken(refreshToken);

            const response = await axios.post(
              `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
              {
                dateRanges: [{ startDate, endDate }],
                metrics: [
                  { name: "sessions" },           // Index 0
                  { name: "addToCarts" },        // Index 1
                  { name: "checkouts" },         // Index 2
                  { name: "ecommercePurchases" } // Index 3
                ],
              },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            const row = response.data?.rows?.[0];
            const metricValues = row?.metricValues || [];

            // Extract Raw Values
            const sessions = parseInt(metricValues[0]?.value || 0);
            const atc = parseInt(metricValues[1]?.value || 0);
            const checkouts = parseInt(metricValues[2]?.value || 0);
            const purchases = parseInt(metricValues[3]?.value || 0);

            // Calculate Rates (Metric / Sessions)
            const atcRate = sessions > 0 ? (atc / sessions) * 100 : 0;
            const checkoutRate = sessions > 0 ? (checkouts / sessions) * 100 : 0;
            const purchaseRate = sessions > 0 ? (purchases / sessions) * 100 : 0;

            return {
              brandId: brand._id,
              brandName: brand.name,
              status: "success",
              metrics: {
                sessions,
                atc,
                atcRate: `${atcRate.toFixed(2)}%`,
                checkouts,
                checkoutRate: `${checkoutRate.toFixed(2)}%`,
                purchases,
                purchaseRate: `${purchaseRate.toFixed(2)}%`
              },
            };
          } catch (err) {
            return {
              brandId: brand._id,
              brandName: brand.name,
              status: "error",
              message: err.message,
            };
          }
        })
      )
    );

    return res.status(200).json({
      success: true,
      dateRange: { startDate, endDate },
      brands: brandResults,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}


function getDateRanges(filter) {
  const today = new Date();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const dayBefore = new Date(today);
  dayBefore.setDate(today.getDate() - 2);

  if (filter === "yesterday") {
    return {
      currentStart: yesterday,
      currentEnd: yesterday,
      previousStart: dayBefore,
      previousEnd: dayBefore,
    };
  }

  if (filter === "last_7d") {
    const currentStart = new Date(today);
    currentStart.setDate(today.getDate() - 7);

    const previousStart = new Date(currentStart);
    previousStart.setDate(currentStart.getDate() - 7);

    const previousEnd = new Date(currentStart);
    previousEnd.setDate(currentStart.getDate() - 1);

    return {
      currentStart,
      currentEnd: yesterday,
      previousStart,
      previousEnd,
    };
  }

  if (filter === "last_30d") {
    const currentStart = new Date(today);
    currentStart.setDate(today.getDate() - 30);

    const previousStart = new Date(currentStart);
    previousStart.setDate(currentStart.getDate() - 30);

    const previousEnd = new Date(currentStart);
    previousEnd.setDate(currentStart.getDate() - 1);

    return {
      currentStart,
      currentEnd: yesterday,
      previousStart,
      previousEnd,
    };
  }

  throw new Error("Invalid dateRangeFilter");
}

// export async function fetchMetaAdsData(startDate, endDate, accessToken, adAccountIds) {
//   return retryWithBackoff(async () => {

//     const batchRequests = adAccountIds.map((accountId) => ({
//       method: 'GET',
//       relative_url: `${accountId}/insights?fields=spend,actions,action_values&time_range={'since':'${formatDate(startDate)}','until':'${formatDate(endDate)}'}`,
//     }));

//     const response = await axios.post(
//       `https://graph.facebook.com/v22.0/`,
//       { batch: batchRequests },
//       {
//         headers: { 'Content-Type': 'application/json' },
//         params: { access_token: accessToken },
//         timeout: 15000,
//       }
//     );

//     let aggregatedData = {
//       metaspend: 0,
//       metarevenue: 0,
//       metasales: 0,   // 👈 SALES COUNT
//       metaroas: 0,
//     };

//     for (let i = 0; i < adAccountIds.length; i++) {
//       const accountResponse = response.data[i];

//       if (accountResponse.code === 200) {
//         const accountBody = JSON.parse(accountResponse.body);

//         if (accountBody.data && accountBody.data.length > 0) {
//           const insight = accountBody.data[0];

//           // Spend
//           aggregatedData.metaspend += Number(insight.spend || 0);

//           // Revenue
//           const revenue =
//             insight.action_values?.find(
//               (action) => action.action_type === 'purchase'
//             )?.value || 0;

//           aggregatedData.metarevenue += Number(revenue);

//           // SALES COUNT
//           const salesCount =
//             insight.actions?.find(
//               (action) => action.action_type === 'purchase'
//             )?.value || 0;

//           aggregatedData.metasales += Number(salesCount);
//         }
//       }
//     }

//     aggregatedData.metaroas =
//       aggregatedData.metaspend > 0
//         ? Number(
//             (aggregatedData.metarevenue / aggregatedData.metaspend).toFixed(2)
//           )
//         : 0;
   
//     return aggregatedData;

//   }, 2, 1500);
// }

export async function fetchMetaAdsData(startDate, endDate, accessToken, adAccountIds) {
  return retryWithBackoff(async () => {

    const batchRequests = adAccountIds.map((accountId) => ({
      method: 'GET',
      relative_url: `${accountId}/insights?fields=actions&time_range={'since':'${formatDate(startDate)}','until':'${formatDate(endDate)}'}`,
    }));

    const response = await axios.post(
      `https://graph.facebook.com/v22.0/`,
      { batch: batchRequests },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: accessToken },
        timeout: 15000,
      }
    );

    let totalSales = 0;

    for (let i = 0; i < adAccountIds.length; i++) {
      const accountResponse = response.data[i];

      if (accountResponse.code === 200) {
        const accountBody = JSON.parse(accountResponse.body);

        if (accountBody.data?.length) {
          const insight = accountBody.data[0];

          const salesCount =
            insight.actions?.find(a =>
              a.action_type.includes('purchase')
            )?.value || 0;

          totalSales += Number(salesCount);
        }
      }
    }
console.log("totalSales---->", totalSales)
    return { sales: totalSales };

  }, 2, 1500);
}

export async function getAllBrandsMetaSummary(req, res) {
  try {
    const { dateRangeFilter } = req.query;

    if (!dateRangeFilter) {
      return res.status(400).json({
        success: false,
        message: "dateRangeFilter is required",
      });
    }

    const {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    } = getDateRanges(dateRangeFilter);

    const brands = await Brand.find({
      _id: { $in: brandsList },
      fbAccessToken: { $exists: true, $ne: null },
    }).lean();

    const brandTasks = brands.map((brand) =>
      limit(async () => {
        if (!brand.fbAdAccounts?.length) {
          return {
            brandId: brand._id.toString(),
            error: "Meta not configured",
          };
        }

        // Fetch current & previous in parallel per brand
        const [currentData, previousData] = await Promise.all([
          fetchMetaAdsData(
            currentStart,
            currentEnd,
            brand.fbAccessToken,
            brand.fbAdAccounts
          ),
          fetchMetaAdsData(
            previousStart,
            previousEnd,
            brand.fbAccessToken,
            brand.fbAdAccounts
          ),
        ]);

        const salesMetrics = calculateMetrics(
          currentData.sales,
          previousData.sales
        );

        return {
          brandId: brand._id.toString(),
          salesMetrics: salesMetrics,
        };
      })
    );

    const results = await Promise.all(brandTasks);

    // Convert array → object keyed by brandId
    const finalResponse = {};
    results.forEach((item) => {
      finalResponse[item.brandId] = {
        sales: item.salesMetrics,
      };
    });

    return res.status(200).json({
      success: true,
      filter: dateRangeFilter,
      salesSummary: finalResponse,
      lastUpdated: new Date(),
    });

  } catch (error) {
    console.error("Meta Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch summary",
    });
  }
}


export const fetchSalesSummary = async (req, res) => {
  try {
    const { dateRangeFilter = "yesterday" } = req.query;

    const brandsList = [
      "68ca95ad548d518de4fca1af",
      "68cc2437e78884ea57ff5385",
      "68d3ca10e78884ea57ff6485",
      "68dd21f5e78884ea57ff762f",
      "6941510e2deb1bce03ca02a2",
      "695b86742d2fb7ad98fb57db",
      "695e30a0ff8894bc66d801c5",
      "6996c6db049176b75d224988",
    ];

    const brandObjectIds = brandsList.map(
      (id) => new mongoose.Types.ObjectId(id)
    );


    let currentStart, currentEnd, previousStart, previousEnd;

    if (dateRangeFilter === "yesterday") {
      currentStart = moment().subtract(1, "days").startOf("day").toDate();
      currentEnd = moment().subtract(1, "days").endOf("day").toDate();

      previousStart = moment().subtract(2, "days").startOf("day").toDate();
      previousEnd = moment().subtract(2, "days").endOf("day").toDate();
    }

    if (dateRangeFilter === "last_7d") {
      currentStart = moment().subtract(7, "days").startOf("day").toDate();
      currentEnd = moment().subtract(1, "days").endOf("day").toDate();

      previousStart = moment().subtract(14, "days").startOf("day").toDate();
      previousEnd = moment().subtract(8, "days").endOf("day").toDate();
    }

    if (dateRangeFilter === "last_30d") {
      currentStart = moment().subtract(30, "days").startOf("day").toDate();
      currentEnd = moment().subtract(1, "days").endOf("day").toDate();
      
      previousStart = moment().subtract(60, "days").startOf("day").toDate();
      previousEnd = moment().subtract(31, "days").endOf("day").toDate();
    }
    

    // ---- CURRENT PERIOD AGGREGATION ----
    const currentAgg = await AdMetrics.aggregate([
      {
        $match: {
          brandId: { $in: brandObjectIds },
          date: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: "$brandId",
          totalSales: { $sum: "$totalSales" },
          refundAmount: { $sum: "$refundAmount" },
        },
      },
    ]);

    // ---- PREVIOUS PERIOD AGGREGATION ----
    const previousAgg = await AdMetrics.aggregate([
      {
        $match: {
          brandId: { $in: brandObjectIds },
          date: { $gte: previousStart, $lte: previousEnd },
        },
      },
      {
        $group: {
          _id: "$brandId",
          totalSales: { $sum: "$totalSales" },
          refundAmount: { $sum: "$refundAmount" },
        },
      },
    ]);

    // Convert arrays to maps for easy lookup
    const currentMap = new Map();
    currentAgg.forEach((item) => {
      const revenue = item.totalSales - item.refundAmount;
      currentMap.set(item._id.toString(), revenue);
    });
  

    const previousMap = new Map();
    previousAgg.forEach((item) => {
      const revenue = item.totalSales - item.refundAmount;
      previousMap.set(item._id.toString(), revenue);
    });

    // ---- BUILD FINAL RESPONSE ----
    const salesSummary = {};

    for (const brandId of brandsList) {
      const currentRevenue = currentMap.get(brandId) || 0;
      const previousRevenue = previousMap.get(brandId) || 0;

      let change = 0;
      let trend = "neutral";

      if (previousRevenue > 0) {
        change =
          ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        change = Number(change.toFixed(2));
      } else if (currentRevenue > 0) {
        change = 100;
        trend = "new";
      }

      if (change > 0) trend = "up";
      else if (change < 0) trend = "down";

      salesSummary[brandId] = {
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          change,
          trend,
        },
      };
    }

    return res.status(200).json({
      success: true,
      dateRangeFilter,
      salesSummary,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Sales Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales summary",
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