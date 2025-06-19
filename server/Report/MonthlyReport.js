import { config } from "dotenv";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
import Shopify from 'shopify-api-node'
import axios from "axios";
import AdMetrics from "../models/AdMetrics.js";
import { GoogleAdsApi } from "google-ads-api";
import moment from 'moment-timezone';
config();

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

function isInTargetDateRange(dateStr, originalStartDate, originalEndDate, storeTimezone) {
    const dateMoment = moment.tz(dateStr, storeTimezone);
    return dateMoment.isBetween(originalStartDate, originalEndDate, 'day', '[]');
}

function processOrderForDay(order, acc, storeTimezone, isInTargetDateRange, originalStartDate, originalEndDate) {
    const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
    
    if (isInTargetDateRange(orderDate, originalStartDate, originalEndDate, storeTimezone) && acc[orderDate]) {
        const totalPrice = Number(order.total_price || 0);
        const subtotalPrice = Number(order.subtotal_price || 0);
        let discountAmount = 0;
        if (order.line_items && Array.isArray(order.line_items)) {
            discountAmount = order.line_items.reduce((sum, item) => {
                if (item.discount_allocations && Array.isArray(item.discount_allocations)) {
                    return sum + item.discount_allocations.reduce((dSum, alloc) => dSum + Number(alloc.amount || 0), 0);
                }
                return sum;
            }, 0);
        }
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
    
    if (order.refunds && Array.isArray(order.refunds)) {
        order.refunds.forEach(refund => {
            const refundDate = moment.tz(refund.created_at, storeTimezone).format('YYYY-MM-DD');
            if (isInTargetDateRange(refundDate, originalStartDate, originalEndDate, storeTimezone) && acc[refundDate]) {
                const { productReturn, totalReturn } = getRefundAmount(refund);
                acc[refundDate].productReturn = (acc[refundDate].productReturn || 0) + productReturn;
                acc[refundDate].refundAmount += totalReturn;
            }
        });
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
                    pageInfo = Buffer.from(response[response.length - 1].id.toString()).toString('base64');
                    await new Promise(resolve => setTimeout(resolve, 300));
                } else {
                    pageInfo = null;
                }
            } while (pageInfo);
        } catch (error) {
            chunkFailed = true;
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
                            subPageInfo = Buffer.from(response[response.length - 1].id.toString()).toString('base64');
                            await new Promise(resolve => setTimeout(resolve, 300));
                        } else {
                            subPageInfo = null;
                        }
                    } while (subPageInfo);
                } catch (subError) {
                    // log and skip
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

export const monthlyFetchTotalSales = async (brandId, startDate, endDate) => {
    try {
        console.log('Fetching orders...');
        console.log('Date range:', { startDate, endDate });
        
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
        
        const REFUND_LOOKBACK_DAYS = 180;
        const originalStartDate = moment.tz(startDate, storeTimezone);
        const originalEndDate = moment.tz(endDate, storeTimezone);
        const extendedStartDate = originalStartDate.clone().subtract(REFUND_LOOKBACK_DAYS, 'days');
        
        console.log('Date processing:', {
            originalStartDate: originalStartDate.format('YYYY-MM-DD'),
            originalEndDate: originalEndDate.format('YYYY-MM-DD'),
            extendedStartDate: extendedStartDate.format('YYYY-MM-DD')
        });
        
        // Initialize daily sales map for ORIGINAL date range only
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
        
        // Test order check (optimized)
        const isTestOrder = (order) => order.test;
        // Fetch all orders (with chunked approach to avoid 500 errors)
        const orders = await fetchAllOrdersChunked(shopify, extendedStartDate, originalEndDate, storeTimezone, isTestOrder);
        
        console.log('Total orders fetched:', orders.length);
        console.log('Test orders filtered out:', orders.filter(order => order.test).length);
        
        // Process orders
        orders.forEach(order => {
            const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
            // Log discount_allocations for June 8th, 2025
            if (orderDate === '2025-06-08' && order.line_items && Array.isArray(order.line_items)) {
                order.line_items.forEach((item, idx) => {
                    if (item.discount_allocations && item.discount_allocations.length > 0) {
                        console.log(`[LOG] Order ${order.id} Line Item ${idx} discount_allocations:`, JSON.stringify(item.discount_allocations, null, 2));
                    }
                });
            }
            processOrderForDay(order, dailySalesMap, storeTimezone, isInTargetDateRange, originalStartDate, originalEndDate);
        });
        
        // Log summary of data processing
        const ordersInRange = orders.filter(order => {
            const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
            return isInTargetDateRange(orderDate, originalStartDate, originalEndDate, storeTimezone);
        }).length;
        const totalRefundsInRange = orders.reduce((total, order) => {
            if (!order.refunds) return total;
            return total + order.refunds.filter(refund => {
                const refundDate = moment.tz(refund.created_at, storeTimezone).format('YYYY-MM-DD');
                return isInTargetDateRange(refundDate, originalStartDate, originalEndDate, storeTimezone);
            }).length;
        }, 0);
        console.log(`Orders in target range: ${ordersInRange}/${orders.length}`);
        console.log(`Refunds processed in target range: ${totalRefundsInRange}`);
        
        return Object.values(dailySalesMap).map(day => {
            const grossSales = Number(day.grossSales);
            const discountAmount = Number(day.discountAmount);
            const refundAmount = Number(day.refundAmount);
            const totalPrice = Number(day.totalPrice);
            const subtotalPrice = Number(day.subtotalPrice);
            const productReturn = Number(day.productReturn || 0);
            const shopifySales = grossSales - discountAmount - productReturn;
            // Log for June 8th
            if (day.date === '2025-06-08') {
                console.log(`[LOG] June 8th - discountAmount: ${discountAmount}, shopifySales: ${shopifySales}, grossSales: ${grossSales}`);
            }
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

            if (!adAccountId) continue;

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

        console.log(metricsByDate);
        return {
            success: true,
            data: metricsByDate,
        };

    } catch (e) {
        console.error('Error getting Google Ad data:', e);
        return {
            success: false,
            message: 'An error occurred while fetching Google Ad data.',
        };
    }
};

export const monthlyAddReportData = async (brandId, startDate, endDate, userId) => {
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
                        monthlyFetchTotalSales(brandId, chunk.start, chunk.end)
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
                const result = await monthlyAddReportData(brandIdString, startDate, endDate, userId);
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

        // Calculate dates for the last two years
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // Set to yesterday
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 2);
        startDate.setDate(1); // Set to first day of the month
        startDate.setHours(0, 0, 0, 0);

        console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`Calculating metrics from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

        // Check if brand exists
        const brand = await Brand.findById(brandId);
        if (!brand) {
            console.error(`Brand not found with ID: ${brandId}`);
            return { success: false, message: 'Brand not found' };
        }
        console.log('Brand found:', brand.name);

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            console.error(`User not found with ID: ${userId}`);
            return { success: false, message: 'User not found' };
        }
        console.log('User found:', user.email);

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
            return { success: true, message: 'Metrics already exist for this brand within the date range' };
        }

        console.log('Starting monthlyAddReportData...');
        const result = await monthlyAddReportData(brandId, startDate, endDate, userId);
        console.log('monthlyAddReportData result:', result);

        if (result.success) {
            console.log(`Historical metrics successfully calculated and saved for brand ${brandId}`);
            return { success: true, message: 'Historical metrics successfully calculated' };
        } else {
            console.error(`Failed to calculate historical metrics for brand ${brandId}: ${result.message}`);
            return { success: false, message: result.message };
        }
    } catch (error) {
        console.error(`Error calculating historical metrics for brand ${brandId}:`, error);
        return { success: false, message: error.message };
    }
};