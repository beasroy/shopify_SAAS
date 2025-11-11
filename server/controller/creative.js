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
          relative_url: `${adId}/insights?fields=spend,ctr,actions,impressions,action_values,cpc,cpp,frequency,video_p25_watched_actions,video_p50_watched_actions,video_p100_watched_actions,cost_per_action_type&time_range={'since':'${startDate}','until':'${endDate}'}`
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

    console.log(`🚀 Fetching creatives for ${adAccountIds.length} ad accounts (limit: ${limit}/account, cursor: ${after ? 'yes' : 'first'})...`);

    
    const batchRequests = adAccountIds.map((accId, idx) => {
      const afterParam = after ? `&after=${after}` : '';
       const request = {
          method: "GET",
          // Note: time_range doesn't work on /ads endpoint, so we fetch all ads and filter by insights later
          relative_url: `${accId}/ads?fields=id,name,status,effective_status,adcreatives{id,object_story_spec{link_data{child_attachments{image_hash,link,name,description}},video_data{video_id}},image_url,thumbnail_url}&limit=${limit * 2}${afterParam}`
        };
     
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
    // if (batchResponse.length > 0 && batchResponse[0].body) {
    //   const firstResponse = JSON.parse(batchResponse[0].body);
    //   console.log(`📊 First account sample:`, JSON.stringify(firstResponse, null, 2).substring(0, 500));
    // }

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

    // 🔹 Step 4: Extract IDs and image hashes from ads
    const videoIds = [];
    const creativeIds = [];
    const imageHashes = [];
    const adIds = allAds.map(ad => ad.id);
    
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

   

    // 🔹 Step 5: Fetch video details, custom thumbnails, carousel images, and insights in parallel
    const [videoMap, thumbnailMap, carouselImageMap, insightsMap] = await Promise.all([
      fetchVideoSourcesBatch(videoIds, accessToken),
      fetchCreativeThumbnails(creativeIds, accessToken, thumbnailWidth, thumbnailHeight),
      fetchCarouselImages(imageHashes, accessToken, adAccountIds),
      fetchAdInsightsBatch(adIds, accessToken, startDate, endDate)
    ]);
    


   
    const allCreatives = allAds
      .map(ad => {
        const creativeData = ad.adcreatives?.data?.[0];
        const creative = creativeData?.object_story_spec;
        const creativeId = creativeData?.id;
        const insights = insightsMap.get(ad.id) || {};
        
 
        const spend = parseFloat(insights.spend || 0);
        const impressions = parseInt(insights.impressions || 0, 10);
        
     
        if (spend === 0 ) {
          return null;
        }
        
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
          cpp: parseFloat(insights.cpp || 0),
          clicks: parseInt(insights.clicks || 0, 10),
          roas: parseFloat(roas.toFixed(2)),
          orders: getActionCount('purchase'),
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
      })
      .filter(creative => creative !== null); // Remove null entries (ads with no activity)
    
    const filteredCount = allAds.length - allCreatives.length;
    if (filteredCount > 0) {
      console.log(`🔍 Filtered out ${filteredCount} ads with no activity during ${startDate} to ${endDate}`);
    }
    
    // Limit to requested amount after filtering
    const limitedCreatives = allCreatives.slice(0, limit * adAccountIds.length);
    console.log(`✅ Returning ${limitedCreatives.length} creatives with activity during the time range`);
  
    const fetchTime = Date.now() - startTime;
    console.log(`⏱️  Total fetch time: ${fetchTime}ms`);

    const responseData = {
        success: true,
        brandId,
      limit,
        total_creatives: limitedCreatives.length,
      hasMore: hasMorePages,
      nextCursor: nextCursor,  // Send cursor to frontend for next request
      creatives: limitedCreatives,
      fetchTime,
      stats: {
        accountsProcessed: adAccountIds.length,
        totalAds: allAds.length,
        adsFiltered: filteredCount,
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
  