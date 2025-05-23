import { config } from "dotenv";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
import Shopify from 'shopify-api-node'
import axios from "axios";
import AdMetrics from "../models/AdMetrics.js";
import { GoogleAdsApi } from "google-ads-api";
import moment from 'moment-timezone';
import { subYears, startOfDay } from 'date-fns';
config();


export const monthlyFetchTotalSales = async (brandId, startDate, endDate) => {
    try {
        console.log('Fetching orders...');

        const brand = await Brand.findById(brandId);
        if (!brand) {
            throw new Error('Brand not found.');
        }

        const access_token = brand.shopifyAccount?.shopifyAccessToken;
        if (!access_token) {
            throw new Error('Access token is missing or invalid.');
        }

        const shopify = new Shopify({
            shopName: brand.shopifyAccount?.shopName,
            accessToken: access_token,
            apiVersion: '2024-04'
        });

        const shopData = await shopify.shop.get();
        const storeTimezone = shopData.iana_timezone || 'UTC';
        console.log('Store timezone:', storeTimezone);

        // Initialize daily sales data structure
        const dailySalesMap = {};
        let currentDay = moment.tz(startDate, storeTimezone).startOf('day');
        const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

        while (currentDay.isSameOrBefore(endMoment)) {
            const dateStr = currentDay.format('YYYY-MM-DD');
            dailySalesMap[dateStr] = {
                date: dateStr,
                grossSales: 0,       // Line items total before discounts
                totalPrice: 0,       // Total including all charges (shipping, taxes, etc.)
                refundAmount: 0,
                discountAmount: 0,
                orderCount: 0,
                cancelledOrderCount: 0
            };
            currentDay.add(1, 'day');
        }



        // Reset for fetching
        currentDay = moment.tz(startDate, storeTimezone).startOf('day');

        const fetchOrdersForTimeRange = async (startTime, endTime) => {
            let orders = [];
            let pageInfo = null;
            let retryCount = 0;
            const MAX_RETRIES = 3;
            const RETRY_DELAY = 5000;

            do {
                try {
                    // Add mandatory delay between requests
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const params = {
                        status: 'any',
                        created_at_min: startTime,
                        created_at_max: endTime,
                        limit: 150, // Reduced limit for better stability
                    };

                    if (pageInfo) {
                        params.page_info = pageInfo;
                    }

                    const response = await shopify.order.list(params);

                    if (!response || !Array.isArray(response)) {
                        console.warn('Unexpected response format:', response);
                        break;
                    }

                    orders = orders.concat(response);

                    console.log(orders);

                    // Extract pagination info from headers
                    const linkHeader = response.headers?.link;
                    if (linkHeader) {
                        const nextLink = linkHeader.split(',').find(link => link.includes('rel="next"'));
                        pageInfo = nextLink ? nextLink.match(/page_info=([^&>]*)/)?.[1] : null;
                    } else {
                        pageInfo = null;
                    }

                    console.log(`Fetched ${response.length} orders, total: ${orders.length}`);
                    retryCount = 0; // Reset retry count on successful request

                } catch (error) {
                    console.error('Error fetching orders:', error);

                    if (error.statusCode === 429) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                        continue;
                    }

                    if (error.statusCode === 400 && pageInfo) {
                        console.log('Bad request with page_info, restarting chunk');
                        pageInfo = null;
                        retryCount++;

                        if (retryCount >= MAX_RETRIES) {
                            console.error('Max retries reached for time range');
                            break;
                        }

                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                        continue;
                    }

                    throw error;
                }
            } while (pageInfo);

            return orders;
        };

        while (currentDay.isSameOrBefore(endMoment)) {
            const dateStr = currentDay.format('YYYY-MM-DD');
            console.log(`Processing date: ${dateStr}`);

            // Split day into 6-hour chunks for better handling
            const timeChunks = Array.from({ length: 4 }, (_, i) => ({
                start: currentDay.clone().add(i * 6, 'hours').toISOString(),
                end: currentDay.clone().add((i + 1) * 6, 'hours').toISOString()
            }));

            for (const chunk of timeChunks) {
                const orders = await fetchOrdersForTimeRange(chunk.start, chunk.end);

                orders.forEach(order => {
                    const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');

                    // const isCancelled = (order.cancelled_at || order.cancel_reason) && order.test === true;

                    // if (isCancelled) {
                    //     // Only increment cancelled order count, don't add to sales metrics
                    //     if (dailySalesMap[orderDate]) {
                    //         dailySalesMap[orderDate].cancelledOrderCount += 1;
                    //     }
                    // } else {
                        const totalPrice = Number(order.total_price || 0);
                        const discountAmount = Number(order.total_discounts || 0);

                        // Calculate true gross sales from line items (before discounts)
                        let lineItemTotal = 0;
                        if (order.line_items && Array.isArray(order.line_items)) {
                            lineItemTotal = order.line_items.reduce((sum, item) => {
                                // Calculate pre-discount price: price × quantity
                                const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
                                return sum + itemTotal;
                            }, 0);
                        }

                        // Fallback to subtotal_price + discounts if line items calculation is not available
                        const grossSales = lineItemTotal > 0 ?
                            lineItemTotal :
                            (Number(order.subtotal_price || 0) + discountAmount);

                        if (dailySalesMap[orderDate]) {
                            dailySalesMap[orderDate].grossSales += grossSales;
                            dailySalesMap[orderDate].totalPrice += totalPrice;
                            dailySalesMap[orderDate].discountAmount += discountAmount;
                            dailySalesMap[orderDate].orderCount += 1;
                        }

                        // Process refunds
                        if (order.refunds?.length > 0) {
                            order.refunds.forEach(refund => {
                                const refundDate = moment.tz(refund.created_at, storeTimezone).format('YYYY-MM-DD');
                                const refundAmount = calculateRefundAmount(refund);

                                if (dailySalesMap[refundDate]) {
                                    dailySalesMap[refundDate].refundAmount += refundAmount;
                                }
                            });
                        }
                    // }
                });
            }


            currentDay.add(1, 'day');
        }

        return Object.values(dailySalesMap).map(day => ({
            ...day,
            // Net product sales (excluding shipping, taxes, etc.)
            shopifySales: Number((day.grossSales - day.discountAmount).toFixed(2)),
            // Total customer payments including all charges, minus refunds
            totalSales: Number((day.totalPrice - day.refundAmount).toFixed(2)),
            refundAmount: Number(day.refundAmount.toFixed(2)),
            discountAmount: Number(day.discountAmount.toFixed(2))
        }));

    } catch (error) {
        console.error('Error in fetchTotalSales:', error);
        throw new Error(`Failed to fetch total sales: ${error.message}`);
    }
};

const calculateRefundAmount = (refund) => {
    const lineItemAmount = refund.refund_line_items?.reduce((sum, item) => {
        return sum + Number(item.subtotal_set?.shop_money?.amount || 0);
    }, 0) || 0;

    const transactionAmount = refund.transactions?.reduce((sum, trans) => {
        return sum + Number(trans.amount || 0);
    }, 0) || 0;

    return Math.max(lineItemAmount, transactionAmount);
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


// export const monthlyAddReportData = async (brandId, startDate, endDate, userId) => {
//     try {
//         if (!brandId || !startDate || !endDate || !userId) {
//             throw new Error('Missing required parameters');
//         }

//         const results = [];
//         const currentStart = moment(startDate);
//         const finalEnd = moment(endDate);

//         // Validate input dates
//         if (!currentStart.isValid() || !finalEnd.isValid()) {
//             throw new Error('Invalid date format provided');
//         }

//         // Process data in chunks of 3 months
//         for (let chunkStart = currentStart.clone(); chunkStart.isBefore(finalEnd);) {
//             let chunkEnd = moment.min(chunkStart.clone().add(3, 'months'), finalEnd);

//             const formattedStart = chunkStart.format('YYYY-MM-DD');
//             const formattedEnd = chunkEnd.format('YYYY-MM-DD');

//             console.log(`Processing chunk: ${formattedStart} to ${formattedEnd}`);

//             try {
//                 // Parallel fetch of all data sources with validation
//                 const [fbDataResult, shopifySalesData, googleDataResult] = await Promise.all([
//                     monthlyFetchFBAdReport(brandId, userId, formattedStart, formattedEnd)
//                         .catch(err => {
//                             console.error('Error fetching FB data:', err);
//                             return { data: [] };
//                         }),
//                     monthlyFetchTotalSales(brandId, formattedStart, formattedEnd)
//                         .catch(err => {
//                             console.error('Error fetching Shopify data:', err);
//                             return [];
//                         }),
//                     monthlyGoogleAdData(brandId, userId, formattedStart, formattedEnd)
//                         .catch(err => {
//                             console.error('Error fetching Google data:', err);
//                             return { data: [] };
//                         })
//                 ]);

//                 // Validate response structures
//                 const fbData = Array.isArray(fbDataResult?.data) ? fbDataResult.data : [];
//                 const shopifyData = Array.isArray(shopifySalesData) ? shopifySalesData : [];
//                 const googleData = Array.isArray(googleDataResult?.data) ? googleDataResult.data : [];

//                 // Create lookup maps
//                 const metricsByDate = new Map();

//                 // Process Shopify data - Add all Shopify dates to metricsByDate
//                 const shopifySalesMap = new Map(
//                     shopifyData.map(sale => [
//                         sale.date,
//                         {
//                             totalSales: parseFloat(sale.totalSales) || 0,
//                             refundAmount: parseFloat(sale.refundAmount) || 0,
//                             shopifySales: parseFloat(sale.shopifySales) || 0
//                         }
//                     ])
//                 );
                
//                 // Initialize metricsByDate with all dates that have Shopify data
//                 shopifySalesMap.forEach((value, date) => {
//                     if (!metricsByDate.has(date)) {
//                         metricsByDate.set(date, {
//                             totalMetaSpend: 0,
//                             totalMetaROAS: 0,
//                             googleSpend: 0,
//                             googleROAS: 0,
//                             googleSales: 0
//                         });
//                     }
//                 });

//                 // Process Google data and add dates to metricsByDate
//                 const googleDataMap = new Map(
//                     googleData.map(entry => [
//                         entry.date,
//                         {
//                             googleSpend: parseFloat(entry.googleSpend) || 0,
//                             googleROAS: parseFloat(entry.googleRoas) || 0,
//                             googleSales: parseFloat(entry.googleSales) || 0
//                         }
//                     ])
//                 );
                
//                 // Add all Google data dates to metricsByDate
//                 googleDataMap.forEach((value, date) => {
//                     if (!metricsByDate.has(date)) {
//                         metricsByDate.set(date, {
//                             totalMetaSpend: 0,
//                             totalMetaROAS: 0,
//                             googleSpend: 0,
//                             googleROAS: 0,
//                             googleSales: 0
//                         });
//                     }
                    
//                     // Update the Google metrics for this date
//                     const metrics = metricsByDate.get(date);
//                     metrics.googleSpend = value.googleSpend;
//                     metrics.googleROAS = value.googleROAS;
//                     metrics.googleSales = value.googleSales;
//                 });

//                 // Process Facebook data and merge with other sources
//                 for (const account of fbData) {
//                     if (!account?.date) continue; // Skip invalid entries

//                     const { date, spend, purchase_roas = [] } = account;

//                     if (!metricsByDate.has(date)) {
//                         metricsByDate.set(date, {
//                             totalMetaSpend: 0,
//                             totalMetaROAS: 0,
//                             googleSpend: 0,
//                             googleROAS: 0,
//                             googleSales: 0
//                         });
//                     }

//                     const metrics = metricsByDate.get(date);
//                     metrics.totalMetaSpend += parseFloat(spend) || 0;
//                     metrics.totalMetaROAS += purchase_roas.reduce(
//                         (acc, roas) => acc + (parseFloat(roas?.value) || 0),
//                         0
//                     );
//                 }

//                 // If no dates are available from any source, add at least today's date
//                 if (metricsByDate.size === 0) {
//                     const today = moment().format('YYYY-MM-DD');
//                     metricsByDate.set(today, {
//                         totalMetaSpend: 0,
//                         totalMetaROAS: 0,
//                         googleSpend: 0,
//                         googleROAS: 0,
//                         googleSales: 0
//                     });
//                 }

//                 // Helper function to get default Shopify data
//                 const getDefaultShopifyData = () => ({
//                     totalSales: 0,
//                     refundAmount: 0,
//                     shopifySales: 0
//                 });

//                 // Collect all entries
//                 const entries = Array.from(metricsByDate.entries()).map(([date, metrics]) => {
//                     const shopifyData = shopifySalesMap.get(date) || getDefaultShopifyData();
//                     return createMetricsEntry(brandId, date, metrics, shopifyData).toObject();
//                 });

//                 // Use bulkWrite for upsert (update if exists, insert if not)
//                 const bulkOps = entries.map(entry => ({
//                     updateOne: {
//                         filter: { brandId: entry.brandId, date: entry.date },
//                         update: { $set: entry },
//                         upsert: true
//                     }
//                 }));

//                 if (bulkOps.length > 0) {
//                     await AdMetrics.bulkWrite(bulkOps, { ordered: false });
//                     console.log(`Bulk upserted ${bulkOps.length} metrics entries for chunk ${formattedStart} to ${formattedEnd}`);
//                 } else {
//                     console.warn(`No entries to upsert for chunk ${formattedStart} to ${formattedEnd}`);
//                 }

//                 results.push({
//                     startDate: formattedStart,
//                     endDate: formattedEnd,
//                     metrics: Object.fromEntries(metricsByDate),
//                     savedCount: bulkOps.length
//                 });

//             } catch (chunkError) {
//                 console.error(`Error processing chunk ${formattedStart} to ${formattedEnd}:`, chunkError);
//                 continue; 
//             }

//             chunkStart = chunkEnd.clone();
//         }

//         if (results.length === 0) {
//             return {
//                 success: false,
//                 message: 'No data was processed successfully.',
//                 data: []
//             };
//         }

//         return {
//             success: true,
//             message: 'Metrics processing completed.',
//             data: results,
//             totalChunks: results.length,
//             totalSavedEntries: results.reduce((acc, chunk) => acc + (chunk.savedCount || 0), 0)
//         };

//     } catch (error) {
//         console.error('Error calculating and saving metrics:', error);
//         return {
//             success: false,
//             message: 'An error occurred while calculating and saving metrics.',
//             error: error.message
//         };
//     }
// };

const PROCESSING_CONFIG = {
    MAX_CONCURRENT_CHUNKS: 6,     
    CHUNK_SIZE_MONTHS: 3,         
    API_DELAY_MS: 200,            
    BATCH_SIZE: 100,              
    MAX_RETRIES: 3                
};

export const monthlyAddReportData = async (brandId, startDate, endDate, userId, progressCallback = null) => {
    try {
        if (!brandId || !startDate || !endDate || !userId) {
            throw new Error('Missing required parameters');
        }

        const currentStart = moment(startDate);
        const finalEnd = moment(endDate);

        if (!currentStart.isValid() || !finalEnd.isValid()) {
            throw new Error('Invalid date format provided');
        }

        console.log(`Starting parallel processing for brand ${brandId}`);
        console.log(`Date range: ${currentStart.format('YYYY-MM-DD')} to ${finalEnd.format('YYYY-MM-DD')}`);

        const chunks = createDateChunks(currentStart, finalEnd, PROCESSING_CONFIG.CHUNK_SIZE_MONTHS);
        console.log(`Created ${chunks.length} chunks for processing`);

        const results = await processChunksInParallel(chunks, brandId, userId, progressCallback);

        const totalSavedEntries = results.reduce((acc, chunk) => acc + (chunk.savedCount || 0), 0);
        
        console.log(`Processing completed! Total entries saved: ${totalSavedEntries}`);

        return {
            success: true,
            message: 'metrics processing completed successfully.',
            data: results,
            totalChunks: results.length,
            totalSavedEntries,
            processingTime: results.reduce((acc, chunk) => acc + (chunk.processingTime || 0), 0)
        };

    } catch (error) {
        console.error('❌ Error in enhanced monthly add report:', error);
        return {
            success: false,
            message: 'An error occurred during enhanced processing.',
            error: error.message
        };
    }
};

function createDateChunks(startDate, endDate, chunkSizeMonths) {
    const chunks = [];
    let currentStart = startDate.clone();

    while (currentStart.isBefore(endDate)) {
        const chunkEnd = moment.min(
            currentStart.clone().add(chunkSizeMonths, 'months'),
            endDate
        );

        chunks.push({
            startDate: currentStart.format('YYYY-MM-DD'),
            endDate: chunkEnd.format('YYYY-MM-DD'),
            id: `chunk-${chunks.length + 1}`
        });

        currentStart = chunkEnd.clone();
    }

    return chunks;
}
async function processChunksInParallel(chunks, brandId, userId, progressCallback) {
    const results = [];
    const { MAX_CONCURRENT_CHUNKS } = PROCESSING_CONFIG;

    // Process chunks in batches to control concurrency
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_CHUNKS) {
        const batch = chunks.slice(i, i + MAX_CONCURRENT_CHUNKS);
        
        console.log(`🔄 Processing batch ${Math.floor(i / MAX_CONCURRENT_CHUNKS) + 1}/${Math.ceil(chunks.length / MAX_CONCURRENT_CHUNKS)}`);
        console.log(`📊 Chunks in this batch: ${batch.map(c => c.id).join(', ')}`);

        // Process batch in parallel with staggered starts
        const batchPromises = batch.map(async (chunk, index) => {
            try {
                // Stagger API calls to avoid rate limiting
                await new Promise(resolve => 
                    setTimeout(resolve, index * PROCESSING_CONFIG.API_DELAY_MS)
                );

                const result = await processChunkWithRetry(chunk, brandId, userId, index);
                
                // Update progress if callback provided
                if (progressCallback) {
                    const totalProcessed = results.length + index + 1;
                    const progressPercent = (totalProcessed / chunks.length) * 100;
                    progressCallback({
                        step: 'processing_chunks',
                        progress: progressPercent,
                        chunk: totalProcessed,
                        totalChunks: chunks.length,
                        currentChunk: chunk.id
                    });
                }

                return result;
            } catch (error) {
                console.error(`❌ Chunk ${chunk.id} failed after retries:`, error);
                return {
                    chunkId: chunk.id,
                    startDate: chunk.startDate,
                    endDate: chunk.endDate,
                    success: false,
                    error: error.message,
                    savedCount: 0
                };
            }
        });

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to be nice to APIs
        if (i + MAX_CONCURRENT_CHUNKS < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return results;
}

// Process individual chunk with retry logic
async function processChunkWithRetry(chunk, brandId, userId, index) {
    let lastError;
    
    for (let attempt = 1; attempt <= PROCESSING_CONFIG.MAX_RETRIES; attempt++) {
        try {
            console.log(`⚡ Processing ${chunk.id} (attempt ${attempt}/${PROCESSING_CONFIG.MAX_RETRIES})`);
            const startTime = Date.now();
            
            const result = await processSingleChunk(chunk, brandId, userId, index);
            
            const processingTime = (Date.now() - startTime) / 1000;
            result.processingTime = processingTime;
            
            console.log(`✅ ${chunk.id} completed in ${processingTime.toFixed(1)}s`);
            return result;
            
        } catch (error) {
            lastError = error;
            console.warn(`⚠️  ${chunk.id} attempt ${attempt} failed:`, error.message);
            
            if (attempt < PROCESSING_CONFIG.MAX_RETRIES) {
                // Exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

// Process a single chunk (enhanced version of your original logic)
async function processSingleChunk(chunk, brandId, userId, index) {
    const { startDate, endDate, id: chunkId } = chunk;

    try {
        // PARALLEL FETCH - All three data sources simultaneously
        const [fbDataResult, shopifySalesData, googleDataResult] = await Promise.all([
            // Facebook data with timeout
            Promise.race([
                monthlyFetchFBAdReport(brandId, userId, startDate, endDate),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('FB API timeout')), 30000)
                )
            ]).catch(err => {
                console.error(`${chunkId} - Error fetching FB data:`, err);
                return { data: [] };
            }),

            // Shopify data with timeout
            Promise.race([
                monthlyFetchTotalSales(brandId, startDate, endDate),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Shopify API timeout')), 30000)
                )
            ]).catch(err => {
                console.error(`${chunkId} - Error fetching Shopify data:`, err);
                return [];
            }),

            // Google data with timeout
            Promise.race([
                monthlyGoogleAdData(brandId, userId, startDate, endDate),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Google API timeout')), 30000)
                )
            ]).catch(err => {
                console.error(`${chunkId} - Error fetching Google data:`, err);
                return { data: [] };
            })
        ]);

        // Validate and process data (same logic as original)
        const fbData = Array.isArray(fbDataResult?.data) ? fbDataResult.data : [];
        const shopifyData = Array.isArray(shopifySalesData) ? shopifySalesData : [];
        const googleData = Array.isArray(googleDataResult?.data) ? googleDataResult.data : [];

        // Create metrics using your original logic but with performance optimizations
        const metricsMap = createOptimizedMetricsMap(fbData, shopifyData, googleData);
        
        // Bulk upsert with optimized batch size
        const savedCount = await bulkUpsertMetrics(brandId, metricsMap);

        return {
            chunkId,
            startDate,
            endDate,
            success: true,
            metrics: Object.fromEntries(metricsMap),
            savedCount,
            dataPoints: {
                facebook: fbData.length,
                shopify: shopifyData.length,
                google: googleData.length
            }
        };

    } catch (error) {
        console.error(`❌ Error processing chunk ${chunkId}:`, error);
        throw error;
    }
}

// Optimized metrics map creation
function createOptimizedMetricsMap(fbData, shopifyData, googleData) {
    const metricsByDate = new Map();

    // Process Shopify data first (create base entries)
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

    // Initialize with Shopify dates
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
    googleData.forEach(entry => {
        if (!entry?.date) return;

        if (!metricsByDate.has(entry.date)) {
            metricsByDate.set(entry.date, {
                totalMetaSpend: 0,
                totalMetaROAS: 0,
                googleSpend: 0,
                googleROAS: 0,
                googleSales: 0
            });
        }

        const metrics = metricsByDate.get(entry.date);
        metrics.googleSpend = parseFloat(entry.googleSpend) || 0;
        metrics.googleROAS = parseFloat(entry.googleRoas) || 0;
        metrics.googleSales = parseFloat(entry.googleSales) || 0;
    });

    // Process Facebook data
    fbData.forEach(account => {
        if (!account?.date) return;

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
    });

    // Ensure at least one entry exists
    if (metricsByDate.size === 0) {
        const today = moment().format('YYYY-MM-DD');
        metricsByDate.set(today, {
            totalMetaSpend: 0,
            totalMetaROAS: 0,
            googleSpend: 0,
            googleROAS: 0,
            googleSales: 0
        });
    }

    return metricsByDate;
}

// Optimized bulk upsert
async function bulkUpsertMetrics(brandId, metricsMap, shopifySalesMap) {
    if (metricsMap.size === 0) return 0;

    // Helper function to get default Shopify data
    const getDefaultShopifyData = () => ({
        totalSales: 0,
        refundAmount: 0,
        shopifySales: 0
    });

    // Create entries using your existing createMetricsEntry function
    const entries = Array.from(metricsMap.entries()).map(([date, metrics]) => {
        const shopifyData = shopifySalesMap.get(date) || getDefaultShopifyData();
        return createMetricsEntry(brandId, date, metrics, shopifyData).toObject();
    });

    if (entries.length === 0) return 0;

    // Process in batches to avoid memory issues with large datasets
    const { BATCH_SIZE } = PROCESSING_CONFIG;
    let totalSaved = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        
        const bulkOps = batch.map(entry => ({
            updateOne: {
                filter: { brandId: entry.brandId, date: entry.date },
                update: { $set: entry },
                upsert: true
            }
        }));

        try {
            const result = await AdMetrics.bulkWrite(bulkOps, { ordered: false });
            totalSaved += result.upsertedCount + result.modifiedCount;
            
            console.log(`💾 Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
        } catch (error) {
            console.error('Batch upsert error:', error);
            // Continue with other batches instead of failing completely
        }
    }

    return totalSaved;
}




const createMetricsEntry = (brandId, date, metrics, shopifyData) => {
    const { totalMetaSpend, totalMetaROAS, googleSpend, googleROAS, googleSales } = metrics;
    const { totalSales, refundAmount, shopifySales } = shopifyData;

    const metaSpend = parseFloat(totalMetaSpend.toFixed(2));
    const metaROAS = parseFloat(totalMetaROAS.toFixed(2));
    const totalSpend = metaSpend + googleSpend;
    const metaSales = metaSpend * metaROAS;
    const adTotalSales = metaSales + googleSales;

    const grossROI = totalSpend > 0 ? adTotalSales / totalSpend : 0;
    const netROI = totalSpend > 0 ? shopifySales / totalSpend : 0;

    return new AdMetrics({
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

        const endDate = new Date();
        const startDate = subYears(startOfDay(endDate), 2);

        console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const existingMetrics = await AdMetrics.findOne({ brandId });

        if (existingMetrics) {
            console.log(`Metrics already exist for brand ${brandId}, skipping initial calculation`);
            return { success: true, message: 'Metrics already exist for this brand' };
        }

        const result = await monthlyAddReportData(brandId, startDate, endDate, userId);

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