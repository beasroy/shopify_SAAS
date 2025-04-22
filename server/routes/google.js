import express from "express";
import { verifyAuth } from "../middleware/verifyAuth.js";
import { fetchStateMetrics } from "../controller/googleAdsReport.js";

const router = express.Router();

router.post("/state/:brandId", verifyAuth, fetchStateMetrics);

export default router;