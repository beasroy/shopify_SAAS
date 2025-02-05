import AdMetrics from "../models/AdMetrics.js";
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


            const dayStart = new Date(targetStartDate);
            dayStart.setUTCHours(0, 0, 0, 0);

            const dayEnd = new Date(targetEndDate);
            dayEnd.setUTCHours(23, 59, 59, 999);

            query.date = { $gte: dayStart, $lte: dayEnd };
        }

        console.log("Final query:", query);

        // Aggregate data by adjusted month
        const metrics = await AdMetrics.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        month: { $month: "$date" },
                        year: { $year: "$date" }
                    },
                    metaSpend: { $sum: "$metaSpend" },
                    googleSpend: { $sum: "$googleSpend" },
                    totalSpend: { $sum: "$totalSpend" },
                    shopifySales: { $sum: "$shopifySales" },
                    dailyMetrics: {
                        $push: {
                            date: "$date",
                            metaSpend: "$metaSpend",
                            googleSpend: "$googleSpend",
                            totalSpend: "$totalSpend",
                            shopifySales: "$shopifySales",
                            metaROAS: "$metaROAS",
                            googleROAS: "$googleROAS",
                            grossROI: "$grossROI",
                            netROI: "$netROI"
                        }
                    }
                }
            },
            {
                $project: {
                    month: "$_id.month",
                    year: "$_id.year",
                    metaSpend: 1,
                    googleSpend: 1,
                    totalSpend: 1,
                    shopifySales: 1,
                    dailyMetrics: {
                        $sortArray: {
                            input: "$dailyMetrics",
                            sortBy: { date: -1 } // Sort by date in descending order
                        }
                    }
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



