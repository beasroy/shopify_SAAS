import Shopify from 'shopify-api-node';
import Brand from '../models/Brands.js';
import AdMetrics from '../models/AdMetrics.js';
import moment from 'moment-timezone';
import D2CCalculator from '../models/D2CCalculator.js';
import axios from 'axios';
import { calculateMonthlyAOV } from './shopify.js';


const fetchTotalRevenue = async (brand, startDate, endDate) => {
  const access_token = brand.shopifyAccount?.shopifyAccessToken;
  if (!access_token) {
    throw new Error('Access token is missing or invalid.');
  }

  const shopName = brand.shopifyAccount?.shopName;
  if (!shopName) {
    throw new Error('Shop name is missing or invalid.');
  }

  const shopify = new Shopify({
    shopName: shopName,
    accessToken: access_token,
    apiVersion: '2024-04'
  });

  // Get store timezone
  let shopData;
  try {
    shopData = await shopify.shop.get();
  } catch (shopError) {
    if (shopError.statusCode === 404) {
      const shopifyFallback = new Shopify({
        shopName: shopName,
        accessToken: access_token,
        apiVersion: '2024-01'
      });
      shopData = await shopifyFallback.shop.get();
    } else {
      throw shopError;
    }
  }

  const storeTimezone = shopData.iana_timezone || 'UTC';
  const startMoment = moment.tz(startDate, storeTimezone).startOf('day');
  const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

  // Fetch AdMetrics data for revenue (up to yesterday - already calculated and cached)
  const today = moment.tz(storeTimezone).startOf('day');
  const yesterday = today.clone().subtract(1, 'day').endOf('day');
  const adMetricsEndDate = moment.min(yesterday, endMoment);

  const adMetrics = await AdMetrics.find({
    brandId: brand._id,
    date: {
      $gte: startMoment.toDate(),
      $lte: adMetricsEndDate.toDate()
    }
  }).sort({ date: 1 });

  // Calculate total revenue from AdMetrics (up to yesterday)
  let totalRevenue = 0;
  adMetrics.forEach(metric => {
    // totalSales already has refunds deducted in AdMetrics
    totalRevenue += Number(metric.totalSales) || 0;
  });

  // If end date includes today, fetch today's sales from Shopify
  if (endMoment.isSameOrAfter(today)) {
    const startTime = today.clone().startOf('day').tz(storeTimezone).utc().format();
    const endTime = endMoment.clone().endOf('day').tz(storeTimezone).utc().format();

    let pageInfo = null;
    do {
      const params = {
        limit: 250,
        fields: 'id,created_at,test,total_price,refunds',
        status: 'any',
        created_at_min: startTime,
        created_at_max: endTime
      };

      if (pageInfo) {
        params.page_info = pageInfo;
        delete params.created_at_min;
        delete params.created_at_max;
      }

      const orders = await shopify.order.list(params);

      if (!orders || orders.length === 0) break;

      // Process orders
      for (const order of orders) {
        if (!order.test) {
          let orderTotal = Number(order.total_price || 0);

          // Subtract refunds if any
          if (order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0) {
            let refundAmount = 0;
            for (const refund of order.refunds) {
              if (refund.refund_line_items) {
                refundAmount += refund.refund_line_items.reduce((sum, item) => {
                  return sum + Number(item.subtotal || 0) + Number(item.total_tax || 0);
                }, 0);
              }
              if (refund.order_adjustments) {
                refundAmount -= refund.order_adjustments.reduce((sum, adj) => {
                  return sum + Number(adj.amount || 0);
                }, 0);
              }
            }
            orderTotal -= refundAmount;
          }

          totalRevenue += orderTotal;
        }
      }

      // Parse pagination
      const linkHeader = orders.headers?.link;
      if (linkHeader) {
        const match = linkHeader.match(/<[^>]*page_info=([^&>]*)[^>]*>; rel="next"/);
        pageInfo = match ? match[1] : null;
      } else {
        pageInfo = null;
      }

      await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
    } while (pageInfo);
  }

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    currency: shopData.currency || 'USD'
  };
};

const calculateD2CMetrics = (revenue, cogs, sellingMarketingExpense, fulfillmentLogistics, otherOperatingExpense) => {
  // Convert all inputs to numbers, defaulting to 0 if invalid
  const revenueValue = Number(revenue) || 0;
  const cogsValue = Number(cogs) || 0;
  const sellingMarketing = Number(sellingMarketingExpense) || 0;
  const fulfillment = Number(fulfillmentLogistics) || 0;
  const other = Number(otherOperatingExpense) || 0;

  // Calculate Gross Profit: Revenue - COGS
  const grossProfit = revenueValue - cogsValue;

  // Calculate total operating expenses
  const totalOperatingExpenses = sellingMarketing + fulfillment + other;

  // Calculate Operating Income: Gross Profit - Total Operating Expenses
  const operatingIncome = grossProfit - totalOperatingExpenses;

  return {
    revenue: Number(revenueValue.toFixed(2)),
    cogs: Number(cogsValue.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    sellingMarketingExpense: Number(sellingMarketing.toFixed(2)),
    fulfillmentLogistics: Number(fulfillment.toFixed(2)),
    otherOperatingExpense: Number(other.toFixed(2)),
    totalOperatingExpenses: Number(totalOperatingExpenses.toFixed(2)),
    operatingIncome: Number(operatingIncome.toFixed(2))
  };
};

// Separate endpoint to fetch revenue only (called when date range changes)
export const getRevenue = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { startDate, endDate } = req.body;

    // Validate required parameters
    if (!brandId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: brandId, startDate, and endDate are required'
      });
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }

    // Get brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found.' });
    }

    // Fetch total revenue from Shopify
    const revenueData = await fetchTotalRevenue(brand, startDate, endDate);

    res.status(200).json({
      success: true,
      data: {
        revenue: revenueData.totalRevenue,
        currency: revenueData.currency
      }
    });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Calculate D2C metrics (receives revenue from frontend, no Shopify API call)
export const calculateD2C = async (req, res) => {
  try {
    const { brandId } = req.params;
    const {
      revenue,
      currency,
      cogs,
      sellingMarketingExpense,
      fulfillmentLogistics,
      otherOperatingExpense
    } = req.body;

    // Validate required parameters
    if (!brandId || revenue === undefined || revenue === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: brandId and revenue are required'
      });
    }

    // Validate revenue is a number
    const revenueValue = Number(revenue);
    if (Number.isNaN(revenueValue)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid revenue value. Revenue must be a number'
      });
    }

    // Calculate all D2C metrics using provided revenue
    const metrics = calculateD2CMetrics(
      revenueValue,
      cogs || 0,
      sellingMarketingExpense || 0,
      fulfillmentLogistics || 0,
      otherOperatingExpense || 0
    );

    res.status(200).json({
      success: true,
      data: {
        ...metrics,
        currency: currency || 'USD'
      }
    });
  } catch (error) {
    console.error('Error calculating D2C metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

function normalizeData(dataObject) {
  const data = {}

  Object.keys(dataObject)?.forEach((key) => {
    const keyValue = dataObject[key].key;
    data[keyValue] = {
      amount: Number(dataObject[key].amount),
      frequency: dataObject[key].frequency
    }
  })
  return data;
}

export const getLastUsedExpenditure = async (req, res) => {
  try {
    const { brandId } = req.params;
    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found.' });
    }
    const lastUsedCosts = await D2CCalculator.findOne({ brandId: brandId }).select('costAndExpenses');

    if (!lastUsedCosts) {
      return res.status(404).json({ success: false, error: 'Last used costs/expenses unavailable.' });
    }

    const { additionalExpenses, operatingCost, otherMarketingCost } = lastUsedCosts["costAndExpenses"];

    const additionalExpensesData = Object?.keys(additionalExpenses)?.length > 0 ? normalizeData(additionalExpenses) : {};

    res.status(200).json({
      success: true,
      data: {
        additionalExpenses: additionalExpensesData,
        operatingCost: operatingCost,
        otherMarketingCost: otherMarketingCost
      }
    });

  } catch (error) {
    console.error('Error getting last used costs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const makeGraphQLRqst = async (shopName, accessToken, query, variables) => {
  const url = `https://${shopName}/admin/api/2024-10/graphql.json`;
  const response = await axios.post(
    url,
    { query, variables },
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.data.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
  }
  return response.data.data;
};

const ORDERS_QUERY = `
query getOrders($query: String, $cursor: String) {
  orders(first: 50, query: $query, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        lineItems(first: 50) {
          edges {
            node {
              quantity
              product { id }
            }
          }
        }
      }
    }
  }
}
`;

const calculateCOGSFROMCSVLIST = async (uploadedFileList = [], brandId, startDate, endDate) => {
  if (!uploadedFileList.length) return { totalCOGS: 0 };

  const brand = await Brand.findById(brandId);
  const { shopifyAccessToken, shopName } = brand.shopifyAccount || {};
  const cleanShopName = shopName.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // 1. Create a Cost Map from the User's Array

  const userCostMap = new Map();
  uploadedFileList.forEach(item => {
    if (item.productId) {
      userCostMap.set(item.productId.toString(), Number(item.unitCost) || 0);
    }
  });

  // 2. Fetch Actual Sales from Shopify for the date range
  let hasNextPage = true;
  let cursor = null;
  let totalCOGS = 0;

  // Filter for paid orders in the date range
  // const dateQuery = `created_at:>=${startDate} AND created_at:<=${endDate} AND financial_status:paid`;
  const dateQuery = `created_at:>='${startDate}' created_at:<='${endDate}'`;

  while (hasNextPage) {
    const data = await makeGraphQLRqst(
      cleanShopName,
      shopifyAccessToken,
      ORDERS_QUERY,
      { query: dateQuery, cursor }
    );

    const result = data?.orders;
    if (!result) break;

    for (const orderEdge of result.edges) {
      for (const itemEdge of orderEdge.node.lineItems.edges) {
        const lineItem = itemEdge.node;

        if (lineItem.product?.id) {
          // Extrating numeric ID from "gid://shopify/Product/6873774686401"
          const shopifyProdId = lineItem.product.id.split('/').pop();

          // Get the cost the user provided for this ID
          const unitCost = userCostMap.get(shopifyProdId);

          if (unitCost) {
            totalCOGS += (lineItem.quantity * unitCost);
          }
        }
      }
    }

    hasNextPage = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  console.log("Final Calculated COGS:", totalCOGS);

  return {
    totalCOGS: Number(totalCOGS.toFixed(2)),
    processedProducts: userCostMap.size
  };
};

export const calculateMetrics = async (req, res) => {
  try {
    const { brandId } = req.params;

    const { revenue, additionalRevenue, costAndExpenses, additionalExpenses,
      additionalCOGS = {}, currency, startDate, endDate, COGSMultiplier = 0, uploadedFileList = [] } = req.body;

    if (!brandId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: brandId, startDate, and endDate are required'
      });
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }

    if (!Object.keys(revenue)?.length || !Object.keys(costAndExpenses)?.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: revenue, costAndExpenses, and cogsData are required'
      });
    }

    if (
      COGSMultiplier === 0 &&
      Object.keys(additionalCOGS)?.length === 0 &&
      uploadedFileList?.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'At least one COGS input is required: COGS Multiplier, additionalCOGS, or uploadedFileList'
      });
    }

    let cogsDataToSave = {
      COGSMultiplier: 0,
      additionalCOGS: []
    };


    let additionalRevenueSum = 0;
    let additionalRevenueData = [];
    const monthFrequency = {
      'monthly': 1,
      'quarterly': 3,
      'half-yearly': 6,
      'yearly': 12
    };

    if (Object.keys(additionalRevenue)?.length > 0) {

      additionalRevenueData = Object.entries(additionalRevenue)?.map(([key, value]) => {

        additionalRevenueSum += (Number(value.amount) ? Number(value.amount) : 0) / monthFrequency[value.frequency];
        return {
          key,
          amount: Number(value.amount),
          frequency: value.frequency
        }
      })
    };

    let additionalExpensesSum = 0;
    let additionalExpensesData = [];

    if (Object.keys(additionalExpenses)?.length > 0) {
      additionalExpensesData = Object.entries(additionalExpenses)?.map(([key, value]) => {
        additionalExpensesSum += (Number(value.amount) || 0) / monthFrequency[value.frequency];
        return {
          key,
          amount: Number(value.amount),
          frequency: value.frequency
        }
      })
    };

    let additionalCOGSSum = 0;
    let additionalCOGSData = [];

    if (Object.keys(additionalCOGS)?.length > 0 && uploadedFileList?.length === 0 && COGSMultiplier === 0) {
      additionalCOGSData = Object.entries(additionalCOGS)?.map(([key, value]) => {

        additionalCOGSSum += (Number(value.amount) || 0) / monthFrequency[value.frequency];
        return {
          key,
          amount: Number(value.amount),
          frequency: value.frequency
        }
      })
    };

    let aov = 0;
    try {
      const resp = await calculateMonthlyAOV(brandId, startDate, endDate);
      if (resp[0].aov) {
        aov = resp[0].aov;
      }

    } catch (error) {
      console.error('Error fetching AOV:', error);
      return res.status(500).json({ success: false, error: "Error fetching AOV" });
    }


    const sales = Number(revenue.shopifySales) || 0;
    const safeAOV = Number(aov) || 0;
    const safeAdditionalCOGS = Number(additionalCOGSSum) || 0;

    let COGS = 0;

    if (COGSMultiplier > 0 && uploadedFileList?.length === 0) {
      COGS = sales * COGSMultiplier;
      cogsDataToSave.COGSMultiplier = COGSMultiplier;
      cogsDataToSave.additionalCOGS = [];
    } else if (safeAOV > 0 && safeAdditionalCOGS > 0) {
      COGS = sales / (safeAOV / safeAdditionalCOGS);
      cogsDataToSave.COGSMultiplier = 0;
      cogsDataToSave.additionalCOGS = additionalCOGSData;
    } else if (uploadedFileList?.length > 0) {

      const cogsResult = await calculateCOGSFROMCSVLIST(uploadedFileList, brandId, startDate, endDate);
      COGS = cogsResult?.totalCOGS || 0;

    }

    let totalRevenue = Number(revenue.shopifySales) + Number(revenue.marketSales) + (Number(revenue.otherRevenue?.amount) || 0 / monthFrequency[revenue.otherRevenue?.frequency]) + additionalRevenueSum;
    let totalExpense = Number(costAndExpenses.marketingCost) + (Number(costAndExpenses.operatingCost?.amount) || 0 / monthFrequency[costAndExpenses.operatingCost?.frequency]) + (Number(costAndExpenses.otherMarketingCost?.amount) || 0 / monthFrequency[costAndExpenses.otherMarketingCost?.frequency]) + additionalExpensesSum + COGS;
    let profit = totalRevenue - totalExpense;
    let profitMargin = (profit / totalRevenue) * 100;


    const updatedRecord = await D2CCalculator.findOneAndUpdate(
      { brandId: brandId },
      {
        revenue: {
          // onlineRevenue: revenue.shopifySales,
          otherRevenue: revenue.otherRevenue,
          "additionalRevenue": additionalRevenueData
        },

        costAndExpenses: {
          marketingCost: costAndExpenses.marketingCost,
          operatingCost: costAndExpenses.operatingCost,
          otherMarketingCost: costAndExpenses.otherMarketingCost,
          additionalExpenses: additionalExpensesData
        },
        cogsData: cogsDataToSave,
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );


    return res.status(200).json({
      success: true,
      data: {
        profit: Number(profit.toFixed(2)),
        profitMargin: Number(profitMargin.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalExpense,
        COGS: Number(COGS.toFixed(2))
      }
    });


  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export const getLastLandedCostForCOGS = async (req, res) => {
  try {
    const { brandId } = req.params;
    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found.' });
    }

    const lastUsedMetrics = await D2CCalculator.findOne({ brandId: brandId }).select('cogsData');
    console.log("lastUsedMetrics===>", lastUsedMetrics);

    if (!lastUsedMetrics) {
      return res.status(404).json({ success: false, error: 'Last used metrics unavailable.' });
    }

    const { cogsData } = lastUsedMetrics || {};

    // const otherRevenue = {
    //   amount: revenue.otherRevenue?.amount || 0,
    //   frequency: revenue.otherRevenue?.frequency
    // }
    // const additionalRevenue = Object.keys(revenue.additionalRevenue)?.length > 0 ? normalizeData(revenue.additionalRevenue) : {};
    // const additionalExpenses = Object.keys(costAndExpenses?.additionalExpenses)?.length > 0 ? normalizeData(costAndExpenses?.additionalExpenses) : {};
    const additionalCOGS = Object.keys(cogsData?.additionalCOGS)?.length > 0 ? normalizeData(cogsData?.additionalCOGS) : {};


    res.status(200).json({
      success: true,
      data: {
        // additionalExpenses: additionalExpenses,
        // cogsData: {
        //   cogs: cogsData.cogs,
        // },
        additionalCOGS: additionalCOGS,
        COGSMultiplier: cogsData.COGSMultiplier || 0,
      }
    });

  } catch (error) {
    console.error('Error getting last used metrics:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}