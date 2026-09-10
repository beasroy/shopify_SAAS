import axios from 'axios';
import Brand from '../models/Brands.js';

export const fetchInstagramMetrics = async (req, res) => {
    try {
        const { brandId } = req.params;
        const { startDate, endDate, accountId } = req.body;

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        if (!brand.igAccessToken || !brand.igAccountIds || brand.igAccountIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Instagram is not connected for this brand' });
        }

        // Use provided accountId or the first connected account
        const targetAccountId = accountId || brand.igAccountIds[0];
        
        if (!brand.igAccountIds.includes(targetAccountId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized Instagram account for this brand' });
        }

        // 1. Fetch Basic Profile Info
        const profileUrl = `https://graph.facebook.com/v19.0/${targetAccountId}`;
        const profileParams = {
            fields: 'id,name,username,followers_count,media_count,profile_picture_url',
            access_token: brand.igAccessToken
        };
        
        const profileRes = await axios.get(profileUrl, { params: profileParams });
        const profileData = profileRes.data;

        // 2. Fetch Insights (Impressions, Reach, Profile Views)
        // Convert dates to unix timestamps if provided, otherwise default to last 30 days
        const until = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : Math.floor(Date.now() / 1000);
        let since = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : until - (30 * 24 * 60 * 60);

        // Meta Graph API limits the range to 30 days for user insights
        if (until - since > 30 * 24 * 60 * 60) {
            since = until - (30 * 24 * 60 * 60);
        }

        const insightsUrl = `https://graph.facebook.com/v19.0/${targetAccountId}/insights`;
        
        // Call 1: All regular metrics (NO breakdown parameter allowed here)
        const regularInsightsParams = {
            metric: 'reach,profile_views,website_clicks,profile_links_taps,total_interactions,accounts_engaged,views',
            period: 'day',
            metric_type: 'total_value',
            limit: 100,
            since,
            until,
            access_token: brand.igAccessToken
        };

        // Call 2: Follows & Unfollows (Requires breakdown parameter)
        const followsParams = {
            metric: 'follows_and_unfollows',
            period: 'day',
            metric_type: 'total_value',
            breakdown: 'follow_type',
            since,
            until,
            access_token: brand.igAccessToken
        };

        let insightsData = [];
        try {
            const [regularRes, followsRes] = await Promise.allSettled([
                axios.get(insightsUrl, { params: regularInsightsParams }),
                axios.get(insightsUrl, { params: followsParams })
            ]);
            
            insightsData = [
                ...(regularRes.status === 'fulfilled' && regularRes.value.data.data ? regularRes.value.data.data : []),
                ...(followsRes.status === 'fulfilled' && followsRes.value.data.data ? followsRes.value.data.data : [])
            ];
            
            if (regularRes.status === 'rejected') {
                console.warn(`Regular insights failed:`, regularRes.reason?.response?.data || regularRes.reason?.message);
            }
            if (followsRes.status === 'rejected') {
                console.warn(`Follows insights failed:`, followsRes.reason?.response?.data || followsRes.reason?.message);
            }
        } catch (insightsError) {
            console.warn(`Could not fetch insights for IG Account ${targetAccountId}:`, insightsError?.response?.data || insightsError.message);
            // Insights might fail if the account doesn't have enough data or isn't a proper business account with history.
        }

        // Process Insights Data
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

        if (insightsData && insightsData.length > 0) {
            insightsData.forEach(metric => {
                if (metric.name === 'follows_and_unfollows') {
                    // Extract from breakdowns array
                    const results = metric.total_value?.breakdowns?.[0]?.results || [];
                    results.forEach(res => {
                        const dim = res.dimension_values?.[0]?.toUpperCase() || '';
                        if (dim.includes('FOLLOW') && !dim.includes('UN') && !dim.includes('NON')) aggregatedInsights.follows += res.value || 0; // Legacy "follow"
                        if (dim.includes('UNFOLLOW')) aggregatedInsights.unfollows += res.value || 0; // Legacy "unfollow"
                        if (dim === 'NON_FOLLOWER') aggregatedInsights.follows += res.value || 0; // New: NON_FOLLOWER means they followed you
                        if (dim === 'FOLLOWER') aggregatedInsights.unfollows += res.value || 0; // New: FOLLOWER means they unfollowed you
                    });
                } else if (metric.total_value && metric.total_value.value !== undefined) {
                    // Normal total_value metrics
                    aggregatedInsights[metric.name] = metric.total_value.value;
                }
            });
        }

        // Calculate Derived KPIs (Engagement Rate & Net Follower Growth)
        const net_follower_growth = aggregatedInsights.follows - aggregatedInsights.unfollows;
        const engagement_rate = aggregatedInsights.reach > 0 
            ? parseFloat(((aggregatedInsights.total_interactions / aggregatedInsights.reach) * 100).toFixed(2)) 
            : 0;

        // Bundle all KPIs together for the Frontend
        const formattedMetrics = {
            // From Profile API
            followers: profileData.followers_count || 0,
            content_published: profileData.media_count || 0,
            
            // From Insights API
            reach: aggregatedInsights.reach,
            profile_views: aggregatedInsights.profile_views,
            website_clicks: aggregatedInsights.website_clicks,
            profile_links_taps: aggregatedInsights.profile_links_taps,
            link_clicks: aggregatedInsights.website_clicks + aggregatedInsights.profile_links_taps, // Combined as per your list
            engagements: aggregatedInsights.total_interactions, // Same as total_interactions
            accounts_engaged: aggregatedInsights.accounts_engaged,
            views: aggregatedInsights.views,
            followers_gained: aggregatedInsights.follows,
            unfollows: aggregatedInsights.unfollows,

            // Calculated
            net_follower_growth: net_follower_growth,
            engagement_rate: engagement_rate, // Based on Reach
            
            // Deprecated
            impressions: 'Deprecated (Use Reach or Views)'
        };

        return res.status(200).json({
            success: true,
            data: {
                profile: profileData,
                kpis: formattedMetrics,
                rawInsights: insightsData
            }
        });

    } catch (error) {
        console.error('Error fetching Instagram metrics:', error?.response?.data || error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch Instagram metrics',
            error: error?.response?.data?.error?.message || error.message
        });
    }
};
