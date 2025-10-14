import express from 'express';
import { 
  handleOrderCreated, 
  handleRefundCreated,
  syncHistoricalOrders,
  getSyncStatus
} from '../controller/shopifyWebhook.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

// Webhook endpoints (no auth - verified by Shopify signature)
// Note: These need raw body for HMAC verification
router.post('/webhooks/shopify/orders/create', handleOrderCreated);
router.post('/webhooks/shopify/refunds/create', handleRefundCreated);

// API endpoints (with auth)
router.post('/shopify/sync-historical/:brandId', verifyAuth, syncHistoricalOrders);
router.get('/shopify/sync-status/:jobId', verifyAuth, getSyncStatus);

export default router;

