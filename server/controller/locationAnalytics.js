import mongoose from 'mongoose';
import Order from '../models/Order.js';
import CityMetadata from '../models/CityMetadata.js';

/**
 * Generate date range array for filling missing dates
 */
function generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

/**
 * Fill missing dates in daily breakdown with zero sales
 */
function fillMissingDates(dailyBreakdown, startDate, endDate) {
    const allDates = generateDateRange(startDate, endDate);
    const existingDates = new Set(dailyBreakdown.map(d => d.date));
    
    allDates.forEach(date => {
        if (!existingDates.has(date)) {
            dailyBreakdown.push({
                date,
                sales: 0,
                orderCount: 0
            });
        }
    });
    
    // Sort by date
    dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));
    
    return dailyBreakdown;
}

/**
 * Transform aggregation results to API response format
 */
function transformToResponse(aggregatedData, dimension, startDate, endDate) {
    const result = {};
    const summary = {};
    
    // Group by dimension value
    aggregatedData.forEach(location => {
        // Get dimension value based on parameter
        let dimValue;
        let isClassified = location.isClassified !== false;
        
        switch (dimension) {
            case 'metro':
                dimValue = location.metroStatus || 'unclassified';
                break;
            case 'region':
                dimValue = location.region || 'unclassified';
                break;
            case 'tier':
                dimValue = location.tier || 'unclassified';
                break;
            case 'coastal':
                dimValue = location.isCoastal ? 'coastal' : 'non-coastal';
                break;
            default:
                dimValue = location.metroStatus || 'unclassified';
        }
        
        if (!result[dimValue]) {
            result[dimValue] = [];
            summary[dimValue] = {
                totalSales: 0,
                totalOrderCount: 0,
                locationCount: 0 // Changed from cityCount to locationCount
            };
        }
        
        // Fill missing dates in daily breakdown
        const filledBreakdown = fillMissingDates(
            location.dailyBreakdown || [],
            startDate,
            endDate
        );
        
        // For region dimension, show state; for others, show city
        const locationData = dimension === 'region' 
            ? {
                state: location.originalLocation || location.originalState,
                totalSales: location.totalSales || 0,
                orderCount: location.totalOrderCount || 0,
                monthlyTotal: location.totalSales || 0,
                dailyBreakdown: filledBreakdown,
                isClassified
            }
            : {
                city: location.originalLocation || location.originalCity,
                state: location.originalState,
                totalSales: location.totalSales || 0,
                orderCount: location.totalOrderCount || 0,
                monthlyTotal: location.totalSales || 0,
                dailyBreakdown: filledBreakdown,
                isClassified
            };
        
        result[dimValue].push(locationData);
        
        // Update summary
        summary[dimValue].totalSales += location.totalSales || 0;
        summary[dimValue].totalOrderCount += location.totalOrderCount || 0;
        summary[dimValue].locationCount += 1;
    });
    
    // Sort locations by totalSales (descending) within each dimension
    Object.keys(result).forEach(dim => {
        result[dim].sort((a, b) => b.totalSales - a.totalSales);
    });
    
    return { data: result, summary };
}

/**
 * Get location-based sales analytics
 * GET /api/analytics/location-sales?brandId=X&dimension=metro&startDate=2024-01-01&endDate=2024-01-18
 */
export async function getLocationSales(req, res) {
    try {
        const { brandId, dimension = 'metro', startDate, endDate } = req.query;
        
        // Validate brandId
        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'brandId is required'
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid brandId format'
            });
        }
        
        // Validate dimension
        const validDimensions = ['metro', 'region', 'tier', 'coastal'];
        if (!validDimensions.includes(dimension)) {
            return res.status(400).json({
                success: false,
                message: `dimension must be one of: ${validDimensions.join(', ')}`
            });
        }
        
        // Determine date range (default: current month till yesterday)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const start = startDate 
            ? new Date(startDate) 
            : new Date(today.getFullYear(), today.getMonth(), 1);
        
        const end = endDate 
            ? new Date(endDate) 
            : new Date(today.getTime() - 86400000); // yesterday
        
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        // Build aggregation pipeline - for region dimension, group by state; for others, group by city
        const isRegionDimension = dimension === 'region';
        
        // Build the grouping stage based on dimension
        const locationGroupStage = {
            $group: {
                _id: {
                    // Use state for region dimension, city for others
                    locationKey: isRegionDimension
                        ? { $toLower: { $trim: { input: { $ifNull: ["$state", ""] }}}}
                        : "$cityNormalized",
                    originalLocation: isRegionDimension ? "$state" : "$city",
                    originalCity: "$city",
                    originalState: "$state",
                    date: "$orderDate",
                    metroStatus: { $ifNull: ["$cityMeta.metroStatus", null] },
                    region: { $ifNull: ["$cityMeta.region", null] },
                    tier: { $ifNull: ["$cityMeta.tier", null] },
                    isCoastal: { $ifNull: ["$cityMeta.isCoastal", null] },
                    isClassified: { $cond: [{ $ne: ["$cityMeta", null] }, true, false] }
                },
                dailySales: { $sum: "$totalSales" },
                dailyOrderCount: { $sum: 1 }
            }
        };
        
        // MongoDB aggregation pipeline
        const pipeline = [
            // Stage 1: Match orders
            {
                $match: {
                    brandId: new mongoose.Types.ObjectId(brandId),
                    orderCreatedAt: { $gte: start, $lte: end },
                    city: { $exists: true, $ne: null, $ne: '' },
                    state: { $exists: true, $ne: null, $ne: '' }
                }
            },
            // Stage 2: Normalize and create lookup key
            {
                $addFields: {
                    cityNormalized: { 
                        $toLower: { 
                            $trim: { 
                                input: { $ifNull: ["$city", ""] }
                            }
                        }
                    },
                    stateNormalized: { 
                        $toLower: { 
                            $trim: { 
                                input: { $ifNull: ["$state", ""] }
                            }
                        }
                    },
                    // Note: lookupKey will be matched dynamically based on city+state
                    // since country is determined by GPT
                    orderDate: {
                        $dateToString: { 
                            format: "%Y-%m-%d", 
                            date: "$orderCreatedAt" 
                        }
                    }
                }
            },
            // Stage 3: Lookup CityMetadata by cityNormalized + state
            // (since lookupKey includes country which we don't know upfront)
            {
                $lookup: {
                    from: "citymetadatas",
                    let: { 
                        cityNorm: "$cityNormalized",
                        stateNorm: "$stateNormalized"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$cityNormalized", "$$cityNorm"] },
                                        { $eq: [{ $toLower: { $trim: "$state" }}, "$$stateNorm"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "cityMeta"
                }
            },
            // Stage 4: Unwind cityMeta (keep null for unclassified)
            {
                $unwind: {
                    path: "$cityMeta",
                    preserveNullAndEmptyArrays: true
                }
            },
            // Stage 5: Group by location + date (for daily breakdown)
            // For region dimension, group by state; for others, group by city
            locationGroupStage,
            // Stage 6: Group by location (aggregate daily data)
            // Group only by normalized locationKey to merge cities with different casing
            {
                $group: {
                    _id: {
                        locationKey: "$_id.locationKey",
                        originalState: "$_id.originalState",
                        metroStatus: "$_id.metroStatus",
                        region: "$_id.region",
                        tier: "$_id.tier",
                        isCoastal: "$_id.isCoastal",
                        isClassified: "$_id.isClassified"
                    },
                    // Pick the first non-null original city name as canonical version
                    originalLocation: { $first: "$_id.originalLocation" },
                    originalCity: { $first: "$_id.originalCity" },
                    totalSales: { $sum: "$dailySales" },
                    totalOrderCount: { $sum: "$dailyOrderCount" },
                    dailyBreakdown: {
                        $push: {
                            date: "$_id.date",
                            sales: "$dailySales",
                            orderCount: "$dailyOrderCount"
                        }
                    }
                }
            },
            // Stage 7: Add fields for easier access
            {
                $addFields: {
                    metroStatus: "$_id.metroStatus",
                    region: "$_id.region",
                    tier: "$_id.tier",
                    isCoastal: "$_id.isCoastal",
                    isClassified: "$_id.isClassified",
                    originalCity: { $ifNull: ["$originalCity", "$originalLocation"] },
                    originalState: "$_id.originalState",
                    originalLocation: { $ifNull: ["$originalLocation", "$originalCity"] },
                    locationKey: "$_id.locationKey"
                }
            },
            // Stage 8: Merge daily breakdown by date (sum sales and orderCount for same dates)
            // Unwind, group by date, then reconstruct
            {
                $unwind: "$dailyBreakdown"
            },
            {
                $group: {
                    _id: {
                        locationKey: "$locationKey",
                        originalState: "$_id.originalState",
                        metroStatus: "$_id.metroStatus",
                        region: "$_id.region",
                        tier: "$_id.tier",
                        isCoastal: "$_id.isCoastal",
                        isClassified: "$_id.isClassified",
                        originalLocation: "$originalLocation",
                        originalCity: "$originalCity",
                        date: "$dailyBreakdown.date"
                    },
                    sales: { $sum: "$dailyBreakdown.sales" },
                    orderCount: { $sum: "$dailyBreakdown.orderCount" }
                }
            },
            {
                $group: {
                    _id: {
                        locationKey: "$_id.locationKey",
                        originalState: "$_id.originalState",
                        metroStatus: "$_id.metroStatus",
                        region: "$_id.region",
                        tier: "$_id.tier",
                        isCoastal: "$_id.isCoastal",
                        isClassified: "$_id.isClassified",
                        originalLocation: "$_id.originalLocation",
                        originalCity: "$_id.originalCity"
                    },
                    dailyBreakdown: {
                        $push: {
                            date: "$_id.date",
                            sales: "$sales",
                            orderCount: "$orderCount"
                        }
                    }
                }
            },
            // Stage 9: Add fields, recalculate totals, and sort daily breakdown
            {
                $addFields: {
                    metroStatus: "$_id.metroStatus",
                    region: "$_id.region",
                    tier: "$_id.tier",
                    isCoastal: "$_id.isCoastal",
                    isClassified: "$_id.isClassified",
                    originalCity: { $ifNull: ["$_id.originalCity", "$_id.originalLocation"] },
                    originalState: "$_id.originalState",
                    originalLocation: { $ifNull: ["$_id.originalLocation", "$_id.originalCity"] },
                    locationKey: "$_id.locationKey",
                    dailyBreakdown: {
                        $sortArray: {
                            input: "$dailyBreakdown",
                            sortBy: { date: 1 }
                        }
                    },
                    totalSales: {
                        $reduce: {
                            input: "$dailyBreakdown",
                            initialValue: 0,
                            in: { $add: ["$$value", "$$this.sales"] }
                        }
                    },
                    totalOrderCount: {
                        $reduce: {
                            input: "$dailyBreakdown",
                            initialValue: 0,
                            in: { $add: ["$$value", "$$this.orderCount"] }
                        }
                    }
                }
            }
        ];
        
        const results = await Order.aggregate(pipeline);
        
        // Transform to response format
        const response = transformToResponse(results, dimension, start, end);
        
        // Count unclassified locations
        const unclassifiedLocations = results
            .filter(c => !c.isClassified)
            .map(c => dimension === 'region' ? c.originalLocation : c.originalCity);
        const unclassifiedSales = results
            .filter(c => !c.isClassified)
            .reduce((sum, c) => sum + (c.totalSales || 0), 0);
        
        res.json({
            success: true,
            dimension,
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                currentDate: today.toISOString().split('T')[0]
            },
            ...response,
            metadata: {
                status: unclassifiedLocations.length > 0 ? "partial" : "complete",
                unclassifiedLocations: [...new Set(unclassifiedLocations)],
                unclassifiedSales,
                lastUpdated: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Location analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to fetch location analytics'
        });
    }
}

