import express from "express";
import { getBatchReports } from "../controller/analytics.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post('/report',verifyAuth,getBatchReports)

export default router;