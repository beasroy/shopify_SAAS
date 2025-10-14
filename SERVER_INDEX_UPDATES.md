# 📝 How to Update server/index.js

## Add These Lines to Your server/index.js

### 1. At the top (with other imports):

```javascript
// Add these imports
import shopifyWebhookRoutes from './routes/shopifyWebhook.js';
import { initializeShopifyWorkers } from './workers/initializeShopifyWorkers.js';
import { initShopifyDailySync } from './cron/shopifyDailySync.js';
```

### 2. Before your routes (middleware):

```javascript
// Special handling for Shopify webhooks (needs raw body for verification)
app.use('/api/webhooks/shopify', express.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
```

### 3. With your routes:

```javascript
// Add Shopify webhook routes
app.use('/api', shopifyWebhookRoutes);
```

### 4. After app.listen() or at the end:

```javascript
// Initialize Shopify workers
initializeShopifyWorkers();

// Initialize daily sync cron
initShopifyDailySync();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { shutdownShopifyWorkers } = await import('./workers/initializeShopifyWorkers.js');
  await shutdownShopifyWorkers();
  process.exit(0);
});
```

## Complete Example

```javascript
// server/index.js
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import connectDB from './config/db.js';

// Your existing routes
import authRoutes from './routes/auth.js';
import brandRoutes from './routes/brand.js';
// ... other routes ...

// NEW: Shopify imports
import shopifyWebhookRoutes from './routes/shopifyWebhook.js';
import { initializeShopifyWorkers } from './workers/initializeShopifyWorkers.js';
import { initShopifyDailySync } from './cron/shopifyDailySync.js';

config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());

// NEW: Special handling for Shopify webhooks
app.use('/api/webhooks/shopify', express.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Regular JSON parsing for other routes
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/brand', brandRoutes);
// ... your other routes ...

// NEW: Shopify routes
app.use('/api', shopifyWebhookRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  
  // NEW: Initialize Shopify workers
  initializeShopifyWorkers();
  
  // NEW: Initialize daily sync cron
  initShopifyDailySync();
});

// NEW: Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { shutdownShopifyWorkers } = await import('./workers/initializeShopifyWorkers.js');
  await shutdownShopifyWorkers();
  process.exit(0);
});
```

## 🔐 Environment Variables

Add to `.env`:
```bash
# Shopify Webhook Secret (get from Shopify admin)
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# Redis (you should already have these)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 🎯 How to Get Webhook Secret

1. Go to Shopify Admin
2. Settings → Notifications → Webhooks
3. When creating webhook, Shopify generates a secret
4. Copy and add to `.env`

Or generate your own:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📡 Register Webhooks in Shopify

### Option 1: Via Shopify Admin UI

1. Go to: Settings → Notifications → Webhooks
2. Click "Create webhook"
3. Event: Order creation
4. Format: JSON
5. URL: `https://your-domain.com/api/webhooks/shopify/orders/create`
6. Click Save

Repeat for:
- Event: Refund creation
- URL: `https://your-domain.com/api/webhooks/shopify/refunds/create`

### Option 2: Via API (Programmatic)

```javascript
// utils/registerWebhooks.js
export const registerShopifyWebhooks = async (brand) => {
  const webhooks = [
    {
      topic: 'orders/create',
      address: `${process.env.APP_URL}/api/webhooks/shopify/orders/create`,
      format: 'json'
    },
    {
      topic: 'refunds/create',
      address: `${process.env.APP_URL}/api/webhooks/shopify/refunds/create`,
      format: 'json'
    }
  ];
  
  for (const webhook of webhooks) {
    try {
      await axios.post(
        `https://${brand.shopifyDomain}/admin/api/2024-10/webhooks.json`,
        { webhook },
        {
          headers: {
            'X-Shopify-Access-Token': brand.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`✅ Registered webhook: ${webhook.topic}`);
    } catch (error) {
      console.error(`❌ Error registering ${webhook.topic}:`, error.message);
    }
  }
};
```

## 🧪 Testing

### Test Webhook Handler

```bash
# Test order created
curl -X POST http://localhost:5000/api/webhooks/shopify/orders/create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Shop-Domain: test-shop.myshopify.com" \
  -d @test-order.json

# Should return: 200 OK
```

### Test Historical Sync

```bash
curl -X POST http://localhost:5000/api/shopify/sync-historical/YOUR_BRAND_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return:
# {
#   "success": true,
#   "message": "Historical sync started",
#   "jobId": "historical-BRAND_ID"
# }
```

### Check Database

```javascript
// In MongoDB
db.shopifyorders.find().limit(5)
db.admetrics.find({ date: ISODate("2024-10-13") })
```

## 📊 Monitoring

### Check Queue Dashboard

```javascript
// Add BullMQ Board (optional, for UI)
npm install @bull-board/express @bull-board/api

// In server/index.js
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(shopifyOrderQueue),
    new BullMQAdapter(revenueCalculationQueue)
  ],
  serverAdapter
});

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());

// Visit: http://localhost:5000/admin/queues
```

### Console Logs

You'll see:
```
✅ Shopify workers initialized
✅ Daily Shopify sync cron initialized
📦 Queued order creation: 123456
✅ Order 123456 created for 2024-10-13
✅ Updated AdMetrics[2024-10-13]: Net=₹48000
```

## ⚠️ Important Notes

### Raw Body Required

Shopify webhook verification needs raw body:
```javascript
app.use('/api/webhooks/shopify', express.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
```

### Webhook Secret

Must match Shopify's secret:
```bash
SHOPIFY_WEBHOOK_SECRET=your_actual_secret
```

### Worker Process

Workers can run in:
1. **Same process** as server (current setup)
2. **Separate process** (scale horizontally)

For now, same process is fine!

## 🎯 Checklist

Setup:
- [ ] Models created (ShopifyOrder, AdMetrics updated)
- [ ] Queues configured (shopifyQueues.js)
- [ ] Workers created (shopifyWorker.js)
- [ ] Webhook handlers created (shopifyWebhook.js)
- [ ] Routes created (shopifyWebhook.js)
- [ ] Cron job created (shopifyDailySync.js)
- [ ] Middleware created (verifyShopify.js)
- [ ] Helper functions created (shopifyHelpers.js)

Integration:
- [ ] Add imports to server/index.js
- [ ] Add webhook middleware
- [ ] Add routes
- [ ] Initialize workers
- [ ] Initialize cron
- [ ] Add graceful shutdown

Configuration:
- [ ] Add SHOPIFY_WEBHOOK_SECRET to .env
- [ ] Register webhooks in Shopify
- [ ] Test webhook handlers

Usage:
- [ ] Run historical sync for each brand
- [ ] Monitor queue dashboard
- [ ] Check AdMetrics updates
- [ ] Verify refund calculations

---

**Everything is ready! Just update server/index.js and restart!** 🚀

