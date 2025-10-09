import axios from "axios";
import Brand from "../models/Brands.js";
import { connection as redis } from "../config/redis.js";

// Cache TTL in seconds (1 hour for creative data)
const CACHE_TTL = 3600;

// Helper function to control concurrency
const pLimit = (concurrency) => {
  const queue = [];
  let activeCount = 0;

  const run = async (fn) => {
    activeCount++;
    try {
      return await fn();
    } finally {
      activeCount--;
      if (queue.length > 0) {
        const next = queue.shift();
        run(next.fn).then(next.resolve, next.reject);
      }
    }
  };

  return (fn) => {
    return new Promise((resolve, reject) => {
      if (activeCount < concurrency) {
        run(fn).then(resolve, reject);
      } else {
        queue.push({ fn, resolve, reject });
      }
    });
  };
};

// Optimized: Process ad into creative format
const processAdToCreative = (ad) => {
  const creative = ad.adcreatives?.data?.[0]?.object_story_spec;
  const creativeId = ad.adcreatives?.data?.[0]?.id || null;
  const insights = ad.insights?.data?.[0] || {};
  const roasObj = insights.purchase_roas?.find(r => r.action_type === "purchase");
  const roas = roasObj ? parseFloat(roasObj.value) : 0;
  const orders = insights.actions?.find(a => a.action_type === "purchase")?.value || 0;

  let creativeType = "unknown";
  let creativeUrl = null;
  let thumbnailUrl = ad.adcreatives?.data?.[0]?.thumbnail_url || null;
  let videoId = null;

  if (creative?.video_data) {
    creativeType = "video";
    videoId = creative.video_data.video_id;
    creativeUrl = videoId;
  } else if (creative?.link_data?.picture) {
    creativeType = "image";
    creativeUrl = creative.link_data.picture;
  }

  return {
    ad_id: ad.id,
    ad_name: ad.name,
    creative_type: creativeType,
    creative_url: creativeUrl,
    thumbnail_url: thumbnailUrl,
    spend: parseFloat(insights.spend || 0),
    ctr: parseFloat(insights.ctr || 0),
    clicks: parseInt(insights.clicks || 0, 10),
    roas,
    orders: parseInt(orders, 10),
    videoId, // Temporary field for video processing
    creativeId // Temporary field for thumbnail fetching
  };
};

// Optimized: Fetch video sources in parallel batches
const fetchVideoSourcesBatch = async (videoIds, accessToken) => {
  if (!videoIds.length) return new Map();

  // Remove duplicates
  const uniqueVideoIds = [...new Set(videoIds)];
  
  // Split into chunks of 50 (Facebook batch limit)
    const chunks = [];
  for (let i = 0; i < uniqueVideoIds.length; i += 50) {
    chunks.push(uniqueVideoIds.slice(i, i + 50));
  }

  // Process all chunks in parallel
  const videoDetailsArrays = await Promise.all(
    chunks.map(async (chunk) => {
      try {
      const batchRequests = chunk.map(id => ({
        method: "GET",
        relative_url: `${id}?fields=source,thumbnails`
      }));
  
      const { data: batchResponse } = await axios.post(
          `https://graph.facebook.com/v24.0/`,
        { batch: JSON.stringify(batchRequests) },
        { params: { access_token: accessToken } }
      );
  
        const details = [];
      batchResponse.forEach(item => {
        try {
            if (item.code === 200 && item.body) {
          const body = JSON.parse(item.body);
              details.push({
            id: body.id,
            source: body.source,
            thumbnail: body.thumbnails?.data?.[0]?.uri || null
          });
            }
          } catch (error) {
            console.error("Error parsing video response:", error.message);
          }
        });
        
        return details;
      } catch (error) {
        console.error("Error fetching video batch:", error.message);
        return [];
      }
    })
  );

  // Convert to Map for O(1) lookups
  const videoMap = new Map();
  videoDetailsArrays.flat().forEach(video => {
    videoMap.set(video.id, video);
  });

  return videoMap;
};

// Fetch custom-sized thumbnails for creatives
const fetchCreativeThumbnails = async (creativeIds, accessToken, width, height) => {
  if (!creativeIds.length) return new Map();

  // Remove duplicates
  const uniqueCreativeIds = [...new Set(creativeIds)];
  
  // Split into chunks of 50 (Facebook batch limit)
  const chunks = [];
  for (let i = 0; i < uniqueCreativeIds.length; i += 50) {
    chunks.push(uniqueCreativeIds.slice(i, i + 50));
  }

  // Process all chunks in parallel
  const thumbnailArrays = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const batchRequests = chunk.map(id => ({
          method: "GET",
          relative_url: `${id}?fields=thumbnail_url&thumbnail_width=${width}&thumbnail_height=${height}`
        }));

        const { data: batchResponse } = await axios.post(
          `https://graph.facebook.com/v24.0/`,
          { batch: JSON.stringify(batchRequests) },
          { params: { access_token: accessToken } }
        );

        const thumbnails = [];
        batchResponse.forEach(item => {
          try {
            if (item.code === 200 && item.body) {
              const body = JSON.parse(item.body);
              thumbnails.push({
                id: body.id,
                thumbnail_url: body.thumbnail_url
              });
            }
          } catch (error) {
            console.error("Error parsing thumbnail response:", error.message);
          }
        });
        
        return thumbnails;
      } catch (error) {
        console.error("Error fetching thumbnail batch:", error.message);
        return [];
      }
    })
  );

  // Convert to Map for O(1) lookups
  const thumbnailMap = new Map();
  thumbnailArrays.flat().forEach(thumb => {
    thumbnailMap.set(thumb.id, thumb.thumbnail_url);
  });

  return thumbnailMap;
};

// Fetch insights for ads in parallel batches
const fetchAdInsightsBatch = async (adIds, accessToken, startDate, endDate) => {
  if (!adIds.length) return new Map();

  // Remove duplicates
  const uniqueAdIds = [...new Set(adIds)];
  
  // Split into chunks of 50 (Facebook batch limit)
  const chunks = [];
  for (let i = 0; i < uniqueAdIds.length; i += 50) {
    chunks.push(uniqueAdIds.slice(i, i + 50));
  }

  // Process all chunks in parallel
  const insightsArrays = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const batchRequests = chunk.map(adId => ({
          method: "GET",
          // Request insights with video metrics including hook rate (3-second video views)
          relative_url: `${adId}/insights?fields=spend,ctr,actions,impressions&time_range={'since':'${startDate}','until':'${endDate}'}`
        }));

        const { data: batchResponse } = await axios.post(
          `https://graph.facebook.com/v24.0/`,
          { batch: JSON.stringify(batchRequests) },
          { params: { access_token: accessToken } }
        );

        const insights = [];
        batchResponse.forEach(item => {
          try {
            if (item.code === 200 && item.body) {
              const body = JSON.parse(item.body);
              const insightData = body.data?.[0] || {};
              
              // Extract ad ID from the response or use a mapping
              // We'll need to track which request corresponds to which ad
              insights.push({
                data: insightData
              });
            }
          } catch (error) {
            console.error("Error parsing insights response:", error.message);
          }
        });
        
        return insights;
      } catch (error) {
        console.error("Error fetching insights batch:", error.message);
        return [];
      }
    })
  );

  // Create map with ad IDs as keys
  const insightsMap = new Map();
  uniqueAdIds.forEach((adId, index) => {
    const insightData = insightsArrays.flat()[index]?.data || {};
    insightsMap.set(adId, insightData);
  });

  return insightsMap;
  };

  export const getBrandCreativesBatch = async (req, res) => {
  const startTime = Date.now();

  try {
    const { 
      startDate, 
      endDate, 
      includeAllAds = false,
      limit = 10,           // How many ads to fetch per account
      after = null,         // Cursor for pagination (from Facebook's response)
      thumbnailWidth = 400, // Thumbnail width in pixels (default: 400)
      thumbnailHeight = 400 // Thumbnail height in pixels (default: 400)
    } = req.body;
        const { brandId } = req.params;
    
        if (!brandId) {
            return res.status(400).json({
              success: false,
              message: 'Brand ID is required.'
            });
          }
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required (format: YYYY-MM-DD).'
      });
    }
    
    console.log(`📅 Request: brandId=${brandId}, startDate=${startDate}, endDate=${endDate}, includeAllAds=${includeAllAds}, limit=${limit}, after=${after}, thumbnail: ${thumbnailWidth}x${thumbnailHeight}`);

    // Check cache first (only cache first page, not paginated results)
    const cacheKey = `creatives:${brandId}:${startDate}:${endDate}:${includeAllAds}:${limit}:first`;
    if (!after) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          console.log(`✨ Returning cached creatives for brand ${brandId} (first page)`);
          return res.status(200).json({
            ...parsed,
            fromCache: true,
            fetchTime: Date.now() - startTime
          });
        }
      } catch (cacheError) {
        console.warn('⚠️  Cache read error:', cacheError.message);
        // Continue with fresh fetch if cache fails
      }
          }
      
          const brand = await Brand.findById(brandId).lean();
      
          if (!brand) {
            return res.status(404).json({
              success: false,
              message: 'Brand not found.'
            });
          }
      
          const adAccountIds = brand.fbAdAccounts;
          const accessToken = brand.fbAccessToken;
      
    if (!adAccountIds?.length) {
      return res.status(200).json({
        success: true,
        brandId,
        total_creatives: 0,
        creatives: [],
        fetchTime: Date.now() - startTime
      });
    }

    console.log(`🚀 Fetching creatives for ${adAccountIds.length} ad accounts (includeAllAds: ${includeAllAds}, limit: ${limit}/account, cursor: ${after ? 'yes' : 'first'})...`);

    // 🔹 Step 1: Create batch requests using cursor-based pagination
    // Facebook uses 'after' cursor for pagination, not offset
    // Two modes:
    // 1. includeAllAds=false (default): Only return ads with insights data in date range
    // 2. includeAllAds=true: Return ALL ads regardless of date range activity
    
    const batchRequests = adAccountIds.map((accId, idx) => {
      let request;
      const afterParam = after ? `&after=${after}` : '';
      
      if (includeAllAds) {
        // Fetch ALL ads without insights and without custom thumbnails
        // We'll fetch custom thumbnails in a separate batch request
        request = {
          method: "GET",
          relative_url: `${accId}/ads?fields=id,name,status,effective_status,adcreatives{id,object_story_spec,image_url}&limit=${limit}${afterParam}`
        };
      } else {
        // Default mode: Get ads with basic info and cursor pagination
        request = {
        method: "GET",
          relative_url: `${accId}/ads?fields=id,name,adcreatives{id,object_story_spec,image_url}&limit=${limit}${afterParam}`
        };
      }
      
      // Log first request for debugging
      if (idx === 0) {
        console.log(`📤 Sample request URL: ${request.relative_url}`);
        console.log(`📐 Will request custom thumbnails: ${thumbnailWidth}x${thumbnailHeight}`);
      }
      
      return request;
    });

    // Split batch requests into chunks of 50 (Facebook batch API limit)
    const batchChunks = [];
    for (let i = 0; i < batchRequests.length; i += 50) {
      batchChunks.push(batchRequests.slice(i, i + 50));
    }

    // 🔹 Step 2: Fetch all batch chunks in parallel
    const allBatchResponses = await Promise.all(
      batchChunks.map(async (chunk) => {
        try {
          const { data } = await axios.post(
            `https://graph.facebook.com/v24.0/`,
            { batch: JSON.stringify(chunk) },
        { params: { access_token: accessToken } }
      );
          return data;
        } catch (error) {
          console.error("Error in batch request:", error.message);
          return [];
        }
      })
    );

    const batchResponse = allBatchResponses.flat();
    console.log(`✅ Fetched initial batch for ${batchResponse.length} accounts`);

    // Debug: Log first response to see what Facebook returned
    if (batchResponse.length > 0 && batchResponse[0].body) {
      const firstResponse = JSON.parse(batchResponse[0].body);
      console.log(`📊 First account sample:`, JSON.stringify(firstResponse, null, 2).substring(0, 500));
    }

    // 🔹 Step 3: Process all accounts and extract cursors
    const accountPromises = batchResponse.map(async (item, index) => {
      if (!item.body) {
        console.warn(`⚠️  Account ${index + 1}: No body in response`);
        return { ads: [], hasMore: false, cursor: null };
      }

      try {
        const parsedBody = JSON.parse(item.body);
        
        // Check for errors in response
        if (parsedBody.error) {
          console.error(`❌ Account ${index + 1} error:`, parsedBody.error);
          return { ads: [], hasMore: false, cursor: null };
        }
        
        const accountAds = parsedBody.data || [];
        const hasMore = !!parsedBody.paging?.next;
        // Extract cursor from paging.cursors.after
        const cursor = parsedBody.paging?.cursors?.after || null;
        
        console.log(`📊 Account ${index + 1}: Found ${accountAds.length} ads, hasMore: ${hasMore}, cursor: ${cursor ? 'yes' : 'no'}`);

        return { ads: accountAds, hasMore, cursor };
      } catch (error) {
        console.error("Error processing account:", error.message);
        return { ads: [], hasMore: false, cursor: null };
      }
    });

    const accountResults = await Promise.all(accountPromises);
    const allAds = accountResults.flatMap(result => result.ads);
    const hasMorePages = accountResults.some(result => result.hasMore);
    // Get cursor from first account (assuming all accounts paginate similarly)
    const nextCursor = accountResults.find(result => result.cursor)?.cursor || null;
    
    console.log(`✅ Fetched ${allAds.length} total ads (hasMore: ${hasMorePages}, nextCursor: ${nextCursor ? 'yes' : 'no'})`);

    // 🔹 Step 4: Process all ads into creatives (without insights first)
    const allCreatives = allAds.map(processAdToCreative);
    
    // Extract IDs for batch requests
    const videoIds = allCreatives
      .filter(c => c.videoId)
      .map(c => c.videoId);
    
    const creativeIds = allCreatives
      .filter(c => c.creativeId)
      .map(c => c.creativeId);
    
    const adIds = allCreatives.map(c => c.ad_id);

    console.log(`🎥 Fetching details for ${videoIds.length} videos...`);
    console.log(`🖼️  Fetching custom thumbnails for ${creativeIds.length} creatives (${thumbnailWidth}x${thumbnailHeight})...`);
    console.log(`📊 Fetching insights for ${adIds.length} ads...`);

    // 🔹 Step 5: Fetch video details, custom thumbnails, and insights in parallel
    const [videoMap, thumbnailMap, insightsMap] = await Promise.all([
      fetchVideoSourcesBatch(videoIds, accessToken),
      fetchCreativeThumbnails(creativeIds, accessToken, thumbnailWidth, thumbnailHeight),
      fetchAdInsightsBatch(adIds, accessToken, startDate, endDate)
    ]);
    
    console.log(`✅ Fetched ${videoMap.size} video details`);
    console.log(`✅ Fetched ${thumbnailMap.size} custom thumbnails`);
    console.log(`✅ Fetched ${insightsMap.size} insights`);

    // 🔹 Step 6: Merge video details, custom thumbnails, and insights (O(1) lookup with Map)
    allCreatives.forEach(creative => {
      // Merge video data
      if (creative.videoId) {
        const video = videoMap.get(creative.videoId);
        if (video) {
          creative.creative_url = video.source;
          creative.thumbnail_url = video.thumbnail || creative.thumbnail_url;
        }
        delete creative.videoId; // Clean up temporary field
      }
      
      // Merge custom thumbnail
      if (creative.creativeId) {
        const customThumbnail = thumbnailMap.get(creative.creativeId);
        if (customThumbnail) {
          creative.thumbnail_url = customThumbnail;
        }
        delete creative.creativeId; // Clean up temporary field
      }
      
      // Merge insights data
      const insights = insightsMap.get(creative.ad_id) || {};
      
      // Helper function to get action count
      const getActionCount = (actionType) => {
        const action = insights.actions?.find(a => a.action_type === actionType);
        return action ? parseInt(action.value, 10) : 0;
      };
      
      // Update metrics from insights
      creative.spend = parseFloat(insights.spend || 0);
      creative.ctr = parseFloat(insights.ctr || 0);
      creative.clicks = parseInt(insights.clicks || 0, 10);
      
      // ROAS
      const roasObj = insights.purchase_roas?.find(r => r.action_type === "purchase");
      creative.roas = roasObj ? parseFloat(roasObj.value) : 0;
      
      // Orders
      creative.orders = getActionCount('purchase');
      
      // Hook Rate - video_view / impressions * 100
      const impressions = parseInt(insights.impressions || 0, 10);
      const videoViews = getActionCount('video_view');
      const hookRate = impressions > 0 ? (videoViews / impressions) * 100 : 0;
      
      creative.hook_rate = parseFloat(hookRate.toFixed(2));
      creative.impressions = impressions;
      creative.video_views = videoViews;
    });
  
    const fetchTime = Date.now() - startTime;
    console.log(`⏱️  Total fetch time: ${fetchTime}ms`);

    const responseData = {
        success: true,
        brandId,
      limit,
        total_creatives: allCreatives.length,
      hasMore: hasMorePages,
      nextCursor: nextCursor,  // Send cursor to frontend for next request
      creatives: allCreatives,
      fetchTime,
      stats: {
        accountsProcessed: adAccountIds.length,
        totalAds: allAds.length,
        videosProcessed: videoMap.size
      }
    };

    // Cache the results (only first page)
    if (!after) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(responseData));
        console.log(`💾 Cached creatives for brand ${brandId} (TTL: ${CACHE_TTL}s)`);
      } catch (cacheError) {
        console.warn('⚠️  Cache write error:', cacheError.message);
        // Continue even if caching fails
      }
    }

    res.status(200).json(responseData);
    } catch (err) {
      console.error("❌ Error fetching brand creatives:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch creatives",
        error: err.message
      });
    }
  };

// Clear cache for a specific brand or all brands
export const clearCreativesCache = async (req, res) => {
  try {
    const { brandId } = req.params;
    
    if (brandId) {
      // Clear cache for specific brand
      const pattern = `creatives:${brandId}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🗑️  Cleared ${keys.length} cache entries for brand ${brandId}`);
        return res.status(200).json({
          success: true,
          message: `Cleared ${keys.length} cache entries`,
          brandId
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'No cache entries found',
          brandId
        });
      }
    } else {
      // Clear all creatives cache
      const pattern = 'creatives:*';
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🗑️  Cleared ${keys.length} total cache entries`);
        return res.status(200).json({
          success: true,
          message: `Cleared ${keys.length} cache entries`
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'No cache entries found'
        });
      }
    }
  } catch (err) {
    console.error("❌ Error clearing cache:", err);
    res.status(500).json({
      success: false,
      message: "Failed to clear cache",
      error: err.message
    });
  }
};
  