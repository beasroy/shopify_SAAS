import express from 'express';
import { handleFetchAdAccountData } from '../controller/adMetcris.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
const router = express.Router();


router.post('/fbad',verifyAuth, handleFetchAdAccountData);

export default router;