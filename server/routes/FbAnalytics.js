import express from 'express';
import { fetchFBAdAccountData } from '../controller/adMetcris.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();


router.post('/fbad/:brandId',verifyAuth, fetchFBAdAccountData);

export default router;