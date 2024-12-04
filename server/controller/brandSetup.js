import { google } from 'googleapis';
import User from '../models/User.js';
import { GoogleAdsApi } from "google-ads-api";
import { config } from 'dotenv';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 604800, checkperiod: 600 });
config();

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
        const { userId } = req.body; 
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }
        const cacheKey = `google_ads_accounts_${userId}`;

        const cachedAdAccounts = cache.get(cacheKey);
        if (cachedAdAccounts) {
            console.log('Retrieved cached ad accounts data:', cachedAdAccounts);
            return res.status(200).json({ clientAccounts: cachedAdAccounts, fromCache: true });
        } else {
            console.log('No cached data found for key:', cacheKey);
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.method !== 'google') {
            return res.status(403).json({ message: 'This user is not using Google authentication.' });
        }

        const client = createGoogleAdsClient(user.googleRefreshToken);

        // Create customer instance
        const customer = client.Customer({
            customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID, 
            login_customer_id: process.env.GOOGLE_AD_MANAGER_ACCOUNT_ID, 
            refresh_token: user.googleRefreshToken,
        });

        const query = `
            SELECT
              customer_client.client_customer,
              customer_client.level,
              customer_client.hidden,
              customer_client.descriptive_name
            FROM customer_client
            WHERE customer_client.level = 1
        `;
        const response = await customer.query(query);

        const clientAccounts = response.map(row => ({
            name: row.customer_client.descriptive_name,
            clientId: row.customer_client.client_customer.split('/')[1],
            hidden: row.customer_client.hidden,
        }));

        console.log('Client Accounts:', clientAccounts);

        // Cache the client accounts
        cache.set(cacheKey, clientAccounts, 604800); // 7 days TTL

        res.status(200).json({ clientAccounts });

    } catch (error) {
        console.error('Error fetching Google accounts:', error);
        res.status(500).json({ message: 'Error fetching Google accounts.', error: error.message });
    }
};




export const getGa4PropertyIds = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        const cacheKey = `ga4_properties_${userId}`;

        const cachedProperties = cache.get(cacheKey);
        if (cachedProperties) {
            console.log('Returning cached data');
            return res.status(200).json({ propertiesList:cachedProperties, fromCache: true });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.method !== 'google') {
            return res.status(403).json({ message: 'This user is not using Google authentication.' });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        oauth2Client.setCredentials({
            access_token: user.googleAccessToken,
            refresh_token: user.googleRefreshToken,
        });

        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.access_token) {
                user.googleAccessToken = tokens.access_token;
            }
            if (tokens.refresh_token) {
                user.googleRefreshToken = tokens.refresh_token;
            }
            await user.save(); // Save updated tokens to the database
        });

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

        cache.set(cacheKey, propertiesList);

        res.json({propertiesList});
    } catch (error) {
        console.error('Error fetching properties:', error.message);
        res.status(500).json({ message: 'Error fetching properties.', error: error.message });
    }
};

