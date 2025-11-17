import axios from "axios";
import Brand from "../models/Brands.js";
import { connection as redis } from "../config/redis.js";

const CACHE_TTL = 3600;

const fetchVideoSourcesBatch = async (videoIds, accessToken) => {
  if (!videoIds.length) return new Map();

  const uniqueVideoIds = [...new Set(videoIds)];
  
    const chunks = [];
  for (let i = 0; i < uniqueVideoIds.length; i += 50) {
    chunks.push(uniqueVideoIds.slice(i, i + 50));
  }

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

const fetchCreativeThumbnails = async (creativeIds, accessToken, width, height) => {
  if (!creativeIds.length) return new Map();


  const uniqueCreativeIds = [...new Set(creativeIds)];
  

  const chunks = [];
  for (let i = 0; i < uniqueCreativeIds.length; i += 50) {
    chunks.push(uniqueCreativeIds.slice(i, i + 50));
  }

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


const fetchCarouselImages = async (imageHashes, accessToken, adAccountIds) => {
  if (!imageHashes.length || !adAccountIds.length) return new Map();

  const uniqueHashes = [...new Set(imageHashes)];
  const imageMap = new Map();

  for (const adAccountId of adAccountIds) {
    if (imageMap.size >= uniqueHashes.length) break; 
    
    const remainingHashes = uniqueHashes.filter(hash => !imageMap.has(hash));
    if (remainingHashes.length === 0) break;

    const chunks = [];
    for (let i = 0; i < remainingHashes.length; i += 50) {
      chunks.push(remainingHashes.slice(i, i + 50));
    }

      for (const chunk of chunks) {
      try {
        // Use ad account's adimages endpoint with hashes parameter
        const batchRequests = chunk.map(hash => {
          return {
            method: "GET",
            relative_url: `${adAccountId}/adimages?hashes=["${hash}"]&fields=url`
          };
        });

        const { data: batchResponse } = await axios.post(
          `https://graph.facebook.com/v24.0/`,
          { batch: JSON.stringify(batchRequests) },
          { params: { access_token: accessToken } }
        );

        batchResponse.forEach((item, index) => {
          try {
            if (item.code === 200 && item.body) {
              const body = JSON.parse(item.body);
              const imageData = body.data?.[0];
              if (imageData?.url) {
                imageMap.set(chunk[index], imageData.url);
              }
            }
          } catch (error) {
          }
        });
      } catch (error) {
        continue;
      }
    }
  }

  return imageMap;
};

// Fetch ad IDs that have activity in the time range from account insights (with limit and pagination)
const fetchAdIdsFromAccountInsights = async (adAccountIds, accessToken, startDate, endDate, limit = null, after = null) => {
  if (!adAccountIds.length) return { adIds: [], nextCursor: null, hasMore: false };

  const adIds = [];
  let accountCursors = {};
  if (after) {
    try {
      accountCursors = JSON.parse(Buffer.from(after, 'base64').toString());
    } catch (error) {
      console.error('Error parsing cursor:', error.message);
      accountCursors = {};
    }
  }
  let remainingLimit = limit || Infinity;
  const nextCursors = {};

  // Process each account separately to handle pagination
  for (const accId of adAccountIds) {
    try {
      // Get cursor for this account if it exists
      const accountCursor = accountCursors[accId] || null;
      let nextUrl = accountCursor 
        ? accountCursor 
        : `${accId}/insights?level=ad&fields=ad_id&time_range={'since':'${startDate}','until':'${endDate}'}&limit=25`;
      
      let pageCount = 0;
      let accountHasMore = false;
      let lastNextUrl = null;
      let hasFetchedAtLeastOnePage = false;

      // Continue fetching until we have enough or there's no more data
      while (nextUrl) {
        // Stop if we've reached the limit AND we've fetched at least one page
        // This ensures we always check for paging.next on the last page we fetch
        if (remainingLimit <= 0 && hasFetchedAtLeastOnePage) {
          break;
        }
        
        pageCount++;
        hasFetchedAtLeastOnePage = true;
        
        try {
          let response;
          // Check if nextUrl is a full URL or relative path
          if (nextUrl.startsWith('http')) {
            // Full URL from paging.next
            response = await axios.get(nextUrl);
          } else {
            // Relative path - construct full URL
            response = await axios.get(
              `https://graph.facebook.com/v24.0/${nextUrl}`,
              { params: { access_token: accessToken } }
            );
          }

          const { data } = response;

          // Extract ad IDs from current page
          if (data.data && Array.isArray(data.data)) {
            for (const insight of data.data) {
              if (insight.ad_id && remainingLimit > 0) {
                adIds.push(insight.ad_id);
                remainingLimit--;
              }
            }
          }

          // Always check for next page to know if there's more data available
          if (data.paging && data.paging.next) {
            lastNextUrl = data.paging.next; // Store the next URL
            accountHasMore = true;
            // Continue to next page only if we haven't reached the limit
            if (remainingLimit > 0) {
              nextUrl = data.paging.next;
            } else {
              // We've reached the limit, but there's more data - stop here
              nextUrl = null;
            }
          } else {
            nextUrl = null;
            accountHasMore = false;
            lastNextUrl = null;
          }
        } catch (error) {
          console.error(`Error fetching insights page ${pageCount} for account ${accId}:`, error.message);
          break; // Move to next account if this one fails
        }
      }

      // Store cursor for this account if there's more data available
      // Use lastNextUrl if we stopped due to limit, or nextUrl if we're continuing
      if (accountHasMore && (lastNextUrl || nextUrl)) {
        nextCursors[accId] = lastNextUrl || nextUrl;
      }
      
      // If we've reached the limit, we can stop processing other accounts
      // (but we've already checked if this account has more data)
      if (remainingLimit <= 0) {
        // Check if other accounts have cursors from previous requests
        // If they do, they might have more data
        for (const otherAccId of adAccountIds) {
          if (otherAccId !== accId && accountCursors[otherAccId]) {
            // This account has a cursor from a previous request, so there might be more data
            // We don't need to fetch it now, but we should indicate there's more
            if (!nextCursors[otherAccId]) {
              // Keep the existing cursor for this account
              nextCursors[otherAccId] = accountCursors[otherAccId];
            }
          }
        }
        break; // Stop processing more accounts since we've reached the limit
      }
    } catch (error) {
      console.error(`Error processing account ${accId}:`, error.message);
      // Continue with next account
    }
  }

  // Create next cursor if there are more pages
  const hasMore = Object.keys(nextCursors).length > 0;
  const nextCursor = hasMore 
    ? Buffer.from(JSON.stringify(nextCursors)).toString('base64')
    : null;

  console.log(`✅ Fetched ${adIds.length} ad IDs from ${adAccountIds.length} accounts (limit: ${limit || 'unlimited'}, hasMore: ${hasMore})`);
  return { adIds, nextCursor, hasMore };
};

const fetchAdInsightsBatch = async (adIds, accessToken, startDate, endDate) => {
  if (!adIds.length) return new Map();

  const uniqueAdIds = [...new Set(adIds)];
  
  const chunks = [];
  for (let i = 0; i < uniqueAdIds.length; i += 50) {
    chunks.push(uniqueAdIds.slice(i, i + 50));
  }

  const insightsArrays = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const batchRequests = chunk.map(adId => ({
          method: "GET",
          relative_url: `${adId}/insights?fields=spend,ctr,actions,impressions,action_values,cpc,frequency,video_p25_watched_actions,video_p50_watched_actions,video_p100_watched_actions,cost_per_action_type&time_range={'since':'${startDate}','until':'${endDate}'}`
        }));

        const { data: batchResponse } = await axios.post(
          `https://graph.facebook.com/v24.0/`,
          { batch: JSON.stringify(batchRequests) },
          { params: { access_token: accessToken } }
        );

        const insights = [];
        batchResponse.forEach((item, index) => {
          try {
            if (item.code === 200 && item.body) {
              const body = JSON.parse(item.body);
              const insightData = body.data?.[0] || {};
              
              insights.push({
                adId: chunk[index],
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

  const insightsMap = new Map();
  insightsArrays.flat().forEach(insight => {
    if (insight.adId && insight.data) {
      insightsMap.set(insight.adId, insight.data);
    }
  });

  return insightsMap;
};

// Fetch ads with creatives for specific ad IDs (no pagination - already limited at ad IDs level)
const fetchAdsByIds = async (adIds, accessToken) => {
  if (!adIds.length) return { ads: [] };

  const uniqueAdIds = [...new Set(adIds)];

  // Split into chunks of 50 for batch API
  const chunks = [];
  for (let i = 0; i < uniqueAdIds.length; i += 50) {
    chunks.push(uniqueAdIds.slice(i, i + 50));
  }

  const allBatchResponses = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const batchRequests = chunk.map(adId => ({
          method: "GET",
          relative_url: `${adId}?fields=id,name,status,effective_status,adcreatives{id,object_story_spec{link_data{child_attachments{image_hash,link,name,description}},video_data{video_id}},image_url,thumbnail_url}`
        }));

        const { data } = await axios.post(
          `https://graph.facebook.com/v24.0/`,
          { batch: JSON.stringify(batchRequests) },
          { params: { access_token: accessToken } }
        );
        return data;
      } catch (error) {
        console.error("Error fetching ads batch:", error.message);
        return [];
      }
    })
  );

  const batchResponse = allBatchResponses.flat();
  const ads = [];

  batchResponse.forEach(item => {
    try {
      if (item.code === 200 && item.body) {
        const body = JSON.parse(item.body);
        if (body.id) {
          ads.push(body);
        }
      }
    } catch (error) {
      console.error("Error parsing ad response:", error.message);
    }
  });

  return { ads };
};

export const getBrandCreativesBatch = async (req, res) => {
  const startTime = Date.now();

  try {
    const { 
      startDate, 
      endDate, 
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
    
    console.log(`📅 Request: brandId=${brandId}, startDate=${startDate}, endDate=${endDate}, limit=${limit}, after=${after}, thumbnail: ${thumbnailWidth}x${thumbnailHeight}`);

    // Check cache first (only cache first page, not paginated results)
    const cacheKey = `creatives:${brandId}:${startDate}:${endDate}:${limit}:first`;
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

    console.log(`🚀 Fetching ad IDs with activity in time range ${startDate} to ${endDate}...`);

    // 🔹 Step 1: Fetch ad IDs that have activity in the time range from account insights (with limit)
    const totalLimit = limit * adAccountIds.length;
    const { adIds, nextCursor: adIdsNextCursor, hasMore: adIdsHasMore } = await fetchAdIdsFromAccountInsights(
      adAccountIds, 
      accessToken, 
      startDate, 
      endDate,
      totalLimit,
      after
    );
    console.log(`✅ Found ${adIds.length} ads with activity in the time range (hasMore: ${adIdsHasMore})`);

    if (adIds.length === 0) {
      return res.status(200).json({
        success: true,
        brandId,
        total_creatives: 0,
        creatives: [],
        hasMore: adIdsHasMore,
        nextCursor: adIdsNextCursor,
        fetchTime: Date.now() - startTime,
        stats: {
          accountsProcessed: adAccountIds.length,
          totalAds: 0,
          totalAdIdsFound: 0,
          videosProcessed: 0
        }
      });
    }

    // 🔹 Step 2: Fetch ads with creatives for those ad IDs (no pagination needed - we already limited at ad IDs level)
    const { ads: allAds } = await fetchAdsByIds(adIds, accessToken);
    
    console.log(`✅ Fetched ${allAds.length} ads with creatives`);

    // 🔹 Step 3: Extract IDs and image hashes from ads
    const videoIds = [];
    const creativeIds = [];
    const imageHashes = [];
    const fetchedAdIds = allAds.map(ad => ad.id);
    
    allAds.forEach(ad => {
      const creativeData = ad.adcreatives?.data?.[0];
      if (creativeData?.id) creativeIds.push(creativeData.id);
      if (creativeData?.object_story_spec?.video_data?.video_id) {
        videoIds.push(creativeData.object_story_spec.video_data.video_id);
      }
      // Extract image hashes from carousel child attachments
      const childAttachments = creativeData?.object_story_spec?.link_data?.child_attachments;
      if (childAttachments && Array.isArray(childAttachments)) {
        childAttachments.forEach(attachment => {
          if (attachment.image_hash) {
            imageHashes.push(attachment.image_hash);
          }
        });
      }
    });

    // 🔹 Step 4: Fetch video details, custom thumbnails, carousel images, and insights in parallel
    const [videoMap, thumbnailMap, carouselImageMap, insightsMap] = await Promise.all([
      fetchVideoSourcesBatch(videoIds, accessToken),
      fetchCreativeThumbnails(creativeIds, accessToken, thumbnailWidth, thumbnailHeight),
      fetchCarouselImages(imageHashes, accessToken, adAccountIds),
      fetchAdInsightsBatch(fetchedAdIds, accessToken, startDate, endDate)
    ]);
    


    // 🔹 Step 5: Process all ads and build creatives array
    const allCreatives = allAds
      .map(ad => {
        const creativeData = ad.adcreatives?.data?.[0];
        const creative = creativeData?.object_story_spec;
        const creativeId = creativeData?.id;
        const insights = insightsMap.get(ad.id) || {};
        
        const spend = parseFloat(insights.spend || 0);
        const impressions = parseInt(insights.impressions || 0, 10);
        
        // Helper to get action count
        const getActionCount = (actionType) => {
          const action = insights.actions?.find(a => a.action_type === actionType);
          return action ? parseInt(action.value, 10) : 0;
        };
        
        // Determine type and URLs
        let creativeType = "unknown";
        let creativeUrl = null;
        let thumbnailUrl = null;
        let carouselImages = null;
        
        // Check for carousel ads (has child_attachments)
        const childAttachments = creative?.link_data?.child_attachments;
        if (childAttachments && Array.isArray(childAttachments) && childAttachments.length > 0) {
          creativeType = "carousel";
          // Extract carousel images from child attachments
          carouselImages = childAttachments
            .map(attachment => {
              if (attachment.image_hash) {
                const imageUrl = carouselImageMap.get(attachment.image_hash);
                // If image hash fetch failed, try to construct URL from hash or use fallback
                if (!imageUrl) {
                  // Fallback: try to use the creative's thumbnail_url if available
                  const creativeThumbnail = creativeData?.thumbnail_url;
                  if (creativeThumbnail && carouselImages === null) {
                    // Use thumbnail as fallback for first image only
                    return null; // Will handle separately
                  }
                  return null;
                }
                return {
                  url: imageUrl,
                  link: attachment.link || null,
                  name: attachment.name || null,
                  description: attachment.description || null
                };
              }
              return null;
            })
            .filter(img => img !== null);
          
          // If no images from hash, try using creative thumbnail_url as fallback
          if (carouselImages.length === 0 && creativeData?.thumbnail_url) {
            carouselImages = [{
              url: creativeData.thumbnail_url,
              link: null,
              name: null,
              description: null
            }];
          }
          
          // Use first carousel image as main thumbnail
          if (carouselImages.length > 0) {
            thumbnailUrl = carouselImages[0].url;
            creativeUrl = carouselImages[0].url;
          } else if (creative?.link_data?.picture) {
            // Final fallback to main picture
            thumbnailUrl = creative.link_data.picture;
            creativeUrl = creative.link_data.picture;
          }
        } else if (creative?.video_data) {
          creativeType = "video";
          const videoId = creative.video_data.video_id;
          const video = videoMap.get(videoId);
          creativeUrl = video?.source || videoId;
          thumbnailUrl = video?.thumbnail || null;
        } else {
          creativeType = "image";
        }
        
        // Get custom thumbnail (only if not already set from carousel)
        if (!thumbnailUrl && creativeId && thumbnailMap.has(creativeId)) {
          thumbnailUrl = thumbnailMap.get(creativeId);
        }
        
        // Calculate metrics
        const videoViews = getActionCount('video_view');
        const hookRate = impressions > 0 ? (videoViews / impressions) * 100 : 0;

        const postEngagement = getActionCount('post_engagement');
        const engagementRate = impressions > 0 ? (postEngagement / impressions) : 0;
        
        // Get revenue from purchase action value
        const revenueObj = insights.action_values?.find((action) => action.action_type === 'purchase') || null;
        const revenue = revenueObj ? parseFloat(revenueObj.value) : 0;
        
        // Calculate ROAS = revenue / spend
        const roas = spend > 0 ? revenue / spend : 0;
        const frequency = parseInt(insights.frequency || 0, 10);
        
        // Extract video watch actions from arrays (they come as arrays of objects)
        const getVideoWatchCount = (actionsArray) => {
          if (!Array.isArray(actionsArray) || actionsArray.length === 0) return 0;
          const videoAction = actionsArray.find(a => a.action_type === 'video_view');
          return videoAction ? parseInt(videoAction.value || 0, 10) : 0;
        };
        
        const videoP25Watched = getVideoWatchCount(insights.video_p25_watched_actions);
        const videoP50Watched = getVideoWatchCount(insights.video_p50_watched_actions);
        const videoP100Watched = getVideoWatchCount(insights.video_p100_watched_actions);

        const orders = getActionCount('purchase');
        
        return {
          ad_id: ad.id,
          ad_name: ad.name,
          creative_type: creativeType,
          creative_url: creativeUrl,
          thumbnail_url: thumbnailUrl,
          carousel_images: carouselImages,
          spend,
          ctr: parseFloat(insights.ctr || 0),
          cpc: parseFloat(insights.cpc || 0),
          cpp: parseFloat(spend / orders || 0),
          clicks: parseInt(insights.clicks || 0, 10),
          roas: parseFloat(roas.toFixed(2)),
          orders,
          hook_rate: parseFloat(hookRate.toFixed(2)),
          impressions,
          video_views: videoViews,
          revenue,
          engagementRate,
          frequency,
          video_p25_watched: videoP25Watched,
          video_p50_watched: videoP50Watched,
          video_p100_watched: videoP100Watched
        };
      });
    
    // All ads already have activity in the time range, so no filtering needed
    const limitedCreatives = allCreatives;
    console.log(`✅ Returning ${limitedCreatives.length} creatives with activity during the time range`);
  
    const fetchTime = Date.now() - startTime;
    console.log(`⏱️  Total fetch time: ${fetchTime}ms`);

    const responseData = {
        success: true,
        brandId,
      limit,
        total_creatives: limitedCreatives.length,
      hasMore: adIdsHasMore,
      nextCursor: adIdsNextCursor,  // Send cursor to frontend for next request (from ad IDs pagination)
      creatives: limitedCreatives,
      fetchTime,
      stats: {
        accountsProcessed: adAccountIds.length,
        totalAds: allAds.length,
        totalAdIdsFound: adIds.length,
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
  