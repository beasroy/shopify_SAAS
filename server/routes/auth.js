import express from "express";
import { userLogin, userLogout, userRegistration, getGoogleAuthURL, handleGoogleCallback, getFbAuthURL, handleFbCallback, updateTokensForGoogleAndFbAndZoho, getShopifyAuthUrl, handleShopifyCallback, handleShopifyBrandSetupCallback, getZohoAuthURL, handleZohoCallback, checkTokenValidity } from "../controller/auth.js";
import { verifyAuth } from "../middleware/verifyAuth.js";


const router = express.Router();
router.post("/signup", userRegistration);
router.post("/login/:type", userLogin);
router.post("/logout", userLogout);
router.get('/google', getGoogleAuthURL);
router.get('/google/callback', handleGoogleCallback);
router.get('/facebook', getFbAuthURL);
router.get('/facebook/callback', handleFbCallback);
router.put('/updateTokens/:type', verifyAuth, updateTokensForGoogleAndFbAndZoho);
router.post('/shopify', getShopifyAuthUrl);
router.get('/shopify/callback', handleShopifyCallback);
router.get('/shopify/callback-brand-setup', handleShopifyBrandSetupCallback);
router.get('/zoho', getZohoAuthURL);
router.get('/zoho/callback', handleZohoCallback);
router.get('/check-token', checkTokenValidity);

export default router;

