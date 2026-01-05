import express from 'express';
import { testSaundIndia, fetchAndSavePageAds, fetchPageAds } from '../services/scrapingService.js';
import ScrapingBrand from '../models/ScrapedBrand.js';
import ScrapedAdDetail from '../models/ScrapedAdDetail.js';
import { scrapeBrand , getSingleAdFromAllScrapedBrands, followBrand, unfollowBrand, getFollowedBrands} from '../controller/adScraper.js';
const router = express.Router();

/**
 * Scrape page directly from Apify and return raw results (no database save)
 * POST /api/scraping/fetch
 * Body: { pageUrl: string, count?: number, countries?: string[], activeStatus?: string, period?: string }
 * 
 * This endpoint directly calls the Apify scraper and returns the raw results
 * without saving to the database
 */
router.post('/fetch', async (req, res) => {
    try {
        const { pageUrl, count = 100, countries = ['IN'], activeStatus = 'all', period = '' } = req.body;
        
        if (!pageUrl) {
            return res.status(400).json({
                success: false,
                message: 'pageUrl is required'
            });
        }

        console.log(`[API] Fetching ads directly from scraper for: ${pageUrl}`);
        
        const result = await fetchPageAds(pageUrl, {
            count,
            countries,
            activeStatus,
            period
        });
        
        res.status(200).json({
            success: true,
            message: 'Scraping completed successfully',
            data: {
                runId: result.runId,
                status: result.status,
                datasetId: result.datasetId,
                totalAds: result.count,
                ads: result.ads // Raw Apify scraping results
            }
        });
    } catch (error) {
        console.error('[API] Error in fetch endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error during scraping',
            error: error.message
        });
    }
});

/**
 * Scrape page directly from Apify via GET (for quick testing)
 * GET /api/scraping/fetch?pageUrl=URL&count=50
 */
router.get('/fetch', async (req, res) => {
    try {
        const { pageUrl, count = 100, countries = 'IN', activeStatus = 'all', period = '' } = req.query;
        
        if (!pageUrl) {
            return res.status(400).json({
                success: false,
                message: 'pageUrl query parameter is required'
            });
        }

        // Parse countries if it's a comma-separated string
        const countriesArray = typeof countries === 'string' 
            ? countries.split(',').map(c => c.trim())
            : [countries];

        console.log(`[API] Fetching ads directly from scraper for: ${pageUrl}`);
        
        const result = await fetchPageAds(pageUrl, {
            count: Number.parseInt(count, 10),
            countries: countriesArray,
            activeStatus,
            period
        });
        
        res.status(200).json({
            success: true,
            message: 'Scraping completed successfully',
            data: {
                runId: result.runId,
                status: result.status,
                datasetId: result.datasetId,
                totalAds: result.count,
                ads: result.ads // Raw Apify scraping results
            }
        });
    } catch (error) {
        console.error('[API] Error in fetch endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error during scraping',
            error: error.message
        });
    }
});

/**
 * Test endpoint to scrape Saund India page and save to database
 * GET /api/scraping/test-saundindia
 */
router.get('/test-saundindia', async (req, res) => {
    try {
        console.log('[API] Test endpoint called for Saund India scraping');
        const result = await testSaundIndia();
        
        res.status(200).json({
            success: true,
            message: 'Scraping completed successfully',
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
        console.error('[API] Error in test endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error during scraping',
            error: error.message
        });
    }
});

/**
 * Scrape any page URL and save to database
 * POST /api/scraping/fetch-and-save
 * Body: { pageUrl: string, count?: number, countries?: string[], activeStatus?: string }
 */
router.post('/fetch-and-save', async (req, res) => {
    try {
        const { pageUrl, count = 200, countries = ['IN'], activeStatus = 'all' } = req.body;
        
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
});

/**
 * Get all scraped brands with their ad counts
 * GET /api/scraping/brands
 * Query params: ?includeAds=true (to include ad details)
 */
router.get('/brands', async (req, res) => {
    try {
        const { includeAds = 'false' } = req.query;
        const shouldIncludeAds = includeAds === 'true';

        const scrapingBrands = await ScrapingBrand.find({}).sort({ createdAt: -1 });

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
                        .sort({ createdAt: -1 })
                        .limit(100); // Limit to prevent huge responses
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
});

/**
 * Get all scraped ad details
 * GET /api/scraping/ads
 * Query params: 
 *   - scrapingBrandId: Filter by specific brand ID
 *   - limit: Limit number of results (default: 100)
 *   - page: Page number for pagination (default: 1)
 */
router.get('/ads', async (req, res) => {
    try {
        const { scrapingBrandId, limit = 100, page = 1 } = req.query;
        const skip = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);

        const query = {};
        if (scrapingBrandId) {
            query.scrapingBrandId = scrapingBrandId;
        }

        const [ads, totalCount] = await Promise.all([
            ScrapedAdDetail.find(query)
                .populate('scrapingBrandId', 'pageId pageName pageUrl')
                .sort({ createdAt: -1 })
                .limit(Number.parseInt(limit, 10))
                .skip(skip),
            ScrapedAdDetail.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            pagination: {
                total: totalCount,
                page: Number.parseInt(page, 10),
                limit: Number.parseInt(limit, 10),
                totalPages: Math.ceil(totalCount / Number.parseInt(limit, 10))
            },
            count: ads.length,
            data: ads
        });
    } catch (error) {
        console.error('[API] Error fetching ad details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ad details',
            error: error.message
        });
    }
});

/**
 * Get a specific scraping brand with all its ad details
 * GET /api/scraping/brands/:brandId
 */
router.get('/brands/:brandId', async (req, res) => {
    try {
        const { brandId } = req.params;

        const scrapingBrand = await ScrapingBrand.findById(brandId);
        
        if (!scrapingBrand) {
            return res.status(404).json({
                success: false,
                message: 'Scraping brand not found'
            });
        }

        const ads = await ScrapedAdDetail.find({ scrapingBrandId: brandId })
            .sort({ createdAt: -1 });

        const adCount = ads.length;

        res.status(200).json({
            success: true,
            data: {
                brand: {
                    _id: scrapingBrand._id,
                    pageId: scrapingBrand.pageId,
                    pageName: scrapingBrand.pageName,
                    pageUrl: scrapingBrand.pageUrl,
                    createdAt: scrapingBrand.createdAt,
                    updatedAt: scrapingBrand.updatedAt
                },
                adCount: adCount,
                ads: ads
            }
        });
    } catch (error) {
        console.error('[API] Error fetching scraping brand:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching scraping brand',
            error: error.message
        });
    }
});

/**
 * Get all scraped details (brands with their ads)
 * GET /api/scraping/all
 * This is a comprehensive endpoint that returns everything
 */
router.get('/all', async (req, res) => {
    try {
        const scrapingBrands = await ScrapingBrand.find({}).sort({ createdAt: -1 });

        const brandsWithAds = await Promise.all(
            scrapingBrands.map(async (brand) => {
                const ads = await ScrapedAdDetail.find({ scrapingBrandId: brand._id })
                    .sort({ createdAt: 1 });

                return {
                    _id: brand._id,
                    pageId: brand.pageId,
                    pageName: brand.pageName,
                    pageUrl: brand.pageUrl,
                    createdAt: brand.createdAt,
                    updatedAt: brand.updatedAt,
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
});


router.post('/scrape-brand', scrapeBrand);
router.get('/get-single-ad-from-all-scraped-brands', getSingleAdFromAllScrapedBrands);
router.post('/follow-brand', followBrand);
router.post('/unfollow-brand/:brandId', unfollowBrand);
router.get('/get-followed-brands/:brandId', getFollowedBrands);
export default router;

