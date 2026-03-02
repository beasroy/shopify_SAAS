import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { parseDate, validateDateRange } from '../utils/dateUtils.js';
import { getCityCanonicalSwitch } from '../utils/cityAliases.js';
import { connection as redis } from '../config/redis.js';

// Constants
const MAX_LOCATIONS_PER_DIMENSION = 1000;
const CACHE_TTL = 300; // 5 minutes in seconds
const MAX_DATE_RANGE_DAYS = 365;

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
        
        // For region dimension, show state; for others, show city; include country from Order
        const locationData = dimension === 'region'
            ? {
                state: location.originalState || location.originalLocation || 'Unknown',
                country: location.originalCountry || 'unknown',
                totalSales: location.totalSales || 0,
                orderCount: location.totalOrderCount || 0,
                monthlyTotal: location.totalSales || 0,
                isClassified
            }
            : {
                city: location.originalCity || location.originalLocation || 'Unknown',
                state: location.originalState || 'Unknown',
                country: location.originalCountry || 'unknown',
                totalSales: location.totalSales || 0,
                orderCount: location.totalOrderCount || 0,
                monthlyTotal: location.totalSales || 0,
                isClassified
            };
        
        result[dimValue].push(locationData);
        
        // Update summary
        summary[dimValue].totalSales += location.totalSales || 0;
        summary[dimValue].totalOrderCount += location.totalOrderCount || 0;
        summary[dimValue].locationCount += 1;
    });
    
    // Sort locations by totalSales (descending) within each dimension
    // Apply result limits to prevent extremely large responses
    Object.keys(result).forEach(dim => {
        result[dim].sort((a, b) => b.totalSales - a.totalSales);
        
        // Limit results per dimension
        if (result[dim].length > MAX_LOCATIONS_PER_DIMENSION) {
            result[dim] = result[dim].slice(0, MAX_LOCATIONS_PER_DIMENSION);
        }
    });
    
    return { data: result, summary };
}

/**
 * Get location-based sales analytics
 * GET /api/analytics/location-sales?brandId=X&dimension=metro&startDate=2024-01-01&endDate=2024-01-18
 */
export async function getLocationSales(req, res) {
    const requestStartTime = Date.now();
    
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
        
        // Build cache key
        const cacheKey = `location-analytics:${brandId}:${dimension}:${startDate || 'default'}:${endDate || 'default'}`;
        
        // Try to get from cache
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                const totalTime = Date.now() - requestStartTime;
                console.log(`✅ Cache hit for location analytics: ${totalTime}ms`);
                return res.json({
                    ...parsed,
                    fromCache: true,
                    queryTime: totalTime
                });
            }
        } catch (cacheError) {
            console.warn('⚠️  Cache read error:', cacheError.message);
            // Continue with fresh query if cache fails
        }
        
        // Determine date range (default: current month till yesterday)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Parse dates using UTC to avoid timezone issues
        const start = startDate 
            ? parseDate(startDate)
            : new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
        
        const end = endDate 
            ? parseDate(endDate)
            : new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 1));
        
        if (!start || !end) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD format'
            });
        }
        
        // Validate date range
        const validation = validateDateRange(start, end, today, MAX_DATE_RANGE_DAYS);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }
        
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);
        
        // Build aggregation pipeline - for region dimension, group by state; for others, group by city
        const isRegionDimension = dimension === 'region';
        
        // Group by location only (no date); sum totalSales and count orders directly
        const locationGroupStage = {
            $group: {
                _id: {
                    locationKey: isRegionDimension
                        ? { $toLower: { $trim: { input: { $ifNull: ["$state", ""] } } } }
                        : "$lookupKey",
                    originalLocation: isRegionDimension ? "$state" : "$city",
                    originalCity: "$city",
                    originalState: "$state",
                    originalCountry: { $ifNull: ["$country", "unknown"] },
                    metroStatus: { $ifNull: ["$cityMeta.metroStatus", null] },
                    region: { $ifNull: ["$cityMeta.region", null] },
                    tier: { $ifNull: ["$cityMeta.tier", null] },
                    isCoastal: { $ifNull: ["$cityMeta.isCoastal", null] },
                    isClassified: { $cond: [{ $ne: ["$cityMeta", null] }, true, false] }
                },
                totalSales: { $sum: "$totalSales" },
                totalOrderCount: { $sum: 1 }
            }
        };
        
        // MongoDB aggregation pipeline: filter by startDate/endDate, then group by location
        const pipeline = [
            // Stage 1: Match orders in the selected date range only
            {
                $match: {
                    brandId: new mongoose.Types.ObjectId(brandId),
                    orderCreatedAt: { $gte: start, $lte: end },
                    city: { $exists: true, $ne: null, $nin: [null, ''] },
                    state: { $exists: true, $ne: null, $nin: [null, ''] }
                }
            },
            // Stage 2: Normalize city, state, country and build lookupKey (same format as CityMetadata: city_state_country, no spaces in state/country)
            {
                $addFields: {
                    cityNormalized: {
                        $toLower: {
                            $trim: { input: { $ifNull: ["$city", ""] } }
                        }
                    },
                    stateNormalized: {
                        $toLower: {
                            $trim: { input: { $ifNull: ["$state", ""] } }
                        }
                    },
                    // Remove spaces/tabs/newlines so lookupKey matches gptService. Each $replaceAll has exactly one find/replacement; chain by nesting.
                    stateNormalizedNoSpaces: {
                        $replaceAll: {
                            input: {
                                $replaceAll: {
                                    input: {
                                        $replaceAll: {
                                            input: {
                                                $replaceAll: {
                                                    input: { $toLower: { $trim: { input: { $ifNull: ["$state", ""] } } } },
                                                    find: " ",
                                                    replacement: ""
                                                }
                                            },
                                            find: "\t",
                                            replacement: ""
                                        }
                                    },
                                    find: "\n",
                                    replacement: ""
                                }
                            },
                            find: "\r",
                            replacement: ""
                        }
                    },
                    countryNormalized: {
                        $replaceAll: {
                            input: {
                                $replaceAll: {
                                    input: {
                                        $replaceAll: {
                                            input: {
                                                $replaceAll: {
                                                    input: { $toLower: { $trim: { input: { $ifNull: ["$country", "unknown"] } } } },
                                                    find: " ",
                                                    replacement: ""
                                                }
                                            },
                                            find: "\t",
                                            replacement: ""
                                        }
                                    },
                                    find: "\n",
                                    replacement: ""
                                }
                            },
                            find: "\r",
                            replacement: ""
                        }
                    },
                    orderDate: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$orderCreatedAt"
                        }
                    }
                }
            },
            // Bangalore/Bengaluru and Delhi/New Delhi -> same canonical for lookupKey
            {
                $addFields: {
                    cityCanonical: getCityCanonicalSwitch()
                }
            },
            {
                $addFields: {
                    lookupKey: {
                        $concat: [
                            "$cityCanonical",
                            "_",
                            "$stateNormalizedNoSpaces",
                            "_",
                            { $cond: [{ $eq: [{ $strLenCP: "$countryNormalized" }, 0] }, "unknown", "$countryNormalized"] }
                        ]
                    }
                }
            },
            // Stage 3: Lookup CityMetadata by lookupKey (city_state_country from Order, stored in DB)
            {
                $lookup: {
                    from: "citymetadatas",
                    let: { orderLookupKey: "$lookupKey" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$lookupKey", "$$orderLookupKey"] } } }
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
            // Stage 5: Group by location for this date range; totalSales and totalOrderCount per location
            locationGroupStage,
            // Stage 6: Add fields for easier access
            {
                $addFields: {
                    metroStatus: "$_id.metroStatus",
                    region: "$_id.region",
                    tier: "$_id.tier",
                    isCoastal: "$_id.isCoastal",
                    isClassified: "$_id.isClassified",
                    originalCity: { $ifNull: ["$_id.originalCity", "$_id.originalLocation"] },
                    originalState: "$_id.originalState",
                    originalCountry: "$_id.originalCountry",
                    originalLocation: { $ifNull: ["$_id.originalLocation", "$_id.originalCity"] },
                    locationKey: "$_id.locationKey"
                }
            }
        ];
        
        // Add performance monitoring
        const queryStartTime = Date.now();
        
        // Execute aggregation with optimizations
        // Try to use the compound index, but fall back gracefully if it doesn't exist
        // The Order model has: { brandId: 1, orderCreatedAt: -1, city: 1, state: 1 }
        let results;
        try {
            // Try with the compound index that includes city and state
            results = await Order.aggregate(pipeline)
                .allowDiskUse(true) // Allow disk use for large aggregations
                .hint({ brandId: 1, orderCreatedAt: -1, city: 1, state: 1 });
        } catch (hintError) {
            // If hint fails (index doesn't exist or can't be used), retry without hint
            // MongoDB's query planner will automatically choose the best available index
            console.warn('⚠️  Index hint failed, using automatic index selection:', hintError.message);
            results = await Order.aggregate(pipeline)
                .allowDiskUse(true); // Allow disk use for large aggregations
        }
        
        const queryExecutionTime = Date.now() - queryStartTime;
        
        // Log slow queries
        if (queryExecutionTime > 1000) {
            console.warn(`⚠️  Slow location analytics query: ${queryExecutionTime}ms for brandId=${brandId}, dimension=${dimension}`);
        }
        
        // Log result size warnings
        if (results.length > 10000) {
            console.warn(`⚠️  Large result set: ${results.length} locations for brandId=${brandId}`);
        }
        
        // Transform to response format
        const response = transformToResponse(results, dimension, start, end);
        
        // Count unclassified locations - use correct fields based on dimension
        const unclassifiedLocations = results
            .filter(c => !c.isClassified)
            .map(c => {
                if (dimension === 'region') {
                    return c.originalState || c.originalLocation || 'Unknown';
                }
                return c.originalCity || c.originalLocation || 'Unknown';
            });
        const unclassifiedSales = results
            .filter(c => !c.isClassified)
            .reduce((sum, c) => sum + (c.totalSales || 0), 0);
        
        // Log unclassified location count
        if (unclassifiedLocations.length > 0) {
            console.log(`ℹ️  Found ${unclassifiedLocations.length} unclassified locations for brandId=${brandId}, dimension=${dimension}`);
        }
        
        // Check if results were truncated
        const resultsTruncated = Object.values(response.data).some(
            locations => locations.length >= MAX_LOCATIONS_PER_DIMENSION
        );
        
        const totalTime = Date.now() - requestStartTime;
        const responseData = {
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
                lastUpdated: new Date().toISOString(),
                resultsTruncated,
                performance: {
                    queryTime: queryExecutionTime,
                    totalTime,
                    resultCount: results.length
                }
            },
            fromCache: false
        };
  
        try {
            await redis.set(cacheKey, JSON.stringify(responseData), 'EX', CACHE_TTL);
        } catch (cacheError) {
            console.warn('⚠️  Cache write error:', cacheError.message);
            // Continue even if cache write fails
        }
        
        res.json(responseData);
        
    } catch (error) {
        console.error('Location analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to fetch location analytics'
        });
    }
}

