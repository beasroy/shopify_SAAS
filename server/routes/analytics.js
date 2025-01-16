import express from "express";
import { getInterestWiseConversions, getAgeMetrics, getChannelMetrics, getRegionWiseConversions,getCityWiseConversions, getDeviceTypeWiseConversions, getGenderWiseConversions, getPageWiseConversions, getChannelWiseConversions, getDailyAddToCartAndCheckouts, getGenderMetrics, getLandingPageMetrics, getLocationMetrics, getAgeWiseConversions } from "../controller/analytics.js";
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
router.post('/genderConversionReport/:brandId', verifyAuth, getGenderWiseConversions)
router.post('/deviceTypeConversionReport/:brandId', verifyAuth, getDeviceTypeWiseConversions)
router.post('/ageConversionReport/:brandId', verifyAuth, getAgeWiseConversions)
router.post('/cityConversionReport/:brandId', verifyAuth, getCityWiseConversions)
router.post('/interestConversionReport/:brandId', verifyAuth, getInterestWiseConversions)

export default router;