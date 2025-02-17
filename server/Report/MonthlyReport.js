import { config } from "dotenv";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
import Shopify from 'shopify-api-node'
import axios from "axios";
import AdMetrics from "../models/AdMetrics.js";
import { GoogleAdsApi } from "google-ads-api";
import moment from 'moment-timezone';
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
        });

        // Get store timezone from Shopify shop data
        const shopData = await shopify.shop.get();
        const storeTimezone = shopData.iana_timezone || 'UTC';
        console.log('Store timezone:', storeTimezone);

        // Initialize daily sales data structure using store's timezone
        const dailySalesMap = {};
        let currentDay = moment.tz(startDate, storeTimezone).startOf('day');
        const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

        // Initialize data structure for all days in range
        while (currentDay.isSameOrBefore(endMoment)) {
            const dateStr = currentDay.format('YYYY-MM-DD');
            dailySalesMap[dateStr] = {
                date: dateStr,
                grossSales: 0,
                refundAmount: 0,
                orderCount: 0
            };
            currentDay.add(1, 'day');
        }

        // Reset currentDay for order fetching
        currentDay = moment.tz(startDate, storeTimezone).startOf('day');

        // Store all orders that have refunds for later analysis
        let ordersWithRefunds = [];

        while (currentDay.isSameOrBefore(endMoment)) {
            const startOfDayISO = currentDay.clone().startOf('day').toISOString();
            const endOfDayISO = currentDay.clone().endOf('day').toISOString();

            console.log('Fetching for date range:', startOfDayISO, endOfDayISO);

            const queryParams = {
                status: 'any',
                created_at_min: startOfDayISO,
                created_at_max: endOfDayISO,
                limit: 250,
                fields: 'id,created_at,total_price,refunds' // Specify fields to ensure we get refunds
            };

            let hasNextPage = true;
            let pageInfo;
            let orders = [];

            while (hasNextPage) {
                if (pageInfo) {
                    queryParams.page_info = pageInfo;
                } else {
                    delete queryParams.page_info;
                }

                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const response = await shopify.order.list(queryParams);
                    if (!response || response.length === 0) {
                        break;
                    }

                    // Store orders with refunds for analysis
                    const ordersWithRefundsFromResponse = response.filter(order => 
                        order.refunds && order.refunds.length > 0
                    );
                    ordersWithRefunds = ordersWithRefunds.concat(ordersWithRefundsFromResponse);

                    orders = orders.concat(response);
                    pageInfo = response.nextPageParameters?.page_info || null;
                    hasNextPage = !!pageInfo;
                } catch (error) {
                    console.error('Error while fetching orders:', error);
                    if (error.statusCode === 429) {
                        console.warn('Rate limit reached, retrying in 2 seconds...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        continue;
                    }
                    throw new Error(`Error fetching orders: ${error.message}`);
                }
            }

            // Process orders and their refunds
            orders.forEach(order => {
                const orderDate = moment.tz(order.created_at, storeTimezone).format('YYYY-MM-DD');
                const orderAmount = Number(order.total_price || 0);

                // Log orders for January 9th
                if (orderDate === '2025-02-04') {
                    console.log('\nFound order for Jan 9th:', {
                        order_id: order.id,
                        created_at: order.created_at,
                        total_price: orderAmount,
                        has_refunds: order.refunds && order.refunds.length > 0,
                        refunds_count: order.refunds ? order.refunds.length : 0
                    });
                }

                if (dailySalesMap[orderDate]) {
                    dailySalesMap[orderDate].grossSales += orderAmount;
                    dailySalesMap[orderDate].orderCount += 1;
                }

                if (order.refunds && order.refunds.length > 0) {
                    order.refunds.forEach(refund => {
                        const refundDate = moment.tz(refund.created_at, storeTimezone).format('YYYY-MM-DD');
                        
                        // Log all refund processing attempts
                        console.log('\nProcessing refund:', {
                            order_id: order.id,
                            refund_id: refund.id,
                            created_at: refund.created_at,
                            refund_date: refundDate,
                            line_items: refund.refund_line_items.length,
                            transactions: refund.transactions ? refund.transactions.length : 0
                        });

                        // Calculate both line items and transaction amounts
                        const lineItemAmount = refund.refund_line_items.reduce((sum, item) => {
                            return sum + Number(item.subtotal_set.shop_money.amount || 0);
                        }, 0);

                        const transactionAmount = refund.transactions ? refund.transactions.reduce((sum, trans) => {
                            return sum + Number(trans.amount || 0);
                        }, 0) : 0;

                        const refundAmount = Math.max(lineItemAmount, transactionAmount);

                        console.log('Refund amounts calculated:', {
                            line_item_amount: lineItemAmount,
                            transaction_amount: transactionAmount,
                            final_refund_amount: refundAmount
                        });

                        if (dailySalesMap[refundDate]) {
                            dailySalesMap[refundDate].refundAmount += refundAmount;
                            console.log(`Updated refund total for ${refundDate}: ${dailySalesMap[refundDate].refundAmount}`);
                        }
                    });
                }
            });

            currentDay.add(1, 'day');
        }

        // Log all orders with refunds found during the entire period
        console.log('\nAll orders with refunds found:', ordersWithRefunds.map(order => ({
            order_id: order.id,
            created_at: order.created_at,
            refunds: order.refunds.map(refund => ({
                refund_id: refund.id,
                created_at: refund.created_at,
                amount: refund.refund_line_items.reduce((sum, item) => 
                    sum + Number(item.subtotal_set.shop_money.amount || 0), 0
                )
            }))
        })));

        const dailySales = Object.values(dailySalesMap).map(day => ({
            ...day,
            shopifySales: Number((day.grossSales - day.refundAmount).toFixed(2)),
            totalSales: Number(day.grossSales.toFixed(2)),
            refundAmount: Number(day.refundAmount.toFixed(2))
        }));

        return dailySales;

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
        ])
        if (!brand || !user) {
            return {
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            };
        }

        const adAccountId = brand.googleAdAccount;
        if (!adAccountId) {
            return {
                success: false,
                message: 'No Google Ads accounts found for this brand.',
                data: [],
            };
        }

        const refreshToken = user.googleRefreshToken;
        if (!refreshToken) {
            return {
                success: false,
                message: 'No refresh token found for this user.',
                data: [],
            };
        }

        const client = new GoogleAdsApi({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
            refresh_token: refreshToken,
        });

        const customer = client.Customer({
            customer_id: adAccountId,
            refresh_token: refreshToken,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const metricsByDate = [];

        let currentDate = moment(startDate);
        const end = moment(endDate);

        while (currentDate.isSameOrBefore(end)) {
            const formattedDate = currentDate.format('YYYY-MM-DD');
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
            const googleRoas = totalSpend > 0 ? (totalConversionsValue / totalSpend) : 0;
            const totalSales = googleRoas * totalSpend || 0;
            metricsByDate.push({
                date: formattedDate,
                googleSpend: totalSpend.toFixed(2),
                googleRoas: googleRoas.toFixed(2),
                googleSales: totalSales.toFixed(2),
            });
            currentDate = currentDate.add(1, 'day');
        }
        console.log(metricsByDate)
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

        const results = [];
        const currentStart = moment(startDate);
        const finalEnd = moment(endDate);

        // Validate input dates
        if (!currentStart.isValid() || !finalEnd.isValid()) {
            throw new Error('Invalid date format provided');
        }

        // Process data in chunks of 3 months
        for (let chunkStart = currentStart.clone(); chunkStart.isBefore(finalEnd);) {
            let chunkEnd = moment.min(chunkStart.clone().add(3, 'months'), finalEnd);

            const formattedStart = chunkStart.format('YYYY-MM-DD');
            const formattedEnd = chunkEnd.format('YYYY-MM-DD');

            console.log(`Processing chunk: ${formattedStart} to ${formattedEnd}`);

            try {
                // Parallel fetch of all data sources with validation
                const [fbDataResult, shopifySalesData, googleDataResult] = await Promise.all([
                    monthlyFetchFBAdReport(brandId, userId, formattedStart, formattedEnd)
                        .catch(err => {
                            console.error('Error fetching FB data:', err);
                            return { data: [] };
                        }),
                    monthlyFetchTotalSales(brandId, formattedStart, formattedEnd)
                        .catch(err => {
                            console.error('Error fetching Shopify data:', err);
                            return [];
                        }),
                    monthlyGoogleAdData(brandId, userId, formattedStart, formattedEnd)
                        .catch(err => {
                            console.error('Error fetching Google data:', err);
                            return { data: [] };
                        })
                ]);

                // Validate response structures
                const fbData = Array.isArray(fbDataResult?.data) ? fbDataResult.data : [];
                const shopifyData = Array.isArray(shopifySalesData) ? shopifySalesData : [];
                const googleData = Array.isArray(googleDataResult?.data) ? googleDataResult.data : [];

                // Create lookup maps
                const metricsByDate = new Map();

                // Process Shopify data
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

                // Process Facebook data and merge with other sources
                for (const account of fbData) {
                    if (!account?.date) continue; // Skip invalid entries

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

                    // Merge Google data if available
                    const googleMetrics = googleDataMap.get(date);
                    if (googleMetrics) {
                        metrics.googleSpend = googleMetrics.googleSpend;
                        metrics.googleROAS = googleMetrics.googleROAS;
                        metrics.googleSales = googleMetrics.googleSales;
                    }
                }

                // Save metrics for each date
                const savePromises = Array.from(metricsByDate.entries()).map(async ([date, metrics]) => {
                    try {
                        const shopifyData = shopifySalesMap.get(date) || getDefaultShopifyData();
                        const metricsEntry = createMetricsEntry(brandId, date, metrics, shopifyData);

                        await metricsEntry.save();
                        console.log(`Metrics entry saved for date: ${date}`);
                        return metricsEntry;
                    } catch (err) {
                        console.error(`Failed to save metrics for date ${date}:`, err);
                        return null;
                    }
                });

                const savedEntries = await Promise.all(savePromises);
                const validEntries = savedEntries.filter(entry => entry !== null);

                if (validEntries.length === 0) {
                    console.warn(`No valid entries saved for chunk ${formattedStart} to ${formattedEnd}`);
                }

                results.push({
                    startDate: formattedStart,
                    endDate: formattedEnd,
                    metrics: Object.fromEntries(metricsByDate),
                    savedCount: validEntries.length
                });

            } catch (chunkError) {
                console.error(`Error processing chunk ${formattedStart} to ${formattedEnd}:`, chunkError);
                continue; // Continue with the next chunk instead of failing completely
            }

            // Move chunkStart forward to next period
            chunkStart = chunkEnd.clone();
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

// Helper functions
const getDefaultShopifyData = () => ({
    totalSales: 0,
    refundAmount: 0,
    shopifySales: 0
});

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