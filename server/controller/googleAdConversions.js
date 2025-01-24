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
            endDate = moment().endOf('month').format('YYYY-MM-DD');
            startDate = moment().subtract(6, 'months').startOf('month').format('YYYY-MM-DD');
        } else {
            startDate = moment(startDate).startOf('month').format('YYYY-MM-DD');
            endDate = moment(endDate).endOf('month').format('YYYY-MM-DD');
        }

        const customer = client.Customer({
            customer_id: brand.googleAdAccount,
            refresh_token: process.env.GOOGLE_AD_REFRESH_TOKEN,
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID,
        });

        const query = `
           SELECT
                metrics.cost_micros,
                metrics.conversions_value,
                metrics.cost_per_conversion,
                segments.month,
                segments.geo_target_city
            FROM
                user_location_view
            WHERE
                segments.date BETWEEN '${startDate}' AND '${endDate}'
        `;

        const results = await customer.query(query);

        // Accumulate data month-wise for each city
        const cityMonthData = results.reduce((acc, row) => {
            const city = row.segments.geo_target_city;
            const month = row.segments.month;

            if (!acc[city]) {
                acc[city] = {
                  MonthlyData: {},
                  TotalSessions: 0,
                  TotalPurchases: 0,
                };
              }

            if (!acc[city].MonthlyData[month]) {
                acc[city].MonthlyData[month] = {
                    Month:month,
                    Cost: 0.00,
                    "Conv. Value": 0.00,
                    "Conv. Value/ Cost": 0.00
                };
            }

            // Accumulate cost and conversions
            acc[city].MonthlyData[month].Cost += row.metrics.cost_micros / 1_000_000; 
            acc[city].MonthlyData[month]["Conv. Value"] += row.metrics.conversions_value;
            acc[city].MonthlyData[month]["Conv. Value/ Cost"] += row.metrics.cost_per_conversion;

            return acc;
        }, {});

        // Format the accumulated data for response
        const formattedData = Object.entries(cityMonthData).map(([city, cityData]) => ({
            City:city,
            MonthlyData: Object.values(cityData.MonthlyData)
        }));

        return res.json({
            success: true,
            data: formattedData,
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
