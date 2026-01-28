import express from 'express';
import { getPageSpeedInsights } from '../controller/pageSpeedInsights.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();

router.post('/', verifyAuth, getPageSpeedInsights);

export default router;