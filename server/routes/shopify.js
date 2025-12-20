import express from 'express';
import { getAov, getTotalRevenue, testGraphQLOrders,  getMonthlyPaymentOrders, getMonthlyProductLaunches } from '../controller/shopify.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/aov/:brandId', verifyAuth, getAov);
router.post('/revenue/:brandId', verifyAuth, getTotalRevenue);
router.get('/test-graphql-orders/:brandId', verifyAuth, testGraphQLOrders);
router.post('/payment-orders/:brandId', verifyAuth, getMonthlyPaymentOrders);
router.post('/monthly-launched-products/:brandId', verifyAuth, getMonthlyProductLaunches);

export default router;