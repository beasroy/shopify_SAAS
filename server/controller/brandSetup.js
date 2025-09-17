import { google } from 'googleapis';
import User from '../models/User.js';
import { GoogleAdsApi } from "google-ads-api";
import { config } from 'dotenv';
import NodeCache from 'node-cache';
import axios from 'axios';
import Brand from '../models/Brands.js';

const cache = new NodeCache({ stdTTL: 604800, checkperiod: 600 });
config();

// Export cache instance for central management
export { cache };

const createGoogleAdsClient = (refreshToken) => {
    return new GoogleAdsApi({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
        refresh_token: refreshToken,
    });
};

export const getGoogleAdAccounts = async (req, res) => {
    try {
        const {brandId} = req.params;
        if (!brandId) {
            return res.status(400).json({ message: 'Brand ID is required.' });
        }
        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found.' });
        }
        if (!brand.googleAdsRefreshToken) {
            return res.status(403).json({ message: 'This brand does not have a Google Ads refresh token.' });
        }

        const cacheKey = `google_ads_accounts_${brandId}`;

        // Check cache
        const cachedAdAccounts = cache.get(cacheKey);
        if (cachedAdAccounts) {
            console.log('Retrieved cached ad accounts data:', cachedAdAccounts);
            return res.status(200).json({ clientAccounts: cachedAdAccounts, fromCache: true });
        } else {
            console.log('No cached data found for key:', cacheKey);
        }

        const client = createGoogleAdsClient(brand.googleAdsRefreshToken);

        // Get list of accessible customers
        const customersResponse = await client.listAccessibleCustomers(brand.googleAdsRefreshToken);
        console.log('Accessible customers:', customersResponse);

        if (!customersResponse?.resource_names?.length) {
            cache.set(cacheKey, [], 604800); // Cache empty result for 7 days
            return res.status(200).json({ clientAccounts: [] });
        }

        const customerIds = customersResponse.resource_names.map(resource => resource.split('/')[1]);

        // Process each customer account
        const clientAccounts = [];

        for (const customerId of customerIds) {
            try {
                const customer = client.Customer({
                    customer_id: customerId,
                    refresh_token: brand.googleAdsRefreshToken,
                });
                const query = `
                    SELECT
                      customer_client.client_customer,
                      customer_client.level,
                      customer_client.hidden,
                      customer_client.descriptive_name
                    FROM customer_client
                    WHERE customer_client.level IN (0,1)
                `;

                const response = await customer.query(query);
                console.log(`Customer ${customerId} response:`, response);

                const accounts = response.map(row => ({
                    name: row.customer_client.descriptive_name,
                    clientId: row.customer_client.client_customer?.split('/')[1] || null,
                    hidden: row.customer_client.hidden,
                    managerId: customerId
                })).filter(account => account.clientId);

                clientAccounts.push(...accounts);
            } catch (error) {
                console.warn(`Error processing customer ${customerId}:`, error.message);
            }
        }

        cache.set(cacheKey, clientAccounts, 604800);

        res.status(200).json({ clientAccounts });

    } catch (error) {
        console.error('Error fetching Google accounts:', error);

        // Check if refresh token is expired
        if (error.message?.includes('invalid_grant')) {
            console.log('Refresh token expired. Prompting brand to reauthenticate.');
            return res.status(401).json({
                message: 'Your Google session has expired. Please log in again.',
                code: 'TOKEN_EXPIRED',
            });
        }

        // Check for Google Ads API errors
        if (error.errors?.some(err => err.message.includes('OAuth access token is not associated with any Ads accounts'))) {
            return res.status(400).json({
                message: 'The Google account is not associated with any Ads accounts.',
                error: error.message,
            });
        }

        res.status(500).json({
            message: 'Error fetching Google accounts.',
            error: error.message,
        });
    }
};


export const getGa4PropertyIds = async (req, res) => {
    try {
        const {brandId} = req.params;
        if (!brandId) {
            return res.status(400).json({ message: 'Brand ID is required.' });
        }
        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found.' });
        }

        if (!brand.googleAnalyticsRefreshToken) {
            return res.status(403).json({ message: 'This brand does not have a Google Analytics refresh token.' });
        }

        const cacheKey = `ga4_properties_${brandId}`;

        const cachedProperties = cache.get(cacheKey);
        if (cachedProperties) {
            console.log('Returning cached data');
            return res.status(200).json({ propertiesList: cachedProperties, fromCache: true });
        }

   

        // Initialize OAuth client with the refresh token only
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({ refresh_token: brand.googleAnalyticsRefreshToken });


        const analyticsAdmin = google.analyticsadmin({ version: 'v1alpha', auth: oauth2Client });
        const accountsResponse = await analyticsAdmin.accounts.list();
        const accounts = accountsResponse.data.accounts || [];

        if (accounts.length === 0) {
            return res.status(404).json({ message: 'No accounts found.' });
        }

        const propertiesList = [];
        for (const account of accounts) {
            const propertiesResponse = await analyticsAdmin.properties.list({
                filter: `parent:${account.name}`,
            });

            const properties = propertiesResponse.data.properties || [];
            properties.forEach((property) => {
                propertiesList.push({
                    accountName: account.displayName,
                    propertyId: property.name.split('/').pop(),
                    propertyName: property.displayName,
                });
            });
        }

        // Cache the result
        cache.set(cacheKey, propertiesList);

        res.json({ propertiesList });
    } catch (error) {
        console.error('Error fetching properties:', error.message);
        console.error('Stack trace:', error.stack);
        if (error.message && error.message.includes('invalid_grant')) {
            console.log('Refresh token expired. Prompting user to reauthenticate.');

            // Invalidate the user's refresh token in the database
            //await User.findByIdAndUpdate(req.body.userId, { googleAnalyticsRefreshToken: null });

            return res.status(401).json({
                message: 'Your Google session has expired. Please log in again to continue.',
                code: 'TOKEN_EXPIRED',
            });
        }
        res.status(500).json({ message: 'Error fetching properties.', error: error.message });
    }
};

export const getFbAdAccountIds = async (req, res) => {
    try {
        const {brandId} = req.params;
        if (!brandId) {
            return res.status(400).json({ message: 'Brand ID is required.' });
        }

        const cacheKey = `fb_ad_accounts_${brandId}`;

        const cachedFbAdAccounts = cache.get(cacheKey);
        if (cachedFbAdAccounts) {
            return res.status(200).json({ adAccounts: cachedFbAdAccounts, fromCache: true });
        }

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found.' });
        }

        if (brand.fbAccessToken == null) {
            return res.status(403).json({ message: 'This brand does not have a Facebook access token.' });
        }

        // Construct the Graph API request URL
        const url = `https://graph.facebook.com/v22.0/me?fields=adaccounts{account_id,name}&access_token=${brand.fbAccessToken}`;

        // Make the request to Facebook Graph API
        const response = await axios.get(url);

        if (response.data && response.data.adaccounts) {
            const adAccounts = response.data.adaccounts.data.map(account => ({
                id: account.id,
                adname: account.name,
            }));

            cache.set(cacheKey, adAccounts, 604800); // 7 days TTL
            return res.status(200).json({ adAccounts: adAccounts, fromCache: false });
        } else {
            return res.status(404).json({ message: 'No ad accounts found for the user.' });
        }
    } catch (error) {
        console.error('Error fetching Facebook Ad Accounts:', error.message);
        res.status(500).json({ message: 'Error fetching Facebook Ad accounts.', error: error.message });
    }
};




