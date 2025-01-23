import express from "express";
import { fetchGoogleAdCityConversions } from "../controller/googleAdConversions.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post("/cityConversion/:brandId", verifyAuth, fetchGoogleAdCityConversions);

export default router;