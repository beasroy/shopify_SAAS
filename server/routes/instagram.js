import express from "express";
import { verifyAuth } from "../middleware/verifyAuth.js";
import { fetchInstagramMetrics } from "../controller/instagramMetrics.js";

const router = express.Router();

router.post("/metrics/:brandId", verifyAuth, fetchInstagramMetrics);

export default router;
