import express from 'express';
import { fetchShopifyData } from '../controller/shopify.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.get('/data',verifyAuth,fetchShopifyData);

export default router;