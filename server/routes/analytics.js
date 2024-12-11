import express from "express";
import { getAgeMetrics, getBatchReports, getDailyAddToCartAndCheckouts, getGenderMetrics } from "../controller/analytics.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post('/report/:brandId',verifyAuth,getBatchReports)
router.post('/atcreport/:brandId',verifyAuth,getDailyAddToCartAndCheckouts);
router.post('/ageReport/:brandId',verifyAuth,getAgeMetrics)
router.post('/genderReport/:brandId',verifyAuth,getGenderMetrics)

export default router;