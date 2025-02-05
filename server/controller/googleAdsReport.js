import moment from 'moment';
import Brand from '../models/Brands.js';
import User from '../models/User.js';
import { GoogleAdsApi } from "google-ads-api";


const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
});

function getAdjustedDates(startDate, endDate) {
    const now = new Date();
    if (startDate && endDate) {
        return {
            adjustedStartDate: new Date(startDate).toISOString().split('T')[0],
            adjustedEndDate: new Date(endDate).toISOString().split('T')[0],
        };
    }
    const lastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
        adjustedStartDate: lastSixMonths.toISOString().split('T')[0],
        adjustedEndDate: endOfMonth.toISOString().split('T')[0],
    };
}


export async function fetchSearchTermMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, userId } = req.body;

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean(),
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            });
        }

        const refreshToken = user.googleRefreshToken;
        if (!refreshToken) {
            return res.status(200).json([]);
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        const customer = client.Customer({
            customer_id: brand.googleAdAccount,
            refresh_token: refreshToken,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const query = `
    SELECT
        search_term_view.search_term,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.conversions_value_per_cost,
        metrics.clicks,
        metrics.conversions_from_interactions_rate,
        segments.month
    FROM
        search_term_view
    WHERE
        segments.date BETWEEN '${adjustedStartDate}' AND '${adjustedEndDate}'
    ORDER BY
        metrics.cost_micros DESC
    LIMIT 1000
`;

        const results = await customer.query(query);

        const searchTermData = new Map();

        for (const result of results) {
            const {
                search_term_view: { search_term },
                metrics,
                segments: { month }
            } = result;


            if (!searchTermData.has(search_term)) {
                searchTermData.set(search_term, { MonthlyData: new Map() });
            }

            const monthlyData = searchTermData.get(search_term).MonthlyData;

            // Initialize month if it doesn't exist in the MonthlyData Map
            if (!monthlyData.has(month)) {
                monthlyData.set(month, {
                    Month: moment(month).format('YYYYMM'), // Format month as "YYYY-MM"
                    Cost: 0,
                    Clicks: 0,
                    Conversions: 0,
                    "Conversion Value": 0,
                    "Conv. Value/ Cost": 0,
                    "Conversion Rate": 0,
                });
            }

            const monthData = monthlyData.get(month);

            // Update the monthly data values
            monthData.Cost += (metrics.cost_micros / 1_000_000);
            monthData.Clicks += metrics.clicks;
            monthData.Conversions += metrics.conversions;
            monthData["Conversion Value"] += metrics.conversions_value
            monthData["Conv. Value/ Cost"] += metrics.conversions_value_per_cost;
            monthData["Conversion Rate"] += metrics.conversions_from_interactions_rate * 100;
        }

        const formattedData = Array.from(searchTermData.entries())
            .map(([searchTerm, { MonthlyData }]) => {
                const totalCost = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData.Cost, 0);
                const totalConvValue = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData["Conversion Value"], 0);

                // Calculate the Total Conv. Value / Cost
                const totalConvValueCostRatio = totalCost > 0 ? totalConvValue / totalCost : 0; // Avoid division by zero

                return {
                    "Search Term": searchTerm,
                    "Total Cost": totalCost,
                    "Conv. Value / Cost": totalConvValueCostRatio,
                    "Total Conv. Value": totalConvValue,
                    MonthlyData: Array.from(MonthlyData.values()),
                };
            }).slice(0, 500);

        return res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error("Failed to fetch Google Ads search term metrics:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }

}

export async function fetchAgeMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, userId } = req.body;

    const ageRanges = {
        0: "UNSPECIFIED",
        1: "UNKNOWN",
        503001: "18_24",
        503002: "25_34",
        503003: "35_44",
        503004: "45_54",
        503005: "55_64",
        503006: "65_UP",
        503999: "UNDETERMINED",
    };

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean(),
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            });
        }

        const refreshToken = user.googleRefreshToken;
        if (!refreshToken) {
            return res.status(200).json([]);
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        const customer = client.Customer({
            customer_id: brand.googleAdAccount,
            refresh_token: refreshToken,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const query = `
           SELECT
                ad_group_criterion.age_range.type,
                metrics.cost_micros,
                metrics.conversions,
                metrics.clicks,
                metrics.conversions_from_interactions_rate,
                metrics.conversions_value,
                segments.month    
            FROM
                age_range_view
            WHERE
                segments.date BETWEEN '${adjustedStartDate}' AND '${adjustedEndDate}'
            LIMIT 1000
        `;

        const results = await customer.query(query);

        const ageRangeData = new Map();

        // Process monthly data
        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const ageRangeType = ageRanges[row.ad_group_criterion.age_range.type] || 'UNKNOWN';

            if (!ageRangeData.has(ageRangeType)) {
                ageRangeData.set(ageRangeType, { 
                    MonthlyData: new Map(),
                    TotalConversionValue: 0,
                    TotalCost: 0
                });
            }

            const monthData = ageRangeData.get(ageRangeType).MonthlyData.get(row.segments.month) || {
                Month: moment(row.segments.month).format('YYYYMM'),
                Cost: 0,
                Clicks: 0,
                Conversions: 0,
                "Conversion Value": 0,
                "Conversion Rate": 0,
                "Conv. Value/ Cost": 0
            };

            const cost = row.metrics.cost_micros / 1_000_000;
            const conversionValue = row.metrics.conversions_value;

            // Update monthly metrics
            monthData.Cost += cost;
            monthData.Clicks += row.metrics.clicks;
            monthData.Conversions += row.metrics.conversions;
            monthData["Conversion Rate"] += row.metrics.conversions_from_interactions_rate * 100;
            monthData["Conversion Value"] += conversionValue;

            // Calculate Conv. Value/Cost for the month
            monthData["Conv. Value/ Cost"] = monthData.Cost > 0 
                ? monthData["Conversion Value"] / monthData.Cost 
                : 0;

            ageRangeData.get(ageRangeType).MonthlyData.set(row.segments.month, monthData);

            // Update totals for the age range
            ageRangeData.get(ageRangeType).TotalConversionValue += conversionValue;
            ageRangeData.get(ageRangeType).TotalCost += cost;
        }

        // Format the final data
        const formattedData = Array.from(ageRangeData.entries())
            .map(([ageRange, data]) => {
                const { MonthlyData, TotalConversionValue, TotalCost } = data;
                const monthlyDataArray = Array.from(MonthlyData.values());

                return {
                    "Age Range": ageRange,
                    "Total Cost":TotalCost,
                    "Total Conv. Value": TotalConversionValue,
                    "Conv. Value / Cost": TotalCost > 0 
                        ? TotalConversionValue / TotalCost 
                        : 0,
                    MonthlyData: monthlyDataArray,
                };
            })
            .slice(0, 500);

        return res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error("Failed to fetch Google Ads age range metrics:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}

export async function fetchGenderMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, userId } = req.body;

    const genderTypes = {
        0: "UNSPECIFIED",
        1: "UNKNOWN",
        10: "MALE",
        11: "FEMALE",
        20: "UNDETERMINED"
    }

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean(),
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            });
        }

        const refreshToken = user.googleRefreshToken;
        if (!refreshToken) {
            return res.status(200).json([]);
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        const customer = client.Customer({
            customer_id: brand.googleAdAccount,
            refresh_token: refreshToken,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const query = `
           SELECT
                ad_group_criterion.gender.type,
                metrics.cost_micros,
                metrics.conversions,
                metrics.clicks,
                metrics.conversions_from_interactions_rate,
                metrics.conversions_value,
                segments.month    
            FROM
                gender_view
            WHERE
                segments.date BETWEEN '${adjustedStartDate}' AND '${adjustedEndDate}'
            LIMIT 1000
        `;

        const results = await customer.query(query);

        const genderData = new Map();

        // Process monthly data
        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const genderType = genderTypes[row.ad_group_criterion.gender.type] || 'UNKNOWN';

            if (!genderData.has(genderType)) {
                genderData.set(genderType, { 
                    MonthlyData: new Map(),
                    TotalConversionValue: 0,
                    TotalCost: 0
                });
            }

            const monthData = genderData.get(genderType).MonthlyData.get(row.segments.month) || {
                Month: moment(row.segments.month).format('YYYYMM'),
                Cost: 0,
                Clicks: 0,
                Conversions: 0,
                "Conversion Value": 0,
                "Conversion Rate": 0,
                "Conv. Value/ Cost": 0
            };

            const cost = row.metrics.cost_micros / 1_000_000;
            const conversionValue = row.metrics.conversions_value;

            // Update monthly metrics
            monthData.Cost += cost;
            monthData.Clicks += row.metrics.clicks;
            monthData.Conversions += row.metrics.conversions;
            monthData["Conversion Rate"] += row.metrics.conversions_from_interactions_rate * 100;
            monthData["Conversion Value"] += conversionValue;

            // Calculate Conv. Value/Cost for the month
            monthData["Conv. Value/ Cost"] = monthData.Cost > 0 
                ? monthData["Conversion Value"] / monthData.Cost 
                : 0;

            genderData.get(genderType).MonthlyData.set(row.segments.month, monthData);

            // Update totals for the gender type
            genderData.get(genderType).TotalConversionValue += conversionValue;
            genderData.get(genderType).TotalCost += cost;
        }

        // Format the final data
        const formattedData = Array.from(genderData.entries())
            .map(([gender, data]) => {
                const { MonthlyData, TotalConversionValue, TotalCost } = data;
                const monthlyDataArray = Array.from(MonthlyData.values());

                return {
                    "Gender": gender,
                    "Total Cost":TotalCost,
                    "Total Conv. Value":TotalConversionValue,
                    "Conv. Value / Cost": TotalCost > 0 
                        ? TotalConversionValue / TotalCost 
                        : 0,
                    MonthlyData: monthlyDataArray,
                };
            })
            .slice(0, 500);

        return res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error("Failed to fetch Google Ads gender metrics:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}

export async function fetchProductMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, userId } = req.body;

    try {
        // Fetch brand and user data concurrently
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean(),
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            });
        }

        const refreshToken = user.googleRefreshToken;
        if (!refreshToken) {
            return res.status(200).json([]); // No refresh token means no data to fetch
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        // Generate the list of months between start and end dates
        const monthsInRange = [];
        let currentMonth = moment(adjustedStartDate);
        const endMonth = moment(adjustedEndDate);

        while (currentMonth.isBefore(endMonth) || currentMonth.isSame(endMonth, 'month')) {
            monthsInRange.push(currentMonth.format('YYYY-MM'));
            currentMonth.add(1, 'month');
        }

        const customer = client.Customer({
            customer_id: brand.googleAdAccount,
            refresh_token: refreshToken,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        // Run all monthly queries in parallel using Promise.all
        const monthlyResults = await Promise.all(
            monthsInRange.map(async (month) => {
                const startOfMonth = `${month}-01`;
                const endOfMonth = moment(startOfMonth).endOf('month').format('YYYY-MM-DD');

                const query = `
                    SELECT
                        shopping_product.title,
                        metrics.cost_micros,
                        metrics.conversions,
                        metrics.clicks,
                        metrics.conversions_from_interactions_rate
                    FROM
                        shopping_product
                    WHERE
                        segments.date BETWEEN '${startOfMonth}' AND '${endOfMonth}'
                    ORDER BY
                        metrics.cost_micros DESC
                `;

                try {
                    const results = await customer.query(query);
                    return { month, results };
                } catch (error) {
                    console.error(`Error fetching data for ${month}:`, error);
                    return { month, results: [] }; // Return empty results for failed months
                }
            })
        );

        // Process results into product data
        const productData = new Map();

        for (const { month, results } of monthlyResults) {
            results.forEach((row) => {
                const productTitle = row.shopping_product.title || 'Unknown';
                const productEntry = productData.get(productTitle) || { MonthlyData: new Map(), TotalCost: 0 };

                const monthData = productEntry.MonthlyData.get(month) || {
                    Month: moment(month, 'YYYY-MM').format('YYYYMM'),
                    Cost: 0,
                    Clicks: 0,
                    Conversions: 0,
                    "Conversion Rate": 0,
                };

                monthData.Cost += row.metrics.cost_micros / 1_000_000; // Convert from micros
                monthData.Clicks += row.metrics.clicks;
                monthData.Conversions += row.metrics.conversions;
                monthData["Conversion Rate"] += row.metrics.conversions_from_interactions_rate != null
                    ? row.metrics.conversions_from_interactions_rate
                    : 0;

                productEntry.MonthlyData.set(month, monthData);
                productEntry.TotalCost += row.metrics.cost_micros / 1_000_000;

                productData.set(productTitle, productEntry);
            });
        }

        // Format the product data
        const formattedData = Array.from(productData.entries())
            .map(([product, { MonthlyData, TotalCost }]) => ({
                Product: product,
                TotalCost,
                MonthlyData: Array.from(MonthlyData.values()),
            }))
            .sort((a, b) => b.TotalCost - a.TotalCost) // Sort by TotalCost (descending)
            .slice(0, 500); // Limit to top 500 products

        return res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('Failed to fetch Google Ads product metrics:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}

export async function fetchBrandMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, userId } = req.body;

    try {
        // Fetch brand and user data concurrently
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean(),
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found.',
            });
        }

        const refreshToken = user.googleRefreshToken;
        if (!refreshToken) {
            return res.status(200).json([]); // No refresh token means no data to fetch
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        // Generate the list of months between start and end dates
        const monthsInRange = [];
        let currentMonth = moment(adjustedStartDate);
        const endMonth = moment(adjustedEndDate);

        while (currentMonth.isBefore(endMonth) || currentMonth.isSame(endMonth, 'month')) {
            monthsInRange.push(currentMonth.format('YYYY-MM'));
            currentMonth.add(1, 'month');
        }

        const customer = client.Customer({
            customer_id: brand.googleAdAccount,
            refresh_token: refreshToken,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        // Run all monthly queries in parallel using Promise.all
        const monthlyResults = await Promise.all(
            monthsInRange.map(async (month) => {
                const startOfMonth = `${month}-01`;
                const endOfMonth = moment(startOfMonth).endOf('month').format('YYYY-MM-DD');

                const query = `
                    SELECT
                        shopping_product.brand,
                        metrics.cost_micros,
                        metrics.conversions,
                        metrics.clicks,
                        metrics.conversions_from_interactions_rate
                    FROM
                        shopping_product
                    WHERE
                        segments.date BETWEEN '${startOfMonth}' AND '${endOfMonth}'
                    ORDER BY
                        metrics.cost_micros DESC
                `;

                try {
                    const results = await customer.query(query);
                    return { month, results };
                } catch (error) {
                    console.error(`Error fetching data for ${month}:`, error);
                    return { month, results: [] }; // Return empty results for failed months
                }
            })
        );

        // Process results into product data
        const brandData = new Map();

        for (const { month, results } of monthlyResults) {
            results.forEach((row) => {
                const brand = row.shopping_product.brand || 'Unknown';
                const brandEntry = brandData.get(brand) || { MonthlyData: new Map(), TotalCost: 0 };

                const monthData = brandEntry.MonthlyData.get(month) || {
                    Month: moment(month, 'YYYY-MM').format('YYYYMM'),
                    Cost: 0,
                    Clicks: 0,
                    Conversions: 0,
                    "Conversion Rate": 0,
                };

                monthData.Cost += row.metrics.cost_micros / 1_000_000; // Convert from micros
                monthData.Clicks += row.metrics.clicks;
                monthData.Conversions += row.metrics.conversions;
                monthData["Conversion Rate"] += row.metrics.conversions_from_interactions_rate != null
                    ? row.metrics.conversions_from_interactions_rate * 100
                    : 0;

                brandEntry.MonthlyData.set(month, monthData);
                brandEntry.TotalCost += row.metrics.cost_micros / 1_000_000;

                brandData.set(brand, brandEntry);
            });
        }

        // Format the product data
        const formattedData = Array.from(brandData.entries())
            .map(([brand, { MonthlyData, TotalCost }]) => ({
                Brand: brand,
                TotalCost,
                MonthlyData: Array.from(MonthlyData.values()),
            }))
            .sort((a, b) => b.TotalCost - a.TotalCost) // Sort by TotalCost (descending)
            .slice(0, 500); // Limit to top 500 products

        return res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('Failed to fetch Google Ads brand metrics:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}





