import express from "express";
import { getAgeMetrics, getChannelMetrics, getRegionWiseConversions,getCityWiseConversions, getDeviceTypeWiseConversions, getProductTypeWiseConversions, getPageWiseConversions, getChannelWiseConversions, getDailyAddToCartAndCheckouts, getGenderMetrics, getLandingPageMetrics, getLocationMetrics, getCampaignWiseConversions } from "../controller/analytics.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();


router.post('/atcreport/:brandId', verifyAuth, getDailyAddToCartAndCheckouts);
router.post('/ageReport/:brandId', verifyAuth, getAgeMetrics)
router.post('/genderReport/:brandId', verifyAuth, getGenderMetrics)
router.post('/locationReport/:brandId', verifyAuth, getLocationMetrics)
router.post('/channelReport/:brandId', verifyAuth, getChannelMetrics)
router.post('/landingpageReport/:brandId', verifyAuth, getLandingPageMetrics)
router.post('/regionConversionReport/:brandId', verifyAuth, getRegionWiseConversions)
router.post('/channelConversionReport/:brandId', verifyAuth, getChannelWiseConversions)
router.post('/pageConversionReport/:brandId', verifyAuth, getPageWiseConversions)
router.post('/productTypeConversionReport/:brandId', verifyAuth, getProductTypeWiseConversions)
router.post('/deviceTypeConversionReport/:brandId', verifyAuth, getDeviceTypeWiseConversions)
router.post('/campaignConversionReport/:brandId', verifyAuth, getCampaignWiseConversions)
router.post('/cityConversionReport/:brandId', verifyAuth, getCityWiseConversions)

export default router;