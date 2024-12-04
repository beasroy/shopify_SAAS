import moment from 'moment';
import Brand from '../models/Brands.js';
import { GoogleAdsApi } from "google-ads-api";
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Array to store cache keys for tracking
let cacheKeys = [];

const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
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

const ageRanges = {
    0: "UNSPECIFIED",
    1: "UNKNOWN",
    503001: "AGE_RANGE_18_24",
    503002: "AGE_RANGE_25_34",
    503003: "AGE_RANGE_35_44",
    503004: "AGE_RANGE_45_54",
    503005: "AGE_RANGE_55_64",
    503006: "AGE_RANGE_65_UP",
    503999: "AGE_RANGE_UNDETERMINED",
};

const genderTypes = {
    0: "UNSPECIFIED",
    1: "UNKNOWN",
    10: "MALE",
    11: "FEMALE",
    20: "UNDETERMINED"
}

const campaignStatus = {
    0: "UNSPECIFIED",
    1: "UNKNOWN",
    2: "ENABLED",
    3: "PAUSED",
    4: "REMOVED",
}

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
    let { startDate, endDate, brands, productType, categoryName, categoryLevel,status } = req.body;

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
        const queryStatus = sanitizeForGoogleAds(status);
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

        if(queryStatus){
            constraints.push(`shopping_product.status = '${queryStatus}'`);
        }
        constraints.push(`metrics.cost_micros > 1000000`);

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
                "metrics.cost_micros",
                "metrics.conversions",
                "metrics.conversions_value",
                "metrics.conversions_from_interactions_rate"
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
            const costMicros = row.metrics.cost_micros || 0;
            const cost = (costMicros / 1_000_000).toFixed(2);
            const issues = row.shopping_product.issues || [];
            const conversions = row.metrics.conversions || 0;
            const conversionsValue = row.metrics.conversions_value || 0;
            const avg_cpc = clicks > 0?((cost/clicks)).toFixed(2):0 || 0;
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
            const conversion_rate = row.metrics.conversions_from_interactions_rate || 0;
            const roas = cost > 0 ? (conversionsValue / cost).toFixed(2) : 0.00;

            // Add each product's data to the array
            productsData.push({
                merchantId,
                itemId,
                title,
                status,
                issues,
                price,
                cost,
                roas,
                conversions,
                conversionsValue,
                conversionsRate: conversion_rate,
                clicks,
                ctr: ctr,
                avg_cpc 
            });
        }

        const ProductStatusOptions = [
            ...new Set(productsData.map(item => item.status))
        ];

        return res.json({
            success: true,
            productsData,
            ProductStatusOptions
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

        const constraints = [];

        constraints.push(`metrics.cost_micros > 1000000`);

        // Fetch report data from Google Ads
        const adsReport = await customer.report({
            entity: "shopping_product",
            attributes: ["shopping_product.brand"],
            metrics: [
                "metrics.impressions",
                "metrics.clicks",
                "metrics.cost_micros",
                "metrics.conversions",
                "metrics.conversions_value",
                "metrics.conversions_from_interactions_rate"
            ],
            constraints,
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
            const cost = (costMicros / 1_000_000).toFixed(2);
            const conversions = row.metrics.conversions || 0;
            const conversionsValue = row.metrics.conversions_value || 0;
            const conversion_rate = row.metrics.conversions_from_interactions_rate || 0;

            // Initialize metrics for the brand if not already done
            if (!brandMetricsMap[brandName]) {
                brandMetricsMap[brandName] = {
                    "Brand": brandName,
                    "Products": 0,
                    "Cost": 0,
                    "ROAS":0,
                    "Conversions":0,
                    "Conv. Value": 0,
                    "Conv. Rate": 0,
                    "Clicks": 0,
                    "CTR": 0,
                    "Avg. CPC": 0
                };
            }

            // Update aggregated metrics
            brandMetricsMap[brandName].Products += 1;
            brandMetricsMap[brandName].Impressions += impressions;
            brandMetricsMap[brandName].Cost += parseFloat(cost);
            brandMetricsMap[brandName].Conversions = Number(
                (brandMetricsMap[brandName].Conversions + conversions).toFixed(2)
              );
              
            brandMetricsMap[brandName]["Conv. Value"] = Number(
                (brandMetricsMap[brandName]["Conv. Value"] + conversionsValue).toFixed(2)
            );
              
            brandMetricsMap[brandName]["Conv. Rate"] = Number(
                (brandMetricsMap[brandName]["Conv. Rate"] + conversion_rate).toFixed(2)
            );
            brandMetricsMap[brandName].ROAS=
            brandMetricsMap[brandName].Cost > 0
            ? ((brandMetricsMap[brandName]["Conv. Value"] / brandMetricsMap[brandName].Cost) * 100).toFixed(2)
            : 0;
            brandMetricsMap[brandName].Clicks += clicks;
            brandMetricsMap[brandName].CTR =
            brandMetricsMap[brandName].Impressions > 0
                ? ((brandMetricsMap[brandName].Clicks / brandMetricsMap[brandName].Impressions) * 100).toFixed(2)
                : 0;
            brandMetricsMap[brandName]["Avg. CPC"]=
            brandMetricsMap[brandName].Clicks > 0
            ? ((brandMetricsMap[brandName].Cost / brandMetricsMap[brandName].Clicks)).toFixed(2)
            : 0.00;

        }

        // Convert the brand metrics map to an array
        const brandsData = Object.values(brandMetricsMap).map(({ Impressions, ...brands }) => ({
            ...brands,
            Cost: brands.Cost.toFixed(2)
        }));

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

        const constraints = [];

        constraints.push(`metrics.cost_micros > 1000000`);

        // Fetch report data from Google Ads
        const adsReport = await customer.report({
            entity: "shopping_product",
            attributes: ["shopping_product.product_type_level1"],
            metrics: [
                "metrics.impressions",
                "metrics.clicks",
                "metrics.cost_micros",
                "metrics.conversions",
                "metrics.conversions_value",
                "metrics.conversions_from_interactions_rate"
            ],
            from_date: startDate,
            to_date: endDate,
            constraints
        });

        // Aggregate metrics by type
        const typeMetricsMap = {};

        for (const row of adsReport) {
            const typeName = row.shopping_product.product_type_level1 || "Unknown type";
            const impressions = row.metrics.impressions || 0;
            const clicks = row.metrics.clicks || 0;
            const costMicros = row.metrics.cost_micros || 0;
            const cost = (costMicros / 1_000_000).toFixed(2);
            const conversions = row.metrics.conversions || 0;
            const conversionsValue = row.metrics.conversions_value || 0;
            const conversion_rate = row.metrics.conversions_from_interactions_rate || 0;

            // Initialize metrics for the brand if not already done
            if (!typeMetricsMap[typeName]) {
                typeMetricsMap[typeName] = {
                    "Type": typeName,
                    "Products": 0,
                    "Cost": 0,
                    "ROAS":0,
                    "Conversions":0,
                    "Conv. Value": 0,
                    "Conv. Rate": 0,
                    "Clicks": 0,
                    "CTR": 0,
                    "Avg. CPC": 0
                };
            }

            // Update aggregated metrics
            typeMetricsMap[typeName].Products += 1;
            typeMetricsMap[typeName].Impressions += impressions;
            typeMetricsMap[typeName].Cost += parseFloat(cost);
            typeMetricsMap[typeName].Conversions = Number(
                (typeMetricsMap[typeName].Conversions + conversions).toFixed(2)
              );
              
              typeMetricsMap[typeName]["Conv. Value"] = Number(
                (typeMetricsMap[typeName]["Conv. Value"] + conversionsValue).toFixed(2)
              );
              
              typeMetricsMap[typeName]["Conv. Rate"] = Number(
                (typeMetricsMap[typeName]["Conv. Rate"] + conversion_rate).toFixed(2)
              );
            typeMetricsMap[typeName].ROAS=
            typeMetricsMap[typeName].Cost > 0
            ? ((typeMetricsMap[typeName]["Conv. Value"] / typeMetricsMap[typeName].Cost) * 100).toFixed(2)
            : 0;
            typeMetricsMap[typeName].Clicks += clicks;
            typeMetricsMap[typeName].CTR =
            typeMetricsMap[typeName].Impressions > 0
                ? ((typeMetricsMap[typeName].Clicks / typeMetricsMap[typeName].Impressions) * 100).toFixed(2)
                : 0;
            typeMetricsMap[typeName]["Avg. CPC"]=
            typeMetricsMap[typeName].Clicks > 0
            ? ((typeMetricsMap[typeName].Cost / typeMetricsMap[typeName].Clicks)).toFixed(2)
            : 0.00;

        }
        const productTypesData = Object.values(typeMetricsMap).map(({ Impressions, ...type }) => ({
            ...type,
            Cost: type.Cost.toFixed(2)
        }));

      
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

const generateCacheKeyForCategory = (brandId, startDate, endDate) => {
    const dates = {
        startDate: startDate || moment().startOf('month').format('YYYY-MM-DD'),
        endDate: endDate || moment().format('YYYY-MM-DD')
    };
    return `category:${brandId}:${dates.startDate}:${dates.endDate}}`;
};
export async function getGoogleProductMetricsByCategory(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, page, limit } = req.body;

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

        page = parseInt(page) || 1; // Default to 1
        limit = parseInt(limit) || 100; // Default to 10

        // Initialize Google Ads customer client
        const customer = client.Customer({
            customer_id: adAccountId,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const categoryCacheKey = generateCacheKeyForCategory(brandId, startDate, endDate);
        let cachedData = cache.get(categoryCacheKey);
        if (cachedData) {
            const totalRecords = cachedData.categoriesData.length; // Correct property name
            const totalPages = Math.ceil(totalRecords / limit);
            const startIndex = (page - 1) * limit;

            return res.json({
                success: true,
                currentPage: page,
                totalPages,
                totalRecords,
                categoriesData: cachedData.categoriesData.slice(startIndex, startIndex + limit),
                fromCache: true,
            });
        }

        const categoryMapping = await fetchProductCategoryMapping();
        const constraints = [];

        constraints.push(`metrics.cost_micros > 1000000`);

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
                "metrics.conversions",
                "metrics.conversions_value",
                "metrics.conversions_from_interactions_rate"
            ],
            constraints,
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
            const conversions = row.metrics.conversions || 0;
            const conversionsValue = row.metrics.conversions_value || 0;
            const conversion_rate = row.metrics.conversions_from_interactions_rate || 0;

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
                            totalCost: 0,
                            ROAS: 0,
                            conversions,
                            ConversionValue: 0,
                            ConversionRate: 0,
                            totalClicks: 0,
                            ctr: 0,
                            AvgCPC: 0,
                        },
                        subcategories: {},
                    };
                }
                currentLevel[levelName].level = `category_level${i + 1}`,
                currentLevel[levelName].metrics.products += 1;
                currentLevel[levelName].metrics.totalImpressions += impressions;
                currentLevel[levelName].metrics.totalCost = (currentLevel[levelName].metrics.totalCost + cost).toFixed(2);
                currentLevel[levelName].metrics.totalCost = parseFloat(currentLevel[levelName].metrics.totalCost);
                currentLevel[levelName].metrics.conversions += conversions;
                currentLevel[levelName].metrics.ConversionValue += conversionsValue;
                currentLevel[levelName].metrics.ConversionRate += conversion_rate;
                currentLevel[levelName].metrics.ROAS=
                    currentLevel[levelName].metrics.totalCost > 0
                    ? ((currentLevel[levelName].metrics.ConversionValue / currentLevel[levelName].metrics.totalCost) * 100).toFixed(2)
                    : 0;
                currentLevel[levelName].metrics.totalClicks += clicks;
                currentLevel[levelName].metrics.ctr =
                    currentLevel[levelName].metrics.totalImpressions > 0
                    ? (currentLevel[levelName].metrics.totalClicks / currentLevel[levelName].metrics.totalImpressions) * 100
                    : 0;
                currentLevel[levelName].metrics.AvgCPC=
                        currentLevel[levelName].metrics.totalClicks > 0
                        ? ((currentLevel[levelName].metrics.totalCost / currentLevel[levelName].metrics.totalClicks)).toFixed(2)
                        : 0.00;
                currentLevel = currentLevel[levelName].subcategories;
            }
        }


        const convertToArray = (levelMap) => {
            return Object.entries(levelMap).map(([name, data]) => ({
                name,
                level: data.level,
                metrics: Object.fromEntries(
                    Object.entries(data.metrics).filter(([key]) => key !== 'totalImpressions')
                ),
                subcategories: convertToArray(data.subcategories),
            }));
        };
        

        const categoriesData = convertToArray(categoryHierarchy);

        // Cache the search terms data
        cache.set(categoryCacheKey, {
            categoriesData: categoriesData,

        });
        const totalRecords = categoriesData.length;
        const totalPages = Math.ceil(totalRecords / limit);
        const startIndex = (page - 1) * limit;

        return res.json({
            success: true,
            totalRecords,
            totalPages,
            categoriesData: categoriesData.slice(startIndex, startIndex + limit),
            fromCache: false,
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


// Helper function to generate a cache key
const generateCacheKeyForSearchTerm = (brandId, startDate, endDate, campaign, adGroup, status) => {
    const dates = {
        startDate: startDate || moment().startOf('month').format('YYYY-MM-DD'),
        endDate: endDate || moment().format('YYYY-MM-DD')
    };
    return `searchTerms:${brandId}:${dates.startDate}:${dates.endDate}:searchTermStatus:${status || ''}:campaign:${campaign || ''}:adGroup:${adGroup || ''}`;
};

// Main function to get search term metrics
export async function getSearchTermMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, limit, page, campaign, adGroup, status } = req.body;

    try {
        // Check if brandId is provided
        if (!brandId) {
            return res.status(400).json({ success: false, message: 'Brand ID is required' });
        }

        // Find the brand and validate its googleAdAccount
        const brand = await Brand.findById(brandId).select('googleAdAccount').lean();
        if (!brand?.googleAdAccount) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'No Google Ads account found for this brand',
                data: []
            });
        }

        const searchTermsCacheKey = generateCacheKeyForSearchTerm(brandId, startDate, endDate, campaign, adGroup, status);
        const pairsCacheKey = `pairs_${brandId}`;
        const statusCacheKey = `status_${brandId}`;

        // Always check for cached pairs and status first
        let campaignAdGroupPairs = cache.get(pairsCacheKey);
        let statusOptions = cache.get(statusCacheKey);
        const noFiltersApplied = !campaign && !adGroup && !status;

        // Check for cached search terms data
        let cachedData = cache.get(searchTermsCacheKey);
        if (cachedData) {
            const totalRecords = cachedData.searchTermData.length;
            const totalPages = Math.ceil(totalRecords / limit);
            const startIndex = (page - 1) * limit;

            return res.json({
                success: true,
                currentPage: page,
                totalPages,
                totalRecords,
                data: cachedData.searchTermData.slice(startIndex, startIndex + limit),
                campaignAdGroupPairs: campaignAdGroupPairs || cachedData.campaignAdGroupPairs,
                statusOptions: statusOptions || cachedData.statusOptions,
                fromCache: true
            });
        }

        // Fetch new data from Google Ads
        const dates = {
            from_date: startDate || moment().startOf('month').format('YYYY-MM-DD'),
            to_date: endDate || moment().format('YYYY-MM-DD')
        };

        const constraints = [];

        if (status) {
            constraints.push(`search_term_view.status = '${sanitizeForGoogleAds(status)}'`);
        }

        if (campaign) {
            constraints.push(`campaign.name = '${sanitizeForGoogleAds(campaign)}'`);
        }

        if (adGroup) {
            constraints.push(`ad_group.name = '${sanitizeForGoogleAds(adGroup)}'`);
        }

        const customer = client.Customer({
            customer_id: brand.googleAdAccount,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const reportConfig = {
            entity: "search_term_view",
            attributes: [
                "search_term_view.search_term",
                "search_term_view.status",
                "campaign.name",
                "ad_group.name",
            ],
            metrics: [
                "metrics.impressions",
                "metrics.clicks",
                "metrics.cost_micros",
                "metrics.conversions",
                "metrics.conversions_value",
                "metrics.conversions_from_interactions_rate"
            ],
            segments: ["segments.search_term_match_type"],
            ...dates,
            constraints
        };

        const adsReport = await customer.report(reportConfig);

        // Process data
        const processedData = adsReport.reduce((acc, row) => {
            const campaignName = row.campaign.name || "Unknown Campaign";
            const adGroupName = row.ad_group.name || "Unknown Ad Group";
            const currentStatus = row.search_term_view.status || 0;
            const clicks = row.metrics.clicks || 0;
            const cost = ((row.metrics.cost_micros || 0) / 1_000_000).toFixed(2);
            const impressions = row.metrics.impressions || 0;
            const conversions = row.metrics.conversions || 0;
            const conversionsValue = row.metrics.conversions_value || 0;
            const avg_cpc = clicks > 0?((cost/clicks)).toFixed(2):0 || 0;
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
            const conversionsRate = row.metrics.conversions_from_interactions_rate || 0;
            const roas = cost > 0 ? (conversionsValue / cost).toFixed(2) : 0.00;
          

            acc.searchTermData.push({
                searchTerm: row.search_term_view.search_term || " ",
                matchType: SearchTermMatchEnum[row.segments.search_term_match_type] || "UNKNOWN",
                status: SearchTermStatusEnum[currentStatus] || "UNKNOWN",
                campaignName,
                adGroupName,
                cost,
                roas,
                conversions,
                conversionsValue,
                conversionsRate,
                clicks,
                ctr,
                avg_cpc   
            });

     
            acc.totalCost += parseFloat(cost);

            // Only collect status if no cached status exists and no filters applied
            if (!statusOptions && noFiltersApplied) {
                acc.statusSet.add(currentStatus);
            }

            // Only build the campaign-ad group map if we don't have cached pairs
            // and no filters are applied
            if (!campaignAdGroupPairs && noFiltersApplied) {
                if (!acc.campaignAdGroupMap[campaignName]) {
                    acc.campaignAdGroupMap[campaignName] = new Set();
                }
                acc.campaignAdGroupMap[campaignName].add(adGroupName);
            }

            return acc;
        }, {
            searchTermData: [],
            campaignAdGroupMap: {},
            statusSet: new Set(),
            totalCost: 0,
        });

        const averageCost = processedData.searchTermData.length > 0 ? (processedData.totalCost / processedData.searchTermData.length).toFixed(2) : 0;

        // Add a new field for each search term based on the average cost
        processedData.searchTermData = processedData.searchTermData.map(term => {
            term.performance = parseFloat(term.cost) < parseFloat(averageCost) ? "Non Performing Keyword" : "Best Performing Keyword";
             return term;
        });

        console.log("Average Cost for All Search Terms:", averageCost);

        // If no filters applied and no cached data exists, create and cache the data
        if (noFiltersApplied) {
            // Cache campaign-ad group pairs if not already cached
            if (!campaignAdGroupPairs) {
                campaignAdGroupPairs = Object.entries(processedData.campaignAdGroupMap).map(([campaignName, adGroups]) => ({
                    campaignName,
                    adGroups: Array.from(adGroups)
                }));

                cache.set(pairsCacheKey, campaignAdGroupPairs);
                console.log('Cached campaign-ad group pairs for brand:', brandId);
            }

            // Cache status options if not already cached
            if (!statusOptions) {
                // Create the status labels directly from processedData
                statusOptions = Array.from(processedData.statusSet).map(status =>
                    SearchTermStatusEnum[status] || "UNKNOWN"
                );
                cache.set(statusCacheKey, statusOptions);
                console.log('Cached status labels for brand:', brandId);
            }

        }

        // Cache the search terms data
        cache.set(searchTermsCacheKey, {
            searchTermData: processedData.searchTermData,
            campaignAdGroupPairs: campaignAdGroupPairs || [],
            statusOptions: statusOptions || []
        });

        // Track the cache key for search terms
        cacheKeys.push(searchTermsCacheKey);

        // Paginate and respond
        const totalRecords = processedData.searchTermData.length;
        const totalPages = Math.ceil(totalRecords / limit);
        const startIndex = (page - 1) * limit;

        return res.json({
            success: true,
            currentPage: page,
            totalPages,
            totalRecords,
            data: processedData.searchTermData.slice(startIndex, startIndex + limit),
            campaignAdGroupPairs,
            statusOptions,
            fromCache: false
        });

    } catch (error) {
        console.error("Failed to fetch Search Term data:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message
        });
    }
}



export async function getAudienceMetricsByAge(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, campaign, adGroup, limit, page, agerange, status } = req.body;

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
                message: "No Google Ads account found for this brand.",
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

        // Construct cache keys
        const AudienceAgeCacheKey = `audienceAgeMetrics:${brandId}:startDate:${startDate || "defaultStart"}:endDate:${endDate || "defaultEnd"}:campaign:${campaign || ''}:adGroup:${adGroup || ''}:agerange:${agerange || ''}:status:${status || ''}`;
        const audienceAgePairsCacheKey = `audienceAgeMetrics:pairs_${brandId}`;
        const audienceAgeStatusCacheKey = `audienceAgeMetrics:status_${brandId}`;

        // Parse pagination parameters
        limit = parseInt(limit || 100);
        page = parseInt(page || 1);

        // Check if no filters are applied
        const noFiltersApplied = !campaign && !adGroup && !status && !agerange;

        // Check if data is cached
        const cachedData = cache.get(AudienceAgeCacheKey);
        let ageCampaignAdGroupPairs = null;
        let ageStatusOptions = null;

        ageCampaignAdGroupPairs = cache.get(audienceAgePairsCacheKey);
        ageStatusOptions = cache.get(audienceAgeStatusCacheKey);
    

        if (cachedData) {
            const { ageData, ageRangeAggregatedMetrics } = cachedData;
            const totalRecords = ageData.length;
            const totalPages = Math.ceil(totalRecords / limit);
            const startIndex = (page - 1) * limit;

            return res.json({
                success: true,
                totalRecords,
                totalPages,
                ageData: ageData.slice(startIndex, startIndex + limit),
                ageRangeAggregatedMetrics,
                campaignAdGroupPairs: ageCampaignAdGroupPairs || [],
                statusOptions: ageStatusOptions || [],
                fromCache: true
            });
        }

        // Construct constraints for Google Ads query
        const constraints = [];
        if (agerange) constraints.push(`ad_group_criterion.age_range.type = '${sanitizeForGoogleAds(agerange)}'`);
        
        if (campaign) constraints.push(`campaign.name = '${sanitizeForGoogleAds(campaign)}'`);
        
        if (adGroup) constraints.push(`ad_group.name = '${sanitizeForGoogleAds(adGroup)}'`);
        
        if (status) constraints.push(`campaign.status = '${sanitizeForGoogleAds(status)}'`);
        
        // Fetch report data from Google Ads
        const adsReport = await customer.report({
            entity: "age_range_view",
            attributes: ["campaign.name", "ad_group.name", "ad_group_criterion.age_range.type", "campaign.status", "ad_group.status"],
            metrics: ["metrics.impressions",
                "metrics.clicks",
                "metrics.cost_micros",
                "metrics.conversions",
                "metrics.conversions_value",
                "metrics.conversions_from_interactions_rate"],
            from_date: startDate,
            to_date: endDate,
            constraints
        });

        // Map data to a readable format
        const ageData = adsReport.map((row) => {
            const ageRangeKey = row.ad_group_criterion.age_range.type;
            const ageRange = ageRanges[ageRangeKey] || "UNKNOWN";
            const campaignName = row.campaign.name || "Unknown Campaign";
            const adGroupName = row.ad_group.name || "Unknown Ad Group";
            const currentStatus = row.campaign.status || 0;
            const clicks = row.metrics.clicks || 0;
            const cost = ((row.metrics.cost_micros || 0) / 1_000_000).toFixed(2);
            const impressions = row.metrics.impressions || 0;
            const conversions = row.metrics.conversions || 0;
            const conversionsValue = row.metrics.conversions_value || 0;
            const avg_cpc = clicks > 0?((cost/clicks)).toFixed(2):0 || 0;
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
            const conversionsRate = row.metrics.conversions_from_interactions_rate || 0;
            const roas = cost > 0 ? (conversionsValue / cost).toFixed(2) : 0.00;
            return {
                campaignName,
                adGroupName,
                campaignStatus: campaignStatus[currentStatus],
                adGroupStatus: row.ad_group.status,
                ageRange,
                cost,roas,conversions,conversionsValue,conversionsRate,clicks,ctr,avg_cpc
            };
        });

        const filteredData = ageData.filter((data) => data.campaignStatus === "ENABLED" && data.adGroupStatus === 2);

        const ageRangeAggregatedMetrics = filteredData.reduce((acc, data) => {
            const { ageRange } = data;
        
            if (!acc[ageRange]) {
                acc[ageRange] = {
                    totalConversions: 0,
                    totalClicks: 0,
                    totalCost: 0,
                    totalCTR: 0,
                };
            }
        
            acc[ageRange].totalConversions = parseFloat(
                (acc[ageRange].totalConversions + data.conversions).toFixed(2)
            );
            acc[ageRange].totalClicks += data.clicks;
            acc[ageRange].totalCost = parseFloat(
                (acc[ageRange].totalCost + parseFloat(data.cost)).toFixed(2)
            );
            acc[ageRange].totalCTR = parseFloat(
                (acc[ageRange].totalCTR + parseFloat(data.ctr)).toFixed(2) // Ensure `data.ctr` is a number
            );
        
            return acc;
        }, {});
        

        // Generate campaign-adgroup pairs and status options ONLY when:
        // 1. No filters are applied AND
        // 2. No cache exists for pairs or statuses
        if (noFiltersApplied && (!ageCampaignAdGroupPairs || !ageStatusOptions)) {
            const campaignAdGroupMap = ageData.reduce((acc, item) => {
                if (!acc[item.campaignName]) {
                    acc[item.campaignName] = {
                        campaignName: item.campaignName,
                        adGroups: []
                    };
                }
                
                // Add unique ad groups
                if (!acc[item.campaignName].adGroups.includes(item.adGroupName)) {
                    acc[item.campaignName].adGroups.push(item.adGroupName);
                }
                
                return acc;
            }, {});

            // Update campaign-adgroup pairs if not cached
            ageCampaignAdGroupPairs = Object.values(campaignAdGroupMap);
            cache.set(audienceAgePairsCacheKey, ageCampaignAdGroupPairs);

            // Update status options if not cached
            ageStatusOptions = [
                ...new Set(ageData.map(item => item.campaignStatus))
            ];
            cache.set(audienceAgeStatusCacheKey, ageStatusOptions);
        }
        
        // Store data in cache
        cache.set(AudienceAgeCacheKey, { ageData, ageRangeAggregatedMetrics,ageCampaignAdGroupPairs,ageStatusOptions });

        // Paginate and respond
        const totalRecords = ageData.length;
        const totalPages = Math.ceil(totalRecords / limit);
        const startIndex = (page - 1) * limit;

        return res.json({
            success: true,
            totalRecords,
            totalPages,
            ageData: ageData.slice(startIndex, startIndex + limit),
            ageRangeAggregatedMetrics,
            campaignAdGroupPairs: ageCampaignAdGroupPairs || [],
            statusOptions: ageStatusOptions || [],
            fromCache: false
        });
    } catch (error) {
        console.error("Failed to fetch age metrics:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
}


export async function getAudienceMetricsByGender(req,res){
    const {brandId} = req.params;
    let {startDate, endDate, campaign, adGroup,status,gender, limit, page} = req.body;
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
                message: "No Google Ads account found for this brand.",
            });
        }

        // Default date range to current month if not provided
        if (!startDate || !endDate) {
            startDate = moment().startOf("month").format("YYYY-MM-DD");
            endDate = moment().format("YYYY-MM-DD");
        }
        
        const customer = client.Customer({
            customer_id: brand.googleAdAccount,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });
         // Construct cache keys
        const AudienceGenderCacheKey = `audienceGenderMetrics:${brandId}:startDate:${startDate || "defaultStart"}:endDate:${endDate || "defaultEnd"}:campaign:${campaign || ''}:adGroup:${adGroup || ''}:gender:${gender || ''}:status:${status || ''}`;
        const audienceGenderPairsCacheKey = `audienceGenderMetrics:pairs_${brandId}`;
        const audienceGenderStatusCacheKey = `audienceGenderMetrics:status_${brandId}`;
        const noFiltersApplied = !campaign && !adGroup && !status && !gender;

        const cachedData = cache.get(AudienceGenderCacheKey);
        let genderCampaignAdGroupPairs = null;
        let genderStatusOptions = null;

        genderCampaignAdGroupPairs = cache.get(audienceGenderPairsCacheKey);
        genderStatusOptions = cache.get(audienceGenderStatusCacheKey);
    

        if (cachedData) {
            const { genderData, aggregatedRecords } = cachedData;
            const totalRecords = genderData.length;
            const totalPages = Math.ceil(totalRecords / limit);
            const startIndex = (page - 1) * limit;

            return res.json({
                success: true,
                totalRecords,
                totalPages,
                genderData: genderData.slice(startIndex, startIndex + limit),
                aggregatedRecords,
                campaignAdGroupPairs: genderCampaignAdGroupPairs || [],
                statusOptions: genderStatusOptions || [],
                fromCache: true
            });
        }

        const constraints = [];
        if (gender) constraints.push(`ad_group_criterion.gender.type = '${sanitizeForGoogleAds(gender)}'`);
        
        if (campaign) constraints.push(`campaign.name = '${sanitizeForGoogleAds(campaign)}'`);
        
        if (adGroup) constraints.push(`ad_group.name = '${sanitizeForGoogleAds(adGroup)}'`);
        
        if (status) constraints.push(`campaign.status = '${sanitizeForGoogleAds(status)}'`);

        const reportConfig = {
            entity: "gender_view",
            attributes: ["campaign.name", "ad_group.name", "ad_group_criterion.gender.type", "campaign.status", "ad_group.status"],
            metrics: ["metrics.conversions", "metrics.clicks", "metrics.ctr", "metrics.cost_micros"],
            from_date: startDate,
            to_date: endDate,
            constraints
        }

        const adsReport = await customer.report(reportConfig);
        const genderData = adsReport.map((row) => {
            const genderKey = row.ad_group_criterion.gender.type;
            const campaignName = row.campaign.name || "Unknown Campaign";
            const adGroupName = row.ad_group.name || "Unknown Ad Group";
            const currentStatus = row.campaign.status || 0;
            const clicks = row.metrics.clicks || 0;
            const cost = ((row.metrics.cost_micros || 0) / 1_000_000).toFixed(2);
            const impressions = row.metrics.impressions || 0;
            const conversions = row.metrics.conversions || 0;
            const conversionsValue = row.metrics.conversions_value || 0;
            const avg_cpc = clicks > 0?((cost/clicks)).toFixed(2):0 || 0;
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
            const conversionsRate = row.metrics.conversions_from_interactions_rate || 0;
            const roas = cost > 0 ? (conversionsValue / cost).toFixed(2) : 0.00;
            return {
                campaignName,
                adGroupName,
                campaignStatus: campaignStatus[currentStatus],
                adGroupStatus: row.ad_group.status,
                gender:genderTypes[genderKey],
               cost,roas,conversions,conversionsValue,conversionsRate,clicks,ctr,avg_cpc
            };
        });
    
        const totalRecords = genderData.length;
        const totalPages = Math.ceil(totalRecords / limit);
        const startIndex = (page - 1) * limit;

        const filteredData = genderData.filter(
            (data) => data.campaignStatus === 'ENABLED' && data.adGroupStatus === 2
        );
     

        const  aggregatedRecords = filteredData.reduce((acc,data)=>{
            const {gender} = data;

            if(!acc[gender]){
                acc[gender]={
                    totalConversions: 0,
                    totalClicks: 0,
                    totalCost: 0,
                    totalCTR: 0,
                }
            }
           
            acc[gender].totalConversions = parseFloat(
                (acc[gender].totalConversions + data.conversions).toFixed(2)
            );
            acc[gender].totalClicks += data.clicks;
            acc[gender].totalCost = parseFloat(
                (acc[gender].totalCost + parseFloat(data.cost)).toFixed(2)
            );
            acc[gender].totalCTR = parseFloat(
                (acc[gender].totalCTR + data.ctr).toFixed(2)
            );
        
            return acc;
        },{})

        if (noFiltersApplied && (!genderCampaignAdGroupPairs || !genderStatusOptions)) {
            const campaignAdGroupMap = genderData.reduce((acc, item) => {
                if (!acc[item.campaignName]) {
                    acc[item.campaignName] = {
                        campaignName: item.campaignName,
                        adGroups: []
                    };
                }
                
                // Add unique ad groups
                if (!acc[item.campaignName].adGroups.includes(item.adGroupName)) {
                    acc[item.campaignName].adGroups.push(item.adGroupName);
                }
                
                return acc;
            }, {});

            // Update campaign-adgroup pairs if not cached
            genderCampaignAdGroupPairs = Object.values(campaignAdGroupMap);
            cache.set(audienceGenderPairsCacheKey, genderCampaignAdGroupPairs);

            // Update status options if not cached
            genderStatusOptions = [
                ...new Set(genderData.map(item => item.campaignStatus))
            ];
            cache.set(audienceGenderStatusCacheKey, genderStatusOptions);
        }

        cache.set(AudienceGenderCacheKey, { genderData, aggregatedRecords,genderCampaignAdGroupPairs,genderStatusOptions });

        return res.json({
            success: true,
            totalRecords,
            totalPages,
            genderData: genderData.slice(startIndex, startIndex + limit),
            aggregatedRecords:aggregatedRecords || [],
            genderCampaignAdGroupPairs:genderCampaignAdGroupPairs || [],
            genderStatusOptions:genderStatusOptions || [],
            fromCache: false
        });

    } catch (error) {
        console.error("Failed to fetch gender metrics:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
}


// export async function getAudienceView(req,res){
//     const {brandId} = req.params;
//     let {startDate, endDate, campaign, adGroup,status,gender, limit, page} = req.body;
//     try {
//         const brand = await Brand.findById(brandId);
//         if (!brand) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Brand not found.",
//             });
//         }

//         const adAccountId = brand.googleAdAccount;
//         if (!adAccountId || adAccountId.length === 0) {
//             return res.json({
//                 success: true,
//                 data: [],
//                 message: "No Google Ads account found for this brand.",
//             });
//         }

//         // Default date range to current month if not provided
//         if (!startDate || !endDate) {
//             startDate = moment().startOf("month").format("YYYY-MM-DD");
//             endDate = moment().format("YYYY-MM-DD");
//         }
        
//         const customer = client.Customer({
//             customer_id: brand.googleAdAccount,
//             refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
//             login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
//         });

//         const reportConfig = {
//             entity: "campaign_audience_view",
//             attributes: ["campaign.name", "campaign_criterion.display_name", "campaign.status"],
//             metrics: ["metrics.conversions", "metrics.clicks", "metrics.ctr", "metrics.cost_micros"],
//             from_date: startDate,
//             to_date: endDate,
//         }

//         const adsReport = await customer.report(reportConfig);
//         const audienceData = adsReport.map((row) => {
//             const campaignName = row.campaign.name || "Unknown Campaign";
//             const currentStatus = row.campaign.status || 0;
//             return {
//                 campaignName,
//                 campaignStatus: campaignStatus[currentStatus],
//                 name:row.campaign_criterion.display_name,
//                 conversions: row.metrics.conversions || 0,
//                 clicks: row.metrics.clicks || 0,
//                 ctr: (row.metrics.ctr || 0).toFixed(2),
//                 cost: ((row.metrics.cost_micros || 0) / 1_000_000).toFixed(2),
//             };
//         })
//         return(
//             res.json({
//                 success: true,
//                 data: audienceData,
//                 message: "Audience view data fetched successfully.",
//             })
//         )
//         ;
//     }catch(error){
//         console.error("Failed to fetch brand data:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal server error.",
//             error: error.message,
//         });
//     }
// }


