import express from "express";
import { getAgeMetrics, getChannelMetrics, getDailyAddToCartAndCheckouts, getGenderMetrics, getLandingPageMetrics, getLocationMetrics } from "../controller/analytics.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();


router.post('/atcreport/:brandId',verifyAuth,getDailyAddToCartAndCheckouts);
router.post('/ageReport/:brandId',verifyAuth,getAgeMetrics)
router.post('/genderReport/:brandId',verifyAuth,getGenderMetrics)
router.post('/locationReport/:brandId',verifyAuth,getLocationMetrics)
router.post('/channelReport/:brandId',verifyAuth, getChannelMetrics)
router.post('/landingpageReport/:brandId',verifyAuth, getLandingPageMetrics)

export default router;