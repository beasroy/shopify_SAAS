import express from "express";
import { verifyAuth } from "../middleware/verifyAuth.js";
import { fetchFBAgeReports } from "../controller/fbReports.js";

const router = express.Router();

router.post("/age/:brandId", verifyAuth, fetchFBAgeReports);

export default router;