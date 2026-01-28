# Location-Based Sales Analytics Setup Guide

## Overview
This system provides location-based sales analytics with city classification (metro/non-metro, region, tier, coastal) using GPT API for city classification and MongoDB aggregation for analytics.

## Architecture

### Components
1. **CityMetadata Model** - Stores city classifications (metro status, region, tier, coastal)
2. **Order Model** - Updated with normalized city/state fields and indexes
3. **GPT Service** - Classifies cities using OpenAI API
4. **BullMQ Queue** - Handles async city classification jobs
5. **City Classification Worker** - Processes classification jobs
6. **Daily Cron Job** - Runs at 6 AM UTC to classify new cities from yesterday's orders
7. **Location Analytics Controller** - Provides API endpoint for location-based sales data

## Setup Instructions

### 1. Environment Variables
Add to your `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
```

### 2. Database Migration
The Order model has been updated with normalized fields. Existing orders will need normalization when queried, or you can run a migration script to normalize existing data.

### 3. Initial Backfill
Run the backfill script to classify all existing cities in your Orders table:
```bash
node server/scripts/backfillCityMetadata.js
```

This will:
- Find all unique city/state combinations from Orders
- Check which ones are already classified
- Queue batch jobs to classify new cities using GPT API
- Store results in CityMetadata collection

### 4. Start Workers
The city classification worker is automatically initialized when the server starts. Make sure Redis is running.

For development, you can also run workers separately:
```bash
npm run dev:worker
```

### 5. Cron Jobs
The daily cron job is automatically set up to run at 6 AM UTC. It will:
- Check yesterday's orders for new cities
- Queue classification jobs for unknown cities
- Process them asynchronously via BullMQ

## API Usage

### Endpoint
```
GET /api/analytics/location-sales
```

### Query Parameters
- `brandId` (required) - Brand ID
- `dimension` (optional) - One of: `metro`, `region`, `tier`, `coastal` (default: `metro`)
- `startDate` (optional) - Start date in YYYY-MM-DD format (default: start of current month)
- `endDate` (optional) - End date in YYYY-MM-DD format (default: yesterday)

### Example Request
```
GET /api/analytics/location-sales?brandId=68dfb7e4e78884ea57ff7b53&dimension=metro&startDate=2024-01-01&endDate=2024-01-18
```

### Response Format
```json
{
  "success": true,
  "dimension": "metro",
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-18",
    "currentDate": "2024-01-19"
  },
  "data": {
    "metro": [
      {
        "city": "Mumbai",
        "state": "Maharashtra",
        "totalSales": 150000,
        "orderCount": 750,
        "monthlyTotal": 150000,
        "dailyBreakdown": [
          {
            "date": "2024-01-01",
            "sales": 8000,
            "orderCount": 40
          },
          {
            "date": "2024-01-02",
            "sales": 9500,
            "orderCount": 48
          }
          // ... all days from startDate to endDate
        ],
        "isClassified": true
      }
    ],
    "non-metro": [
      // Similar structure
    ]
  },
  "summary": {
    "metro": {
      "totalSales": 270000,
      "totalOrderCount": 1350,
      "cityCount": 2
    },
    "non-metro": {
      "totalSales": 80000,
      "totalOrderCount": 400,
      "cityCount": 1
    }
  },
  "metadata": {
    "status": "complete",
    "unclassifiedCities": [],
    "unclassifiedSales": 0,
    "lastUpdated": "2024-01-19T10:30:00Z"
  }
}
```

## Dimensions

### Metro Status
- `metro` - Metro cities
- `non-metro` - Non-metro cities

### Region
- `north` - Northern India
- `south` - Southern India
- `east` - Eastern India
- `west` - Western India
- `central` - Central India
- `northeast` - Northeast India

### Tier
- `tier1` - Tier 1 cities
- `tier2` - Tier 2 cities
- `tier3` - Tier 3 cities
- `tier4` - Tier 4 cities
- `other` - Other cities

### Coastal
- `coastal` - Coastal cities
- `non-coastal` - Non-coastal cities

## Features

### Daily Breakdown
- Returns sales data for each day in the date range
- Missing dates are filled with zero sales
- Sorted chronologically

### Monthly Aggregate
- `monthlyTotal` - Total sales for the month (same as `totalSales` for current month queries)
- `totalSales` - Total sales in the date range
- `orderCount` - Total number of orders

### Unclassified Cities
- Cities not yet classified are marked with `isClassified: false`
- They appear in `metadata.unclassifiedCities`
- Will be classified in the next daily cron run

## Monitoring

### Queue Status
Monitor the BullMQ queue using Redis or BullMQ dashboard:
```javascript
import { cityClassificationQueue } from './config/shopifyQueues.js';

// Get queue stats
const counts = await cityClassificationQueue.getJobCounts();
console.log(counts);
```

### Worker Logs
The worker logs all operations:
- `🔄 [Worker] Processing batch X/Y`
- `✅ [Worker] Classified N cities`
- `❌ [Worker] Error processing batch`

### Cron Logs
The cron job logs:
- `🔄 [Cron] Starting daily city classification job...`
- `📊 [Cron] Found N unique city/state combinations`
- `✅ [Cron] Queued N batch jobs`

## Cost Optimization

1. **Batch Processing** - Cities are batched (20 per GPT call) to reduce API calls
2. **Caching** - Classified cities are stored in CityMetadata, avoiding repeated GPT calls
3. **Daily Processing** - Only new cities from yesterday are processed daily
4. **Model Selection** - Uses `gpt-4o-mini` by default (cost-effective)

## Troubleshooting

### Cities Not Being Classified
1. Check if cron job is running (6 AM UTC)
2. Check worker is running
3. Check Redis connection
4. Check OpenAI API key is set
5. Check queue for failed jobs

### Slow API Responses
1. Ensure indexes are created on Order and CityMetadata collections
2. Check MongoDB query performance
3. Consider pre-aggregation for large datasets

### GPT API Errors
1. Check API key validity
2. Check rate limits
3. Check API quota
4. Review worker logs for specific errors

## Next Steps

1. Run initial backfill: `node server/scripts/backfillCityMetadata.js`
2. Monitor first cron run (6 AM UTC)
3. Test API endpoint with your brandId
4. Normalize existing Order data (optional migration script)

## Files Created/Modified

### New Files
- `server/models/CityMetadata.js`
- `server/services/gptService.js`
- `server/workers/cityClassificationWorker.js`
- `server/controller/locationClassificationCron.js`
- `server/controller/locationAnalytics.js`
- `server/routes/locationAnalytics.js`
- `server/scripts/backfillCityMetadata.js`

### Modified Files
- `server/models/Order.js` - Added normalized fields and indexes
- `server/config/shopifyQueues.js` - Added cityClassificationQueue
- `server/controller/cron-job.js` - Added location classification cron
- `server/index.js` - Added route and worker import

