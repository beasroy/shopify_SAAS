import AdMetrics from '../models/AdMetrics.js';
import mongoose from 'mongoose';
import Brand from '../models/Brands.js';
import { getGoogleAccessToken } from './analytics.js';
import axios from 'axios';

export async function getMarketingInsights(req, res) {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    const objectID = new mongoose.Types.ObjectId(String(brandId));

    console.log(`[Marketing Insights] Fetching for brand ${brandId}`);
    const startTime = Date.now();

    // Get last 6 months of data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const query = {
      brandId: objectID,
      date: { $gte: sixMonthsAgo }
    };

    // Check if data exists
    const existingData = await AdMetrics.findOne({ brandId: objectID });
    if (!existingData) {
      return res.status(200).json({
        success: false,
        message: 'No metrics data available yet.',
        monthlyMetrics: []
      });
    }

    // Aggregate monthly metrics
    const monthlyMetrics = await AdMetrics.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" }
          },
          totalSales: { $sum: "$totalSales" },
          totalRefunds: { $sum: "$refundAmount" },
          metaSpend: { $sum: "$metaSpend" },
          metaRevenue: { $sum: "$metaRevenue" },
          googleSpend: { $sum: "$googleSpend" },
          googleROAS: { $sum: "$googleROAS" },
          totalSpend: { $sum: "$totalSpend" },
          grossROI: { $avg: "$grossROI" }
        }
      },
      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          totalSales: { $round: ["$totalSales", 2] },
          totalRefunds: { $round: ["$totalRefunds", 2] },
          metaSpend: { $round: ["$metaSpend", 2] },
          googleSpend: { $round: ["$googleSpend", 2] },
          totalSpend: { $round: ["$totalSpend", 2] },
          metaRevenue: { $round: ["$metaRevenue", 2] },
          metaROAS: {
            $cond: {
              if: { $gt: ["$metaSpend", 0] },
              then: { $round: [{ $divide: ["$metaRevenue", "$metaSpend"] }, 2] },
              else: 0
            }
          },
          googleROAS: { $round: ["$googleROAS", 2] },
          googleSales: { 
            $cond: {
              if: { $gt: ["$googleSpend", 0] },
              then: { $round: [{ $multiply: ["$googleSpend", "$googleROAS"] }, 2] },
              else: 0
            }
           },
          grossROI: { $round: ["$grossROI", 2] }
        }
      },
      { $sort: { year: -1, month: -1 } },
      { $limit: 6 } // Last 6 months
    ]);

    // Format month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMetrics = monthlyMetrics.map(metric => ({
      period: `${monthNames[metric.month - 1]} ${metric.year}`,
      month: metric.month,
      year: metric.year,
      totalSales: metric.totalSales || 0,
      totalRefunds: metric.totalRefunds || 0,
      metaSpend: metric.metaSpend || 0,
      metaRevenue: metric.metaRevenue || 0,
      metaROAS: metric.metaROAS || 0,
      googleSpend: metric.googleSpend || 0,
      googleSales: metric.googleSales || 0,
      googleROAS: metric.googleROAS || 0,
      totalSpend: metric.totalSpend || 0,
      grossROI: metric.grossROI || 0
    }));

    console.log(`[Marketing Insights] Successfully fetched in ${Date.now() - startTime}ms`);

    res.status(200).json({
      success: true,
      monthlyMetrics: formattedMetrics,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error(`[Marketing Insights Error]`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch marketing insights.',
      message: error.message
    });
  }
}

export async function getAddToCartAndCheckoutsData(req, res) {
  try {
    const { brandId } = req.params;
    let { startDate, endDate } = req.body;
   
    // Use default dates if not provided
    if (!startDate || !endDate) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString().split('T')[0];
    }

    const brand = await Brand.findById(brandId).lean();

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const refreshToken = brand.googleAnalyticsRefreshToken;
    if (!refreshToken || refreshToken.trim() === '') {
      console.warn(`No refresh token found for Brand ID: ${brandId}`);
      return res.status(403).json({
        success: false,
        error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.'
      });
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    // Fetch data from Google Analytics without date dimension for consolidated totals
    const requestBody = {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'addToCarts' },
        { name: 'checkouts' },
        { name: 'ecommercePurchases' },
      ]
    };

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const rows = response?.data?.rows;
    if (!rows || rows.length === 0) {
      console.warn(`No data found for date range ${startDate} to ${endDate}`);
      return res.status(200).json({
        success: true,
        data: {
          startDate,
          endDate,
          Sessions: 0,
          'Add To Cart': 0,
          'Add To Cart Rate': '0%',
          Checkouts: 0,
          'Checkout Rate': '0%',
          Purchases: 0,
          'Purchase Rate': '0%',
        }
      });
    }

    // Get the first row (consolidated data)
    const row = rows[0];
    const sessions = parseInt(row.metricValues[0]?.value) || 0;
    const addToCarts = parseInt(row.metricValues[1]?.value) || 0;
    const checkouts = parseInt(row.metricValues[2]?.value) || 0;
    const purchases = parseInt(row.metricValues[3]?.value) || 0;

    const consolidatedData = {
      startDate,
      endDate,
      Sessions: sessions,
      'Add To Cart': addToCarts,
      'Add To Cart Rate': sessions ? `${((addToCarts / sessions) * 100).toFixed(2)}%` : '0%',
      Checkouts: checkouts,
      'Checkout Rate': sessions ? `${((checkouts / sessions) * 100).toFixed(2)}%` : '0%',
      Purchases: purchases,
      'Purchase Rate': sessions ? `${((purchases / sessions) * 100).toFixed(2)}%` : '0%',
    };

    return res.status(200).json({
      success: true,
      data: consolidatedData
    });

  } catch (error) {
    console.error('Error fetching Add to Cart and Checkout data:', error.response?.data || error.message);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Add to Cart and Checkout data.'
    });
  }
}

