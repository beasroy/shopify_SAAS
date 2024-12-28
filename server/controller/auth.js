import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis'
import crypto from 'crypto';
import axios from 'axios';

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

        if (context === 'brandSetup') {
            const googleRefreshToken = tokens.refresh_token;

            const clientURL = isProduction
                ? 'https://parallels.messold.com/callback'
                : 'http://localhost:5173/callback';

            return res.redirect(clientURL + `?googleRefreshToken=${googleRefreshToken}`);
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
                    googleRefreshToken: tokens.refresh_token,
                    isAdmin: true,
                });
                await user.save();
            } else {
                if (tokens.refresh_token) {
                    user.googleRefreshToken = tokens.refresh_token;
                }
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
            return res.status(200).json({
                success: true,
                message: 'OAuth login successful',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    brands: user.brands
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
            { id: user._id },
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

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                brands: user.brands
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

export const updateTokensForGoogleAndFb = async (req, res) => {
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

        if (type === 'google') {
            const { googleRefreshToken } = req.query;

            if (!googleRefreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Google refresh token is required.',
                });
            }

            await User.findByIdAndUpdate(userId, {
                googleRefreshToken: googleRefreshToken,
            });

            return res.status(200).json({
                success: true,
                message: 'Google refresh token updated successfully.',
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

export const getShopifyAuthUrl = (req, res)=>{
    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({ error: 'Shop name is required' });
    }

    const SCOPES ="read_analytics, write_returns, read_returns, write_orders, read_orders, write_products, read_products"
  
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}&scope=${SCOPES}&redirect_uri=${process.env.SHOPIFY_REDIRECT_URI}`;
  
    res.json({ success: true,authUrl });
}
export const handleShopifyCallback = async (request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const shop = url.searchParams.get('shop');
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  
    if (!code || !shop) {
      return {
        error: 'Missing required parameters: code or shop',
      };
    }
  
    try {
      const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      });
  
      if (tokenResponse.data && tokenResponse.data.access_token) {
        // Return the access token
        const isProduction = process.env.NODE_ENV === 'production';

        const clientURL = isProduction
            ? 'https://parallels.messold.com/dashboard'
            : 'http://localhost:5173/dashboard';

        return res.redirect(clientURL + `?access_token=${tokenResponse.data.access_token}&shop_name=${shop}`);
      } else {
        return {
          error: 'Unable to get access token',
          details: tokenResponse.data,
        };
      }
    } catch (error) {
      return {
        error: 'Error occurred while fetching the access token',
        details: error.response?.data || error.message,
      };
    }
  };