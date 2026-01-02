import axios from 'axios';
import Brand from '../models/Brands.js';
import CompetitorAd from '../models/CompetitorAd.js';


const fetchCompetitorAdsFromMeta = async (competitorBrandName, ourAccessToken, countries = ['IN']) => {
  try {
    const allAds = [];
    let nextUrl = null;
    let pageCount = 0;
    const maxPages = 1000; // Safety limit to prevent infinite loops (increased for large datasets)
    
    // Initial request parameters
    // Note: ad_reached_countries must be an array of ISO country codes (e.g., ['IN', 'US'])
    // Facebook API expects it as a JSON string in the URL - axios will automatically encode it
    const baseParams = {
      access_token: ourAccessToken, // Our app's token, not competitor's
      search_terms: competitorBrandName, // Search by advertiser/page name
      ad_reached_countries: JSON.stringify(countries), // Countries where ads were shown (JSON string format)
      ad_active_status: 'ALL', // 'ALL', 'ACTIVE', 'INACTIVE'
      limit: 25, // Meta API max is 25 per page
      fields: 'id,ad_creative_link_titles,ad_creative_link_descriptions,ad_delivery_start_time,ad_snapshot_url,page_name,page_id,ad_delivery_stop_time'
    };

    // Make initial request with retry logic
    let response;
    try {
      response = await axios.get(
        `https://graph.facebook.com/v24.0/ads_archive`,
        { params: baseParams }
      );
    } catch (initialError) {
      // If OAuth error, provide more helpful message
      if (initialError.response?.data?.error?.type === 'OAuthException') {
        const errorMsg = initialError.response.data.error.message;
        const errorCode = initialError.response.data.error.code;
        console.error(`OAuth Error (Code ${errorCode}): ${errorMsg}`);
        throw new Error(`Facebook API authentication failed: ${errorMsg}. Please check if the access token is valid, not expired, and has the required permissions (ads_read permission for Ads Library API).`);
      }
      // Log full error details for debugging
      if (initialError.response) {
        console.error('Facebook API Error Response:', JSON.stringify(initialError.response.data, null, 2));
      }
      throw initialError;
    }

    // Process first page
    console.log(`\n[PAGINATION] Starting fetch for: ${competitorBrandName}`);
    console.log(`[PAGINATION] Initial request completed`);
    
    if (response.data.data && response.data.data.length > 0) {
      allAds.push(...response.data.data);
      console.log(`[PAGINATION] Page 1: Fetched ${response.data.data.length} ads (total so far: ${allAds.length})`);
    } else {
      console.log(`[PAGINATION] Page 1: No ads found in response`);
    }

    // Check for pagination
    if (response.data.paging) {
      console.log(`[PAGINATION] Paging object found:`, {
        hasNext: !!response.data.paging.next,
        hasCursors: !!response.data.paging.cursors,
        after: response.data.paging.cursors?.after ? response.data.paging.cursors.after.substring(0, 20) + '...' : null
      });
      
      if (response.data.paging.next) {
        nextUrl = response.data.paging.next;
        console.log(`[PAGINATION] Next page URL available, will start pagination`);
        console.log(`[PAGINATION] Next URL (truncated): ${nextUrl.substring(0, 100)}...`);
      } else {
        console.log(`[PAGINATION] No next page URL found - pagination complete after page 1`);
      }
    } else {
      console.log(`[PAGINATION] No paging object in response - single page only`);
    }

    // Follow pagination until no more pages are available
    console.log(`[PAGINATION] Entering pagination loop (max pages: ${maxPages})`);
    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      console.log(`[PAGINATION] ========================================`);
      console.log(`[PAGINATION] Fetching page ${pageCount + 1}...`);
      console.log(`[PAGINATION] Current total ads: ${allAds.length}`);
      
      try {
        // Fetch next page using the full URL provided by Meta
        console.log(`[PAGINATION] Making request to next page URL...`);
        response = await axios.get(nextUrl);
        console.log(`[PAGINATION] Page ${pageCount + 1} request successful`);
        
        if (response.data.data && response.data.data.length > 0) {
          allAds.push(...response.data.data);
          console.log(`[PAGINATION] Page ${pageCount + 1}: Fetched ${response.data.data.length} ads (total: ${allAds.length})`);
        } else {
          console.log(`[PAGINATION] Page ${pageCount + 1}: No ads in response (empty data array)`);
        }

        // Check for next page
        if (response.data.paging && response.data.paging.next) {
          nextUrl = response.data.paging.next;
          console.log(`[PAGINATION] Page ${pageCount + 1}: Next page available, continuing...`);
          console.log(`[PAGINATION] Next URL (truncated): ${nextUrl.substring(0, 100)}...`);
        } else {
          nextUrl = null; // No more pages
          console.log(`[PAGINATION] Page ${pageCount + 1}: No more pages - pagination complete!`);
          if (response.data.paging) {
            console.log(`[PAGINATION] Paging object exists but no 'next' property`);
          } else {
            console.log(`[PAGINATION] No paging object in response`);
          }
        }
      } catch (pageError) {
        console.error(`[PAGINATION] ERROR fetching page ${pageCount + 1} for ${competitorBrandName}:`, pageError.message);
        // If OAuth error on pagination, stop fetching
        if (pageError.response?.data?.error?.type === 'OAuthException') {
          console.error(`[PAGINATION] OAuth error during pagination, stopping fetch`);
          break;
        }
        // For other errors, retry once with a delay
        if (pageCount < 3) {
          console.log(`[PAGINATION] Retrying page ${pageCount + 1} after 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        // Break on error to avoid infinite loops
        console.error(`[PAGINATION] Too many errors, stopping pagination`);
        break;
      }
    }

    // Final summary
    if (pageCount >= maxPages) {
      console.log(`[PAGINATION] WARNING: Reached max pages limit (${maxPages}), stopping pagination`);
      console.log(`[PAGINATION] There may be more pages available that were not fetched`);
    }
    
    console.log(`[PAGINATION] ========================================`);
    console.log(`[PAGINATION] FINISHED: ${competitorBrandName}`);
    console.log(`[PAGINATION] Total pages fetched: ${pageCount + 1}`);
    console.log(`[PAGINATION] Total ads collected: ${allAds.length}`);
    console.log(`[PAGINATION] ========================================\n`);
    return allAds;
  } catch (error) {
    console.error(`Error fetching competitor ads for ${competitorBrandName}:`, error.message);
    if (error.response) {
      console.error('API Error Response:', error.response.data);
    }
    throw error;
  }
};

/**
 * Process ad data from Ad Library API response
 * The Ad Library provides limited public data - mainly snap URLs and basic info
 */
const processAdLibraryResponse = (ad) => {
  // Extract available data from Ad Library API response
  const adId = ad.id;
  
  // The snap URL is the key - it's a public image/screenshot of the ad
  const snapUrl = ad.ad_snapshot_url || '';
  
  const pageName = ad.page_name || '';
  const pageId = ad.page_id || '';
  
  // Parse ad delivery dates
  let adCreatedTime = new Date();
  if (ad.ad_delivery_start_time) {
    adCreatedTime = new Date(ad.ad_delivery_start_time);
  }
  
  const adStopTime = ad.ad_delivery_stop_time ? new Date(ad.ad_delivery_stop_time) : null;
  
  
  return {
    id: adId,
    ad_id: adId,
    snapUrl,
    pageName,
    pageId,
    adCreatedTime,
    adStopTime,
    thumbnailUrl: snapUrl, // Use snap URL as thumbnail
    adStatus: adStopTime ? 'INACTIVE' : 'ACTIVE',
    linkTitles: ad.ad_creative_link_titles || [],
    linkDescriptions: ad.ad_creative_link_descriptions || []
  };
};

/**
 * Process and store competitor ads in the database
 * We only store what's available from Ad Library: snap URLs, captions, and basic metadata
 */
const processAndStoreCompetitorAds = async (brandId, competitorBrandName, adsData) => {
  const storedAds = [];
  const errors = [];

  for (const ad of adsData) {
    try {
      // Process ad data from Ad Library response
      const processedAd = processAdLibraryResponse(ad);
      
      // Use upsert to avoid duplicates (based on brandId, competitorBrandName, adId)
      // We store: snapUrl (main creative), pageName, dates, and metadata
      const competitorAd = await CompetitorAd.findOneAndUpdate(
        { brandId, competitorBrandName, adId: processedAd.id },
        {
          brandId,
          competitorBrandName,
          adId: processedAd.id,
          snapUrl: processedAd.snapUrl,
          adStatus: processedAd.adStatus,
          adCreatedTime: processedAd.adCreatedTime,
          lastFetchedAt: new Date(),
          // Store additional metadata from Ad Library
          metadata: {
            pageId: processedAd.pageId,
            pageName: processedAd.pageName,
            adStopTime: processedAd.adStopTime,
            linkTitles: processedAd.linkTitles,
            linkDescriptions: processedAd.linkDescriptions
          }
        },
        { upsert: true, new: true }
      );

      storedAds.push(competitorAd);
    } catch (error) {
      console.error(`Error storing ad ${ad.id}:`, error.message);
      errors.push({ adId: ad.id, error: error.message });
    }
  }

  return { storedAds, errors };
};

/**
 * Fetch and store competitor ads for a brand
 */
export const fetchAndStoreCompetitorAds = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { competitorBrandName } = req.body;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    if (!competitorBrandName) {
      return res.status(400).json({
        success: false,
        message: 'Competitor brand name is required.'
      });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    if (!brand.fbAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Facebook access token not configured for this brand. We need your app\'s access token to query the Ad Library (not the competitor\'s token).'
      });
    }

    // Fetch competitor ads from Ad Library (public API)
    // We use our own access token to query the public Ad Library
    // The Ad Library provides snap URLs (public screenshots) of competitor ads
    console.log(`Fetching competitor ads for ${competitorBrandName} from Ad Library...`);
    const adsData = await fetchCompetitorAdsFromMeta(
      competitorBrandName,
      brand.fbAccessToken // Our app's token, not competitor's
    );

    if (adsData.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No ads found for this competitor brand.',
        adsCount: 0
      });
    }

    // Process and store ads
    const { storedAds, errors } = await processAndStoreCompetitorAds(
      brandId,
      competitorBrandName,
      adsData
    );

    return res.status(200).json({
      success: true,
      message: `Successfully fetched and stored ${storedAds.length} ads.`,
      adsCount: storedAds.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error fetching competitor ads:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch competitor ads.',
      error: error.message
    });
  }
};

/**
 * Get all competitor ads for a brand, sorted by newest first
 */
export const getCompetitorAds = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { competitorBrandName, limit = 50, skip = 0 } = req.query;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    // Build query
    const query = { brandId };
    if (competitorBrandName) {
      query.competitorBrandName = competitorBrandName;
    }

    // Fetch ads sorted by adCreatedTime (newest first)
    const limitNum = Number.parseInt(limit, 10);
    const skipNum = Number.parseInt(skip, 10);
    
    const ads = await CompetitorAd.find(query)
      .sort({ adCreatedTime: -1 })
      .limit(limitNum)
      .skip(skipNum)
      .lean();

    const totalCount = await CompetitorAd.countDocuments(query);

    return res.status(200).json({
      success: true,
      ads,
      totalCount,
      limit: limitNum,
      skip: skipNum
    });
  } catch (error) {
    console.error('Error fetching competitor ads:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch competitor ads.',
      error: error.message
    });
  }
};

/**
 * Search competitor ads without storing (for preview)
 */
export const searchCompetitorAds = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { competitorBrandName, limit = 20 } = req.query;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    if (!competitorBrandName) {
      return res.status(400).json({
        success: false,
        message: 'Competitor brand name is required.'
      });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    if (!brand.fbAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Facebook access token not configured for this brand.'
      });
    }

    // Fetch competitor ads from Ad Library (public API) - don't store
    console.log(`Searching competitor ads for ${competitorBrandName} from Ad Library...`);
    const adsData = await fetchCompetitorAdsFromMeta(
      competitorBrandName,
      brand.fbAccessToken
    );

    // Process ads for response (limit results)
    const processedAds = adsData
      .slice(0, Number.parseInt(limit, 10))
      .map(ad => processAdLibraryResponse(ad));

    return res.status(200).json({
      success: true,
      ads: processedAds,
      totalFound: adsData.length,
      competitorBrandName
    });
  } catch (error) {
    console.error('Error searching competitor ads:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search competitor ads.',
      error: error.message
    });
  }
};

/**
 * Add a competitor brand to a brand's competitor list and fetch/store ads
 */
export const addCompetitorBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { competitorBrandName } = req.body;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    // Convert to string if it's not already, and handle edge cases
    const brandName = competitorBrandName ? String(competitorBrandName).trim() : '';
    
    if (!brandName) {
      return res.status(400).json({
        success: false,
        message: 'Competitor brand name is required.',
        received: req.body
      });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    if (!brand.fbAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Facebook access token not configured for this brand.'
      });
    }

    // Check if competitor already exists
    if (brand.competitorBrands && brand.competitorBrands.includes(brandName)) {
      return res.status(400).json({
        success: false,
        message: 'Competitor brand already exists in the list.'
      });
    }

    // Add competitor brand
    if (!brand.competitorBrands) {
      brand.competitorBrands = [];
    }
    brand.competitorBrands.push(brandName);
    await brand.save();

    // Fetch and store ads for this competitor brand
    try {
      console.log(`Fetching and storing ads for competitor: ${brandName}`);
      const adsData = await fetchCompetitorAdsFromMeta(
        brandName,
        brand.fbAccessToken
      );

      if (adsData.length > 0) {
        const { storedAds, errors } = await processAndStoreCompetitorAds(
          brandId,
          brandName,
          adsData
        );

        return res.status(200).json({
          success: true,
          message: 'Competitor brand added successfully and ads fetched.',
          competitorBrands: brand.competitorBrands,
          adsStored: storedAds.length,
          errors: errors.length > 0 ? errors : undefined
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'Competitor brand added successfully. No ads found.',
          competitorBrands: brand.competitorBrands,
          adsStored: 0
        });
      }
    } catch (adsError) {
      // If ads fetching fails, still return success for adding the brand
      console.error('Error fetching ads for competitor brand:', adsError);
      return res.status(200).json({
        success: true,
        message: 'Competitor brand added successfully, but failed to fetch ads.',
        competitorBrands: brand.competitorBrands,
        adsError: adsError.message
      });
    }
  } catch (error) {
    console.error('Error adding competitor brand:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add competitor brand.',
      error: error.message
    });
  }
};

/**
 * Remove a competitor brand from a brand's competitor list
 */
export const removeCompetitorBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { competitorBrandName } = req.body;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    if (!competitorBrandName) {
      return res.status(400).json({
        success: false,
        message: 'Competitor brand name is required.'
      });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    // Remove competitor brand
    if (brand.competitorBrands) {
      brand.competitorBrands = brand.competitorBrands.filter(
        name => name !== competitorBrandName
      );
      await brand.save();
    }

    // Optionally delete stored ads for this competitor
    await CompetitorAd.deleteMany({ brandId, competitorBrandName });

    return res.status(200).json({
      success: true,
      message: 'Competitor brand removed successfully.',
      competitorBrands: brand.competitorBrands
    });
  } catch (error) {
    console.error('Error removing competitor brand:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove competitor brand.',
      error: error.message
    });
  }
};

/**
 * Get all competitor brands for a brand
 */
export const getCompetitorBrands = async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required.'
      });
    }

    const brand = await Brand.findById(brandId).select('competitorBrands');
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found.'
      });
    }

    return res.status(200).json({
      success: true,
      competitorBrands: brand.competitorBrands || []
    });
  } catch (error) {
    console.error('Error fetching competitor brands:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch competitor brands.',
      error: error.message
    });
  }
};

/**
 * Process a single competitor brand for a given brand
 */
const processCompetitorBrand = async (brand, competitorBrandName) => {
  try {
    console.log(`  Fetching ads for competitor: ${competitorBrandName}`);
    
    const adsData = await fetchCompetitorAdsFromMeta(
      competitorBrandName,
      brand.fbAccessToken
    );

    if (adsData.length > 0) {
      const { storedAds, errors } = await processAndStoreCompetitorAds(
        brand._id.toString(),
        competitorBrandName,
        adsData
      );

      const errorMsg = errors.length > 0 ? ` (${errors.length} errors)` : '';
      console.log(`    Stored ${storedAds.length} ads for ${competitorBrandName}${errorMsg}`);
    } else {
      console.log(`    No ads found for ${competitorBrandName}`);
    }
  } catch (error) {
    console.error(`    Error fetching ads for ${competitorBrandName}:`, error.message);
    // Continue with next competitor
  }
};

/**
 * Process all competitor brands for a single brand
 */
const processBrandCompetitors = async (brand) => {
  try {
    console.log(`Processing brand: ${brand.name} (${brand._id})`);
    
    for (const competitorBrandName of brand.competitorBrands) {
      await processCompetitorBrand(brand, competitorBrandName);
    }
  } catch (error) {
    console.error(`Error processing brand ${brand.name}:`, error.message);
    // Continue with next brand
  }
};

/**
 * Fetch competitor ads for all brands (used by cron job)
 */
export const fetchCompetitorAdsForAllBrands = async () => {
  try {
    console.log('Starting competitor ads fetch for all brands...');
    
    // Find brands that have competitor brands configured and have an access token
    // The access token is used to authenticate our Ad Library API calls (not competitor's token)
    const brands = await Brand.find({
      competitorBrands: { $exists: true, $ne: [] },
      fbAccessToken: { $exists: true, $ne: null }
    });

    console.log(`Found ${brands.length} brands with competitor brands configured.`);
    console.log('Note: Using Ad Library API (public) - we only get snap URLs and basic info, not full ad account access.');

    for (const brand of brands) {
      await processBrandCompetitors(brand);
    }

    console.log('Completed competitor ads fetch for all brands.');
  } catch (error) {
    console.error('Error in fetchCompetitorAdsForAllBrands:', error);
    throw error;
  }
};

