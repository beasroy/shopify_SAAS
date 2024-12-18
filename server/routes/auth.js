import express from "express";
import { userLogin, userLogout, userRegistration,getGoogleAuthURL,handleGoogleCallback, getFbAuthURL, handleFbCallback, updateTokensForGoogleAndFb, getShopifyAuthUrl, handleShopifyCallback } from "../controller/auth.js";
import { verifyAuth } from "../middleware/verifyAuth.js";


const router = express.Router();
router.post("/signup",userRegistration);
router.post("/login/:type",userLogin)
router.post("/logout",userLogout)
router.get('/google', getGoogleAuthURL);
router.get('/google/callback',handleGoogleCallback);
router.get('/facebook',getFbAuthURL);
router.get('/facebook/callback',handleFbCallback);
router.get('/updateTokens/:type',verifyAuth,updateTokensForGoogleAndFb);
router.post('/shopify',getShopifyAuthUrl);
router.get('/shopify/callback',handleShopifyCallback);

export default router;

