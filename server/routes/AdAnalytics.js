import express from 'express';
import { fetchFBAdAccountData, getAdLevelSpendAndROAS } from '../controller/adMetcris.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();


router.post('/fbad/:brandId',verifyAuth, fetchFBAdAccountData);
router.post('/googlead/:brandId',verifyAuth, getAdLevelSpendAndROAS);

export default router;