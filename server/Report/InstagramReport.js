import axios from 'axios';
import Brand from '../models/Brands.js';
import InstagramMetrics from '../models/InstagramMetrics.js';
import moment from 'moment-timezone';

const STORE_TZ = 'Asia/Kolkata';
const IG_API_VERSION = 'v22.0';

const extractMetricValue = (metric) => {
    if (metric?.total_value?.value !== undefined) {
        return Number(metric.total_value.value) || 0;
    }
    // Fallback for period/day time-series responses
    if (Array.isArray(metric?.values) && metric.values.length > 0) {
        return metric.values.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
    }
    return 0;
};

// Helper to fetch metrics for a specific single day
export const syncInstagramMetricsForDay = async (brandId, targetDate) => {
    try {
        const brand = await Brand.findById(brandId);
        if (!brand || !brand.igAccessToken || !brand.igAccountIds || brand.igAccountIds.length === 0) {
            return { success: false, message: 'Instagram not connected' };
        }

        const targetAccountId = brand.igAccountIds[0];

        // Meta treats `until` as exclusive — use start of next day
        const startOfDay = moment.tz(targetDate, STORE_TZ).startOf('day');
        const startOfNextDay = startOfDay.clone().add(1, 'day');
        const since = startOfDay.unix();
        const until = startOfNextDay.unix();

        // 1. Fetch Basic Profile Info (to get current followers)
        const profileUrl = `https://graph.facebook.com/${IG_API_VERSION}/${targetAccountId}`;
        const profileParams = {
            fields: 'followers_count,media_count',
            access_token: brand.igAccessToken
        };
        
        let currentFollowers = 0;
        let currentMediaCount = 0;
        try {
            const profileRes = await axios.get(profileUrl, { params: profileParams });
            currentFollowers = profileRes.data.followers_count || 0;
            currentMediaCount = profileRes.data.media_count || 0;
        } catch (err) {
            console.warn(
                `Could not fetch IG profile for ${brandId}:`,
                err?.response?.data || err.message
            );
        }

        // 2. Fetch Insights for the specific day
        const insightsUrl = `https://graph.facebook.com/${IG_API_VERSION}/${targetAccountId}/insights`;

        // Keep core metrics that are widely supported. Request fragile ones separately
        // so one deprecated metric doesn't zero out the whole day.
        const coreMetrics = 'reach,profile_views,total_interactions,accounts_engaged,views';
        const optionalMetrics = 'website_clicks,profile_links_taps';

        const baseInsightParams = {
            period: 'day',
            metric_type: 'total_value',
            since,
            until,
            access_token: brand.igAccessToken
        };

        const followsParams = {
            metric: 'follows_and_unfollows',
            period: 'day',
            metric_type: 'total_value',
            breakdown: 'follow_type',
            since,
            until,
            access_token: brand.igAccessToken
        };

        const [coreRes, optionalRes, followsRes] = await Promise.allSettled([
            axios.get(insightsUrl, { params: { ...baseInsightParams, metric: coreMetrics } }),
            axios.get(insightsUrl, { params: { ...baseInsightParams, metric: optionalMetrics } }),
            axios.get(insightsUrl, { params: followsParams })
        ]);

        if (coreRes.status === 'rejected') {
            console.warn(
                `IG core insights failed for ${brandId} on ${targetDate}:`,
                coreRes.reason?.response?.data || coreRes.reason?.message
            );
        }
        if (optionalRes.status === 'rejected') {
            console.warn(
                `IG optional insights failed for ${brandId} on ${targetDate}:`,
                optionalRes.reason?.response?.data || optionalRes.reason?.message
            );
        }
        if (followsRes.status === 'rejected') {
            console.warn(
                `IG follows insights failed for ${brandId} on ${targetDate}:`,
                followsRes.reason?.response?.data || followsRes.reason?.message
            );
        }

        let insightsData = [
            ...(coreRes.status === 'fulfilled' && coreRes.value.data.data ? coreRes.value.data.data : []),
            ...(optionalRes.status === 'fulfilled' && optionalRes.value.data.data ? optionalRes.value.data.data : []),
            ...(followsRes.status === 'fulfilled' && followsRes.value.data.data ? followsRes.value.data.data : [])
        ];

        // Process Data
        const aggregatedInsights = {
            reach: 0,
            profile_views: 0,
            website_clicks: 0,
            profile_links_taps: 0,
            total_interactions: 0,
            accounts_engaged: 0,
            views: 0,
            follows: 0,
            unfollows: 0
        };

        insightsData.forEach(metric => {
            if (metric.name === 'follows_and_unfollows') {
                const results = metric.total_value?.breakdowns?.[0]?.results || [];
                results.forEach(res => {
                    const dim = res.dimension_values?.[0]?.toUpperCase() || '';
                    if (dim.includes('FOLLOW') && !dim.includes('UN') && !dim.includes('NON')) aggregatedInsights.follows += res.value || 0;
                    if (dim.includes('UNFOLLOW')) aggregatedInsights.unfollows += res.value || 0;
                    if (dim === 'NON_FOLLOWER') aggregatedInsights.follows += res.value || 0;
                    if (dim === 'FOLLOWER') aggregatedInsights.unfollows += res.value || 0;
                });
            } else if (metric.name && Object.prototype.hasOwnProperty.call(aggregatedInsights, metric.name)) {
                aggregatedInsights[metric.name] = extractMetricValue(metric);
            } else if (metric.name === 'total_interactions') {
                aggregatedInsights.total_interactions = extractMetricValue(metric);
            }
        });

        const net_follower_growth = aggregatedInsights.follows - aggregatedInsights.unfollows;
        const engagement_rate = aggregatedInsights.reach > 0 
            ? parseFloat(((aggregatedInsights.total_interactions / aggregatedInsights.reach) * 100).toFixed(2)) 
            : 0;

        const updateData = {
            followers: currentFollowers, // NOTE: this is always the current followers, not historical.
            content_published: currentMediaCount,
            reach: aggregatedInsights.reach,
            profile_views: aggregatedInsights.profile_views,
            website_clicks: aggregatedInsights.website_clicks,
            profile_links_taps: aggregatedInsights.profile_links_taps,
            link_clicks: aggregatedInsights.website_clicks + aggregatedInsights.profile_links_taps,
            engagements: aggregatedInsights.total_interactions,
            accounts_engaged: aggregatedInsights.accounts_engaged,
            views: aggregatedInsights.views,
            followers_gained: aggregatedInsights.follows,
            unfollows: aggregatedInsights.unfollows,
            net_follower_growth,
            engagement_rate
        };

        // Upsert the daily record
        const startOfDayDate = startOfDay.toDate();
        
        await InstagramMetrics.findOneAndUpdate(
            { brandId: brand._id, date: startOfDayDate },
            { $set: updateData },
            { upsert: true, new: true }
        );

        return { success: true, date: startOfDayDate, metrics: updateData };
    } catch (error) {
        console.error(`Error syncing IG metrics for brand ${brandId} on ${targetDate}:`, error.message);
        return { success: false, error: error.message };
    }
};

// Cron job function
export const syncYesterdayInstagramMetricsForAllBrands = async () => {
    try {
        const brands = await Brand.find({ 
            igAccessToken: { $exists: true, $ne: null },
            igAccountIds: { $exists: true, $not: {$size: 0} }
        });
        
        // Yesterday
        const yesterday = moment().tz(STORE_TZ).subtract(1, 'days').format('YYYY-MM-DD');
        
        for (const brand of brands) {
            await syncInstagramMetricsForDay(brand._id, yesterday);
            // small delay to prevent rate limits
            await new Promise(res => setTimeout(res, 500));
        }
        console.log(`Successfully synced Instagram metrics for ${brands.length} brands for ${yesterday}`);
    } catch (error) {
        console.error("Failed to sync yesterday's Instagram metrics:", error);
    }
};

// Backfill function (up to 30 days natively easily).
// Awaited by connect + dashboard so metrics are available immediately.
export const backfillInstagramMetrics = async (brandId, daysToBackfill = 30) => {
    console.log(`Starting backfill for ${brandId} for last ${daysToBackfill} days`);
    for (let i = 1; i <= daysToBackfill; i++) {
        const targetDate = moment().tz(STORE_TZ).subtract(i, 'days').format('YYYY-MM-DD');
        await syncInstagramMetricsForDay(brandId, targetDate);
        // Short delay to stay under Meta rate limits without slowing connect too much
        if (i < daysToBackfill) {
            await new Promise(res => setTimeout(res, 150));
        }
    }
    console.log(`Completed backfill for ${brandId}`);
};
