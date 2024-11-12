import express from 'express';
import { fetchFBAdAccountData, getGoogleAdMetrics } from '../controller/adMetcris.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();


router.post('/fbad/:brandId',verifyAuth, fetchFBAdAccountData);
router.post('/googlead/:brandId',verifyAuth, getGoogleAdMetrics);

export default router;