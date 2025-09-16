import moment from 'moment';
import Brand from '../models/Brands.js';
import User from '../models/User.js';
import { GoogleAdsApi } from "google-ads-api";
import { compareValues } from './analytics.js';


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
    let { startDate, endDate, costFilter, convValuePerCostFilter } = req.body;

    try {
        const brand = await Brand.findById(brandId).lean();

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found.',
            });
        }

        const refreshToken = brand.googleAdsRefreshToken;
        if (!refreshToken || refreshToken.trim() === '') {
            console.warn(`No refresh token found for Brand ID: ${brandId}`);
            return res.status(403).json({ error: 'Access to Google Ads API is forbidden. Check your credentials or permissions.' });
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        if (!brand.googleAdAccount || brand.googleAdAccount.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: "No Google ads accounts found for this brand"
            });
        }

        // Array to store results from all accounts
        let allAccountsData = [];

        // Process each ad account
        for (const adAccount of brand.googleAdAccount) {
            const clientId = adAccount.clientId;
            const managerId = adAccount.managerId;

            if (!clientId) {
                continue; // Skip accounts without clientId
            }

            try {
                const customer = client.Customer({
                    customer_id: clientId,
                    refresh_token: refreshToken,
                    login_customer_id: managerId
                });

                // Now get search term data
                const searchTermQuery = `
                    SELECT
                        customer.descriptive_name,
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

                const results = await customer.query(searchTermQuery);
                const accountName = results.length > 0 && results[0].customer && results[0].customer.descriptive_name
                    ? results[0].customer.descriptive_name
                    : `Account ${clientId}`;

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
                            Month: moment(month).format('YYYYMM'),
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
                    monthData["Conversion Value"] += metrics.conversions_value;
                    monthData["Conv. Value/ Cost"] += metrics.conversions_value_per_cost;
                    monthData["Conversion Rate"] += metrics.conversions_from_interactions_rate * 100;
                }

                const formattedData = Array.from(searchTermData.entries())
                    .map(([searchTerm, { MonthlyData }]) => {
                        const totalCost = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData.Cost, 0);
                        const totalConvValue = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData["Conversion Value"], 0);

                        // Calculate the Total Conv. Value / Cost
                        const totalConvValueCostRatio = totalCost > 0 ? totalConvValue / totalCost : 0;
                        const monthlyDataArray = Array.from(MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month));

                        return {
                            "Search Term": searchTerm,
                            "Total Cost": totalCost,
                            "Conv. Value / Cost": totalConvValueCostRatio,
                            "Total Conv. Value": totalConvValue,
                            MonthlyData: monthlyDataArray,
                        };
                    });

                let limitedData = formattedData.slice(0, 500);

                if (costFilter || convValuePerCostFilter) {
                    limitedData = limitedData.filter(item => {
                        const costCondition = costFilter
                            ? compareValues(item["Total Cost"], costFilter.value, costFilter.operator)
                            : true;

                        const convValuePerCostCondition = convValuePerCostFilter
                            ? compareValues(item["Conv. Value / Cost"], convValuePerCostFilter.value, convValuePerCostFilter.operator)
                            : true;

                        return costCondition && convValuePerCostCondition;
                    });
                }

                // Add the account data to our collection
                allAccountsData.push({
                    accountId: clientId,
                    accountName: accountName,
                    searchTerms: limitedData
                });

            } catch (accountError) {
                console.error(`Error processing ad account ${clientId} for search terms:`, accountError);
                // Add empty data for this account to show it was processed but had an error
                allAccountsData.push({
                    accountId: clientId,
                    accountName: `Account ${clientId}`,
                    searchTerms: [],
                    error: accountError.message
                });
            }
        }

        return res.json({
            success: true,
            data: allAccountsData
        });
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
    let { startDate, endDate, costFilter, convValuePerCostFilter } = req.body;

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
        const brand = await Brand.findById(brandId).lean();

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found.',
            });
        }

        const refreshToken = brand.googleAdsRefreshToken;
        if (!refreshToken || refreshToken.trim() === '') {
            console.warn(`No refresh token found for Brand ID: ${brandId}`);
            return res.status(403).json({ error: 'Access to Google Ads API is forbidden. Check your credentials or permissions.' });
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        if (!brand.googleAdAccount || brand.googleAdAccount.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: "No Google ads accounts found for this brand"
            });
        }

        // Array to store results from all accounts
        let allAccountsData = [];

        // Process each ad account
        for (const adAccount of brand.googleAdAccount) {
            const clientId = adAccount.clientId;
            const managerId = adAccount.managerId;

            if (!clientId) {
                continue; // Skip accounts without clientId
            }

            try {
                const customer = client.Customer({
                    customer_id: clientId,
                    refresh_token: refreshToken,
                    login_customer_id: managerId
                });

                const ageQuery = `
                    SELECT
                        customer.descriptive_name,
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

                const results = await customer.query(ageQuery);
                const accountName = results.length > 0 && results[0].customer && results[0].customer.descriptive_name
                    ? results[0].customer.descriptive_name
                    : `Account ${clientId}`;

                const ageRangeData = new Map();

                // Process monthly data
                for (const result of results) {
                    const ageRangeType = ageRanges[result.ad_group_criterion.age_range.type] || 'UNKNOWN';
                    const month = result.segments.month;

                    if (!ageRangeData.has(ageRangeType)) {
                        ageRangeData.set(ageRangeType, { MonthlyData: new Map() });
                    }

                    if (!ageRangeData.get(ageRangeType).MonthlyData.has(month)) {
                        ageRangeData.get(ageRangeType).MonthlyData.set(month, {
                            Month: moment(month).format('YYYYMM'),
                            Cost: 0,
                            Clicks: 0,
                            Conversions: 0,
                            "Conversion Value": 0,
                            "Conversion Rate": 0,
                            "Conv. Value/ Cost": 0
                        });
                    }

                    const monthData = ageRangeData.get(ageRangeType).MonthlyData.get(month);
                    const cost = result.metrics.cost_micros / 1_000_000;
                    const conversionValue = result.metrics.conversions_value;

                    // Update monthly metrics
                    monthData.Cost += cost;
                    monthData.Clicks += result.metrics.clicks;
                    monthData.Conversions += result.metrics.conversions;
                    monthData["Conversion Rate"] += result.metrics.conversions_from_interactions_rate * 100;
                    monthData["Conversion Value"] += conversionValue;

                    // Calculate Conv. Value/Cost for the month
                    monthData["Conv. Value/ Cost"] = monthData.Cost > 0
                        ? monthData["Conversion Value"] / monthData.Cost
                        : 0;
                }

                // Format the final data
                const formattedData = Array.from(ageRangeData.entries())
                    .map(([ageRange, { MonthlyData }]) => {
                        const totalCost = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData.Cost, 0);
                        const totalConvValue = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData["Conversion Value"], 0);

                        // Calculate the Total Conv. Value / Cost
                        const totalConvValueCostRatio = totalCost > 0 ? totalConvValue / totalCost : 0;
                        const monthlyDataArray = Array.from(MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month));

                        return {
                            "Age Range": ageRange,
                            "Total Cost": totalCost,
                            "Total Conv. Value": totalConvValue,
                            "Conv. Value / Cost": totalConvValueCostRatio,
                            MonthlyData: monthlyDataArray,
                        };
                    });

                let limitedData = formattedData.slice(0, 500);

                if (costFilter || convValuePerCostFilter) {
                    limitedData = limitedData.filter(item => {
                        const costCondition = costFilter
                            ? compareValues(item["Total Cost"], costFilter.value, costFilter.operator)
                            : true;

                        const convValuePerCostCondition = convValuePerCostFilter
                            ? compareValues(item["Conv. Value / Cost"], convValuePerCostFilter.value, convValuePerCostFilter.operator)
                            : true;

                        return costCondition && convValuePerCostCondition;
                    });
                }

                // Add the account data to our collection
                allAccountsData.push({
                    accountId: clientId,
                    accountName: accountName,
                    ageRanges: limitedData
                });

            } catch (accountError) {
                console.error(`Error processing ad account ${clientId} for age metrics:`, accountError);
                // Add empty data for this account to show it was processed but had an error
                allAccountsData.push({
                    accountId: clientId,
                    accountName: `Account ${clientId}`,
                    ageRanges: [],
                    error: accountError.message
                });
            }
        }

        return res.json({
            success: true,
            data: allAccountsData
        });
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
    let { startDate, endDate, costFilter, convValuePerCostFilter } = req.body;

    const userId = req.user._id;

    const genderTypes = {
        0: "UNSPECIFIED",
        1: "UNKNOWN",
        10: "MALE",
        11: "FEMALE",
        20: "UNDETERMINED"
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

        const refreshToken = user.googleAdsRefreshToken;
        if (!refreshToken || refreshToken.trim() === '') {
            console.warn(`No refresh token found for User ID: ${userId}`);
            return res.status(403).json({ error: 'Access to Google Ads API is forbidden. Check your credentials or permissions.' });
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        if (!brand.googleAdAccount || brand.googleAdAccount.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: "No Google ads accounts found for this brand"
            });
        }

        // Array to store results from all accounts
        let allAccountsData = [];

        // Process each ad account
        for (const adAccount of brand.googleAdAccount) {
            const clientId = adAccount.clientId;
            const managerId = adAccount.managerId;

            if (!clientId) {
                continue; // Skip accounts without clientId
            }

            try {
                const customer = client.Customer({
                    customer_id: clientId,
                    refresh_token: refreshToken,
                    login_customer_id: managerId
                });

                const genderQuery = `
                   SELECT
                        customer.descriptive_name,
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

                const results = await customer.query(genderQuery);
                const accountName = results.length > 0 && results[0].customer && results[0].customer.descriptive_name
                    ? results[0].customer.descriptive_name
                    : `Account ${clientId}`;

                const genderData = new Map();

                // Process monthly data
                for (const result of results) {
                    const genderType = genderTypes[result.ad_group_criterion.gender.type] || 'UNKNOWN';
                    const month = result.segments.month;

                    if (!genderData.has(genderType)) {
                        genderData.set(genderType, { MonthlyData: new Map() });
                    }

                    if (!genderData.get(genderType).MonthlyData.has(month)) {
                        genderData.get(genderType).MonthlyData.set(month, {
                            Month: moment(month).format('YYYYMM'),
                            Cost: 0,
                            Clicks: 0,
                            Conversions: 0,
                            "Conversion Value": 0,
                            "Conversion Rate": 0,
                            "Conv. Value/ Cost": 0
                        });
                    }

                    const monthData = genderData.get(genderType).MonthlyData.get(month);
                    const cost = result.metrics.cost_micros / 1_000_000;
                    const conversionValue = result.metrics.conversions_value;

                    // Update monthly metrics
                    monthData.Cost += cost;
                    monthData.Clicks += result.metrics.clicks;
                    monthData.Conversions += result.metrics.conversions;
                    monthData["Conversion Rate"] += result.metrics.conversions_from_interactions_rate * 100;
                    monthData["Conversion Value"] += conversionValue;

                    // Calculate Conv. Value/Cost for the month
                    monthData["Conv. Value/ Cost"] = monthData.Cost > 0
                        ? monthData["Conversion Value"] / monthData.Cost
                        : 0;
                }

                // Format the final data
                const formattedData = Array.from(genderData.entries())
                    .map(([gender, { MonthlyData }]) => {
                        const totalCost = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData.Cost, 0);
                        const totalConvValue = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData["Conversion Value"], 0);
                        
                        // Calculate the Total Conv. Value / Cost
                        const totalConvValueCostRatio = totalCost > 0 ? totalConvValue / totalCost : 0;
                        const monthlyDataArray = Array.from(MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month));

                        return {
                            "Gender": gender,
                            "Total Cost": totalCost,
                            "Total Conv. Value": totalConvValue,
                            "Conv. Value / Cost": totalConvValueCostRatio,
                            MonthlyData: monthlyDataArray,
                        };
                    });

                let limitedData = formattedData.slice(0, 500);

                if (costFilter || convValuePerCostFilter) {
                    limitedData = limitedData.filter(item => {
                        const costCondition = costFilter
                            ? compareValues(item["Total Cost"], costFilter.value, costFilter.operator)
                            : true;

                        const convValuePerCostCondition = convValuePerCostFilter
                            ? compareValues(item["Conv. Value / Cost"], convValuePerCostFilter.value, convValuePerCostFilter.operator)
                            : true;

                        return costCondition && convValuePerCostCondition;
                    });
                }

                // Add the account data to our collection
                allAccountsData.push({
                    accountId: clientId,
                    accountName: accountName,
                    genders: limitedData
                });

            } catch (accountError) {
                console.error(`Error processing ad account ${clientId} for gender metrics:`, accountError);
                // Add empty data for this account to show it was processed but had an error
                allAccountsData.push({
                    accountId: clientId,
                    accountName: `Account ${clientId}`,
                    genders: [],
                    error: accountError.message
                });
            }
        }

        return res.json({
            success: true,
            data: allAccountsData
        });
    } catch (error) {
        console.error("Failed to fetch Google Ads gender metrics:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}
export async function fetchKeywordMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, costFilter, convValuePerCostFilter } = req.body;

    try {
        const brand = await Brand.findById(brandId).lean();

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found.',
            });
        }

        const refreshToken = brand.googleAdsRefreshToken;
        if (!refreshToken || refreshToken.trim() === '') {
            console.warn(`No refresh token found for Brand ID: ${brandId}`);
            return res.status(403).json({ error: 'Access to Google Ads API is forbidden. Check your credentials or permissions.' });
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        if (!brand.googleAdAccount || brand.googleAdAccount.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: "No Google ads accounts found for this brand"
            });
        }

        // Array to store results from all accounts
        let allAccountsData = [];

        // Process each ad account
        for (const adAccount of brand.googleAdAccount) {
            const clientId = adAccount.clientId;
            const managerId = adAccount.managerId;

            if (!clientId) {
                continue; // Skip accounts without clientId
            }
            try {

                const customer = client.Customer({
                    customer_id: clientId,
                    refresh_token: refreshToken,
                    login_customer_id: managerId
                });

                const keywordQuery = `
                   SELECT
                        customer.descriptive_name,
                        ad_group_criterion.keyword.text,
                        metrics.cost_micros,
                        metrics.conversions,
                        metrics.clicks,
                        metrics.conversions_from_interactions_rate,
                        metrics.conversions_value,
                        segments.month    
                    FROM
                        keyword_view
                    WHERE
                        segments.date BETWEEN '${adjustedStartDate}' AND '${adjustedEndDate}'
                    LIMIT 1000
                `;

                const results = await customer.query(keywordQuery);
                const accountName = results.length > 0 && results[0].customer && results[0].customer.descriptive_name
                    ? results[0].customer.descriptive_name
                    : `Account ${clientId}`;

                const keywordData = new Map();

                // Process monthly data
                for (const result of results) {
                    const keyword = result.ad_group_criterion.keyword.text || 'UNKNOWN';
                    const month = result.segments.month;

                    if (!keywordData.has(keyword)) {
                        keywordData.set(keyword, { MonthlyData: new Map() });
                    }

                    if (!keywordData.get(keyword).MonthlyData.has(month)) {
                        keywordData.get(keyword).MonthlyData.set(month, {
                            Month: moment(month).format('YYYYMM'),
                            Cost: 0,
                            Clicks: 0,
                            Conversions: 0,
                            "Conversion Value": 0,
                            "Conversion Rate": 0,
                            "Conv. Value/ Cost": 0
                        });
                    }

                    const monthData = keywordData.get(keyword).MonthlyData.get(month);
                    const cost = result.metrics.cost_micros / 1_000_000;
                    const conversionValue = result.metrics.conversions_value;

                    // Update monthly metrics
                    monthData.Cost += cost;
                    monthData.Clicks += result.metrics.clicks;
                    monthData.Conversions += result.metrics.conversions;
                    monthData["Conversion Rate"] += result.metrics.conversions_from_interactions_rate * 100;
                    monthData["Conversion Value"] += conversionValue;

                    // Calculate Conv. Value/Cost for the month
                    monthData["Conv. Value/ Cost"] = monthData.Cost > 0
                        ? monthData["Conversion Value"] / monthData.Cost
                        : 0;
                }

                // Format the final data
                const formattedData = Array.from(keywordData.entries())
                    .map(([keyword, { MonthlyData }]) => {
                        const totalCost = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData.Cost, 0);
                        const totalConvValue = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData["Conversion Value"], 0);
                        
                        // Calculate the Total Conv. Value / Cost
                        const totalConvValueCostRatio = totalCost > 0 ? totalConvValue / totalCost : 0;
                        const monthlyDataArray = Array.from(MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month));

                        return {
                            "Keyword": keyword,
                            "Total Cost": totalCost,
                            "Total Conv. Value": totalConvValue,
                            "Conv. Value / Cost": totalConvValueCostRatio,
                            MonthlyData: monthlyDataArray,
                        };
                    });

                let limitedData = formattedData.slice(0, 500);

                if (costFilter || convValuePerCostFilter) {
                    limitedData = limitedData.filter(item => {
                        const costCondition = costFilter
                            ? compareValues(item["Total Cost"], costFilter.value, costFilter.operator)
                            : true;

                        const convValuePerCostCondition = convValuePerCostFilter
                            ? compareValues(item["Conv. Value / Cost"], convValuePerCostFilter.value, convValuePerCostFilter.operator)
                            : true;

                        return costCondition && convValuePerCostCondition;
                    });
                }

                // Add the account data to our collection
                allAccountsData.push({
                    accountId: clientId,
                    accountName: accountName,
                    keywords: limitedData
                });

            } catch (accountError) {
                console.error(`Error processing ad account ${clientId} for keyword metrics:`, accountError);
                // Add empty data for this account to show it was processed but had an error
                allAccountsData.push({
                    accountId: clientId,
                    accountName: `Account ${clientId}`,
                    keywords: [],
                    error: accountError.message
                });
            }
        }

        return res.json({
            success: true,
            data: allAccountsData
        });
    } catch (error) {
        console.error("Failed to fetch Google Ads keyword metrics:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}
export async function fetchProductMetrics(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate, costFilter, convValuePerCostFilter } = req.body;

    try {
        const brand = await Brand.findById(brandId).lean();

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found.',
            });
        }

        const refreshToken = brand.googleAdsRefreshToken;
        if (!refreshToken || refreshToken.trim() === '') {
            console.warn(`No refresh token found for Brand ID: ${brandId}`);
            return res.status(403).json({ error: 'Access to Google Ads API is forbidden. Check your credentials or permissions.' });
        }

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        if (!brand.googleAdAccount || brand.googleAdAccount.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: "No Google ads accounts found for this brand"
            });
        }
        // Array to store results from all accounts
        let allAccountsData = [];

        // Generate all months between start and end dates
        const months = [];
        let current = moment(adjustedStartDate).startOf('month');
        while (current.isBefore(adjustedEndDate)) {
            months.push(current.format('YYYYMM'));
            current.add(1, 'month');
        }

        // Process each ad account
        for (const adAccount of brand.googleAdAccount) {
            const clientId = adAccount.clientId;
            const managerId = adAccount.managerId;

            if (!clientId) {
                continue; // Skip accounts without clientId
            }
            try {
                
                const customer = client.Customer({
                    customer_id: clientId,
                    refresh_token: refreshToken,
                    login_customer_id: managerId
                });

                // Fetch account name
                let accountName = `Account ${clientId}`;
                try {
                    const accountInfoQuery = `
                        SELECT customer.descriptive_name 
                        FROM customer 
                        WHERE customer.id = ${clientId}
                        LIMIT 1
                    `;
                    const accountInfo = await customer.query(accountInfoQuery);
                    if (accountInfo.length > 0 && accountInfo[0].customer && accountInfo[0].customer.descriptive_name) {
                        accountName = accountInfo[0].customer.descriptive_name;
                    }
                } catch (accountInfoError) {
                    console.warn(`Could not fetch account name for ${clientId}:`, accountInfoError.message);
                }

                // Then fetch data for each month separately
                const monthlyResults = await Promise.all(months.map(async (month) => {
                    const monthStart = moment(month, 'YYYYMM').startOf('month').format('YYYY-MM-DD');
                    const monthEnd = moment(month, 'YYYYMM').endOf('month').format('YYYY-MM-DD');

                    const monthlyQuery = `
                        SELECT
                            shopping_product.title,
                            metrics.cost_micros,
                            metrics.conversions,
                            metrics.clicks,
                            metrics.conversions_value
                        FROM
                            shopping_product
                        WHERE
                            segments.date BETWEEN '${monthStart}' AND '${monthEnd}'
                    `;

                    try {
                        const results = await customer.query(monthlyQuery);
                        return { month, data: results };
                    } catch (error) {
                        console.error(`Failed to fetch data for ${month}:`, error);
                        return { month, data: [] };
                    }
                }));

                // Process results with month context
                const productData = new Map();

                monthlyResults.forEach(({ month, data }) => {
                    data.forEach(row => {
                        const product = row.shopping_product.title || 'UNKNOWN';
                        
                        if (!productData.has(product)) {
                            productData.set(product, { MonthlyData: new Map() });
                        }

                        if (!productData.get(product).MonthlyData.has(month)) {
                            productData.get(product).MonthlyData.set(month, {
                                Month: month,
                                Cost: 0,
                                Clicks: 0,
                                Conversions: 0,
                                "Conversion Value": 0,
                                "Conversion Rate": 0,
                                "Conv. Value/ Cost": 0
                            });
                        }
                        
                        const monthData = productData.get(product).MonthlyData.get(month);
                        const cost = row.metrics.cost_micros / 1_000_000;
                        const conversionValue = row.metrics.conversions_value;

                        // Accumulate metrics
                        monthData.Cost += cost;
                        monthData.Clicks += row.metrics.clicks;
                        monthData.Conversions += row.metrics.conversions;
                        monthData["Conversion Value"] += conversionValue;
                    });
                });

                // Finally calculate rates and ratios
                productData.forEach((productEntry) => {
                    productEntry.MonthlyData.forEach((monthEntry) => {
                        monthEntry["Conversion Rate"] = monthEntry.Clicks > 0
                            ? (monthEntry.Conversions / monthEntry.Clicks) * 100
                            : 0;

                        monthEntry["Conv. Value/ Cost"] = monthEntry.Cost > 0
                            ? monthEntry["Conversion Value"] / monthEntry.Cost
                            : 0;
                    });
                });

                const formattedData = Array.from(productData.entries())
                    .map(([product, { MonthlyData }]) => {
                        const totalCost = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData.Cost, 0);
                        const totalConvValue = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData["Conversion Value"], 0);
                        
                        // Calculate the Total Conv. Value / Cost
                        const totalConvValueCostRatio = totalCost > 0 ? totalConvValue / totalCost : 0;
                        const monthlyDataArray = Array.from(MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month));

                        return {
                            "Product": product,
                            "Total Cost": totalCost,
                            "Total Conv. Value": totalConvValue,
                            "Conv. Value / Cost": totalConvValueCostRatio,
                            MonthlyData: monthlyDataArray,
                        };
                    });

                let limitedData = formattedData.slice(0, 500);

                if (costFilter || convValuePerCostFilter) {
                    limitedData = limitedData.filter(item => {
                        const costCondition = costFilter
                            ? compareValues(item["Total Cost"], costFilter.value, costFilter.operator)
                            : true;

                        const convValuePerCostCondition = convValuePerCostFilter
                            ? compareValues(item["Conv. Value / Cost"], convValuePerCostFilter.value, convValuePerCostFilter.operator)
                            : true;

                        return costCondition && convValuePerCostCondition;
                    });
                }

                // Add the account data to our collection
                allAccountsData.push({
                    accountId: clientId,
                    accountName: accountName,
                    products: limitedData
                });

            } catch (accountError) {
                console.error(`Error processing ad account ${clientId} for product metrics:`, accountError);
                // Add empty data for this account to show it was processed but had an error
                allAccountsData.push({
                    accountId: clientId,
                    accountName: `Account ${clientId}`,
                    products: [],
                    error: accountError.message
                });
            }
        }

        return res.json({
            success: true,
            data: allAccountsData
        });
    } catch (error) {
        console.error("Failed to fetch Google Ads product metrics:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}

// Helper function to process monthly data
function processMonthlyData(monthlyData, metrics, month) {
    if (!monthlyData.has(month)) {
        monthlyData.set(month, {
            Month: moment(month).format('YYYYMM'),
            Cost: 0,
            Clicks: 0,
            Conversions: 0,
            "Conversion Value": 0,
            "Conv. Value/ Cost": 0,
            "Conversion Rate": 0,
        });
    }

    const monthData = monthlyData.get(month);
    monthData.Cost += (metrics.cost_micros / 1_000_000);
    monthData.Clicks += metrics.clicks;
    monthData.Conversions += metrics.conversions;
    monthData["Conversion Value"] += metrics.conversions_value;
    monthData["Conv. Value/ Cost"] = metrics.conversions_value_per_cost;
    monthData["Conversion Rate"] = metrics.conversions_from_interactions_rate * 100;
}
// Helper function to format state data
function formatStateData(stateData) {
    return Array.from(stateData.entries()).map(([stateName, { MonthlyData }]) => {
        const totalCost = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData.Cost, 0);
        const totalConvValue = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData["Conversion Value"], 0);
        const totalClicks = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData.Clicks, 0);
        const totalConversions = Array.from(MonthlyData.values()).reduce((sum, monthData) => sum + monthData.Conversions, 0);
        const totalConvValueCostRatio = totalCost > 0 ? totalConvValue / totalCost : 0;
        const totalConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
        
        return {
            "State": stateName,
            "Total Cost": totalCost,
            "Total Clicks": totalClicks,
            "Total Conversions": totalConversions,
            "Conv. Value / Cost": totalConvValueCostRatio,
            "Conversion Rate": totalConversionRate,
            "Total Conv. Value": totalConvValue,
            MonthlyData: Array.from(MonthlyData.values()).sort((a, b) => a.Month.localeCompare(b.Month)),
        };
    });
}

// Helper function to validate brand and user
function validateBrandAndUser(brand) {
    if (!brand) {
        return {
            success: false,
            message: 'Brand not found.',
        };
    }
    return null;
}

// Helper function to validate refresh token
function validateRefreshToken(refreshToken, brandId) {
    if (!refreshToken?.trim()) {
        console.warn(`No refresh token found for Brand ID: ${brandId}`);
        return { error: 'Access to Google Ads API is forbidden. Check your credentials or permissions.' };
    }
    return null;
}

// Helper function to process account data
async function processAccountStateData(customer, adjustedStartDate, adjustedEndDate) {
    const stateQuery = `
        SELECT
            customer.descriptive_name,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value,
            metrics.clicks,
            metrics.conversions_from_interactions_rate,
            segments.geo_target_state,
            segments.month
        FROM
            user_location_view
        WHERE
            segments.date BETWEEN '${adjustedStartDate}' AND '${adjustedEndDate}'
        ORDER BY
            metrics.cost_micros DESC
        LIMIT 1000
    `;

    const results = await customer.query(stateQuery);
    const stateData = new Map();

    for (const result of results) {
        const state = result.segments.geo_target_state || 'Unknown';
        if (!stateData.has(state)) {
            stateData.set(state, { MonthlyData: new Map() });
        }
        processMonthlyData(stateData.get(state).MonthlyData, result.metrics, result.segments.month);
    }

    return {
        accountName: results[0]?.customer?.descriptive_name || `Account ${customer.customer_id}`,
        stateData
    };
}

export async function fetchStateMetrics(req, res) {
    const { brandId } = req.params;

    let { startDate, endDate, costFilter, convValuePerCostFilter } = req.body;

    try {
        const brand = await Brand.findById(brandId).lean();

        const validationError = validateBrandAndUser(brand);
        if (validationError) return res.status(404).json(validationError);

        const refreshTokenError = validateRefreshToken(brand.googleAdsRefreshToken, brandId);
        if (refreshTokenError) return res.status(403).json(refreshTokenError);

        const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

        if (!brand.googleAdAccount?.length) {
            return res.json({
                success: true,
                data: [],
                message: "No Google ads accounts found for this brand"
            });
        }

        const allAccountsData = await Promise.all(brand.googleAdAccount.map(async (adAccount) => {
            const clientId = adAccount.clientId;
            const managerId = adAccount.managerId;

            if (!clientId) return null;

            try {
                const customer = client.Customer({
                    customer_id: clientId,
                    refresh_token: brand.googleAdsRefreshToken,
                    login_customer_id: managerId
                });

                const { accountName, stateData } = await processAccountStateData(customer, adjustedStartDate, adjustedEndDate);
                let limitedData = formatStateData(stateData).slice(0, 500);

                if (costFilter || convValuePerCostFilter) {
                    limitedData = limitedData.filter(item => {
                        const costCondition = costFilter ? compareValues(item["Total Cost"], costFilter.value, costFilter.operator) : true;
                        const convValuePerCostCondition = convValuePerCostFilter ? compareValues(item["Conv. Value / Cost"], convValuePerCostFilter.value, convValuePerCostFilter.operator) : true;
                        return costCondition && convValuePerCostCondition;
                    });
                }

                return {
                    accountId: clientId,
                    accountName,
                    stateMetrics: limitedData
                };
            } catch (accountError) {
                console.error(`Error processing ad account ${clientId} for state metrics:`, accountError);
                return {
                    accountId: clientId,
                    accountName: `Account ${clientId}`,
                    stateMetrics: [],
                    error: accountError.message
                };
            }
        }));

        return res.json({
            success: true,
            data: allAccountsData.filter(Boolean)
        });
    } catch (error) {
        console.error("Failed to fetch Google Ads state metrics:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}




