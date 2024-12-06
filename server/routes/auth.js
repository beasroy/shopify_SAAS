import express from "express";
import { userLogin, userLogout, userRegistration,getGoogleAuthURL,handleGoogleCallback, getFbAuthURL, handleFbCallback } from "../controller/auth.js";


const router = express.Router();
router.post("/signup",userRegistration);
router.post("/login/:type",userLogin)
router.post("/logout",userLogout)
router.get('/google', getGoogleAuthURL);
router.get('/google/callback',handleGoogleCallback);
router.get('/facebook',getFbAuthURL);
router.get('/facebook/callback',handleFbCallback);

export default router;

