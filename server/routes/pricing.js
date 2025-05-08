import express from 'express';
import { handlePricingCallback } from '../controller/pricing.js';

const router = express.Router();

router.get('/callback',handlePricingCallback);

export default router;