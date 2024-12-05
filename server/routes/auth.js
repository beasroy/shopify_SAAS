import express from "express";
import { userLogin, userLogout, userRegistration,getGoogleAuthURL,handleGoogleCallback } from "../controller/auth.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();
router.post("/signup",userRegistration);
router.post("/login/:type",userLogin)
router.post("/logout",userLogout)
router.get('/google', getGoogleAuthURL);
router.get('/google/callback',handleGoogleCallback);

export default router;

