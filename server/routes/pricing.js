import express from 'express';
import { getPricingDetails, handlePricingCallback } from '../controller/pricing.js';
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

router.get('/callback',handlePricingCallback);
router.get('/details/:brandId',verifyAuth,getPricingDetails)

export default router;