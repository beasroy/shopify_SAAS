import axios from 'axios';
import { config } from 'dotenv';
import moment from 'moment';
import Brand from '../models/Brands.js';
import { GoogleAdsApi } from "google-ads-api";

config();

const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
    refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
});

export async function fetchGoogleAdCityConversions(req, res) {
    const { brandId } = req.params;
    let { startDate, endDate } = req.body;

    try {
        const brand = await Brand.findById(brandId);
        if (!brand || !brand.googleAdAccount) {
            return res.status(404).json({
                success: false,
                message: 'Brand or Ad Account not found.',
            });
        }

        // Ensure a valid month-based date range
        if (!startDate || !endDate) {
            endDate = moment().endOf('month').format('YYYY-MM-01');
            startDate = moment(endDate).subtract(3, 'months').format('YYYY-MM-01');
        } else {
            startDate = moment(startDate).startOf('month').format('YYYY-MM-01');
            endDate = moment(endDate).startOf('month').format('YYYY-MM-01');
        }

        const customer = client.Customer({
            customer_id: brand.googleAdAccount,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const query = `
            SELECT 
                segments.month,
                geo_target_constant.name,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.ctr
            FROM campaign_location_view
            WHERE segments.month >= '${startDate}'
            AND segments.month < '${endDate}'
            AND metrics.impressions > 0
            ORDER BY 
                segments.month, 
                metrics.impressions DESC
        `;

        const results = await customer.query(query);

        const processedReport = results.map(row => ({
            month: row.segments.month,
            city: row.geo_target_constant.name,
            impressions: row.metrics.impressions,
            clicks: row.metrics.clicks,
            costMicros: row.metrics.cost_micros,
            costUSD: row.metrics.cost_micros / 1000000,
            conversions: row.metrics.conversions,
            ctr: row.metrics.ctr
        }));

        return res.json({
            success: true,
            data: processedReport,
        });

    } catch (error) {
        console.error("Failed to fetch Google Ads location metrics:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
}