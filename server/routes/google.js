import express from "express";
import { verifyAuth } from "../middleware/verifyAuth.js";
import { fetchStateMetrics } from "../controller/googleAdsReport.js";
import { fetchAgeMetrics, fetchGenderMetrics, fetchKeywordMetrics, fetchProductMetrics, fetchSearchTermMetrics } from '../controller/googleAdsReport.js';


const router = express.Router();

router.post("/state/:brandId", verifyAuth, fetchStateMetrics);
router.post('/searchTerm/:brandId',verifyAuth,fetchSearchTermMetrics);
router.post('/age/:brandId',verifyAuth,fetchAgeMetrics)
router.post('/gender/:brandId',verifyAuth,fetchGenderMetrics)
router.post('/keyword/:brandId',verifyAuth,fetchKeywordMetrics)
router.post('/product/:brandId',verifyAuth,fetchProductMetrics)

export default router;