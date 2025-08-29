import AdMetrics from "../models/AdMetrics.js";
import mongoose from "mongoose";
import RefundCache from '../models/RefundCache.js';
import moment from 'moment-timezone';

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

        // Check if data exists for this brand at all
        const existingData = await AdMetrics.findOne({ brandId: objectID });
        if (!existingData) {
            return res.status(404).json({
                success: false,
                message: 'No metrics data available yet. Please try again later.'
            });
        }

        const metrics = await AdMetrics.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        month: { $month: "$date" },
                        year: { $year: "$date" }
                    },
                    totalSales: { $sum: "$totalSales" },
                    refundAmount: { $sum: "$refundAmount" },
                    metaSpend: { $sum: "$metaSpend" },
                    googleSpend: { $sum: "$googleSpend" },
                    totalSpend: { $sum: "$totalSpend" },
                    dailyMetrics: {
                        $push: {
                            date: "$date",
                            totalSales: "$totalSales",
                            refundAmount: "$refundAmount",
                            metaSpend: "$metaSpend",
                            googleSpend: "$googleSpend",
                            totalSpend: "$totalSpend",
                            metaROAS: "$metaROAS",
                            googleROAS: "$googleROAS",
                            grossROI: "$grossROI",
                        }
                    }
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
        console.error("Error fetching metrics by ID:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


export const checkRefundCache = async (req, res) => {
    try {
        const { brandId } = req.params;
        const { refundDate} = req.body;

        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID is required'
            });
        }

        let query = { brandId };

        // If specific refund date is provided
        if (refundDate) {
            const startOfDay = moment(refundDate).startOf('day').toDate();
            const endOfDay = moment(refundDate).endOf('day').toDate();
            query.refundCreatedAt = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }
     

        const refunds = await RefundCache.find(query).sort({ refundCreatedAt: -1 });

        // Group refunds by date for easier analysis
        const refundsByDate = refunds.reduce((acc, refund) => {
            const refundDate = moment(refund.refundCreatedAt).format('YYYY-MM-DD');
            
            if (!acc[refundDate]) {
                acc[refundDate] = {
                    refundDate,
                   
                    totalRefundAmount: 0,
                    refundCount: 0,
                    refunds: []
                };
            }
            
           
            acc[refundDate].totalRefundAmount += refund.totalReturn || 0;
            acc[refundDate].refundCount += 1;
            acc[refundDate].refunds.push({
                refundId: refund.refundId,
                orderId: refund.orderId,
               
                totalReturn: refund.totalReturn,
                refundCreatedAt: refund.refundCreatedAt,
                orderCreatedAt: refund.orderCreatedAt
            });
            
            return acc;
        }, {});

        // Calculate summary statistics
        const totalRefunds = refunds.length;
       
        const totalRefundAmount = refunds.reduce((sum, refund) => sum + (refund.totalReturn || 0), 0);

        res.json({
            success: true,
            data: {
                summary: {
                    totalRefunds,
                    totalRefundAmount,
                    dateRange: refundDate || 'All dates'
                },
                refundsByDate: Object.values(refundsByDate),
                rawRefunds: refunds.map(refund => ({
                    refundId: refund.refundId,
                    orderId: refund.orderId,
                    totalReturn: refund.totalReturn,
                    refundCreatedAt: refund.refundCreatedAt,
                    orderCreatedAt: refund.orderCreatedAt
                }))
            }
        });

    } catch (error) {
        console.error('Error checking refund cache:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking refund cache',
            error: error.message
        });
    }
}; 




