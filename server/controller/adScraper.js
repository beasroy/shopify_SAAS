import ScrapedBrand from '../models/ScrapedBrand.js';
import Brand from '../models/Brands.js';
import ScrapedAdDetail from '../models/ScrapedAdDetail.js';
import { fetchAndSavePageAds } from '../services/scrapingService.js';

export const followBrand = async (req, res) => {
  const { brandId } = req.params;
  const { scrapedBrandId } = req.body;

  try {
    const scrapedBrand = await ScrapedBrand.findById(scrapedBrandId);
    if (!scrapedBrand) {
      return res.status(404).json({ message: 'Scraped brand not found' });
    }

    const brand = await Brand.findById(brandId)
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    brand.followedBrands.push(scrapedBrand._id);
    await brand.save();

    return res.status(200).json({ message: 'Brand followed successfully' });

  } catch (error) {
    console.error('Error following brand:', error);
    return res.status(500).json({ message: 'Error following brand', error: error.message });
  }

}

export const unfollowBrand = async (req, res) => {
  const { brandId } = req.params;
  const { scrapedBrandId } = req.body;

  try {
    const brand = await Brand.findById(brandId);

    brand.followedBrands = brand.followedBrands.filter(
        item => {
          const id = item._id ? item._id.toString() : item.toString();
          return id !== scrapedBrandId;
        }
      );
    await brand.save();

    return res.status(200).json({success: true, message: 'Brand unfollowed successfully' });

  } catch (error) {
    console.error('Error unfollowing brand:', error);
    return res.status(500).json({ message: 'Error unfollowing brand', error: error.message });
  }
}

export const getFollowedBrands = async (req, res) => {
  const { brandId } = req.params;

  try {
    const brand = await Brand.findById(brandId);
    
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }
    
    // Get the ObjectIds from followedBrands
    const followedBrandIds = brand.followedBrands || [];
    
    // If no followed brands, return early
    if (followedBrandIds.length === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          totalBrands: 0,
          totalAds: 0
        },
        data: []
      });
    }
    
    // Directly fetch ScrapedBrand documents using the ObjectIds
    const scrapingBrands = await ScrapedBrand.find({ _id: { $in: followedBrandIds } }).sort({createdAt: -1});
    
    // If some documents don't exist, clean up invalid references
    if (scrapingBrands.length < followedBrandIds.length) {
      const validIds = new Set(scrapingBrands.map(b => b._id.toString()));
      
      // Remove invalid ObjectIds from the brand's followedBrands array
      brand.followedBrands = brand.followedBrands.filter(id => {
        return validIds.has(id.toString());
      });
      await brand.save();
      console.log(`Cleaned up ${followedBrandIds.length - scrapingBrands.length} invalid ObjectIds from followedBrands`);
    }
    
    // If no valid scraping brands found, return early
    if (scrapingBrands.length === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          totalBrands: 0,
          totalAds: 0
        },
        data: []
      });
    }

    const brandsWithAds = await Promise.all(
        scrapingBrands.map(async (scrapingBrand) => {
            const ads = await ScrapedAdDetail.find({ scrapingBrandId: scrapingBrand._id })
                .sort({ createdAt: 1 });

            return {
                _id: scrapingBrand._id,
                pageId: scrapingBrand.pageId,
                pageName: scrapingBrand.pageName,
                pageUrl: scrapingBrand.pageUrl,
                createdAt: scrapingBrand.createdAt,
                updatedAt: scrapingBrand.updatedAt,
                adCount: ads.length,
                ads: ads
            };
        })
    );

    const totalAds = brandsWithAds.reduce((sum, brand) => sum + brand.adCount, 0);

    res.status(200).json({
        success: true,
        summary: {
            totalBrands: brandsWithAds.length,
            totalAds: totalAds
        },
        data: brandsWithAds
    });
} catch (error) {
    console.error('[API] Error fetching all scraped details:', error);
    res.status(500).json({
        success: false,
        message: 'Error fetching all scraped details',
        error: error.message
    });
}
} 

export const scrapeBrand = async (req, res) => {

  try {
    const { pageUrl, count = 200, countries = ['IN'], activeStatus = 'all', brandId } = req.body;
    
    if (!pageUrl) {
        return res.status(400).json({
            success: false,
            message: 'pageUrl is required'
        });
    }

    console.log(`[API] Fetching and saving ads for: ${pageUrl}`);
    
    const result = await fetchAndSavePageAds(pageUrl, {
        count,
        countries,
        activeStatus
    });
    
    // If brandId is provided and scrapingBrand was created, add it to followedBrands
    if (brandId && result.saveResult.scrapingBrand && result.saveResult.scrapingBrand._id) {
      try {
        const brand = await Brand.findById(brandId);
        if (brand) {
          // Check if the scrapingBrand is already in the followedBrands array
          const scrapingBrandId = result.saveResult.scrapingBrand._id;
          const isAlreadyFollowed = brand.followedBrands.some(
            id => id.toString() === scrapingBrandId.toString()
          );
          
          if (isAlreadyFollowed) {
            console.log(`[API] ScrapingBrand ${scrapingBrandId} already in brand ${brandId}'s followedBrands`);
          } else {
            brand.followedBrands.push(scrapingBrandId);
            await brand.save();
            console.log(`[API] Added scrapingBrand ${scrapingBrandId} to brand ${brandId}'s followedBrands`);
          }
        } else {
          console.warn(`[API] Brand ${brandId} not found, skipping followedBrands update`);
        }
      } catch (brandError) {
        console.error('[API] Error updating brand followedBrands:', brandError);
        // Don't fail the whole request if this fails
      }
    }
    
    res.status(200).json({
        success: true,
        message: 'Scraping and saving completed successfully',
        data: {
            fetchResult: {
                runId: result.fetchResult.runId,
                adsFetched: result.fetchResult.count,
                status: result.fetchResult.status
            },
            saveResult: {
                scrapingBrand: result.saveResult.scrapingBrand,
                adsSaved: result.saveResult.adsSaved,
                adsSkipped: result.saveResult.adsSkipped,
                errors: result.saveResult.errors
            }
        }
    });
} catch (error) {
    console.error('[API] Error in fetch-and-save endpoint:', error);
    res.status(500).json({
        success: false,
        message: 'Error during scraping',
        error: error.message
    });
}


}

export const getSingleAdFromAllScrapedBrands = async (req, res) => {
    try {
        const { includeAds = 'false' } = req.query;
        const shouldIncludeAds = includeAds === 'true';

        const scrapingBrands = await ScrapedBrand.find({}).sort({ createdAt: -1 });

        const brandsWithCounts = await Promise.all(
            scrapingBrands.map(async (brand) => {
                const adCount = await ScrapedAdDetail.countDocuments({ scrapingBrandId: brand._id });
                
                const brandData = {
                    _id: brand._id,
                    pageId: brand.pageId,
                    pageName: brand.pageName,
                    pageUrl: brand.pageUrl,
                    adCount: adCount,
                    createdAt: brand.createdAt,
                    updatedAt: brand.updatedAt
                };

                if (shouldIncludeAds) {
                    const ads = await ScrapedAdDetail.find({ scrapingBrandId: brand._id })
                        .sort({ createdAt: 1 })
                        .limit(1); // Limit to prevent huge responses
                    brandData.ads = ads;
                }

                return brandData;
            })
        );

        res.status(200).json({
            success: true,
            count: brandsWithCounts.length,
            data: brandsWithCounts
        });
    } catch (error) {
        console.error('[API] Error fetching scraping brands:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching scraping brands',
            error: error.message
        });
    }
}

export const deleteSpecificScrapedBrandDetails = async (req, res) => {
  try {
    const { scrapedBrandId } = req.params;
    const { adId } = req.body;
  } catch (error) {
    console.error('[API] Error deleting specific scraped brand details:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting specific scraped brand details',
      error: error.message
    });
  }
}