import moment from 'moment';
import Brand from '../models/Brands.js';
import User from '../models/User.js';
import { GoogleAdsApi } from "google-ads-api";


const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
});

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

        // Set default date range
        startDate = !startDate 
            ? moment().subtract(6, 'months').startOf('month').format('YYYY-MM-DD')
            : moment(startDate).startOf('month').format('YYYY-MM-DD');
        
        endDate = !endDate
            ? moment().endOf('month').format('YYYY-MM-DD')
            : moment(endDate).endOf('month').format('YYYY-MM-DD');

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
                metrics.conversions_value_per_cost,
                metrics.clicks,
                metrics.conversions_from_interactions_rate,
                segments.month    
            FROM
                search_term_view
            WHERE
                segments.date BETWEEN '${startDate}' AND '${endDate}'
        `;

        const results = await customer.query(query);
      

        // Optimized data aggregation
        const searchTermData = results.reduce((acc, { search_term_view: { search_term }, metrics, segments: { month } }) => {
            if (!acc[search_term]) {
                acc[search_term] = { MonthlyData: {} };
            }

            const monthData = acc[search_term].MonthlyData[month] || {
                Month: moment(month).format('YYYYMM'),
                Cost: 0, Clicks: 0, Conversions: 0,
                "Conv. Value/ Cost": 0, "Conversion Rate": 0
            };

            monthData.Cost += metrics.cost_micros / 1_000_000;
            monthData.Clicks += metrics.clicks;
            monthData.Conversions += metrics.conversions;
            monthData["Conv. Value/ Cost"] += metrics.conversions_value_per_cost;
            monthData["Conversion Rate"] += metrics.conversions_from_interactions_rate*100;

            acc[search_term].MonthlyData[month] = monthData;
            return acc;
        }, {});

        // Format and sort
        const formattedData = Object.entries(searchTermData)
            .map(([searchTerm, { MonthlyData }]) => ({
                "Search Term": searchTerm,
                TotalCost: Object.values(MonthlyData).reduce((sum, monthData) => sum + monthData.Cost, 0),
                MonthlyData: Object.values(MonthlyData)
            }))
            .sort((a, b) => b.TotalCost - a.TotalCost).slice(0, 500);

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

        // Set default date range
        startDate = !startDate 
            ? moment().subtract(6, 'months').startOf('month').format('YYYY-MM-DD')
            : moment(startDate).startOf('month').format('YYYY-MM-DD');
        
        endDate = !endDate
            ? moment().endOf('month').format('YYYY-MM-DD')
            : moment(endDate).endOf('month').format('YYYY-MM-DD');

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
                segments.month    
            FROM
                age_range_view
            WHERE
                segments.date BETWEEN '${startDate}' AND '${endDate}'
        `;

        const results = await customer.query(query);
      
        // Optimized data aggregation
        const ageRangeData = results.reduce((acc, row) => {
            const ageRangeType = ageRanges[row.ad_group_criterion.age_range.type] || 'UNKNOWN';
            
            if (!acc[ageRangeType]) {
                acc[ageRangeType] = { MonthlyData: {} };
            }

            const monthData = acc[ageRangeType].MonthlyData[row.segments.month] || {
                Month: moment(row.segments.month).format('YYYYMM'),
                Cost: 0, 
                Clicks: 0, 
                Conversions: 0,
                "Conversion Rate": 0
            };

            monthData.Cost += row.metrics.cost_micros / 1_000_000;
            monthData.Clicks += row.metrics.clicks;
            monthData.Conversions += row.metrics.conversions;
            monthData["Conversion Rate"] += row.metrics.conversions_from_interactions_rate * 100;

            acc[ageRangeType].MonthlyData[row.segments.month] = monthData;
            return acc;
        }, {});

        // Format and sort
        const formattedData = Object.entries(ageRangeData)
            .map(([ageRange, { MonthlyData }]) => ({
                "Age Range": ageRange,
                TotalCost: Object.values(MonthlyData).reduce((sum, monthData) => sum + monthData.Cost, 0),
                MonthlyData: Object.values(MonthlyData)
            })).slice(0,500);

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

        // Set default date range
        startDate = !startDate 
            ? moment().subtract(6, 'months').startOf('month').format('YYYY-MM-DD')
            : moment(startDate).startOf('month').format('YYYY-MM-DD');
        
        endDate = !endDate
            ? moment().endOf('month').format('YYYY-MM-DD')
            : moment(endDate).endOf('month').format('YYYY-MM-DD');

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
                segments.month    
            FROM
                gender_view
            WHERE
                segments.date BETWEEN '${startDate}' AND '${endDate}'
        `;

        const results = await customer.query(query);
      
        // Optimized data aggregation
        const genderData = results.reduce((acc, row) => {
            const gender = genderTypes[row.ad_group_criterion.gender.type] || 'UNKNOWN';
            
            if (!acc[gender]) {
                acc[gender] = { MonthlyData: {} };
            }

            const monthData = acc[gender].MonthlyData[row.segments.month] || {
                Month: moment(row.segments.month).format('YYYYMM'),
                Cost: 0, 
                Clicks: 0, 
                Conversions: 0,
                "Conversion Rate": 0
            };

            monthData.Cost += row.metrics.cost_micros / 1_000_000;
            monthData.Clicks += row.metrics.clicks;
            monthData.Conversions += row.metrics.conversions;
            monthData["Conversion Rate"] += row.metrics.conversions_from_interactions_rate * 100;

            acc[gender].MonthlyData[row.segments.month] = monthData;
            return acc;
        }, {});

        // Format and sort
        const formattedData = Object.entries(genderData)
            .map(([gender, { MonthlyData }]) => ({
                "Gender": gender,
                TotalCost: Object.values(MonthlyData).reduce((sum, monthData) => sum + monthData.Cost, 0),
                MonthlyData: Object.values(MonthlyData)
            })).slice(0,500);

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
