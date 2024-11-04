import express from "express";
import { getBatchReports, getDailyAddToCartAndCheckouts } from "../controller/analytics.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post('/report/:brandId',verifyAuth,getBatchReports)
router.post('/atcreport/:brandId',verifyAuth,getDailyAddToCartAndCheckouts);

export default router;