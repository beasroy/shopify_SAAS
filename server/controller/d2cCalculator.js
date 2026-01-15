import Shopify from 'shopify-api-node';
import Brand from '../models/Brands.js';
import AdMetrics from '../models/AdMetrics.js';
import moment from 'moment-timezone';
import D2CCalculator from '../models/D2CCalculator.js';


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

export const getLastUsedExpenditure = async (req, res) => {
  try {
    const { brandId } = req.params;
    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found.' });
    }
    const lastUsedCosts = await D2CCalculator.findOne({ brandId: brandId });

    if (!lastUsedCosts) {
      return res.status(404).json({ success: false, error: 'Last used costs unavailable.' });
    }
    res.status(200).json({ success: true, data: lastUsedCosts });
  } catch (error) {
    console.error('Error getting last used costs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const calculateMetrics = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { additionalRevenue, additionalExpenses, onlineRevenue, otherRevenue, currency, marketingExpense, otherMarketingExpense, operatingCost, cogs = 0 } = req.body;
    console.log("calculateMetrics===>", req.body);

    if (!onlineRevenue || !currency || !marketingExpense || !operatingCost || !otherMarketingExpense) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: brandId, onlineRevenue, currency, marketingExpense, and operatingCost are required'
      });
    }

    let totalRevenue = onlineRevenue + otherRevenue;

    if (Object.keys(additionalRevenue).length > 0) {
      totalRevenue += Object.values(additionalRevenue).reduce((sum, value) => sum + Number(value), 0);
    }

    let totalExpense = marketingExpense + operatingCost + otherMarketingExpense;

    if (Object.keys(additionalExpenses).length > 0) {
      totalExpense += Object.values(additionalExpenses).reduce((sum, value) => sum + Number(value), 0);
    }

    const profit = totalRevenue - totalExpense;
    const profitMargin = (profit / totalRevenue) * 100;

    const updatedRecord = await D2CCalculator.findOneAndUpdate(
      { brandId: brandId },
      {
        // Data to update or create
        marketingCosts: marketingExpense,
        otherMarketingCosts: otherMarketingExpense,
        operatingCosts: operatingCost,
        cogs: cogs || 0
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
        profit,
        profitMargin,
        totalRevenue,
        totalExpense
      }
    });

  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}