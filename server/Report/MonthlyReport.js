import { config } from "dotenv";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
import Shopify from 'shopify-api-node'
import axios from "axios";
import AdMetrics from "../models/AdMetrics.js";
import { GoogleAdsApi } from "google-ads-api";
import moment from 'moment-timezone';
import RefundCache from '../models/RefundCache.js';
import { createRedisConnection } from '../config/redis.js';
config();

// Redis publisher for notifications
const redisPublisher = createRedisConnection();

// Publish notification to Redis channel
const publishNotification = (channel, data) => {
    try {
        redisPublisher.publish(channel, JSON.stringify(data));
        console.log(`✅ Published notification to Redis channel '${channel}':`, data);
        return true;
    } catch (error) {
        console.error('❌ Error publishing notification to Redis:', error);
        return false;
    }
};

function getRefundAmount(refund) {
    // Product-only refund (for net sales)
    const productReturn = refund?.refund_line_items
        ? refund.refund_line_items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
        : 0;

    // Total return (product + adjustments, for total returns)
    let adjustmentsTotal = 0;
    if (refund?.order_adjustments) {
        adjustmentsTotal = refund.order_adjustments.reduce((sum, adjustment) => sum + Number(adjustment.amount || 0), 0);
    }
    const totalReturn = productReturn - adjustmentsTotal;

    return {
        productReturn, // for net sales
        totalReturn    // for total returns
    };
}

async function processOrderForDay(order, acc, storeTimezone, brandId) {
    const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
    
    // Only process orders that are in the target date range
    if (acc[orderDate]) {
        const totalPrice = Number(order.total_price || 0);
        const subtotalPrice = Number(order.subtotal_price || 0);
        const discountAmount = Number(order.total_discounts || 0);
        let grossSales = 0;
        if (order.line_items && Array.isArray(order.line_items) && order.line_items.length > 0) {
            grossSales = order.line_items.reduce((sum, item) => {
                const unitPrice = item.price_set ? Number(item.price_set.shop_money?.amount) : Number(item.original_price ?? item.price);
                const unitTotal = unitPrice * Number(item.quantity);
                let taxTotal = 0;
                if (item.tax_lines && Array.isArray(item.tax_lines)) {
                    taxTotal = item.tax_lines.reduce((taxSum, tax) => taxSum + Number(tax.price || 0), 0);
                }
                const netItemTotal = unitTotal - taxTotal;
                return sum + netItemTotal;
            }, 0);
        } else {
            grossSales = subtotalPrice + discountAmount;
        }
        acc[orderDate].grossSales += grossSales;
        acc[orderDate].discountAmount += discountAmount;
        acc[orderDate].subtotalPrice += subtotalPrice;
        acc[orderDate].totalPrice += totalPrice;
        acc[orderDate][order.cancelled_at ? 'cancelledOrderCount' : 'orderCount']++;
    }
    
    // Cache refunds for this order if they exist (synchronously)
    if (order.refunds && Array.isArray(order.refunds)) {
        for (const refund of order.refunds) {
            try {
                // Check if refund already exists in cache
                const existingRefund = await RefundCache.findOne({ 
                    refundId: refund.id,
                    brandId: brandId 
                });
                
                if (!existingRefund) {
                    const { productReturn, totalReturn } = getRefundAmount(refund);
                    
                    const refundCache = new RefundCache({
                        refundId: refund.id,
                        orderId: order.id,
                        refundCreatedAt: new Date(refund.created_at),
                        orderCreatedAt: new Date(order.created_at),
                        productReturn: productReturn,
                        totalReturn: totalReturn,
                        rawData: JSON.stringify(refund),
                        brandId: brandId
                    });
                    
                    await refundCache.save();
                    console.log(`Cached refund ${refund.id} for order ${order.id}`);
                }
            } catch (error) {
                console.error(`Error caching refund ${refund.id}:`, error);
            }
        }
    }
}

// Helper: Chunked order fetching with fallback
async function fetchAllOrdersChunked(shopify, extendedStartDate, originalEndDate, storeTimezone, isTestOrder) {
    const CHUNK_SIZE_DAYS = 7;
    const SUB_CHUNK_SIZE_DAYS = 3;
    let allOrders = [];
    let currentStart = extendedStartDate.clone();
    const finalEnd = originalEndDate.clone();
    while (currentStart.isSameOrBefore(finalEnd)) {
        const chunkEnd = moment.min(currentStart.clone().add(CHUNK_SIZE_DAYS - 1, 'days'), finalEnd);
        const startTime = currentStart.clone().startOf('day').tz(storeTimezone).utc().format();
        const endTime = chunkEnd.clone().endOf('day').tz(storeTimezone).utc().format();
        let chunkOrders = [];
        let pageInfo = null;
        let pageCount = 0;
        const fetchChunkWithRetries = async (params, maxRetries = 5) => {
            let attempt = 0;
            while (attempt < maxRetries) {
                try {
                    return await shopify.order.list(params);
                } catch (error) {
                    attempt++;
                    console.error(`Attempt ${attempt} failed for chunk ${startTime} to ${endTime}:`, error.message);
                    
                    // Handle specific Shopify API errors
                    if (error.code === 'ERR_GOT_REQUEST_ERROR' && error.message.includes('invalid id')) {
                        console.error('Invalid ID error detected - this might be due to malformed page_info token');
                        // Reset pageInfo and try again
                        params.page_info = null;
                        if (attempt >= maxRetries) throw error;
                    }
                    
                    if (attempt >= maxRetries) throw error;
                    const wait = 2000 * attempt;
                    await new Promise(resolve => setTimeout(resolve, wait));
                }
            }
        };
        let chunkFailed = false;
        try {
            do {
                const params = {
                    status: 'any',
                    limit: 250,
                    fields: 'id,created_at,total_price,subtotal_price,total_discounts,test,tags,financial_status,line_items,refunds,cancelled_at'
                };
                if (pageInfo) {
                    params.page_info = pageInfo;
                } else {
                    params.created_at_min = startTime;
                    params.created_at_max = endTime;
                }
                const response = await fetchChunkWithRetries(params, 7);
                if (!response || response.length === 0) break;
                const validOrders = response.filter(order => !isTestOrder(order));
                chunkOrders = chunkOrders.concat(validOrders);
                pageCount++;
                if (response.length === 250) {
                    try {
                        pageInfo = Buffer.from(response[response.length - 1].id.toString()).toString('base64');
                    } catch (pageInfoError) {
                        console.error('Error creating page_info token:', pageInfoError);
                        pageInfo = null;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 300));
                } else {
                    pageInfo = null;
                }
            } while (pageInfo);
        } catch (error) {
            chunkFailed = true;
            console.error(`Chunk failed for ${startTime} to ${endTime}:`, error.message);
        }
        if (chunkFailed) {
            let subStart = currentStart.clone();
            while (subStart.isSameOrBefore(chunkEnd)) {
                const subEnd = moment.min(subStart.clone().add(SUB_CHUNK_SIZE_DAYS - 1, 'days'), chunkEnd);
                const subStartTime = subStart.clone().startOf('day').tz(storeTimezone).utc().format();
                const subEndTime = subEnd.clone().endOf('day').tz(storeTimezone).utc().format();
                let subChunkOrders = [];
                let subPageInfo = null;
                try {
                    do {
                        const params = {
                            status: 'any',
                            limit: 250,
                            fields: 'id,created_at,total_price,subtotal_price,total_discounts,test,tags,financial_status,line_items,refunds,cancelled_at'
                        };
                        if (subPageInfo) {
                            params.page_info = subPageInfo;
                        } else {
                            params.created_at_min = subStartTime;
                            params.created_at_max = subEndTime;
                        }
                        const response = await fetchChunkWithRetries(params, 7);
                        if (!response || response.length === 0) break;
                        const validOrders = response.filter(order => !isTestOrder(order));
                        subChunkOrders = subChunkOrders.concat(validOrders);
                        if (response.length === 250) {
                            try {
                                subPageInfo = Buffer.from(response[response.length - 1].id.toString()).toString('base64');
                            } catch (pageInfoError) {
                                console.error('Error creating sub-page_info token:', pageInfoError);
                                subPageInfo = null;
                                break;
                            }
                            await new Promise(resolve => setTimeout(resolve, 300));
                        } else {
                            subPageInfo = null;
                        }
                    } while (subPageInfo);
                } catch (subError) {
                    console.error(`Sub-chunk failed for ${subStartTime} to ${subEndTime}:`, subError.message);
                }
                allOrders = allOrders.concat(subChunkOrders);
                subStart = subEnd.clone().add(1, 'day');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } else {
            allOrders = allOrders.concat(chunkOrders);
        }
        currentStart = chunkEnd.clone().add(1, 'day');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return allOrders;
}

export const monthlyFetchTotalSales = async (brandId, startDate, endDate, refundOnlyStartDate = null) => {
    try {
        console.log('Fetching orders...');
        console.log('Date range:', { startDate, endDate });
        if (refundOnlyStartDate) {
            console.log('Refund-only period:', { refundOnlyStartDate, startDate });
        }
        
        const brand = await Brand.findById(brandId);
        if (!brand) throw new Error('Brand not found.');
        const access_token = brand.shopifyAccount?.shopifyAccessToken;
        if (!access_token) throw new Error('Access token is missing or invalid.');
        const shopify = new Shopify({
            shopName: brand.shopifyAccount?.shopName,
            accessToken: access_token,
            apiVersion: '2024-04'
        });
        const shopData = await shopify.shop.get();
        const storeTimezone = shopData.iana_timezone || 'UTC';
        const storeCurrency = shopData.currency || 'USD';
        
        console.log('Store info:', {
            shopName: brand.shopifyAccount?.shopName,
            timezone: storeTimezone,
            currency: storeCurrency
        });
        
        const originalStartDate = moment.tz(startDate, storeTimezone);
        const originalEndDate = moment.tz(endDate, storeTimezone);
        
        // Determine the actual fetch start date (for refund caching)
        const fetchStartDate = refundOnlyStartDate ? moment.tz(refundOnlyStartDate, storeTimezone) : originalStartDate;
        
        console.log('Date processing:', {
            fetchStartDate: fetchStartDate.format('YYYY-MM-DD'),
            originalStartDate: originalStartDate.format('YYYY-MM-DD'),
            originalEndDate: originalEndDate.format('YYYY-MM-DD')
        });
        
        // Check if refunds are already cached for the extended period
        let needToFetchOrders = true;
        if (refundOnlyStartDate) {
            const existingRefunds = await RefundCache.countDocuments({
                brandId: brandId,
                refundCreatedAt: {
                    $gte: new Date(refundOnlyStartDate),
                    $lte: new Date(endDate)
                }
            });
            
            console.log(`Found ${existingRefunds} existing refunds in cache for extended period`);
            
            // If we have a reasonable number of refunds cached, skip fetching orders
            if (existingRefunds > 0) {
                console.log('Refunds already cached, skipping order fetching for extended period');
                needToFetchOrders = false;
            }
        }
        
        // Initialize daily sales map for target date range only
        const dailySalesMap = {};
        let currentDay = originalStartDate.clone().startOf('day');
        const endMoment = originalEndDate.clone().endOf('day');
        while (currentDay.isSameOrBefore(endMoment)) {
            const dateStr = currentDay.format('YYYY-MM-DD');
            dailySalesMap[dateStr] = {
                date: dateStr,
                grossSales: 0,
                subtotalPrice: 0,
                totalPrice: 0,
                refundAmount: 0,
                discountAmount: 0,
                orderCount: 0,
                cancelledOrderCount: 0,
                productReturn: 0 // Track product-only returns for net sales
            };
            currentDay.add(1, 'day');
        }
        
        let orders = [];
        
        if (needToFetchOrders) {
            // Test order check (optimized)
            const isTestOrder = (order) => order.test;
            
            // Fetch all orders from extended date range (for refund caching)
            orders = await fetchAllOrdersChunked(shopify, fetchStartDate, originalEndDate, storeTimezone, isTestOrder);
            
            console.log('Total orders fetched:', orders.length);
            console.log('Test orders filtered out:', orders.filter(order => order.test).length);
            
            // Process orders for sales data and cache refunds
            let totalRefundsCached = 0;
            for (const order of orders) {
                await processOrderForDay(order, dailySalesMap, storeTimezone, brandId);
                if (order.refunds && order.refunds.length > 0) {
                    totalRefundsCached += order.refunds.length;
                }
            }
            
            console.log(`Total refunds processed during order processing: ${totalRefundsCached}`);
        } else {
            // Only fetch orders for the target date range since refunds are already cached
            const isTestOrder = (order) => order.test;
            orders = await fetchAllOrdersChunked(shopify, originalStartDate, originalEndDate, storeTimezone, isTestOrder);
            
            console.log('Total orders fetched (target range only):', orders.length);
            console.log('Test orders filtered out:', orders.filter(order => order.test).length);
            
            // Process orders for sales data only (refunds already cached)
            for (const order of orders) {
                await processOrderForDay(order, dailySalesMap, storeTimezone, brandId);
            }
        }
        
        // Fetch refund amounts from cache for the target date range
        const refundAmountsFromCache = await getRefundAmountsFromCache(brandId, originalStartDate.format('YYYY-MM-DD'), originalEndDate.format('YYYY-MM-DD'));
        
        console.log(`Refunds found in cache for target range: ${Object.keys(refundAmountsFromCache).length} dates`);
        console.log(`Total refund entries in cache: ${Object.values(refundAmountsFromCache).reduce((sum, data) => sum + (data.productReturn + data.totalReturn), 0)}`);
        
        // Apply refund amounts from cache to daily sales data
        Object.keys(refundAmountsFromCache).forEach(date => {
            if (dailySalesMap[date]) {
                const refundData = refundAmountsFromCache[date];
                dailySalesMap[date].productReturn = refundData.productReturn;
                dailySalesMap[date].refundAmount = refundData.totalReturn;
                console.log(`Applied refunds for ${date}: productReturn=${refundData.productReturn}, totalReturn=${refundData.totalReturn}`);
            }
        });
        
        // Log summary of data processing
        const ordersInRange = orders.filter(order => {
            const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
            return originalStartDate.isSameOrBefore(moment.tz(orderDate, storeTimezone)) && originalEndDate.isSameOrAfter(moment.tz(orderDate, storeTimezone));
        }).length;
        
        console.log(`Orders in target range: ${ordersInRange}/${orders.length}`);
        
        return Object.values(dailySalesMap).map(day => {
            const grossSales = Number(day.grossSales);
            const discountAmount = Number(day.discountAmount);
            const refundAmount = Number(day.refundAmount);
            const totalPrice = Number(day.totalPrice);
            const subtotalPrice = Number(day.subtotalPrice);
            const productReturn = Number(day.productReturn || 0);
            //const shopifySales = grossSales - discountAmount - refundAmount;
            const shopifySales = totalPrice - refundAmount;
            
            return {
                date: day.date,
                grossSales: grossSales.toFixed(2),
                shopifySales: shopifySales.toFixed(2), // Net sales
                totalSales: (totalPrice - refundAmount).toFixed(2),
                subtotalSales: subtotalPrice.toFixed(2),
                refundAmount: refundAmount.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                productReturn: productReturn.toFixed(2),
                orderCount: day.orderCount,
                cancelledOrderCount: day.cancelledOrderCount,
                currency: storeCurrency
            };
        });
    } catch (error) {
        console.error('Error in fetchTotalSales:', error);
        throw new Error(`Failed to fetch total sales: ${error.message}`);
    }
};

export const monthlyFetchFBAdReport = async (brandId, userId, startDate, endDate) => {
    try {
        // Validate and convert input dates to Moment objects
        const start = moment(startDate);
        const end = moment(endDate);

        if (!start.isValid() || !end.isValid()) {
            throw new Error('Invalid date format provided');
        }

        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean(),
        ]);

        if (!brand || !user) {
            return {
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
                data: []
            };
        }

        const adAccountIds = brand.fbAdAccounts;
        if (!adAccountIds?.length) {
            return {
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
                data: []
            };
        }

        const accessToken = user.fbAccessToken;
        if (!accessToken) {
            return {
                success: false,
                message: 'Access token is missing or invalid.',
                data: []
            };
        }

        const results = [];
        let currentChunkStart = start.clone();

        // Process in chunks of 15 days
        while (currentChunkStart.isSameOrBefore(end)) {
            const chunkEnd = moment.min(
                currentChunkStart.clone().add(15, 'days'),
                end
            );

            // Process day by day within the chunk
            const batchRequests = [];
            const requestDates = [];
            let currentDay = currentChunkStart.clone();

            while (currentDay.isSameOrBefore(chunkEnd)) {
                const formattedDay = currentDay.format('YYYY-MM-DD');

                // Create batch requests for each account
                adAccountIds.forEach(accountId => {
                    const requestUrl = `${accountId}/insights?fields=spend,purchase_roas&time_range={"since":"${formattedDay}","until":"${formattedDay}"}`;
                    batchRequests.push({ method: 'GET', relative_url: requestUrl });
                    requestDates.push({ accountId, date: currentDay.clone() });
                });

                // Process batch if limit reached or last day
                if (batchRequests.length >= 50 || currentDay.isSame(chunkEnd)) {
                    try {
                        const response = await axios.post(
                            'https://graph.facebook.com/v21.0/',
                            { batch: batchRequests },
                            {
                                headers: { 'Content-Type': 'application/json' },
                                params: { access_token: accessToken }
                            }
                        );

                        // Process responses
                        response.data?.forEach((res, index) => {
                            const { accountId, date } = requestDates[index];
                            const formattedDate = date.format('YYYY-MM-DD');

                            if (res.code === 200) {
                                try {
                                    const result = JSON.parse(res.body);
                                    const insight = result.data?.[0];

                                    if (insight) {
                                        results.push({
                                            adAccountId: accountId,
                                            date: formattedDate,
                                            spend: insight.spend || '0',
                                            purchase_roas: insight.purchase_roas?.map(roas => ({
                                                action_type: roas.action_type || 'N/A',
                                                value: roas.value || '0'
                                            })) || []
                                        });
                                    } else {
                                        results.push({
                                            adAccountId: accountId,
                                            date: formattedDate,
                                            spend: '0',
                                            purchase_roas: []
                                        });
                                    }
                                } catch (parseError) {
                                    console.error(`Error parsing response for ${accountId} on ${formattedDate}:`, parseError);
                                    results.push({
                                        adAccountId: accountId,
                                        date: formattedDate,
                                        spend: '0',
                                        purchase_roas: []
                                    });
                                }
                            } else {
                                console.error(`Error for account ${accountId} on ${formattedDate}:`, res.body);
                                results.push({
                                    adAccountId: accountId,
                                    date: formattedDate,
                                    spend: '0',
                                    purchase_roas: []
                                });
                            }
                        });
                    } catch (batchError) {
                        console.error('Batch request error:', batchError);
                        // Add empty results for failed batch
                        requestDates.forEach(({ accountId, date }) => {
                            results.push({
                                adAccountId: accountId,
                                date: date.format('YYYY-MM-DD'),
                                spend: '0',
                                purchase_roas: []
                            });
                        });
                    }

                    // Reset batch arrays
                    batchRequests.length = 0;
                    requestDates.length = 0;
                }

                currentDay.add(1, 'days');
            }

            // Move to next chunk
            currentChunkStart = chunkEnd.clone().add(1, 'days');
        }

        return {
            success: true,
            data: results
        };

    } catch (error) {
        console.error('Error fetching Facebook Ad Account data:', error);
        return {
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account data.',
            error: error.message,
            data: [] // Always include data property even in error case
        };
    }
};

export const monthlyGoogleAdData = async (brandId, userId, startDate, endDate) => {
    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean(),
        ]);

        if (!brand || !user) {
            return {
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            };
        }

        const refreshToken = user.googleAdsRefreshToken;
        if (!refreshToken) {
            return {
                success: false,
                message: 'No refresh token found for this user.',
                data: [],
            };
        }

        // Check if there are any Google Ad accounts
        if (!brand.googleAdAccount || !brand.googleAdAccount.length) {
            return {
                success: false,
                message: 'No Google Ads accounts found for this brand.',
                data: [],
            };
        }

        // 

        const client = new GoogleAdsApi({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
            refresh_token: refreshToken,
        });

        // Initialize a map to store metrics by date
        const metricsMap = new Map();

        // Process each Google Ad account
        for (const adAccount of brand.googleAdAccount) {
            const adAccountId = adAccount.clientId;
            const managerId = adAccount.managerId;

            if (!adAccountId) {
                console.log('Skipping account with no clientId');
                continue;
            }

            console.log(`Processing Google Ad Account: ${adAccountId}, Manager ID: ${managerId}`);

            const customer = client.Customer({
                customer_id: adAccountId,
                refresh_token: refreshToken,
                login_customer_id: managerId,
            });

            let currentDate = moment(startDate);
            const end = moment(endDate);

            while (currentDate.isSameOrBefore(end)) {
                const formattedDate = currentDate.format('YYYY-MM-DD');

                try {
                    console.log(`Fetching data for account ${adAccountId} on date ${formattedDate}`);
                    
                    const adsReport = await customer.report({
                        entity: "customer",
                        attributes: ["customer.descriptive_name"],
                        metrics: [
                            "metrics.cost_micros",
                            "metrics.conversions_value",
                        ],
                        from_date: formattedDate,
                        to_date: formattedDate,
                    });

                    let totalSpend = 0;
                    let totalConversionsValue = 0;

                    // Process each row of the report
                    for (const row of adsReport) {
                        const costMicros = row.metrics.cost_micros || 0;
                        const spend = costMicros / 1_000_000;
                        totalSpend += spend;
                        totalConversionsValue += row.metrics.conversions_value || 0;
                    }

                    // Update or create metrics for this date
                    if (!metricsMap.has(formattedDate)) {
                        metricsMap.set(formattedDate, {
                            date: formattedDate,
                            googleSpend: 0,
                            googleConversionsValue: 0,
                        });
                    }

                    const dateMetrics = metricsMap.get(formattedDate);
                    dateMetrics.googleSpend += totalSpend;
                    dateMetrics.googleConversionsValue += totalConversionsValue;

                } catch (error) {
                    console.error(`Error fetching data for account ${adAccountId} on date ${formattedDate}:`, error);
                    console.error('Error details:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        metadata: error.metadata
                    });
                    
                    // If it's an authentication error, break out of the loop for this account
                    if (error.code === 2 || error.message.includes('invalid_request')) {
                        console.error(`Authentication error for account ${adAccountId}, skipping remaining dates`);
                        break;
                    }
                    // Continue with other dates and accounts if one fails
                }

                currentDate = currentDate.add(1, 'day');
            }
        }

        // Convert map to array and calculate ROAS and sales for each date
        const metricsByDate = Array.from(metricsMap.values()).map(metrics => {
            const googleRoas = metrics.googleSpend > 0 ?
                (metrics.googleConversionsValue / metrics.googleSpend) : 0;
            const googleSales = googleRoas * metrics.googleSpend || 0;

            return {
                date: metrics.date,
                googleSpend: metrics.googleSpend.toFixed(2),
                googleRoas: googleRoas.toFixed(2),
                googleSales: googleSales.toFixed(2),
            };
        });

        // Sort by date
        metricsByDate.sort((a, b) => moment(a.date).diff(moment(b.date)));

        console.log(`Google Ads data processed: ${metricsByDate.length} dates`);
        return {
            success: true,
            data: metricsByDate,
        };

    } catch (e) {
        console.error('Error getting Google Ad data:', e);
        console.error('Full error details:', {
            message: e.message,
            code: e.code,
            details: e.details,
            stack: e.stack
        });
        return {
            success: false,
            message: 'An error occurred while fetching Google Ad data.',
        };
    }
};

export const monthlyAddReportData = async (brandId, startDate, endDate, userId, refundOnlyStartDate = null) => {
    try {
        if (!brandId || !startDate || !endDate || !userId) {
            throw new Error('Missing required parameters');
        }

        const currentStart = moment(startDate);
        const finalEnd = moment(endDate);

        // Validate input dates
        if (!currentStart.isValid() || !finalEnd.isValid()) {
            throw new Error('Invalid date format provided');
        }

        console.log(`Processing range: ${currentStart.format('YYYY-MM-DD')} to ${finalEnd.format('YYYY-MM-DD')}`);
        if (refundOnlyStartDate) {
            console.log(`Extended refund caching from: ${refundOnlyStartDate}`);
        }

        // Create chunks of 4 months
        const chunks = [];
        for (let chunkStart = currentStart.clone(); chunkStart.isBefore(finalEnd);) {
            let chunkEnd = moment.min(chunkStart.clone().add(4, 'months'), finalEnd);
            chunks.push({
                start: chunkStart.format('YYYY-MM-DD'),
                end: chunkEnd.format('YYYY-MM-DD')
            });
            chunkStart = chunkEnd.clone();
        }

        
        const CONCURRENCY_LIMIT = 3; 
        const results = [];
        
        for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
            const chunkPromises = chunks.slice(i, i + CONCURRENCY_LIMIT).map(async (chunk) => {
                console.log(`Processing chunk: ${chunk.start} to ${chunk.end}`);

                try {
                    // Parallel fetch of all data sources
                    const [fbDataResult, shopifySalesData, googleDataResult] = await Promise.all([
                        monthlyFetchFBAdReport(brandId, userId, chunk.start, chunk.end)
                            .catch(err => {
                                console.error('Error fetching FB data:', err);
                                return { data: [] };
                            }),
                        monthlyFetchTotalSales(brandId, chunk.start, chunk.end, refundOnlyStartDate)
                            .catch(err => {
                                console.error('Error fetching Shopify data:', err);
                                return [];
                            }),
                        monthlyGoogleAdData(brandId, userId, chunk.start, chunk.end)
                            .catch(err => {
                                console.error('Error fetching Google data:', err);
                                return { data: [] };
                            })
                    ]);

                    // Validate and process data
                    const fbData = Array.isArray(fbDataResult?.data) ? fbDataResult.data : [];
                    const shopifyData = Array.isArray(shopifySalesData) ? shopifySalesData : [];
                    const googleData = Array.isArray(googleDataResult?.data) ? googleDataResult.data : [];

                    // Create lookup maps for faster data access
                    const metricsByDate = new Map();
                    const shopifySalesMap = new Map(
                        shopifyData.map(sale => [
                            sale.date,
                            {
                                totalSales: parseFloat(sale.totalSales) || 0,
                                refundAmount: parseFloat(sale.refundAmount) || 0,
                                shopifySales: parseFloat(sale.shopifySales) || 0
                            }
                        ])
                    );

                    // Initialize metricsByDate with Shopify data
                    shopifySalesMap.forEach((value, date) => {
                        metricsByDate.set(date, {
                            totalMetaSpend: 0,
                            totalMetaROAS: 0,
                            googleSpend: 0,
                            googleROAS: 0,
                            googleSales: 0
                        });
                    });

                    // Process Google data
                    const googleDataMap = new Map(
                        googleData.map(entry => [
                            entry.date,
                            {
                                googleSpend: parseFloat(entry.googleSpend) || 0,
                                googleROAS: parseFloat(entry.googleRoas) || 0,
                                googleSales: parseFloat(entry.googleSales) || 0
                            }
                        ])
                    );

                    // Merge Google data
                    googleDataMap.forEach((value, date) => {
                        if (!metricsByDate.has(date)) {
                            metricsByDate.set(date, {
                                totalMetaSpend: 0,
                                totalMetaROAS: 0,
                                googleSpend: 0,
                                googleROAS: 0,
                                googleSales: 0
                            });
                        }
                        const metrics = metricsByDate.get(date);
                        metrics.googleSpend = value.googleSpend;
                        metrics.googleROAS = value.googleROAS;
                        metrics.googleSales = value.googleSales;
                    });

                    // Process Facebook data
                    for (const account of fbData) {
                        if (!account?.date) continue;
                        const { date, spend, purchase_roas = [] } = account;

                        if (!metricsByDate.has(date)) {
                            metricsByDate.set(date, {
                                totalMetaSpend: 0,
                                totalMetaROAS: 0,
                                googleSpend: 0,
                                googleROAS: 0,
                                googleSales: 0
                            });
                        }

                        const metrics = metricsByDate.get(date);
                        metrics.totalMetaSpend += parseFloat(spend) || 0;
                        metrics.totalMetaROAS += purchase_roas.reduce(
                            (acc, roas) => acc + (parseFloat(roas?.value) || 0),
                            0
                        );
                    }

                    // Create entries for bulk write
                    const entries = Array.from(metricsByDate.entries()).map(([date, metrics]) => {
                        const shopifyData = shopifySalesMap.get(date) || {
                            totalSales: 0,
                            refundAmount: 0,
                            shopifySales: 0
                        };
                        const entryObj = createMetricsEntry(brandId, date, metrics, shopifyData).toObject();
                        delete entryObj._id;
                        return entryObj;
                    });

                    // Perform bulk write
                    if (entries.length > 0) {
                        const bulkOps = entries.map(entry => ({
                            updateOne: {
                                filter: { brandId: entry.brandId, date: entry.date },
                                update: { $set: entry },
                                upsert: true
                            }
                        }));

                        await AdMetrics.bulkWrite(bulkOps, { ordered: false });
                        console.log(`Bulk upserted ${bulkOps.length} metrics entries for chunk ${chunk.start} to ${chunk.end}`);
                    }

                    return {
                        startDate: chunk.start,
                        endDate: chunk.end,
                        metrics: Object.fromEntries(metricsByDate),
                        savedCount: entries.length
                    };

                } catch (chunkError) {
                    console.error(`Error processing chunk ${chunk.start} to ${chunk.end}:`, chunkError);
                    return {
                        startDate: chunk.start,
                        endDate: chunk.end,
                        error: chunkError.message,
                        savedCount: 0
                    };
                }
            });

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
        }

        if (results.length === 0) {
            return {
                success: false,
                message: 'No data was processed successfully.',
                data: []
            };
        }

        return {
            success: true,
            message: 'Metrics processing completed.',
            data: results,
            totalChunks: results.length,
            totalSavedEntries: results.reduce((acc, chunk) => acc + (chunk.savedCount || 0), 0)
        };

    } catch (error) {
        console.error('Error calculating and saving metrics:', error);
        return {
            success: false,
            message: 'An error occurred while calculating and saving metrics.',
            error: error.message
        };
    }
};

const createMetricsEntry = (brandId, date, metrics, shopifyData) => {
    console.log('Creating metrics entry with data:', {
        brandId,
        date,
        metrics,
        shopifyData
    });

    const { totalMetaSpend, totalMetaROAS, googleSpend, googleROAS, googleSales } = metrics;
    const { totalSales, refundAmount, shopifySales } = shopifyData;

    const metaSpend = parseFloat(totalMetaSpend.toFixed(2));
    const metaROAS = parseFloat(totalMetaROAS.toFixed(2));
    const totalSpend = metaSpend + googleSpend;
    const metaSales = metaSpend * metaROAS;
    const adTotalSales = metaSales + googleSales;

    const grossROI = totalSpend > 0 ? adTotalSales / totalSpend : 0;
    const netROI = totalSpend > 0 ? shopifySales / totalSpend : 0;

    const entry = new AdMetrics({
        brandId,
        date: new Date(date), // Ensure UTC date
        metaSpend,
        metaROAS,
        googleSpend,
        googleROAS,
        googleSales,
        totalSales,
        refundAmount,
        shopifySales,
        totalSpend: totalSpend.toFixed(2),
        grossROI: grossROI.toFixed(2),
        netROI: netROI.toFixed(2)
    });

    console.log('Created metrics entry:', entry.toObject());
    return entry;
};

export const monthlyCalculateMetricsForAllBrands = async (startDate, endDate, userId) => {
    try {
        const brands = await Brand.find({});
        console.log(`Found ${brands.length} brands for metrics calculation.`);

        const metricsPromises = brands.map(async (brand) => {
            const brandIdString = brand._id.toString();
            console.log(`Starting metrics processing for brand: ${brandIdString}`);

            try {
                const result = await monthlyAddReportData(brandIdString, startDate, endDate, userId, startDate, endDate);
                if (result.success) {
                    console.log(`Metrics successfully saved for brand ${brandIdString}`);
                } else {
                    console.error(`Failed to save metrics for brand ${brandIdString}: ${result.message}`);
                }
            } catch (error) {
                console.error(`Error in addReportData for brand ${brandIdString}: ${error.message}`);
            }

            console.info(`Completed metrics processing for brand: ${brandIdString}`);
        });

        const settledResults = await Promise.allSettled(metricsPromises);
        console.log("All brand metrics promises settled:", settledResults);
        console.log("Completed metrics calculation for all brands.");
    } catch (error) {
        console.error('Error processing metrics for all brands:', error);
    }
};

export const calculateMetricsForSingleBrand = async (brandId, userId) => {
    try {
        console.log(`Starting historical metrics calculation for brand: ${brandId}`);
        console.log(`Using user ID: ${userId}`);

        const brand = await Brand.findById(brandId);
        if (!brand) {
            console.error(`Brand not found with ID: ${brandId}`);
            const errorResult = { success: false, message: 'Brand not found' };
            publishNotification('metrics-error', { brandId, userId, message: 'Brand not found' });
            return errorResult;
        }
        console.log('Brand found:', brand.name);

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            console.error(`User not found with ID: ${userId}`);
            const errorResult = { success: false, message: 'User not found' };
            publishNotification('metrics-error', { brandId, userId, message: 'User not found' });
            return errorResult;
        }
        console.log('User found:', user.email);

        // Calculate dates for the last two years
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // Set to yesterday
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 2);
        startDate.setDate(1); // Set to first day of the month
        startDate.setHours(0, 0, 0, 0);

        // Calculate 6 months prior to start date for refund caching
        const refundOnlyStartDate = new Date(startDate);
        refundOnlyStartDate.setMonth(refundOnlyStartDate.getMonth() - 6);
        refundOnlyStartDate.setHours(0, 0, 0, 0);

        console.log(`Date range for ad metrics: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`Extended refund caching from: ${refundOnlyStartDate.toISOString()}`);
        console.log(`Calculating metrics from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

        // Check if brand exists


        // Check for existing metrics within the date range
        const existingMetrics = await AdMetrics.findOne({
            brandId,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });
        
        console.log('Existing metrics check:', existingMetrics ? 'Found existing metrics' : 'No existing metrics found');

        if (existingMetrics) {
            console.log(`Metrics already exist for brand ${brandId} within the date range, skipping calculation`);
            const result = { success: true, message: 'Metrics already exist for this brand within the date range' };
            publishNotification('metrics-completion', { success: true, message: 'Metrics already exist for this brand within the date range', brandId, userId });
            return result;
        }

        console.log('Starting monthlyAddReportData with extended refund caching...');
        
        // Use the extended date range for refund caching but only create metrics for the target range
        const result = await monthlyAddReportData(brandId, startDate, endDate, userId, refundOnlyStartDate);
        console.log('monthlyAddReportData result:', result);

        if (result.success) {
            console.log(`Historical metrics successfully calculated and saved for brand ${brandId}`);
            const successResult = { success: true, message: 'Historical metrics successfully calculated' };
            
            // Send completion notification
            publishNotification('metrics-completion', { success: true, message: 'Historical metrics successfully calculated', brandId, userId });
            
            return successResult;
        } else {
            console.error(`Failed to calculate historical metrics for brand ${brandId}: ${result.message}`);
            const errorResult = { success: false, message: result.message };
            
            // Send error notification
            publishNotification('metrics-error', { brandId, userId, message: result.message });
            
            return errorResult;
        }
    } catch (error) {
        console.error(`Error calculating historical metrics for brand ${brandId}:`, error);
        const errorResult = { success: false, message: error.message };
        
        // Send error notification
        publishNotification('metrics-error', { brandId, userId, message: error.message });
        
        return errorResult;
    }
};

// Function to handle all types of new additions (stores, Meta accounts, Google accounts)
export const calculateMetricsForNewAdditions = async (brandId, userId, newAdditions = {}) => {
    try {
        console.log(`Starting metrics calculation for new additions for brand: ${brandId}`);
        console.log('New additions:', newAdditions);
        console.log(`Using user ID: ${userId}`);

        // Get brand details including creation date
        const brand = await Brand.findById(brandId);
        if (!brand) {
            console.error(`Brand not found with ID: ${brandId}`);
            const errorResult = { success: false, message: 'Brand not found' };
            publishNotification('metrics-error', { brandId, userId, message: 'Brand not found' });
            return errorResult;
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            console.error(`User not found with ID: ${userId}`);
            const errorResult = { success: false, message: 'User not found' };
            publishNotification('metrics-error', { brandId, userId, message: 'User not found' });
            return errorResult;
        }

        const { newStore = false, newFbAccounts = [], newGoogleAccounts = [] } = newAdditions;

        // If no new additions, return early
        if (!newStore && newFbAccounts.length === 0 && newGoogleAccounts.length === 0) {
            console.log('No new additions detected, skipping calculation');
            return { success: true, message: 'No new additions to process' };
        }

        // Calculate date range based on brand creation date
        const brandCreatedAt = new Date(brand.createdAt);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // Set to yesterday
        endDate.setHours(23, 59, 59, 999);

        // Start date is 2 years before brand creation date
        const startDate = new Date(brandCreatedAt);
        startDate.setFullYear(startDate.getFullYear() - 2);
        startDate.setHours(0, 0, 0, 0);

        // Calculate 6 months prior to start date for refund caching (only if new store)
        const refundOnlyStartDate = newStore ? new Date(startDate) : null;
        if (refundOnlyStartDate) {
            refundOnlyStartDate.setMonth(refundOnlyStartDate.getMonth() - 6);
            refundOnlyStartDate.setHours(0, 0, 0, 0);
        }

        console.log(`Brand creation date: ${brandCreatedAt.toISOString()}`);
        console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        if (newStore) {
            console.log(`Extended refund caching from: ${refundOnlyStartDate.toISOString()}`);
        }

        // CASE 1: New Store - Only update Shopify data
        if (newStore) {
            console.log('New store detected - updating Shopify data only...');
            
            // Check for existing metrics within the date range
            const existingMetrics = await AdMetrics.find({
                brandId,
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ date: 1 });

            if (existingMetrics.length === 0) {
                console.log('No existing metrics found for new store. Triggering full calculation...');
                // If no existing metrics, trigger full calculation
                const result = await monthlyAddReportData(brandId, startDate, endDate, userId, refundOnlyStartDate);
                
                if (result.success) {
                    console.log(`Full metrics calculation completed for brand ${brandId} with new store`);
                    const successResult = { 
                        success: true, 
                        message: 'Full metrics calculation completed for new store',
                        type: 'new-store-full'
                    };
                    
                    publishNotification('metrics-completion', { 
                        success: true, 
                        message: 'Full metrics calculation completed for new store', 
                        brandId, 
                        userId 
                    });
                    
                    return successResult;
                } else {
                    throw new Error(result.message);
                }
            }

            console.log(`Found ${existingMetrics.length} existing metrics entries to update with Shopify data`);

            // Fetch new Shopify sales data
            console.log('Fetching Shopify sales data for new store...');
            const shopifySalesData = await monthlyFetchTotalSales(brandId, startDate, endDate, refundOnlyStartDate);
            
            if (!shopifySalesData || shopifySalesData.length === 0) {
                console.log('No Shopify sales data returned, skipping update');
                return { success: true, message: 'No Shopify sales data to update' };
            }

            // Create a map of Shopify data by date for easy lookup
            const shopifyDataMap = new Map();
            shopifySalesData.forEach(sale => {
                shopifyDataMap.set(sale.date, {
                    totalSales: parseFloat(sale.totalSales) || 0,
                    refundAmount: parseFloat(sale.refundAmount) || 0,
                    shopifySales: parseFloat(sale.shopifySales) || 0
                });
            });

            // Update existing metrics with new Shopify data
            const updatedMetrics = [];

            existingMetrics.forEach(existingMetric => {
                const dateStr = moment(existingMetric.date).format('YYYY-MM-DD');
                const shopifyData = shopifyDataMap.get(dateStr);

                if (shopifyData) {
                    // Update existing metric with new Shopify data
                    const updatedMetric = {
                        ...existingMetric.toObject(),
                        totalSales: shopifyData.totalSales,
                        refundAmount: shopifyData.refundAmount,
                        shopifySales: shopifyData.shopifySales
                    };

                    // Recalculate ROI metrics based on existing ad spend data
                    const totalSpend = (existingMetric.metaSpend || 0) + (existingMetric.googleSpend || 0);
                    const metaSales = (existingMetric.metaSpend || 0) * (existingMetric.metaROAS || 0);
                    const adTotalSales = metaSales + (existingMetric.googleSales || 0);
                    const grossROI = totalSpend > 0 ? adTotalSales / totalSpend : 0;
                    const netROI = totalSpend > 0 ? shopifyData.shopifySales / totalSpend : 0;

                    updatedMetric.grossROI = grossROI.toFixed(2);
                    updatedMetric.netROI = netROI.toFixed(2);

                    updatedMetrics.push(updatedMetric);
                }
            });

            // Update the database with new Shopify data
            if (updatedMetrics.length > 0) {
                const bulkOps = updatedMetrics.map(metric => ({
                    updateOne: {
                        filter: { _id: metric._id },
                        update: { 
                            $set: {
                                totalSales: metric.totalSales,
                                refundAmount: metric.refundAmount,
                                shopifySales: metric.shopifySales,
                                grossROI: metric.grossROI,
                                netROI: metric.netROI
                            }
                        }
                    }
                }));

                await AdMetrics.bulkWrite(bulkOps, { ordered: false });
                console.log(`Updated ${bulkOps.length} metrics entries with new Shopify data`);
            }

            console.log(`Successfully updated Shopify data for new store in brand ${brandId}`);
            const successResult = { 
                success: true, 
                message: 'Shopify data successfully updated for new store',
                type: 'new-store-update',
                updatedCount: updatedMetrics.length
            };
            
            publishNotification('metrics-completion', { 
                success: true, 
                message: 'Shopify data successfully updated for new store', 
                brandId, 
                userId 
            });
            
            return successResult;
        }

        // CASE 2 & 3: New Ad Accounts Only - Update existing metrics
        if (newFbAccounts.length > 0 || newGoogleAccounts.length > 0) {
            console.log('New ad accounts detected - updating existing metrics...');
            
            // Get existing metrics for the date range
            const existingMetrics = await AdMetrics.find({
                brandId,
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ date: 1 });

            if (existingMetrics.length === 0) {
                console.log('No existing metrics found for new ad accounts. Triggering full calculation...');
                // If no existing metrics, trigger full calculation
                const result = await monthlyAddReportData(brandId, startDate, endDate, userId, refundOnlyStartDate);
                
                if (result.success) {
                    console.log(`Full metrics calculation completed for brand ${brandId} with new ad accounts`);
                    const successResult = { 
                        success: true, 
                        message: 'Full metrics calculation completed for new ad accounts',
                        type: 'new-ad-accounts-full'
                    };
                    
                    publishNotification('metrics-completion', { 
                        success: true, 
                        message: 'Full metrics calculation completed for new ad accounts', 
                        brandId, 
                        userId 
                    });
                    
                    return successResult;
                } else {
                    throw new Error(result.message);
                }
            }

            console.log(`Found ${existingMetrics.length} existing metrics entries to update`);

            // Create a map of existing metrics by date for easy lookup
            const existingMetricsMap = new Map();
            existingMetrics.forEach(metric => {
                const dateStr = moment(metric.date).format('YYYY-MM-DD');
                existingMetricsMap.set(dateStr, metric);
            });

            // Process new Facebook ad accounts
            let fbData = [];
            if (newFbAccounts.length > 0) {
                console.log('Fetching data for new Facebook ad accounts...');
                const fbResult = await monthlyFetchFBAdReport(brandId, userId, startDate, endDate);
                if (fbResult.success && fbResult.data.length > 0) {
                    // Filter to only include new accounts
                    fbData = fbResult.data.filter(entry => 
                        newFbAccounts.includes(entry.adAccountId)
                    );
                    console.log(`Filtered ${fbData.length} Facebook entries for new accounts`);
                }
            }

            // Process new Google ad accounts
            let googleData = [];
            if (newGoogleAccounts.length > 0) {
                console.log('Fetching data for new Google ad accounts...');
                const googleResult = await monthlyGoogleAdData(brandId, userId, startDate, endDate);
                if (googleResult.success && googleResult.data.length > 0) {
                    googleData = googleResult.data;
                    console.log(`Got ${googleData.length} Google entries`);
                }
            }

            // Update existing metrics with new ad account data
            const updatedMetrics = [];

            // Process each date in the range
            let currentDate = moment(startDate);
            const endMoment = moment(endDate);

            while (currentDate.isSameOrBefore(endMoment)) {
                const dateStr = currentDate.format('YYYY-MM-DD');
                const existingMetric = existingMetricsMap.get(dateStr);

                if (existingMetric) {
                    // Get Facebook data for this date
                    const dateFbData = fbData.filter(entry => entry.date === dateStr);
                    let newMetaSpend = 0;
                    let newMetaROAS = 0;

                    dateFbData.forEach(entry => {
                        newMetaSpend += parseFloat(entry.spend) || 0;
                        newMetaROAS += entry.purchase_roas.reduce(
                            (acc, roas) => acc + (parseFloat(roas?.value) || 0),
                            0
                        );
                    });

                    // Get Google data for this date
                    const dateGoogleData = googleData.find(entry => entry.date === dateStr);
                    const newGoogleSpend = dateGoogleData ? parseFloat(dateGoogleData.googleSpend) || 0 : 0;
                    const newGoogleROAS = dateGoogleData ? parseFloat(dateGoogleData.googleRoas) || 0 : 0;
                    const newGoogleSales = dateGoogleData ? parseFloat(dateGoogleData.googleSales) || 0 : 0;

                    // Update existing metric with new ad account data
                    const updatedMetric = {
                        ...existingMetric.toObject(),
                        metaSpend: (existingMetric.metaSpend || 0) + newMetaSpend,
                        metaROAS: (existingMetric.metaROAS || 0) + newMetaROAS,
                        googleSpend: (existingMetric.googleSpend || 0) + newGoogleSpend,
                        googleROAS: (existingMetric.googleROAS || 0) + newGoogleROAS,
                        googleSales: (existingMetric.googleSales || 0) + newGoogleSales
                    };

                    // Recalculate totals
                    const totalSpend = updatedMetric.metaSpend + updatedMetric.googleSpend;
                    const metaSales = updatedMetric.metaSpend * updatedMetric.metaROAS;
                    const adTotalSales = metaSales + updatedMetric.googleSales;
                    const grossROI = totalSpend > 0 ? adTotalSales / totalSpend : 0;
                    const netROI = totalSpend > 0 ? updatedMetric.shopifySales / totalSpend : 0;

                    updatedMetric.totalSpend = totalSpend.toFixed(2);
                    updatedMetric.grossROI = grossROI.toFixed(2);
                    updatedMetric.netROI = netROI.toFixed(2);

                    updatedMetrics.push(updatedMetric);
                }

                currentDate.add(1, 'day');
            }

            // Update the database with new ad account data
            if (updatedMetrics.length > 0) {
                const bulkOps = updatedMetrics.map(metric => ({
                    updateOne: {
                        filter: { _id: metric._id },
                        update: { 
                            $set: {
                                metaSpend: metric.metaSpend,
                                metaROAS: metric.metaROAS,
                                googleSpend: metric.googleSpend,
                                googleROAS: metric.googleROAS,
                                googleSales: metric.googleSales,
                                totalSpend: metric.totalSpend,
                                grossROI: metric.grossROI,
                                netROI: metric.netROI
                            }
                        }
                    }
                }));

                await AdMetrics.bulkWrite(bulkOps, { ordered: false });
                console.log(`Updated ${bulkOps.length} metrics entries with new ad account data`);
            }

            console.log(`Successfully updated metrics for new ad accounts for brand ${brandId}`);
            const successResult = { 
                success: true, 
                message: 'Metrics successfully updated for new ad accounts',
                type: 'new-ad-accounts-update',
                updatedCount: updatedMetrics.length
            };
            
            publishNotification('metrics-completion', { 
                success: true, 
                message: 'Metrics successfully updated for new ad accounts', 
                brandId, 
                userId 
            });
            
            return successResult;
        }

        return { success: true, message: 'No processing needed' };

    } catch (error) {
        console.error(`Error processing new additions for brand ${brandId}:`, error);
        const errorResult = { success: false, message: error.message };
        
        publishNotification('metrics-error', { brandId, userId, message: error.message });
        
        return errorResult;
    }
};

// Function to get refund amounts from cache for a specific date range
const getRefundAmountsFromCache = async (brandId, startDate, endDate) => {
    try {
        console.log(`Fetching refunds from cache for brand ${brandId} from ${startDate} to ${endDate}`);
        
        const refunds = await RefundCache.find({
            brandId: brandId,
            refundCreatedAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        });
        
        console.log(`Found ${refunds.length} refunds in cache for the date range`);
        
        const result = refunds.reduce((acc, refund) => {
            const refundDate = moment(refund.refundCreatedAt).format('YYYY-MM-DD');
            if (!acc[refundDate]) {
                acc[refundDate] = {
                    productReturn: 0,
                    totalReturn: 0
                };
            }
            acc[refundDate].productReturn += refund.productReturn || 0;
            acc[refundDate].totalReturn += refund.totalReturn || 0;
            console.log(`Processing refund ${refund.refundId} for date ${refundDate}: productReturn=${refund.productReturn}, totalReturn=${refund.totalReturn}`);
            return acc;
        }, {});
        
        console.log(`Processed refunds for ${Object.keys(result).length} unique dates`);
        return result;
    } catch (error) {
        console.error('Error fetching refund amounts from cache:', error);
        return {};
    }
};



// async function getOrderRefundDetails(refundId) {
//     const query = `
//     query getOrderRefunds($id: ID!) {
//         refund(id: $id) {
//             id
//             note
//             totalRefundedSet {
//                 presentmentMoney {
//                     amount
//                     currencyCode
//                 }
//             }
//             transactions(first: 20) {
//                 edges {
//                     node {
//                         amountSet {
//                             presentmentMoney {
//                                 amount
//                                 currencyCode
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     `;

//     try {
//         const response = await shopify.graphql(query, { id: `gid://shopify/Refund/${refundId}` });
//         console.log('Order Refund Details:', JSON.stringify(response, null, 2));
//         return response;
//     } catch (error) {
//         console.error('Error fetching order refund details:', error);
//         throw error; // Re-throw to handle upstream
//     }
// }




