import express from 'express';
import { fetchShopifySales, fetchShopifyData } from '../controller/shopify.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.get('/data/:brandId',verifyAuth,fetchShopifyData);
router.get('/dailysales/:brandId',verifyAuth,fetchShopifySales)



export default router;