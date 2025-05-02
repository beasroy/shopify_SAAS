import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis'
import crypto from 'crypto';
import axios from 'axios';
import Brand from "../models/Brands.js";

config();

export const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
);
const SECRET_KEY = process.env.JWT_SECRET || "your-default-secret";

export const getGoogleAuthURL = (req, res) => {
    const { context } = req.query;

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
        state: context || 'default',
    });

    res.status(200).json({ authUrl: url });
};

export const handleGoogleCallback = async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code from Google.');

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const context = state || 'default';
        const isProduction = process.env.NODE_ENV === 'production';

        if (context === 'googleAdSetup') {
            const googleadRefreshToken = tokens.refresh_token;

            const clientURL = isProduction
                ? 'https://parallels.messold.com/callback'
                : 'http://localhost:5173/callback';

            return res.redirect(clientURL + `?googleadRefreshToken=${googleadRefreshToken}`);
        } else if (context === 'googleAnalyticsSetup') {
            const googleanalyticsRefreshToken = tokens.refresh_token;

            const clientURL = isProduction
                ? 'https://parallels.messold.com/callback'
                : 'http://localhost:5173/callback';

            return res.redirect(clientURL + `?googleanalyticsRefreshToken=${googleanalyticsRefreshToken}`);
        }else if (context === 'userLogin') {

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
                { expiresIn: '14d' }
            );

            res.cookie('token', jwtToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'strict' : 'lax',
                maxAge: 14 * 24 * 60 * 60 * 1000,
            });

            const clientURL = isProduction
                ? 'https://parallels.messold.com/callback'
                : 'http://localhost:5173/callback';

            return res.redirect(clientURL + `?token=${jwtToken}`);
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
    const state = crypto.randomBytes(16).toString('hex'); // Generate a random state
    res.cookie('fb_state', state, { httpOnly: true, secure: true }); // Store in a secure cookie

    const authURL = `https://www.facebook.com/v21.0/dialog/oauth?` +
        `client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)}` +
        `&state=${state}` +
        `&scope=public_profile,email,ads_management,business_management,ads_read`;

    return res.status(200).json({ success: true, authURL });
};

export const handleFbCallback = async (req, res) => {
    try {
        const { code, state: receivedState } = req.query;
        const storedState = req.cookies.fb_state; // Retrieve the state from cookies

        // Validate the state
        if (!storedState || storedState !== receivedState) {
            return res.status(400).send('Invalid state parameter');
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

        return res.redirect(clientURL + `?fbToken=${longLivedAccessToken}`);
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

        if (type === 'facebook') {
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
            const { googleAdRefreshToken } = req.query;

            if (!googleAdRefreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Google refresh token is required.',
                });
            }

            await User.findByIdAndUpdate(userId, {
                googleAdsRefreshToken: googleAdRefreshToken,
            });

            return res.status(200).json({
                success: true,
                message: 'Google Ads refresh token updated successfully.',
            });
        }

        if (type === 'googleanalyticsRefreshToken') {
            const { googleAnalyticsRefreshToken } = req.query;

            if (!googleAnalyticsRefreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Google analytics refresh token is required.',
                });
            }

            await User.findByIdAndUpdate(userId, {
                googleAnalyticsRefreshToken: googleAnalyticsRefreshToken,
            });

            return res.status(200).json({
                success: true,
                message: 'Google Ads refresh token updated successfully.',
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
    const { shop } = req.body;

    if (!shop) {
        return res.status(400).json({ error: 'Shop name is required' });
    }

    const SCOPES = "read_analytics, write_returns, read_returns, write_orders, read_orders, write_products, read_products"

    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}&scope=${SCOPES}&redirect_uri=${process.env.SHOPIFY_REDIRECT_URI}`;

    res.json({ success: true, authUrl });
}
export const handleShopifyCallback = async (request, res) => {
    const absoluteUrl = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    const url = new URL(absoluteUrl);

    const code = url.searchParams.get('code');
    const shop = url.searchParams.get('shop');
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!code || !shop) {
        return res.status(400).json({ error: 'Missing required parameters: code or shop' });
    }

    try {
        // Get access token from Shopify
        const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
        });

        if (tokenResponse.data && tokenResponse.data.access_token) {
            const accessToken = tokenResponse.data.access_token;
            
            // Get shop details
            const shopResponse = await axios.get(`https://${shop}/admin/api/2023-07/shop.json`, {
                headers: {
                    'X-Shopify-Access-Token': accessToken
                }
            });
            
            const shopData = shopResponse.data.shop;
            const shopName = shopData.name;
            const ownerEmail = shopData.email;
            const ownerName = shopData.shop_owner;
            
            // Find or create user
            let user = await User.findOne({ email: ownerEmail || `${shopName}@${shop}` });
            
            if (!user) {
                user = new User({
                    username: ownerName || shopName,
                    email: ownerEmail || `${shopName}@${shop}`,
                    method: 'shopify',
                    brands: [] 
                });
                
                await user.save();
            }
            
            // Find or create brand
            let brand = await Brand.findOne({ 'shopifyAccount.shopName': shop });
            
            if (brand) {
                brand.shopifyAccount.shopifyAccessToken = accessToken;
                await brand.save();
                
                if (!user.brands.includes(brand._id.toString())) {
                    user.brands.push(brand._id);
                    await user.save();
                }
            } else {
                // Create a new brand
                brand = new Brand({
                    name: shopName, 
                    shopifyAccount: {
                        shopName: shop,
                        shopifyAccessToken: accessToken
                    },
                });
                
                await brand.save();
                user.brands.push(brand._id);
                await user.save();
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user._id,
                    email: user.email
                }, 
                process.env.JWT_SECRET, 
                { expiresIn: '30d' } 
            );

            // Set HTTP-only cookie
            res.cookie('auth_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000 
            });
            
            // Redirect to client with user ID and token
            const isProduction = process.env.NODE_ENV === 'production';
            const clientURL = isProduction
                ? 'https://parallels.messold.com/callback'
                : 'http://localhost:5173/callback';

            return res.redirect(`${clientURL}?shopify_token=${token}&userId=${user._id}`);
        } else {
            return res.status(500).json({ error: 'Unable to get access token', details: tokenResponse.data });
        }
    } catch (error) {
        console.error('Error in Shopify callback:', error);
        return res.status(500).json({ error: 'Error occurred while processing callback', details: error.response?.data || error.message });
    }
};

export const getShpifyUrlInstall = async (req, res) => {
  const { hmac, shop, timestamp, host } = req.body;

    const message = Object.entries({ shop, timestamp, host })
    .sort(([a], [b]) => a.localeCompare(b)) 
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  const generatedHash = crypto
    .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest('hex');
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(generatedHash, 'hex'),
    Buffer.from(hmac, 'hex')
  );
  
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Invalid HMAC' });
  }
  
  const SCOPES = "read_analytics, write_returns, read_returns, write_orders, read_orders, write_customers, read_customers, write_products, read_products";
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}&scope=${SCOPES}&redirect_uri=${process.env.SHOPIFY_REDIRECT_URI}`;
  
  return res.json({ success: true, authUrl });
};
 
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

        return res.redirect(clientURL + `?zohoToken=${refresh_token}`);
    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed');
    }
};