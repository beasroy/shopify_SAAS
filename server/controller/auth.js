import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis'
import crypto from 'crypto';
import axios from 'axios';
import Brand from "../models/Brands.js";
import Subscription from "../models/Subscription.js";
import { registerWebhooks } from '../webhooks/shopify.js';
import { metricsQueue } from "../config/redis.js";

config();

export const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
);
const SECRET_KEY = process.env.JWT_SECRET || "your-default-secret";

export const getGoogleAuthURL = (req, res) => {
    const { context, source } = req.query;

    const scopes = [
        'https://www.googleapis.com/auth/adwords',
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics.edit',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: JSON.stringify({ context: context || 'default', source: source || '/dashboard' }),
    });

    res.status(200).json({ authUrl: url });
};

export const handleGoogleCallback = async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code from Google.');

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        let stateObj;
        try {
            stateObj = JSON.parse(state);
        } catch (e) {
            stateObj = { context: 'default', source: '/dashboard' };
        }

        const context = stateObj.context || 'default';
        const sourcePage = stateObj.source || '/dashboard';
        const isProduction = process.env.NODE_ENV === 'production';

        if (context === 'googleAdSetup') {
            const googleadRefreshToken = tokens.refresh_token;

            const clientURL = isProduction
                ? 'https://parallels.messold.com/callback'
                : 'http://localhost:5173/callback';

            return res.redirect(clientURL + `?googleadRefreshToken=${googleadRefreshToken}&source=${encodeURIComponent(sourcePage)}`);
        } else if (context === 'googleAnalyticsSetup') {
            const googleanalyticsRefreshToken = tokens.refresh_token;

            const clientURL = isProduction
                ? 'https://parallels.messold.com/callback'
                : 'http://localhost:5173/callback';

            return res.redirect(clientURL + `?googleanalyticsRefreshToken=${googleanalyticsRefreshToken}&source=${encodeURIComponent(sourcePage)}`);
        } else if (context === 'userLogin') {
            const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
            const userInfo = await oauth2.userinfo.get();
            const { email, name, id } = userInfo.data;

            let user = await User.findOne({ email });
            if (!user) {
                user = new User({
                    username: name,
                    email,
                    googleId: id,
                    method: 'google',
                    googleAdsRefreshToken: tokens.refresh_token, 
                    googleAnalyticsRefreshToken: tokens.refresh_token, 
                    isAdmin: false,
                    isClient: true
                });
                await user.save();
            } 

            const jwtToken = jwt.sign(
                { id: user._id, email: user.email, method: user.method },
                SECRET_KEY,
                { expiresIn: '7d' }
            );

            res.cookie('token', jwtToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'strict' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            const clientURL = isProduction
                ? 'https://parallels.messold.com/callback'
                : 'http://localhost:5173/callback';

            return res.redirect(clientURL + `?token=${jwtToken}&source=${encodeURIComponent(sourcePage)}`);
        } else {
            return res.status(400).send('Invalid context in Google callback.');
        }
    } catch (error) {
        console.error('Error during Google OAuth callback:', error);
        res.status(500).json({ success: false, message: 'Google OAuth failed', error: error.message });
    }
};

export const userRegistration = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username, email, and password.'
            });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists.'
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            method: 'password'
        });

        await newUser.save();

        const userResponse = {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email
        };

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userResponse
        });

    } catch (error) {
        console.error('Error registering user:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register user.',
            error: error.message
        });
    }
}

export const userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { type } = req.params;

        let decoded_token;

        if (type === 'oauth') {
            const { auth_token } = req.query;

            if (!auth_token) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing authentication token for OAuth login.'
                });
            }

            try {
                decoded_token = jwt.verify(auth_token, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }
        }

        const user = await User.findOne({
            email: type === 'oauth' ? decoded_token?.email : email
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found. Please check your email or register.'
            });
        }

        if (type === 'oauth') {
            user.loginCount += 1;
            await user.save();
            return res.status(200).json({
                success: true,
                message: 'OAuth login successful',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    brands: user.brands,
                    isAdmin: user.isAdmin,
                    isClient: user.isClient,
                    method: user.method,
                    loginCount: user.loginCount
                }
            });
        }

        // Handle normal login
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both email and password.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials. Please check your password.'
            });
        }

        const token = jwt.sign(
            { id: user._id,email: user.email, method: user.method },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        user.loginCount += 1; // Increment login count
        await user.save(); // Save updated count

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                brands: user.brands,
                isAdmin: user.isAdmin,
                isClient: user.isClient,
                method: user.method,
                loginCount: user.loginCount
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during login.',
            error: error.message
        });
    }
};
export const userLogout = (req, res) => {
    try {
        // Configure cookies for production (HTTPS)
        const isProduction = process.env.NODE_ENV === 'production';

        res.clearCookie('token', {
            httpOnly: true,
            secure: isProduction, // Use true if running on HTTPS in production
            sameSite: isProduction ? 'strict' : 'lax' // Use 'strict' for better security
        });

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Error during logout:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during logout.',
            error: error.message
        });
    }
};

export const getFbAuthURL = (req, res) => {
    const { source } = req.query; 
    
    // Generate a random state for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store both state and source in the cookie
    const stateData = JSON.stringify({ state, source: source || '/dashboard' });
    res.cookie('fb_state', stateData, { httpOnly: true, secure: true }); // Store in a secure cookie

    const authURL = `https://www.facebook.com/v21.0/dialog/oauth?` +
        `client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)}` +
        `&state=${state}` +
        `&scope=ads_read`;

    return res.status(200).json({ success: true, authURL });
};

export const handleFbCallback = async (req, res) => {
    try {
        const { code, state: receivedState } = req.query;
        const storedStateData = req.cookies.fb_state;
        let sourcePage = '/dashboard';

        // Parse the stored state data
        try {
            const stateData = JSON.parse(storedStateData);
            if (stateData.state !== receivedState) {
                return res.status(400).send('Invalid state parameter');
            }
            sourcePage = stateData.source;
        } catch (e) {
            console.error('Error parsing state data:', e);
            return res.status(400).send('Invalid state data');
        }

        if (!code) {
            return res.status(400).send('Authorization code not provided');
        }

        const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
            params: {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                code
            }
        });
        const { access_token } = tokenResponse.data;

        const longLivedTokenResponse = await axios.get('https://graph.facebook.com/v17.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                fb_exchange_token: access_token
            }
        });

        const longLivedAccessToken = longLivedTokenResponse.data.access_token;

        const isProduction = process.env.NODE_ENV === 'production';

        const clientURL = isProduction
            ? 'https://parallels.messold.com/callback'
            : 'http://localhost:5173/callback';

        return res.redirect(clientURL + `?fbToken=${longLivedAccessToken}&source=${encodeURIComponent(sourcePage)}`);
    } catch (err) {
        console.error('Error during Facebook OAuth callback:', err);
        return res.status(500).json({ success: false, message: 'Failed to handle Facebook callback', error: err.message });
    }
}

export const updateTokensForGoogleAndFbAndZoho = async (req, res) => {
    try {
        const { type } = req.params;
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).send('User not authenticated.');
        }

        const userId = user._id;

        if (type === 'fbToken') {
            const { fbToken } = req.query;

            if (!fbToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Facebook token is required.',
                });
            }

            await User.findByIdAndUpdate(userId, {
                fbAccessToken: fbToken,
            });

            return res.status(200).json({
                success: true,
                message: 'Facebook access token updated successfully.',
            });
        }

        if (type === 'googleadRefreshToken') {
            const { googleadRefreshToken } = req.query;

            if (!googleadRefreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Google refresh token is required.',
                });
            }

            await User.findByIdAndUpdate(userId, {
                googleAdsRefreshToken: googleadRefreshToken,
            });

            return res.status(200).json({
                success: true,
                message: 'Google Ads refresh token updated successfully.',
            });
        }

        if (type === 'googleanalyticsRefreshToken') {
            const { googleanalyticsRefreshToken } = req.query; // <-- lowercase as in URL

            if (!googleanalyticsRefreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Google Analytics refresh token is required.',
                });
            }

            await User.findByIdAndUpdate(userId, {
                googleAnalyticsRefreshToken: googleanalyticsRefreshToken, // match field name
            });

            return res.status(200).json({
                success: true,
                message: 'Google Analytics refresh token updated successfully.',
            });
        }

        if (type === 'zoho') {
            const { zohoToken } = req.query;

            if (!zohoToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Zoho refresh token is required.',
                });
            }

            await User.findByIdAndUpdate(userId, {
                zohoRefreshToken: zohoToken,
            });

            return res.status(200).json({
                success: true,
                message: 'Zoho refresh token updated successfully.',
            });
        }

        return res.status(400).json({
            success: false,
            message: `Unsupported token type: ${type}`,
        });

    } catch (err) {
        console.error(`Error updating ${type} token:`, err);
        return res.status(500).json({
            success: false,
            message: `Failed to update ${type} token.`,
            error: err.message,
        });
    }
};


export const getShopifyAuthUrl = (req, res) => {
    const { shop , flowType} = req.body;

    if (!shop) {
        return res.status(400).json({ error: 'Shop name is required' });
    }

    // Remove .myshopify.com if present
    const cleanShop = shop.replace('.myshopify.com', '');

    const SCOPES = "read_all_orders,read_analytics, write_returns, read_returns, write_reports, read_reports, write_orders, read_orders, write_customers, read_customers, write_products, read_products"
    let redirectUri;
    if (flowType === 'brandSetup') {
        redirectUri = process.env.SHOPIFY_BRAND_SETUP_REDIRECT_URI;
    } else {
        redirectUri = process.env.SHOPIFY_LOGIN_REDIRECT_URI;
    }

    const authUrl = `https://${cleanShop}.myshopify.com/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}&scope=${SCOPES}&redirect_uri=${redirectUri}`;

    res.json({ success: true, authUrl });
}
export const handleShopifyCallback = async (req, res) => {
    const absoluteUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const url = new URL(absoluteUrl);

    const code = url.searchParams.get('code');
    const shop = url.searchParams.get('shop');

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!code || !shop) {
        return res.status(400).json({ error: 'Missing required parameters: code or shop' });
    }

    try {
        // Step 1: Exchange code for access token
        const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
        });

        const accessToken = tokenResponse.data?.access_token;
        if (!accessToken) {
            return res.status(500).json({ error: 'Failed to obtain access token' });
        }

        // Step 2: Fetch shop details
        const shopResponse = await axios.get(`https://${shop}/admin/api/2024-04/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken
            }
        });

        const shopData = shopResponse.data.shop;
        const shopId = shopData.id;
        const shopName = shopData.name;
        const ownerEmail = shopData.email;
        const ownerName = shopData.shop_owner;
        const storeCurrency = shopData.currency || 'USD';

        // Step 3: Find or create user
        const emailToUse = ownerEmail || `${shopName}@${shop}`;
        let user = await User.findOne({ email: emailToUse });

        if (user) {
            user.loginCount += 1;
            await user.save();
        }

        if (!user) {
            user = new User({
                username: ownerName || shopName,
                email: emailToUse,
                method: 'shopify',
                brands: [],
                isAdmin: false,
                loginCount: 0,
            });
            await user.save();
        }

        // Step 4: Find or create brand
        let brand = await Brand.findOne({ 'shopifyAccount.shopName': shop });

        if (brand) {
            brand.shopifyAccount.shopifyAccessToken = accessToken;
            brand.shopifyAccount.shopId = shopId;
            brand.shopifyAccount.currency = storeCurrency;
            await brand.save();

            if (!user.brands.includes(brand._id.toString())) {
                user.brands.push(brand._id);
                await user.save();
            }

            // Also add brand to all admin users
            const adminUsers = await User.find({ isAdmin: true });
            for (const adminUser of adminUsers) {
                if (!adminUser.brands.includes(brand._id.toString())) {
                    adminUser.brands.push(brand._id);
                    await adminUser.save();
                }
            }
        } else {
            brand = new Brand({
                name: shopName,
                shopifyAccount: {
                    shopName: shop,
                    shopifyAccessToken: accessToken,
                    shopId: shopId,
                    currency: storeCurrency
                }
            });
            await brand.save();

            // Add brand to the current user
            user.brands.push(brand._id);
            await user.save();

            // Also add brand to all admin users
            const adminUsers = await User.find({ isAdmin: true });
            for (const adminUser of adminUsers) {
                if (!adminUser.brands.includes(brand._id.toString())) {
                    adminUser.brands.push(brand._id);
                    await adminUser.save();
                }
            }
        }

        // Step 5: Create subscription if not exists
        let subscription = await Subscription.findOne({
            brandId: brand._id.toString(),
            shopId: shopId,
        });

        if (!subscription) {
            subscription = new Subscription({
                brandId: brand._id.toString(),
                shopId: shopId,
                planName: 'Free Plan',
                price: 0,
                status: 'active',
                billingOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            });
            await subscription.save();
        }

        await registerWebhooks(shop, accessToken);

        try {
            await metricsQueue.add('calculate-metrics', {
                brandId: brand._id.toString(),
                userId: user._id.toString()
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });
            console.log(`Metrics calculation queued for brand ${brand._id}`);
        } catch (metricsError) {
            console.error(`Failed to queue metrics calculation for brand ${brand._id}:`, metricsError);
        }

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                method: user.method
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        // Step 9: Redirect to frontend
        const clientURL = process.env.NODE_ENV === 'production'
            ? 'https://parallels.messold.com/callback'
            : 'http://localhost:5173/callback';

        return res.redirect(`${clientURL}?shopify_token=${token}&userId=${user._id}`);

    } catch (error) {
        console.error('Shopify OAuth callback error:', error);
        return res.status(500).json({
            error: 'Something went wrong during Shopify callback',
            details: error.response?.data || error.message
        });
    }
};

export const handleShopifyBrandSetupCallback = async (req, res) => {
    const { code, shop } = req.query;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!code || !shop) {}
}
 




export const getZohoAuthURL = (req, res) => {
    const authUrl = 'https://accounts.zoho.com/oauth/v2/auth' +
        `?client_id=${process.env.ZOHO_CLIENT_ID}` +
        '&response_type=code' +
        `&redirect_uri=${process.env.ZOHO_REDIRECT_URI}` +
        '&scope=Desk.tickets.ALL,Desk.basic.READ,Desk.settings.ALL,Desk.search.READ' +
        '&access_type=offline';
    res.json({ success: true, authUrl });
};

export const handleZohoCallback = async (req, res) => {
    const { code } = req.query;
    const sourcePage = req.query.source || '/dashboard';

    if (!code) {
        return res.status(400).send('Authorization code is missing');
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
            params: {
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                redirect_uri: process.env.ZOHO_REDIRECT_URI,
                code: code,
                grant_type: 'authorization_code',
            }
        });
        const { refresh_token } = tokenResponse.data;
        const isProduction = process.env.NODE_ENV === 'production';

        const clientURL = isProduction
            ? 'https://parallels.messold.com/callback'
            : 'http://localhost:5173/callback';

        return res.redirect(clientURL + `?zohoToken=${refresh_token}&source=${encodeURIComponent(sourcePage)}`);
    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed');
    }
};

export const checkTokenValidity = async (req, res) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
                isValid: false
            });
        }

        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (decoded.exp < currentTime) {
                return res.status(401).json({
                    success: false,
                    message: 'Token has expired',
                    isValid: false,
                    expiresAt: decoded.exp
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Token is valid',
                isValid: true,
                expiresAt: decoded.exp,
                user: {
                    id: decoded.id,
                    email: decoded.email,
                    method: decoded.method
                }
            });
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
                isValid: false
            });
        }
    } catch (error) {
        console.error('Error checking token validity:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking token validity',
            isValid: false
        });
    }
};