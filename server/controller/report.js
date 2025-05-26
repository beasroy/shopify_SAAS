import AdMetrics from "../models/AdMetrics.js";
import mongoose from "mongoose";

export const getMetricsbyID = async (req, res) => {
  const { brandId } = req.params;
  const { startDate, endDate } = req.query;
  const objectID = new mongoose.Types.ObjectId(String(brandId));

  try {
    const query = { brandId: objectID };

    const today = new Date();
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start < twoYearsAgo || end < twoYearsAgo) {
        return res.status(400).json({
          success: false,
          message: "Please select a date range within the last 2 years.",
        });
      }

      const dayStart = new Date(start);
      dayStart.setUTCHours(0, 0, 0, 0);

      const dayEnd = new Date(end);
      dayEnd.setUTCHours(23, 59, 59, 999);

      query.date = { $gte: dayStart, $lte: dayEnd };
    }

    console.log("Final query:", query);

    // Check if data exists for this brand at all
    const existingData = await AdMetrics.findOne({ brandId: objectID });
    if (!existingData) {
      return res.status(404).json({
        success: false,
        message: "No metrics data available yet. Please try again later.",
      });
    }

    const metrics = await AdMetrics.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" },
          },
          totalSales: { $sum: "$totalSales" },
          refundAmount: { $sum: "$refundAmount" },
          shopifySales: { $sum: "$shopifySales" },
          metaSpend: { $sum: "$metaSpend" },
          googleSpend: { $sum: "$googleSpend" },
          totalSpend: { $sum: "$totalSpend" },
          dailyMetrics: {
            $push: {
              date: "$date",
              totalSales: "$totalSales",
              refundAmount: "$refundAmount",
              shopifySales: "$shopifySales",
              metaSpend: "$metaSpend",
              googleSpend: "$googleSpend",
              totalSpend: "$totalSpend",
              metaROAS: "$metaROAS",
              googleROAS: "$googleROAS",
              grossROI: "$grossROI",
              netROI: "$netROI",
            },
          },
        },
      },
      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          totalSales: 1,
          refundAmount: 1,
          shopifySales: 1,
          metaSpend: 1,
          googleSpend: 1,
          totalSpend: 1,
          dailyMetrics: {
            $sortArray: {
              input: "$dailyMetrics",
              sortBy: { date: -1 },
            },
          },
        },
      },
      { $sort: { year: -1, month: -1 } },
    ]);

    if (!metrics || metrics.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for the selected date range.",
      });
    }

    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    console.error("Error fetching metrics by ID:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
