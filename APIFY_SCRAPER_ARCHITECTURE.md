# Apify Scraper Architecture Recommendation

## Executive Summary

**Recommendation: Use a Separate BullMQ Worker** ⭐

For integrating Apify API scraper to fetch Meta ads for competitor brands, I recommend creating a **separate BullMQ worker** (similar to your existing `metricsWorker.js`) rather than a separate microservice. This provides the right balance of isolation, maintainability, and operational simplicity.

---

## Why Not a Separate Microservice?

### ❌ Microservice Overhead (Not Worth It Here)
- **Service Discovery**: Need to set up service registry, health checks, load balancing
- **Network Latency**: HTTP calls between services add unnecessary overhead
- **Deployment Complexity**: Multiple services to deploy, monitor, and maintain
- **Debugging Difficulty**: Distributed tracing needed for simple scraping tasks
- **Cost**: Additional infrastructure (containers, load balancers, etc.)

### ✅ When Microservice Makes Sense
- Different technology stack (e.g., Python for ML)
- Different team ownership
- Need for independent scaling at very high volumes
- Different deployment schedules

**Your case**: Same Node.js stack, same team, similar scaling needs → **Worker is better**

---

## Why a Separate Worker? ✅

### 1. **Different Execution Model**
- **Meta API**: Synchronous HTTP calls, seconds to complete
- **Apify**: Async actor runs, minutes to complete, requires polling
- **Different error handling**: Apify has actor failures, rate limits, cost limits
- **Different retry logic**: Apify needs exponential backoff for polling

### 2. **Isolation & Reliability**
- ✅ Scraper failures don't block main app
- ✅ Can handle long-running tasks (5-30 minutes per run)
- ✅ Independent retry/error handling
- ✅ Can be scaled separately (different concurrency settings)

### 3. **Resource Management**
- ✅ Long-running tasks won't block other workers
- ✅ Can set different timeouts (5-30 min vs 30 sec for API calls)
- ✅ Different concurrency limits (scraping is slower, needs fewer workers)

### 4. **Cost & Monitoring**
- ✅ Track Apify costs separately
- ✅ Monitor scraping-specific metrics (run duration, success rate, costs)
- ✅ Alert on scraping failures without affecting main app alerts

### 5. **Follows Existing Pattern**
- ✅ You already have `metricsWorker.js` - same pattern
- ✅ Uses existing Redis + BullMQ infrastructure
- ✅ Consistent with your architecture

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Main Backend (Express)                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │  Competitor Ads Controller                        │  │
│  │  - API endpoints                                  │  │
│  │  - Queue jobs to worker                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        │ (BullMQ Queue)
                        ▼
┌─────────────────────────────────────────────────────────┐
│         Apify Scraper Worker (Separate Process)         │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │  Apify Integration Service                       │  │
│  │  - Start actor runs                              │  │
│  │  - Poll for completion                           │  │
│  │  - Handle retries & errors                       │  │
│  │  - Process results                               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Data Processing                                 │  │
│  │  - Transform Apify results                      │  │
│  │  - Store in CompetitorAd model                  │  │
│  │  - Update brand metadata                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        │ (HTTP API)
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Apify Platform                              │
│  - Actor runs (scraping agents)                          │
│  - Returns results via API/webhook                       │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create Apify Worker (Week 1)

**File Structure:**
```
server/
├── workers/
│   ├── metricsWorker.js (existing)
│   └── apifyScraperWorker.js (new)
├── services/
│   └── apifyService.js (new)
└── controller/
    └── competitorAds.js (modify to queue jobs)
```

### Phase 2: Apify Service Implementation

**Key Features:**
1. **Start Actor Run**: Initiate Apify actor run
2. **Poll for Completion**: Check status every 10-30 seconds
3. **Handle Errors**: Retry logic, timeout handling
4. **Process Results**: Transform Apify data to your format
5. **Cost Tracking**: Log Apify usage per brand

### Phase 3: Integration

1. **Modify Cron Job**: Queue scraping jobs instead of direct API calls
2. **Update API Endpoints**: Queue jobs for on-demand scraping
3. **Add Status Endpoints**: Check scraping job status
4. **Error Notifications**: Alert on scraping failures

---

## Code Structure Preview

### 1. Apify Service (`server/services/apifyService.js`)

```javascript
import axios from 'axios';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR_ID = 'your-actor-id'; // e.g., 'apify/facebook-ads-scraper'
const APIFY_BASE_URL = 'https://api.apify.com/v2';

export class ApifyService {
  /**
   * Start an Apify actor run
   */
  static async startActorRun(pageIds, countries = ['IN']) {
    const response = await axios.post(
      `${APIFY_BASE_URL}/acts/${APIFY_ACTOR_ID}/runs`,
      {
        startUrl: pageIds.map(id => `https://www.facebook.com/${id}`),
        countries: countries,
        maxResults: 1000 // Adjust based on your needs
      },
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.data; // Returns { id, status, etc. }
  }

  /**
   * Poll for actor run completion
   */
  static async waitForCompletion(runId, maxWaitTime = 30 * 60 * 1000) {
    const startTime = Date.now();
    const pollInterval = 15000; // Poll every 15 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getRunStatus(runId);
      
      if (status.status === 'SUCCEEDED') {
        return await this.getRunResults(runId);
      }
      
      if (status.status === 'FAILED' || status.status === 'ABORTED') {
        throw new Error(`Apify run failed: ${status.status}`);
      }
      
      // Still running, wait and poll again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('Apify run timeout - exceeded max wait time');
  }

  /**
   * Get run status
   */
  static async getRunStatus(runId) {
    const response = await axios.get(
      `${APIFY_BASE_URL}/actor-runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_TOKEN}`
        }
      }
    );
    
    return response.data.data;
  }

  /**
   * Get run results
   */
  static async getRunResults(runId) {
    const response = await axios.get(
      `${APIFY_BASE_URL}/actor-runs/${runId}/dataset/items`,
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_TOKEN}`
        },
        params: {
          format: 'json',
          clean: true
        }
      }
    );
    
    return response.data;
  }
}
```

### 2. Apify Worker (`server/workers/apifyScraperWorker.js`)

```javascript
import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { connectDB } from '../config/db.js';
import { ApifyService } from '../services/apifyService.js';
import { processAndStoreCompetitorAds } from '../controller/competitorAds.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

const apifyScraperWorker = new Worker(
  'apify-scraper',
  async (job) => {
    const { brandId, pageIds, competitorBrandName, countries } = job.data;
    
    console.log(`[Apify Worker] Starting scrape for brand ${brandId}, pages: ${pageIds.join(', ')}`);
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Start Apify actor run
      const run = await ApifyService.startActorRun(pageIds, countries);
      const runId = run.id;
      
      console.log(`[Apify Worker] Started Apify run ${runId}`);
      await job.updateProgress(30);
      
      // Wait for completion (with progress updates)
      const results = await ApifyService.waitForCompletion(runId);
      
      console.log(`[Apify Worker] Run ${runId} completed, got ${results.length} results`);
      await job.updateProgress(70);
      
      // Process and store results
      const { storedAds, errors } = await processAndStoreCompetitorAds(
        brandId,
        competitorBrandName,
        results
      );
      
      await job.updateProgress(100);
      
      return {
        success: true,
        runId,
        adsStored: storedAds.length,
        errors: errors.length,
        totalResults: results.length
      };
      
    } catch (error) {
      console.error(`[Apify Worker] Error scraping for brand ${brandId}:`, error);
      throw error;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: isDevelopment ? 1 : 2, // Lower concurrency (scraping is slower)
    limiter: {
      max: 5, // Max 5 scraping jobs per minute (Apify rate limits)
      duration: 60000
    },
    settings: {
      lockDuration: 600000, // 10 minutes (scraping takes longer)
      stalledInterval: 30000,
      maxStalledCount: 1
    }
  }
);

// Event handlers
apifyScraperWorker.on('completed', (job) => {
  console.log(`[Apify Worker] Job ${job.id} completed for brand ${job.data.brandId}`);
});

apifyScraperWorker.on('failed', (job, error) => {
  console.error(`[Apify Worker] Job ${job.id} failed for brand ${job.data.brandId}:`, error);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down Apify scraper worker...');
  await apifyScraperWorker.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start worker if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting Apify scraper worker...');
  connectDB().then(() => {
    apifyScraperWorker.on('ready', () => {
      console.log('Apify scraper worker is ready');
    });
  }).catch(error => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });
}

export { apifyScraperWorker };
```

### 3. Queue Setup (`server/config/apifyQueue.js`)

```javascript
import { Queue } from 'bullmq';
import { createRedisConnection } from './redis.js';

export const apifyScraperQueue = new Queue('apify-scraper', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000 // 1 minute initial delay
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 604800 // Keep failed jobs for 7 days
    }
  }
});

export default apifyScraperQueue;
```

### 4. Update Competitor Ads Controller

```javascript
import { apifyScraperQueue } from '../config/apifyQueue.js';

// Add new function to queue Apify scraping
export const queueApifyScraping = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { pageIds, countries = ['IN'] } = req.body;
    
    // ... validation ...
    
    // Queue scraping job
    const job = await apifyScraperQueue.add('scrape-competitor-ads', {
      brandId,
      pageIds: Array.isArray(pageIds) ? pageIds : [pageIds],
      competitorBrandName: pageName, // Fetch from pageId
      countries
    }, {
      jobId: `apify-${brandId}-${Date.now()}`, // Unique job ID
      priority: 1 // Normal priority
    });
    
    return res.status(202).json({
      success: true,
      message: 'Scraping job queued',
      jobId: job.id,
      status: 'queued'
    });
  } catch (error) {
    // ... error handling ...
  }
};

// Update cron job to use queue
export const fetchCompetitorAdsForAllBrands = async () => {
  // Instead of direct API calls, queue jobs
  const brands = await Brand.find({
    competitorBrands: { $exists: true, $ne: [] },
    fbAccessToken: { $exists: true, $ne: null }
  });
  
  for (const brand of brands) {
    for (const competitor of brand.competitorBrands) {
      await apifyScraperQueue.add('scrape-competitor-ads', {
        brandId: brand._id.toString(),
        pageIds: [competitor.pageId],
        competitorBrandName: competitor.pageName,
        countries: ['IN'] // or from brand config
      });
    }
  }
};
```

---

## Configuration

### Environment Variables

```bash
# .env
APIFY_API_TOKEN=your_apify_token_here
APIFY_ACTOR_ID=apify/facebook-ads-scraper  # Or your custom actor
APIFY_MAX_WAIT_TIME=1800000  # 30 minutes max wait
APIFY_POLL_INTERVAL=15000    # Poll every 15 seconds
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev:worker:apify": "NODE_ENV=development node workers/apifyScraperWorker.js",
    "dev:worker:apify:watch": "nodemon workers/apifyScraperWorker.js",
    "start:worker:apify": "NODE_ENV=production node workers/apifyScraperWorker.js"
  }
}
```

---

## Deployment Strategy

### Development
```bash
# Terminal 1: Main app
npm run dev

# Terminal 2: Metrics worker
npm run dev:worker

# Terminal 3: Apify scraper worker
npm run dev:worker:apify
```

### Production
```bash
# Use PM2 or similar process manager
pm2 start index.js --name "main-app"
pm2 start workers/metricsWorker.js --name "metrics-worker"
pm2 start workers/apifyScraperWorker.js --name "apify-scraper-worker"
```

---

## Monitoring & Observability

### Key Metrics to Track
1. **Job Success Rate**: % of successful scraping jobs
2. **Average Duration**: Time per scraping job
3. **Apify Costs**: Track costs per brand/run
4. **Error Rate**: Failed jobs by error type
5. **Queue Depth**: Pending jobs in queue

### Logging
- Log all Apify API calls (start, status checks, results)
- Log costs per run
- Log errors with context (brandId, pageIds, runId)

---

## Cost Considerations

### Apify Pricing
- **Pay-per-use**: Typically $0.001-0.01 per result or per run
- **Monthly plans**: Available for high-volume usage
- **Estimate**: 100 brands × 5 competitors × 4 runs/day = 2000 runs/month

### Cost Optimization
1. **Batch scraping**: Combine multiple pageIds in one run when possible
2. **Smart scheduling**: Don't scrape too frequently (6-hour intervals are good)
3. **Cache results**: Don't re-scrape if recent data exists
4. **Monitor usage**: Set up alerts for unexpected cost spikes

---

## Migration Strategy

### Phase 1: Parallel Running (Week 1-2)
- Keep Meta API as primary
- Add Apify as fallback/alternative
- A/B test: Some brands use Apify, others use Meta API

### Phase 2: Gradual Migration (Week 3-4)
- Move more brands to Apify
- Compare data quality and completeness
- Monitor costs and performance

### Phase 3: Full Migration (Week 5+)
- Switch all brands to Apify
- Keep Meta API code as backup
- Optimize based on learnings

---

## When to Consider Microservice Later

Consider extracting to a microservice if:
1. **Different Tech Stack**: Want to use Python for ML/data processing
2. **Team Separation**: Different team owns scraping
3. **Very High Scale**: Need 100+ concurrent scraping workers
4. **Different Deployment**: Need to deploy scraping updates independently

**For now**: Worker is the right choice ✅

---

## Next Steps

1. ✅ **Set up Apify account** and get API token
2. ✅ **Choose Apify actor** (use existing or create custom)
3. ✅ **Create Apify service** (`server/services/apifyService.js`)
4. ✅ **Create Apify worker** (`server/workers/apifyScraperWorker.js`)
5. ✅ **Create queue** (`server/config/apifyQueue.js`)
6. ✅ **Update competitor ads controller** to queue jobs
7. ✅ **Update cron job** to use queue
8. ✅ **Add monitoring** and cost tracking
9. ✅ **Test with one brand** first
10. ✅ **Gradually migrate** all brands

---

## Summary

**Use a Separate Worker** because:
- ✅ Provides isolation without microservice overhead
- ✅ Follows your existing architecture pattern
- ✅ Handles long-running async tasks properly
- ✅ Easy to monitor and scale independently
- ✅ Simple to implement and maintain

**Don't use a microservice** because:
- ❌ Unnecessary complexity for this use case
- ❌ Same tech stack and team
- ❌ Worker pattern is sufficient

Would you like me to start implementing the Apify worker and service?

