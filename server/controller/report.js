import Metrics from "../models/Metrics.js"
import mongoose from "mongoose";


export const getMetricsbyID = async (req, res) => {
    const { brandId } = req.params;
    const { startDate, endDate } = req.query;
    const objectID = new mongoose.Types.ObjectId(String(brandId));

    try {
        const query = { brandId: objectID };

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const targetStartDate = new Date(start);
            const targetEndDate = new Date(end);

            // Adjust date range for specific case
            if (start < new Date("2024-10-30T00:00:00Z")) {
                targetStartDate.setUTCDate(targetStartDate.getUTCDate() - 1); 
              
            }

            const dayStart = new Date(targetStartDate);
            dayStart.setUTCHours(0, 0, 0, 0);

            const dayEnd = new Date(targetEndDate);
            dayEnd.setUTCHours(23, 59, 59, 999);

            query.date = { $gte: dayStart, $lte: dayEnd };
        }

        console.log("Final query:", query);

        // Aggregate data by adjusted month
        const metrics = await Metrics.aggregate([
            { $match: query },
            {
                $addFields: {
                    // Adjust date for data before October 30th, 2024
                    adjustedDate: {
                        $cond: {
                            if: { 
                                $lt: [
                                    "$date", 
                                    new Date("2024-10-30T00:00:00Z") // If the date is before 30th October 2024
                                ]
                            },
                            then: { 
                                $dateAdd: { 
                                    startDate: "$date", 
                                    unit: "day", 
                                    amount: 1 
                                } 
                            },
                            else: "$date" // Otherwise, leave the date as is
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$adjustedDate" },
                        year: { $year: "$adjustedDate" }
                    },
                    metaSpend: { $sum: "$metaSpend" },
                    metaROAS: { $sum: "$metaROAS" },
                    googleSpend: { $sum: "$googleSpend" },
                    googleROAS: { $sum: "$googleROAS" },
                    totalSpend: { $sum: "$totalSpend" },
                    grossROI: { $sum: "$grossROI" },
                    shopifySales: { $sum: "$shopifySales" },
                    netROI: { $avg: "$netROI" },
                    dailyMetrics: { $push: "$$ROOT" } // Collect daily metrics in array
                }
            },
            {
                $project: {
                    month: "$_id.month",
                    year: "$_id.year",
                    metaSpend: 1,
                    metaROAS: 1,
                    googleSpend: 1,
                    googleROAS: 1,
                    totalSpend: 1,
                    grossROI: 1,
                    shopifySales: 1,
                    netROI: 1,
                    dailyMetrics: 1 // Include daily metrics in the response
                }
            },
            { $sort: { year: -1, month: -1 } } // Sort by most recent month
        ]);

        if (!metrics || metrics.length === 0) {
            return res.status(404).json({ success: false, message: 'Metrics not found.' });
        }

        res.status(200).json({ success: true, data: metrics });

    } catch (error) {
        console.error("Error fetching metrics by ID:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};



