import moment from 'moment';
import Brand from '../models/Brands.js';
import { GoogleAdsApi } from "google-ads-api";


const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_AD_CLIENT_ID,
    client_secret: process.env.GOOGLE_AD_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
    refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
});

export async function getGoogleProductMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate } = req.body;

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
                message: "No Google ads account found for this brand",
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

        // Fetch product data
        const adsReport = await customer.report({
            entity: "shopping_product",
            attributes: [
                "shopping_product.item_id",
                "shopping_product.merchant_center_id",
                "shopping_product.title",
                "shopping_product.status",
                "shopping_product.price_micros",
                "shopping_product.issues",
            ],
            metrics: [
                "metrics.impressions",
                "metrics.clicks",
                "metrics.ctr",
                "metrics.cost_micros",
            ],
            from_date: startDate,
            to_date: endDate,
        });

        const productsData = [];

        // Process each row of the report
        for (const row of adsReport) {
            const merchantId = row.shopping_product.merchant_center_id || null;
            const itemId = row.shopping_product.item_id || null;
            const title = row.shopping_product.title || "Untitled";
            const status = row.shopping_product.status || "UNKNOWN";
            const priceMicros = row.shopping_product.price_micros || 0;
            const price = (priceMicros / 1_000_000).toFixed(2);
            const brand = row.shopping_product.brand;
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
        console.log(productsData.length)

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
                    brand: brandName,
                    totalClicks: 0,
                    totalImpressions: 0,
                    totalCost: 0,
                    productCount: 0,
                };
            }

            // Update aggregated metrics
            brandMetricsMap[brandName].totalClicks += clicks;
            brandMetricsMap[brandName].totalImpressions += impressions;
            brandMetricsMap[brandName].totalCost += cost;
            brandMetricsMap[brandName].productCount += 1;
        }

        // Convert the brand metrics map to an array
        const brandsData = Object.values(brandMetricsMap);
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
                    type: typeName,
                    totalClicks: 0,
                    totalImpressions: 0,
                    totalCost: 0,
                    productCount: 0,
                };
            }

            // Update aggregated metrics
            typeMetricsMap[typeName].totalClicks += clicks;
            typeMetricsMap[typeName].totalImpressions += impressions;
            typeMetricsMap[typeName].totalCost += cost;
            typeMetricsMap[typeName].productCount += 1;
        }

        // Convert the brand metrics map to an array
        const productTypesData = Object.values(typeMetricsMap);
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
                "metrics.ctr",
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

                // Only skip if the level is explicitly "Unknown" (not "Unnamed Category")
                if (levelName.startsWith("Unknown")) {
                    break; // Skip this level and stop processing subcategories
                }

                if (!currentLevel[levelName]) {
                    currentLevel[levelName] = {
                        metrics: {
                            totalClicks: 0,
                            totalImpressions: 0,
                            totalCost: 0,
                            productCount: 0,
                        },
                        subcategories: {},
                    };
                }
                currentLevel[levelName].metrics.totalClicks += clicks;
                currentLevel[levelName].metrics.totalImpressions += impressions;
                currentLevel[levelName].metrics.totalCost += cost;
                currentLevel[levelName].metrics.productCount += 1;

                currentLevel = currentLevel[levelName].subcategories;
            }
        }

        const convertToArray = (levelMap) => {
            return Object.entries(levelMap).map(([name, data]) => ({
                name,
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



