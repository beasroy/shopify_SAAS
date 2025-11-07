import express from 'express';
import { getAov, getTotalRevenue } from '../controller/shopify.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/aov/:brandId', verifyAuth, getAov);
router.post('/revenue/:brandId', verifyAuth, getTotalRevenue);

export default router;