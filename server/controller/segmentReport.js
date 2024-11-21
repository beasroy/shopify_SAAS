import moment from 'moment';
import Brand from '../models/Brands.js';
import { GoogleAdsApi } from "google-ads-api";


const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_AD_CLIENT_ID,
    client_secret: process.env.GOOGLE_AD_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
    refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
});

const ProductStatusEnum = {
    0: "UNSPECIFIED",
    1: "UNKNOWN",
    2: "NOT_ELIGIBLE",
    3: "ELIGIBLE_LIMITED",
    4: "ELIGIBLE",
};
const sanitizeForGoogleAds = (value) => {
    // Check if the value is a string before calling replace
    if (typeof value !== 'string') {
        return value || ''; // Return an empty string or original value if it's not a string
    }
    // Escape special characters like single quotes
    return value.replace(/'/g, "\\'");
};

export async function getGoogleProductMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, brands, productType, categoryName,categoryLevel } = req.body;

    try {
        // Fetch category mapping from Google Ads
        const categoryMapping = await fetchProductCategoryResourceMapping();

        // If categoryName is provided, map it to the correct Google Ads resource name
        let mappedCategoryResourceName = null;
        if (categoryName && categoryMapping) {
            // Check if the localized category name exists in the mapping
            mappedCategoryResourceName = categoryMapping[categoryName] || null;
        }

        // Proceed with fetching brand and product data
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found.',
            });
        }

        const adAccountId = brand.googleAdAccount;

        if (!adAccountId || adAccountId.length === 0) {
            return res.json({
                success: true,
                data: {},
                message: "No Google Ads account found for this brand",
            });
        }

        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
            endDate = moment().format('YYYY-MM-DD');
        }

        const customer = client.Customer({
            customer_id: adAccountId,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const queryBrand = sanitizeForGoogleAds(brands);
        const queryProductType = sanitizeForGoogleAds(productType);
        const queryCategory = sanitizeForGoogleAds(mappedCategoryResourceName); // Use the mapped resource name
        const queryCategoryLevel = categoryLevel ? `shopping_product.${categoryLevel}` : null;
        // Build dynamic constraints
        const constraints = [];

        // If brands are provided, add a filter for brands
        if (brands) {
            constraints.push(`shopping_product.brand = '${queryBrand}'`);
        }

        // If productType is provided, add a filter for product type
        if (productType) {
            constraints.push(`shopping_product.product_type_level1 = '${queryProductType}'`);
        }
      
        if (queryCategory && queryCategoryLevel) {
            constraints.push(`${queryCategoryLevel} = '${queryCategory}'`);
        }
        

        // Fetch product data with constraints
        const adsReport = await customer.report({
            entity: "shopping_product",
            attributes: [
                "shopping_product.item_id",
                "shopping_product.merchant_center_id",
                "shopping_product.title",
                "shopping_product.status",
                "shopping_product.price_micros",
                "shopping_product.issues",
                "shopping_product.category_level1",
                "shopping_product.category_level2",
                "shopping_product.category_level3",
                "shopping_product.category_level4"
            ],
            metrics: [
                "metrics.impressions",
                "metrics.clicks",
                "metrics.ctr",
                "metrics.cost_micros",
            ],
            from_date: startDate,
            to_date: endDate,
            constraints, // Apply the dynamic constraints here
        });

        const productsData = [];

        // Process each row of the report
        for (const row of adsReport) {
            const merchantId = row.shopping_product.merchant_center_id || null;
            const itemId = row.shopping_product.item_id || null;
            const title = row.shopping_product.title || "Untitled";
            const statusCode = row.shopping_product.status || 0; // Default to 0 if not provided
            const status = ProductStatusEnum[statusCode] || "UNKNOWN";
            const priceMicros = row.shopping_product.price_micros || 0;
            const price = (priceMicros / 1_000_000).toFixed(2);
            const impressions = row.metrics.impressions || 0;
            const clicks = row.metrics.clicks || 0;
            const ctr = row.metrics.ctr || 0;
            const costMicros = row.metrics.cost_micros || 0;
            const cost = (costMicros / 1_000_000).toFixed(2);
            const issues = row.shopping_product.issues || [];

            // Add each product's data to the array
            productsData.push({
                merchantId,
                itemId,
                title,
                status,
                issues,
                price,
                impressions,
                clicks,
                ctr: ctr.toFixed(2),
                cost,
            });
        }

        return res.json({
            success: true,
            productsData,
        });
    } catch (error) {
        console.error("Failed to fetch product-level data:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}


export async function getGoogleProductMetricsByBrand(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate } = req.body;

    try {
        // Find the brand by ID
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found.",
            });
        }

        const adAccountId = brand.googleAdAccount;

        if (!adAccountId || adAccountId.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: "No Google ads account found for this brand",
            });
        }

        // Default date range to current month if not provided
        if (!startDate || !endDate) {
            startDate = moment().startOf("month").format("YYYY-MM-DD");
            endDate = moment().format("YYYY-MM-DD");
        }

        // Initialize Google Ads customer client
        const customer = client.Customer({
            customer_id: adAccountId,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        // Fetch report data from Google Ads
        const adsReport = await customer.report({
            entity: "shopping_product",
            attributes: ["shopping_product.brand"],
            metrics: [
                "metrics.impressions",
                "metrics.clicks",
                "metrics.ctr",
                "metrics.cost_micros",
            ],
            from_date: startDate,
            to_date: endDate,
        });

        // Aggregate metrics by brand
        const brandMetricsMap = {};

        for (const row of adsReport) {
            const brandName = row.shopping_product.brand || "Unknown Brand";
            const impressions = row.metrics.impressions || 0;
            const clicks = row.metrics.clicks || 0;
            const costMicros = row.metrics.cost_micros || 0;
            const cost = costMicros / 1_000_000;

            // Initialize metrics for the brand if not already done
            if (!brandMetricsMap[brandName]) {
                brandMetricsMap[brandName] = {
                    Brand: brandName,
                    Products: 0,
                    Clicks: 0,
                    Impressions: 0,
                    CTR: 0,
                    Cost: 0,
                };
            }

            // Update aggregated metrics
            brandMetricsMap[brandName].Products += 1;
            brandMetricsMap[brandName].Clicks += clicks;
            brandMetricsMap[brandName].Impressions += impressions;
            brandMetricsMap[brandName].CTR = 
            brandMetricsMap[brandName].Impressions > 0
                        ? ((brandMetricsMap[brandName].Clicks / brandMetricsMap[brandName].Impressions) * 100).toFixed(2)
                        : 0;
            brandMetricsMap[brandName].Cost += parseFloat(cost);
         
        }

        // Convert the brand metrics map to an array
        const brandsData = Object.values(brandMetricsMap).map(brands=>({
            ...brands,
            Cost: brands.Cost.toFixed(2)
        }));
        console.log(brandsData.length);

        return res.json({
            success: true,
            brandsData
        });
    } catch (error) {
        console.error("Failed to fetch brand metrics:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
}

export async function getGoogleProductMetricsByType(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate } = req.body;

    try {
        // Find the brand by ID
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found.",
            });
        }

        const adAccountId = brand.googleAdAccount;

        if (!adAccountId || adAccountId.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: "No Google ads account found for this brand",
            });
        }

        // Default date range to current month if not provided
        if (!startDate || !endDate) {
            startDate = moment().startOf("month").format("YYYY-MM-DD");
            endDate = moment().format("YYYY-MM-DD");
        }

        // Initialize Google Ads customer client
        const customer = client.Customer({
            customer_id: adAccountId,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        // Fetch report data from Google Ads
        const adsReport = await customer.report({
            entity: "shopping_product",
            attributes: ["shopping_product.product_type_level1"],
            metrics: [
                "metrics.impressions",
                "metrics.clicks",
                "metrics.ctr",
                "metrics.cost_micros",
            ],
            from_date: startDate,
            to_date: endDate,
        });

        // Aggregate metrics by type
        const typeMetricsMap = {};

        for (const row of adsReport) {
            const typeName = row.shopping_product.product_type_level1 || "Unknown type";
            const impressions = row.metrics.impressions || 0;
            const clicks = row.metrics.clicks || 0;
            const costMicros = row.metrics.cost_micros || 0;
            const cost = costMicros / 1_000_000;

            // Initialize metrics for the brand if not already done
            if (!typeMetricsMap[typeName]) {
                typeMetricsMap[typeName] = {
                    Type: typeName,
                    Products: 0,
                    Clicks: 0,
                    Impressions: 0,
                    CTR:0,
                    Cost: 0,
                    
                };
            }

            // Update aggregated metrics
            typeMetricsMap[typeName].Products += 1;
            typeMetricsMap[typeName].Clicks += clicks;
            typeMetricsMap[typeName].Impressions += impressions;
            typeMetricsMap[typeName].CTR = 
            typeMetricsMap[typeName].Impressions > 0
                        ? ((typeMetricsMap[typeName].Clicks / typeMetricsMap[typeName].Impressions) * 100).toFixed(2)
                        : 0;
            typeMetricsMap[typeName].Cost += parseFloat(cost);
           
        }

        // Convert the brand metrics map to an array
        const productTypesData = Object.values(typeMetricsMap).map(type => ({
            ...type,
            Cost: type.Cost.toFixed(2)
        }));
        console.log(productTypesData.length);

        return res.json({
            success: true,
            productTypesData
        });
    } catch (error) {
        console.error("Failed to fetch brand metrics:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
}
async function fetchProductCategoryMapping() {
    try {
        const customer = client.Customer({
            customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const response = await customer.query(`
            SELECT product_category_constant.resource_name, product_category_constant.localizations
            FROM product_category_constant
        `);

        const categoryMapping = {};

        for (const row of response) {
            const productCategory = row.product_category_constant;
            const localizations = productCategory.localizations || [];

            // Extract the localized name for "US" region and "en" language
            const localizedName = localizations
                .filter(
                    (localization) =>
                        localization.region_code === "US" && localization.language_code === "en"
                )
                .map((localization) => localization.value)
                .find((value) => value !== undefined);

            // If no localized name found, assign a default category name
            categoryMapping[productCategory.resource_name] = localizedName || "Unnamed Category";
        }

        return categoryMapping;
    } catch (error) {
        console.error("Failed to fetch product category mappings:", error);
        return {};
    }
}


export async function getGoogleProductMetricsByCategory(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate } = req.body;

    try {
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found.",
            });
        }

        const adAccountId = brand.googleAdAccount;

        if (!adAccountId || adAccountId.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: "No Google ads account found for this brand",
            });
        }

        // Default date range to current month if not provided
        if (!startDate || !endDate) {
            startDate = moment().startOf("month").format("YYYY-MM-DD");
            endDate = moment().format("YYYY-MM-DD");
        }

        // Initialize Google Ads customer client
        const customer = client.Customer({
            customer_id: adAccountId,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const categoryMapping = await fetchProductCategoryMapping();

        const adsReport = await customer.report({
            entity: "shopping_product",
            attributes: [
                "shopping_product.category_level1",
                "shopping_product.category_level2",
                "shopping_product.category_level3",
                "shopping_product.category_level4",
                "shopping_product.category_level5",
            ],
            metrics: [
                "metrics.impressions",
                "metrics.clicks",
                "metrics.cost_micros",
            ],
            from_date: startDate,
            to_date: endDate,
        });

        const categoryHierarchy = {};

        // Iterate through the report and build the category hierarchy
        for (const row of adsReport) {
            const levels = [
                row.shopping_product.category_level1 || "Unknown Level 1",
                row.shopping_product.category_level2 || "Unknown Level 2",
                row.shopping_product.category_level3 || "Unknown Level 3",
                row.shopping_product.category_level4 || "Unknown Level 4",
                row.shopping_product.category_level5 || "Unknown Level 5",
            ].map((level) => {
                const categoryKey = level.split("/")[1];
        
                if (categoryKey) {
                    return categoryMapping[`productCategoryConstants/${categoryKey}`] || level;
                }
                return level;
            });
        
            const impressions = row.metrics.impressions || 0;
            const clicks = row.metrics.clicks || 0;
            const costMicros = row.metrics.cost_micros || 0;
            const cost = costMicros / 1_000_000;
        
            let currentLevel = categoryHierarchy;
            for (let i = 0; i < levels.length; i++) {
                const levelName = levels[i];
        
                if (levelName.startsWith("Unknown")) {
                    break;
                }
        
                if (!currentLevel[levelName]) {
                    currentLevel[levelName] = {
                        level: `category_level-Not Known`,
                        metrics: {
                            products: 0,
                            totalClicks: 0,
                            totalImpressions: 0,
                            totalCost: 0,
                            ctr: 0,
                        },
                        subcategories: {},
                    };
                }
                currentLevel[levelName].level = `category_level${i + 1}`,
                currentLevel[levelName].metrics.products += 1;
                currentLevel[levelName].metrics.totalClicks += clicks;
                currentLevel[levelName].metrics.totalImpressions += impressions;
                currentLevel[levelName].metrics.totalCost += cost;
        
                // Correct CTR calculation
                currentLevel[levelName].metrics.ctr = 
                    currentLevel[levelName].metrics.totalImpressions > 0
                        ? (currentLevel[levelName].metrics.totalClicks / currentLevel[levelName].metrics.totalImpressions) * 100
                        : 0;
        
                currentLevel = currentLevel[levelName].subcategories;
            }
        }
        

        const convertToArray = (levelMap) => {
            return Object.entries(levelMap).map(([name, data]) => ({
                name,
                level: data.level, 
                metrics: data.metrics,
                subcategories: convertToArray(data.subcategories),
            }));
        };

        const categoriesData = convertToArray(categoryHierarchy);
        return res.json({
            success: true,
            categoriesData
        });

    } catch (error) {
        console.error("Failed to fetch product-level metrics:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
}

async function fetchProductCategoryResourceMapping() {
    try {
        const customer = client.Customer({
            customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const response = await customer.query(`
            SELECT product_category_constant.resource_name, product_category_constant.localizations
            FROM product_category_constant
        `);

        const categoryMapping = {};

        // Reverse the mapping: from localized name -> resource_name
        for (const row of response) {
            const productCategory = row.product_category_constant;
            const localizations = productCategory.localizations || [];

            // Extract the localized name for "US" region and "en" language
            localizations.forEach(localization => {
                if (localization.region_code === "US" && localization.language_code === "en") {
                    const localizedName = localization.value;
                    categoryMapping[localizedName] = productCategory.resource_name;
                }
            });
        }

        return categoryMapping;
    } catch (error) {
        console.error("Failed to fetch product category mappings:", error);
        return {};
    }
}


const fetchCampaignNameById = async (customer, campaignId) => {
    try {
        // Query for the campaign name
        const campaignData = await customer.report({
            entity: "campaign",
            attributes: [
                "campaign.id",
                "campaign.name",
            ],
            constraints: [
                `campaign.id = ${campaignId}`, // Filter by campaign ID
            ],
            limit: 1, // Since we are querying a specific campaign
        });

        if (campaignData.length > 0) {
            const campaign = campaignData[0];
            return campaign.campaign.name || "Unknown Campaign Name";
        } else {
            console.warn(`No campaign found for ID: ${campaignId}`);
            return "Campaign Not Found";
        }
    } catch (error) {
        console.error("Error fetching campaign name:", error);
        throw new Error("Failed to fetch campaign name.");
    }
};


const SearchTermStatusEnum = {
    0: "UNSPECIFIED",
    1: "UNKNOWN",
    2: "ADDED",
    3: "EXCLUDED",
    4: "ADDED_EXCLUDED",
    5: "NONE"
};

const SearchTermMatchEnum = {
    0: "UNSPECIFIED",
    1: "UNKNOWN",
    2: "BROAD",
    3: "EXACT",
    4: "PHRASE",
    5: "NEAR_EXACT",
    6: "NEAR_PHRASE"
}

export async function getSearchTermMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, limit } = req.body;
    const pageToken = req.query.pageToken;  // Extract pageToken from query parameters
    
    // Default to 100 rows per page if no limit is provided
    limit = limit || 100;

    try {
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found.',
            });
        }

        const adAccountId = brand.googleAdAccount;

        if (!adAccountId || adAccountId.length === 0) {
            return res.json({
                success: true,
                data: {},
                message: "No Google Ads account found for this brand",
            });
        }

        if (!startDate || !endDate) {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
            endDate = moment().format('YYYY-MM-DD');
        }

        const customer = client.Customer({
            customer_id: adAccountId,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const adsReport = await customer.report({
            entity: "search_term_view",
            attributes: [
                "search_term_view.search_term",
                "search_term_view.status",
                "campaign.name",
                "search_term_view.ad_group",
                "ad_group.name"
            ],
            metrics: [
                "metrics.impressions",
                "metrics.clicks",
                "metrics.ctr",
                "metrics.cost_micros",
            ],
            from_date: startDate,
            to_date: endDate,
            segments: ["segments.search_term_match_type"],
            page_token: pageToken,  // Use the pageToken from the query parameters
            limit: limit,  // Set the limit to control how many rows to fetch per request
        });

        const searchTermData = [];

        for (const row of adsReport) {
            const searchTerm = row.search_term_view.search_term || " ";
            const matchTypeCode = row.segments.search_term_match_type;
            const matchType = SearchTermMatchEnum[matchTypeCode] || "UNKNOWN";
            const statusCode = row.search_term_view.status || 0; 
            const status = SearchTermStatusEnum[statusCode] || "UNKNOWN";
            const campaignName = row.campaign.name || "Unknown Campaign";
            const adGroup = row.ad_group.name || "Unknown Ad Group";
           
            const impressions = row.metrics.impressions || 0;
            const clicks = row.metrics.clicks || 0;
            const ctr = row.metrics.ctr || 0;
            const costMicros = row.metrics.cost_micros || 0;
            const cost = (costMicros / 1_000_000).toFixed(2);
         
            searchTermData.push({
                searchTerm,
                matchType,
                status,
                campaignName,
                adGroup,
                impressions,
                clicks,
                ctr: ctr.toFixed(2),
                cost,
            });
        }

        // Check if there is a nextPageToken to support pagination
        const nextPageToken = adsReport.nextPageToken || null;

        return res.json({
            success: true,
            searchTermData,
            nextPageToken,  // Return the nextPageToken to the frontend for subsequent requests
        });
    } catch (error) {
        console.error("Failed to fetch Search Term data:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}



