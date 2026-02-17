import { config } from "dotenv";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
import axios from "axios";
import AdMetrics from "../models/AdMetrics.js";
import { GoogleAdsApi } from "google-ads-api";
import moment from 'moment-timezone';
import { monthlyFetchTotalSalesGraphQL } from './MonthlyReportGraphQL.js';
import { createRedisConnection } from '../config/redis.js';
import {   getRefundsForDateRange } from '../utils/refundHelpers.js';
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

export const monthlyFetchFBAdReport = async (brandId, startDate, endDate) => {
    try {
        // Validate and convert input dates to Moment objects
        const start = moment(startDate);
        const end = moment(endDate);

        if (!start.isValid() || !end.isValid()) {
            throw new Error('Invalid date format provided');
        }

        const brand = await Brand.findById(brandId).lean();

        if (!brand) {
            return {
                success: false,
                message: 'Brand not found.',
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

        const accessToken = brand.fbAccessToken;
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
                    const requestUrl = `${accountId}/insights?fields=spend,action_values&time_range={"since":"${formattedDay}","until":"${formattedDay}"}`;
                    batchRequests.push({ method: 'GET', relative_url: requestUrl });
                    requestDates.push({ accountId, date: currentDay.clone() });
                });

                // Process batch if limit reached or last day
                if (batchRequests.length >= 50 || currentDay.isSame(chunkEnd)) {
                    try {
                        const response = await axios.post(
                            'https://graph.facebook.com/v22.0/',
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
                                        // Extract revenue from action_values
                                        const revenue = insight.action_values?.find((action) => action.action_type === 'purchase')?.value || '0';
                                        
                                        results.push({
                                            adAccountId: accountId,
                                            date: formattedDate,
                                            spend: insight.spend || '0',
                                            revenue: revenue
                                        });
                                    } else {
                                        results.push({
                                            adAccountId: accountId,
                                            date: formattedDate,
                                            spend: '0',
                                            revenue: '0'
                                        });
                                    }
                                } catch (parseError) {
                                    console.error(`Error parsing response for ${accountId} on ${formattedDate}:`, parseError);
                                    results.push({
                                        adAccountId: accountId,
                                        date: formattedDate,
                                        spend: '0',
                                        revenue: '0'
                                    });
                                }
                            } else {
                                console.error(`Error for account ${accountId} on ${formattedDate}:`, res.body);
                                results.push({
                                    adAccountId: accountId,
                                    date: formattedDate,
                                    spend: '0',
                                    revenue: '0'
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
                                revenue: '0'
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

        console.log(`Facebook Ad data processed: ${results.length} dates`);
        console.log(results);

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

export const monthlyGoogleAdData = async (brandId, startDate, endDate) => {
    try {
        const brand = await Brand.findById(brandId).lean();

        if (!brand) {
            return {
                success: false,
                message: 'Brand not found.',
            };
        }

        const refreshToken = brand.googleAdsRefreshToken;
        if (!refreshToken) {
            return {
                success: false,
                message: 'No refresh token found for this brand.',
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

            // Create client for this account - will be recreated if token expires
            let client = new GoogleAdsApi({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
                refresh_token: refreshToken,
            });

            // Create customer object
            let customer = client.Customer({
                customer_id: adAccountId,
                refresh_token: refreshToken,
                login_customer_id: managerId,
            });

            let currentDate = moment(startDate);
            const end = moment(endDate);

            while (currentDate.isSameOrBefore(end)) {
                const formattedDate = currentDate.format('YYYY-MM-DD');
                let retryCount = 0;
                const maxRetries = 2;
                let success = false;

                while (retryCount <= maxRetries && !success) {
                    try {
                        console.log(`Fetching data for account ${adAccountId} on date ${formattedDate}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
                        
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
                        
                        success = true;

                    } catch (error) {
                        const isAuthError = error.code === 2 || 
                                          error.code === 16 || 
                                          error.message?.includes('UNAUTHENTICATED') ||
                                          error.message?.includes('invalid_request') ||
                                          error.message?.includes('authentication credential');
                        
                        console.error(`Error fetching data for account ${adAccountId} on date ${formattedDate}:`, error);
                        console.error('Error details:', {
                            code: error.code,
                            message: error.message,
                            details: error.details,
                            metadata: error.metadata
                        });
                        
                        // If it's an authentication error, try to recreate the entire client to force fresh token refresh
                        if (isAuthError && retryCount < maxRetries) {
                            console.log(`Authentication error detected (code: ${error.code}). Recreating client and customer object to force token refresh...`);
                            
                            // Recreate the entire client - this forces a fresh token refresh
                            client = new GoogleAdsApi({
                                client_id: process.env.GOOGLE_CLIENT_ID,
                                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                                developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
                                refresh_token: refreshToken,
                            });
                            
                            // Recreate the customer object with the new client
                            customer = client.Customer({
                                customer_id: adAccountId,
                                refresh_token: refreshToken,
                                login_customer_id: managerId,
                            });
                            
                            retryCount++;
                            
                            // Wait a bit before retrying to allow token refresh
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            continue;
                        }
                        
                        // If it's an authentication error and we've exhausted retries, break out of the loop for this account
                        if (isAuthError) {
                            console.error(`Authentication error for account ${adAccountId} after ${maxRetries} retries, skipping remaining dates`);
                            break;
                        }
                        
                        // For non-auth errors, log and continue to next date
                        console.warn(`Non-authentication error for account ${adAccountId} on date ${formattedDate}, continuing to next date`);
                        break;
                    }
                }
                
                // If we broke out due to auth error after retries, exit the date loop
                if (!success && retryCount > maxRetries) {
                    const isAuthError = true; // We know it was auth error if we exhausted retries
                    if (isAuthError) {
                        break;
                    }
                }

                // Add small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
                
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

export const monthlyAddReportData = async (brandId, startDate, endDate) => {
    try {
        if (!brandId || !startDate || !endDate) {
            throw new Error('Missing required parameters');
        }

        // Fetch brand to get timezone and other settings
        const brand = await Brand.findById(brandId);
        if (!brand) {
            throw new Error('Brand not found');
        }

        const currentStart = moment(startDate);
        const finalEnd = moment(endDate);

        // Validate input dates
        if (!currentStart.isValid() || !finalEnd.isValid()) {
            throw new Error('Invalid date format provided');
        }

        console.log(`Processing range: ${currentStart.format('YYYY-MM-DD')} to ${finalEnd.format('YYYY-MM-DD')}`);

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
                        monthlyFetchFBAdReport(brandId, chunk.start, chunk.end)
                            .catch(err => {
                                console.error('Error fetching FB data:', err);
                                return { data: [] };
                            }),
                        monthlyFetchTotalSalesGraphQL(brandId, chunk.start, chunk.end)
                            .catch(err => {
                                console.error('Error fetching Shopify data:', err);
                                return [];
                            }),
                        monthlyGoogleAdData(brandId, chunk.start, chunk.end)
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
                    
                    // Get store timezone from Shopify API (not stored in brand model)
                    let storeTimezone = 'UTC';
                    try {
                        const cleanShopName = brand.shopifyAccount?.shopName?.replace(/^https?:\/\//, '').replace(/\/$/, '');
                        if (cleanShopName && brand.shopifyAccount?.shopifyAccessToken) {
                            const shopResponse = await axios.get(
                                `https://${cleanShopName}/admin/api/2024-04/shop.json`,
                                {
                                    headers: { 'X-Shopify-Access-Token': brand.shopifyAccount.shopifyAccessToken },
                                    timeout: 30000,
                                }
                            );
                            storeTimezone = shopResponse.data.shop.iana_timezone || 'UTC';
                        }
                    } catch (error) {
                        console.warn('⚠️  Could not fetch store timezone, using UTC:', error.message);
                    }
                    
                    const refundsFromModel = await getRefundsForDateRange(brandId, chunk.start, chunk.end, storeTimezone);
                    
                    const shopifySalesMap = new Map(
                        shopifyData.map(sale => {
                            const date = sale.date;
                            // Get refund amount from OrderRefund model (includes both historical refunds and webhook refunds)
                            // Note: Don't use sale.refundAmount as it's already stored in OrderRefund model
                            const refundAmount = refundsFromModel.get(date) || 0;
                            
                            return [
                                date,
                                {
                                    totalSales: Number.parseFloat(sale.totalSales) || 0,
                                    refundAmount: refundAmount,
                                    codOrderCount: Number.parseInt(sale.codOrderCount, 10) || 0,
                                    prepaidOrderCount: Number.parseInt(sale.prepaidOrderCount, 10) || 0,
                                }
                            ];
                        })
                    );
                    
                    // Also add refunds for dates that might not be in shopifyData but have webhook refunds
                    refundsFromModel.forEach((refundAmount, date) => {
                        if (!shopifySalesMap.has(date)) {
                            shopifySalesMap.set(date, {
                                totalSales: 0,
                                refundAmount: refundAmount,
                                codOrderCount: 0,
                                prepaidOrderCount: 0,
                            });
                        }
                    });

                    // Initialize metricsByDate with Shopify data
                    shopifySalesMap.forEach((value, date) => {
                        metricsByDate.set(date, {
                            totalMetaSpend: 0,
                            totalMetaRevenue: 0,
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
                                totalMetaRevenue: 0,
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

                    // Process Facebook data - aggregate spend and revenue across all accounts
                    for (const account of fbData) {
                        if (!account?.date) continue;
                        const { date, spend, revenue } = account;

                        if (!metricsByDate.has(date)) {
                            metricsByDate.set(date, {
                                totalMetaSpend: 0,
                                totalMetaRevenue: 0,
                                googleSpend: 0,
                                googleROAS: 0,
                                googleSales: 0
                            });
                        }

                        const metrics = metricsByDate.get(date);
                        metrics.totalMetaSpend += parseFloat(spend) || 0;
                        metrics.totalMetaRevenue += parseFloat(revenue) || 0;
                    }

                    // Create entries for bulk write
                    const entries = Array.from(metricsByDate.entries()).map(([date, metrics]) => {
                        const shopifyData = shopifySalesMap.get(date) || {
                            totalSales: 0,
                            refundAmount: 0,
                            codOrderCount: 0,
                            prepaidOrderCount: 0,
                        };
                        const entryObj = createMetricsEntry(brandId, date, metrics, shopifyData).toObject();
                        delete entryObj._id;
                        return entryObj;
                    });

                    // Perform bulk write
                    if (entries.length > 0) {
                        console.log(`🔍 DEBUG: About to bulk write ${entries.length} entries for chunk ${chunk.start} to ${chunk.end}`);
                        console.log(`🔍 DEBUG: Sample entry:`, JSON.stringify(entries[0], null, 2));
                        
                        const bulkOps = entries.map(entry => ({
                            updateOne: {
                                filter: { brandId: entry.brandId, date: entry.date },
                                update: { $set: entry },
                                upsert: true
                            }
                        }));
                        console.log(`🔍 DEBUG: Bulk ops sample:`, JSON.stringify(bulkOps[0], null, 2));

                        await AdMetrics.bulkWrite(bulkOps, { ordered: false });
                        console.log(`Bulk upserted ${bulkOps.length} metrics entries for chunk ${chunk.start} to ${chunk.end}`);
                    }else {
                        console.log(`⚠️ No entries to save for chunk ${chunk.start} to ${chunk.end}`)
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

    const { totalMetaSpend, totalMetaRevenue, googleSpend, googleROAS, googleSales } = metrics;
    const { totalSales, refundAmount, codOrderCount = 0, prepaidOrderCount = 0 } = shopifyData;

    const metaSpend = Number.parseFloat(totalMetaSpend.toFixed(2));
    const metaRevenue = Number.parseFloat(totalMetaRevenue.toFixed(2));
    const totalSpend = metaSpend + googleSpend;
    
    const adTotalSales = metaRevenue + googleSales;

    const grossROI = totalSpend > 0 ? adTotalSales / totalSpend : 0;

    const entry = new AdMetrics({
        brandId,
        date: new Date(date), // Ensure UTC date
        metaSpend,
        metaRevenue,
        googleSpend,
        googleROAS,
        googleSales,
        totalSales,
        refundAmount,
        codOrderCount: Number.parseInt(codOrderCount, 10) || 0,
        prepaidOrderCount: Number.parseInt(prepaidOrderCount, 10) || 0,
        totalSpend: totalSpend.toFixed(2),
        grossROI: grossROI.toFixed(2),
    });

    console.log('Created metrics entry:', entry.toObject());
    return entry;
};

export const monthlyCalculateMetricsForAllBrands = async (startDate, endDate) => {
    try {
        const brands = await Brand.find({});
        console.log(`Found ${brands.length} brands for metrics calculation.`);

        const metricsPromises = brands.map(async (brand) => {
            const brandIdString = brand._id.toString();
            console.log(`Starting metrics processing for brand: ${brandIdString}`);

            try {
                const result = await monthlyAddReportData(brandIdString, startDate, endDate);
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

        console.log(`Date range for ad metrics: ${startDate.toISOString()} to ${endDate.toISOString()}`);
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

        console.log('Starting monthlyAddReportData...');
        
        // Calculate metrics for the date range
        const result = await monthlyAddReportData(brandId, startDate, endDate);
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

        console.log(`Brand creation date: ${brandCreatedAt.toISOString()}`);
        console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

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
                const result = await monthlyAddReportData(brandId, startDate, endDate);
                
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
            const shopifySalesData = await monthlyFetchTotalSalesGraphQL(brandId, startDate, endDate);
            
            if (!shopifySalesData || shopifySalesData.length === 0) {
                console.log('No Shopify sales data returned, skipping update');
                return { success: true, message: 'No Shopify sales data to update' };
            }

            // Get store timezone from Shopify API (not stored in brand model)
            let storeTimezone = 'UTC';
            try {
                const cleanShopName = brand.shopifyAccount?.shopName?.replace(/^https?:\/\//, '').replace(/\/$/, '');
                if (cleanShopName && brand.shopifyAccount?.shopifyAccessToken) {
                    const shopResponse = await axios.get(
                        `https://${cleanShopName}/admin/api/2024-04/shop.json`,
                        {
                            headers: { 'X-Shopify-Access-Token': brand.shopifyAccount.shopifyAccessToken },
                            timeout: 30000,
                        }
                    );
                    storeTimezone = shopResponse.data.shop.iana_timezone || 'UTC';
                }
            } catch (error) {
                console.warn('⚠️  Could not fetch store timezone, using UTC:', error.message);
            }
            
            const refundsFromModel = await getRefundsForDateRange(brandId, startDate, endDate, storeTimezone);

            // Create a map of Shopify data by date for easy lookup
            const shopifyDataMap = new Map();
            shopifySalesData.forEach(sale => {
                // Use refunds from OrderRefund model (single source of truth)
                // Don't use sale.refundAmount as it's already stored in OrderRefund model
                const refundAmount = refundsFromModel.get(sale.date) || 0;
                shopifyDataMap.set(sale.date, {
                    totalSales: parseFloat(sale.totalSales) || 0,
                    refundAmount: refundAmount
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
                    };

                    // Recalculate ROI metrics based on existing ad spend data
                    const totalSpend = (existingMetric.metaSpend || 0) + (existingMetric.googleSpend || 0);
                    const metaSales = (existingMetric.metaSpend || 0) * (existingMetric.metaROAS || 0);
                    const adTotalSales = metaSales + (existingMetric.googleSales || 0);
                    const grossROI = totalSpend > 0 ? adTotalSales / totalSpend : 0;
                

                    updatedMetric.grossROI = grossROI.toFixed(2);
                  

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
                const result = await monthlyAddReportData(brandId, startDate, endDate);
                
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
                const fbResult = await monthlyFetchFBAdReport(brandId, startDate, endDate);
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
                const googleResult = await monthlyGoogleAdData(brandId, startDate, endDate);
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
                        newMetaROAS += parseFloat(entry.revenue) || 0;
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
                

                    updatedMetric.totalSpend = totalSpend.toFixed(2);
                    updatedMetric.grossROI = grossROI.toFixed(2);
                 

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








