#!/bin/bash
export NODE_ENV=production
export MONGO_URI='mongodb+srv://messold:shopify@shopify.tgb5b.mongodb.net/?retryWrites=true&w=majority&appName=Shopify'
export REDIS_HOST='redis-13509.crce182.ap-south-1-1.ec2.redns.redis-cloud.com'
export REDIS_PORT=13509
export REDIS_PASSWORD='Ib2QJzBNoZtCO6wrwbVTU5wvhx9lXDaL'

pm2 start /home/ec2-user/shopify_SAAS/server/workers/metricsWorker.js --name "metrics-worker" 