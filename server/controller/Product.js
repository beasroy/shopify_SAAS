import Product from "../models/Product.js";
import Brand from "../models/Brands.js";
import mongoose from "mongoose";
import axios from 'axios';
import moment from 'moment-timezone';


export async function deleteAllProducts(req, res) {
    try {
        const result = await Product.deleteMany({});

        if (result.deletedCount === 0) {
            return res.status(200).json({
                success: true,
                message: 'No products found',
            });
        }

        return res.status(200).json({
            success: true,
            message: `${result.deletedCount} products deleted successfully`,
        });
    } catch (error) {
        console.error(`Error deleting products:`, error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}


export async function deleteProductsByBrand(req, res) {
    try {
        const { brandId } = req.params;

        if (!brandId) {
            return res.status(400).json({
                success: false,
                error: 'brandId is required',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Brand ID format'
            });
        }

        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({ success: false, error: 'Brand not found' });
        }
        const result = await Product.deleteMany({ brandId: brandId });

        if (result.deletedCount === 0) {
            return res.status(200).json({
                success: true,
                message: 'No products found for this brand',
            });
        }

        return res.status(200).json({
            success: true,
            message: `${result.deletedCount} products deleted successfully for brand ${brand.name}`,
            deletedCount: result.deletedCount,
            brand: brand.name
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

const makeGraphQLRqst = async (shopName, accessToken, query, variables) => {
    const url = `https://${shopName}/admin/api/2024-10/graphql.json`; // Updated API version
    const response = await axios.post(
        url,
        { query, variables },
        {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        }
    );

    if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
    }
    return response.data.data;
};

export const calculateMonthlyProductLaunches = async (brandId, startDate, endDate) => {
    try {
        if (!brandId || !startDate || !endDate) {
            throw new Error('Missing required parameters: brandId, startDate, and endDate are required');
        }

        // Validate date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            throw new Error('Invalid date format. Please use YYYY-MM-DD format');
        }

        const brand = await Brand.findById(brandId);
        const { shopifyAccessToken: access_token, shopName } = brand.shopifyAccount || {};
        const cleanShopName = shopName.replace(/^https?:\/\//, '').replace(/\/$/, '');

        const shopResponse = await axios.get(`https://${cleanShopName}/admin/api/2024-10/shop.json`, {
            headers: { 'X-Shopify-Access-Token': access_token }
        });
        const storeTimezone = shopResponse.data.shop.iana_timezone || 'UTC';

        // Set boundaries
        const startMoment = moment.tz(startDate, storeTimezone).startOf('day');
        const endMoment = moment.tz(endDate, storeTimezone).endOf('day');

        // 1. Fetch EVERYTHING from Shopify via GraphQL 

        let allProducts = [];
        let hasNextPage = true;
        let cursor = null;

        // We search the entire range provided in the request
        // const queryStr = `created_at:>=${startMoment.utc().toISOString()} AND created_at:<=${endMoment.utc().toISOString()}`;
        const queryStr = `created_at:>=${startMoment.utc().format('YYYY-MM-DDTHH:mm:ss[Z]')} created_at:<=${endMoment.utc().format('YYYY-MM-DDTHH:mm:ss[Z]')}`;


        while (hasNextPage) {
            const PRODUCT_QUERY = `
          query getProducts($first: Int!, $after: String, $query: String!) {
            products(first: $first, after: $after, query: $query) {
              pageInfo { hasNextPage endCursor }
              edges { node { createdAt } }
            }
          }
        `;

            const gqlData = await makeGraphQLRqst(cleanShopName, access_token, PRODUCT_QUERY, {
                first: 250,
                after: cursor,
                query: queryStr
            });

            const edges = gqlData?.products?.edges || [];
            console.log("edges==========>", edges);
            allProducts.push(...edges);

            hasNextPage = gqlData?.products?.pageInfo?.hasNextPage;
            cursor = gqlData?.products?.pageInfo?.endCursor;
        }

        // 2. Group by Month using Store Timezone
        const monthlyMap = new Map();

        allProducts.forEach(edge => {
            const monthKey = moment.tz(edge.node.createdAt, storeTimezone).format('YYYY-MM');
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
        });

        // 3. Format Response
        return Array.from(monthlyMap.entries())
            .map(([monthKey, count]) => ({
                month: monthKey,
                monthName: moment(monthKey + '-01').format('MMM-YYYY'),
                productsLaunched: count
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

    } catch (error) {
        console.error('❌ Error in calculation:', error.message);
        throw error;
    }
};

export const getMonthlyProductLaunches = async (req, res) => {
    try {
        const { brandId } = req.params;
        const { startDate, endDate } = req.body;

        const data = await calculateMonthlyProductLaunches(
            brandId,
            startDate,
            endDate
        );

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('❌ Error in getMonthlyProductLaunches:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};