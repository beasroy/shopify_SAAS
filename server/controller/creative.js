import axios from "axios";
import crypto from "node:crypto";
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
        { batch: batchRequests },
        {
          headers: { 'Content-Type': 'application/json' },
          params: { access_token: accessToken }
        }
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
          { batch: batchRequests },
          {
            headers: { 'Content-Type': 'application/json' },
            params: { access_token: accessToken }
          }
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
          { batch: batchRequests },
          {
            headers: { 'Content-Type': 'application/json' },
            params: { access_token: accessToken }
          }
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

// Fetch all ads from ad accounts (sorted by newest first, with pagination)
// limit is per account - each account will fetch up to 'limit' ads
const fetchAllAdsFromAccounts = async (adAccountIds, accessToken, limit = null, after = null) => {
  if (!adAccountIds.length) return { ads: [], nextCursor: null, hasMore: false };

  const allAds = [];
  let accountCursors = {};
  if (after) {
    try {
      accountCursors = JSON.parse(Buffer.from(after, 'base64').toString());
    } catch (error) {
      console.error('Error parsing cursor:', error.message);
      accountCursors = {};
    }
  }
  const limitPerAccount = limit || Infinity;
  const nextCursors = {};

  // Process each account separately to handle pagination
  for (const accId of adAccountIds) {
    try {
      // Get cursor for this account if it exists
      const accountCursor = accountCursors[accId] || null;
      let nextUrl = accountCursor 
        ? accountCursor 
        : `${accId}/ads?fields=id,name,status,effective_status,created_time,updated_time,ad_account_id&limit=25&sort[]=created_time_descending`;
      
      let pageCount = 0;
      let accountHasMore = false;
      let lastNextUrl = null;
      let hasFetchedAtLeastOnePage = false;
      let accountAdsCount = 0; // Track how many ads we've fetched from this account

      // Continue fetching until we have enough or there's no more data
      while (nextUrl) {
        // Stop if we've reached the per-account limit AND we've fetched at least one page
        if (accountAdsCount >= limitPerAccount && hasFetchedAtLeastOnePage) {
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

          // Extract ads from current page
          if (data.data && Array.isArray(data.data)) {
            for (const ad of data.data) {
              if (ad.id && accountAdsCount < limitPerAccount) {
                // Ensure ad_account_id is set (fallback to accId if not in response)
                allAds.push({
                  ...ad,
                  ad_account_id: ad.ad_account_id || accId
                });
                accountAdsCount++;
              }
            }
          }

          // Always check for next page to know if there's more data available
          if (data.paging && data.paging.next) {
            lastNextUrl = data.paging.next; // Store the next URL
            accountHasMore = true;
            // Continue to next page only if we haven't reached the per-account limit
            if (accountAdsCount < limitPerAccount) {
              nextUrl = data.paging.next;
            } else {
              // We've reached the per-account limit, but there's more data - stop here
              nextUrl = null;
            }
          } else {
            nextUrl = null;
            accountHasMore = false;
            lastNextUrl = null;
          }
        } catch (error) {
          console.error(`Error fetching ads page ${pageCount} for account ${accId}:`, error.message);
          break; // Move to next account if this one fails
        }
      }

      // Store cursor for this account if there's more data available
      if (accountHasMore && (lastNextUrl || nextUrl)) {
        nextCursors[accId] = lastNextUrl || nextUrl;
      }
    } catch (error) {
      console.error(`Error processing account ${accId}:`, error.message);
      // Continue with next account
    }
  }

  // Sort all ads by created_time (newest launched first) - in case we got ads from multiple accounts
  allAds.sort((a, b) => {
    const timeA = new Date(a.created_time || a.updated_time || 0);
    const timeB = new Date(b.created_time || b.updated_time || 0);
    return timeB - timeA; // Descending order (newest launched first)
  });

  // Log ads per account for debugging
  const adsPerAccount = {};
  allAds.forEach(ad => {
    const accId = ad.ad_account_id || 'unknown';
    adsPerAccount[accId] = (adsPerAccount[accId] || 0) + 1;
  });
  console.log(`📊 Ads per account:`, adsPerAccount);

  // Create next cursor if there are more pages
  const hasMore = Object.keys(nextCursors).length > 0;
  console.log(`✅ Fetched ${allAds.length} ads from ${adAccountIds.length} accounts (limit per account: ${limit || 'unlimited'}, hasMore: ${hasMore})`);
  const nextCursor = hasMore 
    ? Buffer.from(JSON.stringify(nextCursors)).toString('base64')
    : null;

  return { ads: allAds, nextCursor, hasMore };
};

const fetchAdInsightsBatch = async (adIds, accessToken) => {
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
          relative_url: `${adId}/insights?fields=spend,ctr,actions,impressions,action_values,cpc,frequency,video_p25_watched_actions,video_p50_watched_actions,video_p100_watched_actions,cost_per_action_type`
        }));

        const { data: batchResponse } = await axios.post(
          `https://graph.facebook.com/v24.0/`,
          { batch: batchRequests },
          {
            headers: { 'Content-Type': 'application/json' },
            params: { access_token: accessToken }
          }
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
  console.log(`🔍 Fetching ${uniqueAdIds.length} ads by IDs (first 5: ${uniqueAdIds.slice(0, 5).join(', ')})`);

  // Split into chunks of 50 for batch API
  const chunks = [];
  for (let i = 0; i < uniqueAdIds.length; i += 50) {
    chunks.push(uniqueAdIds.slice(i, i + 50));
  }

  const allBatchResponses = await Promise.all(
    chunks.map(async (chunk, chunkIndex) => {
      try {
        const batchRequests = chunk.map(adId => ({
          method: "GET",
          relative_url: `${adId}?fields=id,name,status,effective_status,created_time,updated_time,adcreatives{id,object_story_spec{link_data{child_attachments{image_hash,link,name,description}},video_data{video_id}},image_url,thumbnail_url}`
        }));

        const { data } = await axios.post(
          `https://graph.facebook.com/v24.0/`,
          { batch: batchRequests },
          {
            headers: { 'Content-Type': 'application/json' },
            params: { access_token: accessToken }
          }
        );
        
        // Log errors in batch response
        if (data && Array.isArray(data)) {
          const errors = data.filter(item => item.code !== 200);
          if (errors.length > 0) {
            console.error(`⚠️  Batch chunk ${chunkIndex + 1} has ${errors.length} errors:`, errors.slice(0, 3).map(e => ({ code: e.code, body: e.body })));
          }
        }
        
        return data;
      } catch (error) {
        console.error(`❌ Error fetching ads batch chunk ${chunkIndex + 1}:`, error.message);
        if (error.response) {
          console.error(`   Response status: ${error.response.status}`, error.response.data);
        }
        return [];
      }
    })
  );

  const batchResponse = allBatchResponses.flat();
  const ads = [];
  let successCount = 0;
  let errorCount = 0;

  batchResponse.forEach((item, index) => {
    try {
      if (item.code === 200 && item.body) {
        const body = JSON.parse(item.body);
        if (body.id) {
          ads.push(body);
          successCount++;
        } else {
          console.warn(`⚠️  Ad response ${index} missing id:`, body);
        }
      } else {
        errorCount++;
        if (errorCount <= 3) { // Only log first 3 errors to avoid spam
          console.error(`❌ Ad response ${index} error - code: ${item.code}, body: ${item.body?.substring(0, 200)}`);
        }
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Error parsing ad response ${index}:`, error.message, item);
    }
  });

  console.log(`📊 Fetched ${ads.length} ads (${successCount} success, ${errorCount} errors) from ${batchResponse.length} responses`);
  return { ads };
};

export const getBrandCreativesBatch = async (req, res) => {
  const startTime = Date.now();

  try {
    const { 
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
    
    console.log(`📅 Request: brandId=${brandId}, limit=${limit}, after=${after}, thumbnail: ${thumbnailWidth}x${thumbnailHeight}`);

    // Create cache key that includes cursor for pagination (cache all pages)
    // Hash the cursor to create a shorter, consistent cache key
    const cacheKeySuffix = after 
      ? crypto.createHash('md5').update(after).digest('hex').substring(0, 16) // Use first 16 chars of MD5 hash
      : 'first';
    const cacheKey = `creatives:${brandId}:${limit}:${thumbnailWidth}x${thumbnailHeight}:${cacheKeySuffix}`;
    
    // Check cache for all pages (not just first page)
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        console.log(`✨ Returning cached creatives for brand ${brandId} (page: ${after ? 'paginated' : 'first'})`);
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

    console.log(`🚀 Fetching all ads (sorted by newest first)...`);

    // 🔹 Step 1: Fetch all ads from accounts (sorted by newest first, with limit and pagination)
    // limit is per account - each account will fetch up to 'limit' ads
    const { ads: allAdsBasic, nextCursor: adsNextCursor, hasMore: adsHasMore } = await fetchAllAdsFromAccounts(
      adAccountIds, 
      accessToken,
      limit,
      after
    );
    console.log(`✅ Found ${allAdsBasic.length} ads (hasMore: ${adsHasMore})`);

    if (allAdsBasic.length === 0) {
      return res.status(200).json({
        success: true,
        brandId,
        total_creatives: 0,
        creatives: [],
        hasMore: adsHasMore,
        nextCursor: adsNextCursor,
        fetchTime: Date.now() - startTime,
        stats: {
          accountsProcessed: adAccountIds.length,
          totalAds: 0,
          videosProcessed: 0
        }
      });
    }

    // 🔹 Step 2: Fetch full ad details with creatives for those ad IDs
    const adIds = allAdsBasic.map(ad => ad.id).filter(id => id); // Filter out any null/undefined IDs
    console.log(`🔍 Extracted ${adIds.length} ad IDs from ${allAdsBasic.length} basic ads (first 5: ${adIds.slice(0, 5).join(', ')})`);
    
    if (adIds.length === 0) {
      console.warn(`⚠️  No valid ad IDs found in basic ads. Sample ad structure:`, allAdsBasic[0]);
    }
    
    // Create a map of ad_id -> ad_account_id from basic ads
    const adAccountIdMap = new Map();
    allAdsBasic.forEach(ad => {
      if (ad.id && ad.ad_account_id) {
        adAccountIdMap.set(ad.id, ad.ad_account_id);
      }
    });
    
    const { ads: allAds } = await fetchAdsByIds(adIds, accessToken);
    
    // Preserve ad_account_id from basic ads if not in full ad details
    allAds.forEach(ad => {
      if (!ad.ad_account_id && adAccountIdMap.has(ad.id)) {
        ad.ad_account_id = adAccountIdMap.get(ad.id);
      }
    });
    
    console.log(`✅ Fetched ${allAds.length} ads with creatives`);

    // 🔹 Step 3: Extract IDs and image hashes from ads
    const videoIds = [];
    const creativeIds = [];
    const imageHashes = [];
    const fetchedAdIds = allAds.map(ad => ad.id);
    
    allAds.forEach(ad => {
      const adCreatives = ad.adcreatives?.data || [];
      adCreatives.forEach(creativeData => {
        if (creativeData?.id) creativeIds.push(creativeData.id);

        const videoId = creativeData?.object_story_spec?.video_data?.video_id;
        if (videoId) videoIds.push(videoId);

        // Extract image hashes from carousel child attachments
        const childAttachments = creativeData?.object_story_spec?.link_data?.child_attachments;
        if (childAttachments && Array.isArray(childAttachments)) {
          childAttachments.forEach(attachment => {
            if (attachment.image_hash) imageHashes.push(attachment.image_hash);
          });
        }
      });
    });

    // 🔹 Step 4: Fetch video details, custom thumbnails, carousel images, and insights in parallel
    const [videoMap, thumbnailMap, carouselImageMap, insightsMap] = await Promise.all([
      fetchVideoSourcesBatch(videoIds, accessToken),
      fetchCreativeThumbnails(creativeIds, accessToken, thumbnailWidth, thumbnailHeight),
      fetchCarouselImages(imageHashes, accessToken, adAccountIds),
      fetchAdInsightsBatch(fetchedAdIds, accessToken)
    ]);
    


    // 🔹 Step 5: Process all ads and build creatives array
    const allCreatives = [];

    allAds.forEach(ad => {
      const insights = insightsMap.get(ad.id) || {};

      const spend = parseFloat(insights.spend || 0);
      const impressions = parseInt(insights.impressions || 0, 10);

      // Helper to get action count
      const getActionCount = (actionType) => {
        const action = insights.actions?.find(a => a.action_type === actionType);
        return action ? parseInt(action.value, 10) : 0;
      };

      // Calculate metrics (ad-level; repeated for every creative within this ad)
      const videoViews = getActionCount('video_view');
      const hookRate = impressions > 0 ? (videoViews / impressions) * 100 : 0;

      const postEngagement = getActionCount('post_engagement');
      const engagementRate = impressions > 0 ? (postEngagement / impressions) : 0;

      const revenueObj = insights.action_values?.find((action) => action.action_type === 'purchase') || null;
      const revenue = revenueObj ? parseFloat(revenueObj.value) : 0;

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

      const videoP25WatchedRate = impressions > 0 ? (videoP25Watched / impressions) * 100 : 0;
      const videoP50WatchedRate = impressions > 0 ? (videoP50Watched / impressions) * 100 : 0;
      const videoP100WatchedRate = impressions > 0 ? (videoP100Watched / impressions) * 100 : 0;

      const orders = getActionCount('purchase');
      const cpp = spend > 0 ? spend / orders : 0;

      // Determine status: active only if both status and effective_status are ACTIVE
      const status = (ad.status?.toUpperCase() === 'ACTIVE' && ad.effective_status?.toUpperCase() === 'ACTIVE')
        ? 'ACTIVE'
        : 'PAUSED';

      const adCreatives = ad.adcreatives?.data || [];
      adCreatives.forEach(creativeData => {
        const creative = creativeData?.object_story_spec;
        const creativeId = creativeData?.id;
        if (!creativeId) return;

        // Determine type and URLs
        let creativeType = "unknown";
        let creativeUrl = "";
        let thumbnailUrl = "";
        let carouselImages = [];

        const childAttachments = creative?.link_data?.child_attachments;
        if (childAttachments && Array.isArray(childAttachments) && childAttachments.length > 0) {
          creativeType = "carousel";

          carouselImages = childAttachments
            .map(attachment => {
              if (!attachment.image_hash) return null;
              const imageUrl = carouselImageMap.get(attachment.image_hash);
              if (!imageUrl) return null;
              return {
                url: imageUrl,
                link: attachment.link || null,
                name: attachment.name || null,
                description: attachment.description || null
              };
            })
            .filter(img => img !== null);

          // Fallback if hash->URL fetch failed
          if (carouselImages.length === 0) {
            const fallbackUrl = creativeData?.thumbnail_url || creative?.link_data?.picture || "";
            if (fallbackUrl) {
              carouselImages = [{
                url: fallbackUrl,
                link: null,
                name: null,
                description: null
              }];
            }
          }

          thumbnailUrl = carouselImages[0]?.url || "";
          creativeUrl = carouselImages[0]?.url || "";
        } else if (creative?.video_data) {
          creativeType = "video";
          const videoId = creative.video_data.video_id;
          const video = videoMap.get(videoId);
          creativeUrl = video?.source || videoId || "";
          thumbnailUrl = video?.thumbnail || "";
        } else {
          creativeType = "image";
          creativeUrl = creativeData?.image_url || creative?.link_data?.picture || "";
          // If image_url is missing, UI can fall back to thumbnail_url (but we set it below)
          thumbnailUrl = creativeData?.thumbnail_url || "";
          if (!thumbnailUrl) thumbnailUrl = "";
        }

        // Get custom thumbnail (only if not already set from carousel/video)
        if (!thumbnailUrl && creativeId && thumbnailMap.has(creativeId)) {
          thumbnailUrl = thumbnailMap.get(creativeId) || "";
        }

        // For pure image creatives, ensure at least one URL exists for the UI.
        if (creativeType === "image" && !creativeUrl) {
          creativeUrl = thumbnailUrl || "";
        }

        allCreatives.push({
          creative_id: creativeId,
          ad_id: ad.id,
          ad_name: ad.name,
          ad_account_id: ad.ad_account_id || null,
          ad_effective_status: ad.effective_status,
          ad_status: ad.status,
          status,
          created_time: ad.created_time,
          creative_type: creativeType,
          creative_url: creativeUrl || "",
          thumbnail_url: thumbnailUrl || "",
          carousel_images: carouselImages.length > 0 ? carouselImages : [],
          spend,
          ctr: parseFloat(insights.ctr || 0),
          cpc: parseFloat(insights.cpc || 0),
          cpp: parseFloat(cpp),
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
          video_p100_watched: videoP100Watched,
          video_p25_watched_rate: videoP25WatchedRate,
          video_p50_watched_rate: videoP50WatchedRate,
          video_p100_watched_rate: videoP100WatchedRate
        });
      });
    });
    
    // Sort creatives by newest launched first (already sorted at ad level, but ensure consistency)
    const sortedCreatives = allCreatives.sort((a, b) => {
      const timeA = a.created_time || 0;
      const timeB = b.created_time || 0;
      return new Date(timeB) - new Date(timeA); // Descending order (newest launched first)
    });
    
    console.log(`✅ Returning ${sortedCreatives.length} creatives (sorted by newest launched first)`);
  
    // Find the oldest created_time from this batch (for global sorting reference)
    const oldestCreatedTime = sortedCreatives.length > 0 
      ? sortedCreatives[sortedCreatives.length - 1]?.created_time || null
      : null;
  
    const fetchTime = Date.now() - startTime;
    console.log(`⏱️  Total fetch time: ${fetchTime}ms`);

    const responseData = {
        success: true,
        brandId,
      limit,
        total_creatives: sortedCreatives.length,
      hasMore: adsHasMore,
      nextCursor: adsNextCursor,  // Send cursor to frontend for next request
      oldestCreatedTime, // Oldest date in this batch (for frontend global sorting)
      creatives: sortedCreatives,
      fetchTime,
      stats: {
        accountsProcessed: adAccountIds.length,
        totalAds: allAds.length,
        videosProcessed: videoMap.size
      }
    };

    // Cache the results (all pages, not just first)
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(responseData));
      console.log(`💾 Cached creatives for brand ${brandId} (page: ${after ? 'paginated' : 'first'}, TTL: ${CACHE_TTL}s)`);
    } catch (cacheError) {
      console.warn('⚠️  Cache write error:', cacheError.message);
      // Continue even if caching fails
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
        console.log(`Cleared ${keys.length} cache entries for brand ${brandId}`);
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
  