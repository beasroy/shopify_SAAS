import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis'


config();

export const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
);
const SECRET_KEY = process.env.JWT_SECRET || "your-default-secret";

export const getGoogleAuthURL = (req, res) => {
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
        prompt: 'consent'
    });

    res.status(200).json({ authUrl: url });
};

export const handleGoogleCallback = async (req, res) => {
    const { code } = req.query;

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
        const userInfo = await oauth2.userinfo.get();

        const { email, name, id } = userInfo.data;

        // Check if the user already exists
        let user = await User.findOne({ email });
        if (!user) {
            // Create a new user if one does not exist
            user = new User({
                username: name,
                email,
                googleId: id,
                method: 'google',
                googleAccessToken: tokens.access_token,
                googleRefreshToken: tokens.refresh_token,
                isAdmin: true,
            });
            await user.save();
        } else {
            // Update the existing user's tokens
            user.googleAccessToken = tokens.access_token;

            // Only update the refresh token if a new one is returned
            if (tokens.refresh_token) {
                user.googleRefreshToken = tokens.refresh_token;
            }

            await user.save();
        }

        // Generate a JWT token for the session
        const jwtToken = jwt.sign(
            { id: user._id, email: user.email, method: user.method },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const isProduction = process.env.NODE_ENV === 'production';

        // Set JWT token in cookies
        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Redirect to client with the token
        const clientURL =
            process.env.NODE_ENV === 'production'
                ? 'https://parallels.messold.com/google/callback'
                : 'http://localhost:5173/google/callback';

        return res.redirect(clientURL + `?token=${jwtToken}`);
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
            method:'password'
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

