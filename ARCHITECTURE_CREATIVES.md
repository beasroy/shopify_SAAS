# Creative Data Architecture Design Document

## Executive Summary

This document outlines the architecture for fetching and storing all creative/ad data from Facebook API in a single operation, while allowing the frontend to paginate through the stored data. The architecture separates data ingestion (background job) from data retrieval (API endpoint), enabling efficient data management and improved user experience.

### Key Problems Solved

1. **✅ Real-time Data Staleness**
   - **Problem:** Facebook metrics change over time, stored data becomes outdated
   - **Solution:** Periodic refresh jobs (every 6-12 hours) + on-demand refresh endpoint
   - **Result:** Data stays fresh without manual intervention

2. **✅ Accurate Filtering Aggregations**
   - **Problem:** Need accurate totals (e.g., total spend for all image ads) but user doesn't load all pages
   - **Solution:** Pre-computed aggregations stored in `CreativeAggregation` collection
   - **Result:** Fast, accurate metrics via single document lookup - no need to load all pages!

3. **✅ Video Analysis Support**
   - **Problem:** Need all historical data stored for ML/AI video analysis
   - **Solution:** Complete data stored in MongoDB with all metrics, URLs, and metadata
   - **Result:** All data available for video processing and analysis

4. **✅ Performance & Scalability**
   - **Problem:** Fetching all data on-demand is slow and hits API limits
   - **Solution:** Background sync stores everything, frontend reads from database
   - **Result:** Fast pagination, reduced API calls, better user experience

5. **✅ First-Time Loading (Milliseconds Response)**
   - **Problem:** First request takes minutes if waiting for full sync
   - **Solution:** Smart fallback - Check DB first, if empty fetch limited data immediately (2-5s), trigger background sync in parallel
   - **Result:** User sees data immediately, background job fills DB for future requests

---

## Quick Reference: Response Times

| Scenario | Response Time | Data Source |
|----------|--------------|-------------|
| **First Request (No DB)** | 2-5 seconds | API Fallback (limited data) |
| **Subsequent Requests** | 50-200ms | MongoDB Database |
| **Aggregations** | 10-50ms | Pre-computed Aggregations |
| **Background Sync** | 5-10 minutes | Facebook API (all data) |

**Key Insight:** First request shows limited data immediately, background sync fills DB, all future requests are milliseconds!

---

## Current Architecture Analysis

### Current Flow
1. **Frontend Request** → Sends `limit` parameter (e.g., 10 ads per account)
2. **Backend Processing** → Fetches limited ad IDs from Facebook API
3. **Data Fetching** → Retrieves ad details, creatives, insights, videos, thumbnails for limited set
4. **Caching** → Stores first page in Redis (TTL: 3600s)
5. **Response** → Returns limited results with pagination cursor

### Current Limitations
- ❌ Data is fetched on-demand with limits, not stored persistently
- ❌ Each request triggers external API calls
- ❌ Cache expires after 1 hour, requiring re-fetch
- ❌ No historical data persistence
- ❌ Cannot analyze all data at once (limited by pagination)
- ❌ **Cannot get accurate aggregated metrics** (e.g., total spend for all image ads) without loading all pages
- ❌ **No support for video analysis** - need historical data storage
- ❌ **Real-time data becomes stale** - metrics change over time but aren't updated

---

## Proposed Architecture: Background Job + Database Storage + Aggregations

### Key Requirements Addressed
1. ✅ **Store ALL data** in database for complete analytics
2. ✅ **Pre-compute aggregations** for accurate filtering (e.g., total spend for all image ads)
3. ✅ **Periodic updates** to keep real-time metrics fresh
4. ✅ **Video analysis support** - historical data for ML/AI processing
5. ✅ **Fast filtering** - aggregated metrics available without loading all pages

### High-Level Overview

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 1. Request: GET /api/creatives/sync/:brandId
       │    Body: { startDate, endDate }
       │
       ▼
┌─────────────────────────────────────┐
│         API Endpoint                 │
│  POST /api/creatives/sync/:brandId  │
└──────┬──────────────────────────────┘
       │
       │ 2. Queue Background Job
       │
       ▼
┌─────────────────────────────────────┐
│      BullMQ Queue (Redis)            │
│  Queue: 'creative-sync'               │
└──────┬──────────────────────────────┘
       │
       │ 3. Worker Picks Job
       │
       ▼
┌─────────────────────────────────────┐
│    Background Worker                 │
│  - Fetch ALL ad IDs (no limit)      │
│  - Fetch ALL ad details             │
│  - Fetch ALL insights               │
│  - Fetch ALL videos/thumbnails      │
│  - Store in MongoDB                 │
└──────┬──────────────────────────────┘
       │
       │ 4. Store Data
       │
       ▼
┌─────────────────────────────────────┐
│      MongoDB Database                │
│  Collection: creatives               │
└─────────────────────────────────────┘

┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 5. Request: GET /api/creatives/:brandId
       │    Query: ?startDate=X&endDate=Y&page=1&limit=10
       │
       ▼
┌─────────────────────────────────────┐
│    API Endpoint (Read)              │
│  GET /api/creatives/:brandId         │
└──────┬──────────────────────────────┘
       │
       │ 6. Query MongoDB (paginated)
       │
       ▼
┌─────────────────────────────────────┐
│      MongoDB Database                │
│  Collection: creatives               │
└─────────────────────────────────────┘
```

---

## Architecture Components

### 1. Database Schema (MongoDB)

#### Creative Model (`server/models/Creative.js`)

**Purpose:** Store individual ad/creative data with all metrics for detailed analysis and video processing.

```javascript
{
  // Identification
  brandId: ObjectId (ref: 'Brand', indexed),
  ad_id: String (indexed, unique per brand),
  creative_id: String,
  
  // Ad Information
  ad_name: String,
  ad_status: String,
  ad_effective_status: String,
  
  // Creative Details
  creative_type: String (enum: ['video', 'image', 'carousel', 'unknown']),
  creative_url: String,
  thumbnail_url: String,
  carousel_images: [{
    url: String,
    link: String,
    name: String,
    description: String
  }],
  
  // Metrics (from insights)
  spend: Number,
  ctr: Number,
  cpc: Number,
  cpp: Number,
  clicks: Number,
  roas: Number,
  orders: Number,
  hook_rate: Number,
  impressions: Number,
  video_views: Number,
  revenue: Number,
  engagementRate: Number,
  frequency: Number,
  video_p25_watched: Number,
  video_p50_watched: Number,
  video_p100_watched: Number,
  video_p25_watched_rate: Number,
  video_p50_watched_rate: Number,
  video_p100_watched_rate: Number,
  
  // Time Range
  startDate: Date (indexed),
  endDate: Date (indexed),
  
  // Metadata
  syncedAt: Date,
  lastUpdated: Date,
  dataVersion: Number, // Increment on each update
  
  // Indexes
  // Compound: { brandId: 1, startDate: 1, endDate: 1 }
  // Compound: { brandId: 1, ad_id: 1 }
  // Compound: { brandId: 1, creative_type: 1 }
}
```

#### Creative Aggregation Model (`server/models/CreativeAggregation.js`)

**Purpose:** Pre-computed aggregated metrics for fast filtering and analytics without querying all individual records.

```javascript
{
  // Identification
  brandId: ObjectId (ref: 'Brand', indexed),
  startDate: Date (indexed),
  endDate: Date (indexed),
  
  // Filter Dimensions (for different aggregation views)
  creative_type: String (enum: ['all', 'video', 'image', 'carousel', 'unknown']), // 'all' = no filter
  ad_status: String (optional, for status-based aggregations),
  
  // Aggregated Metrics (sums, averages, counts)
  total_ads: Number,
  total_spend: Number,
  total_revenue: Number,
  total_orders: Number,
  total_impressions: Number,
  total_clicks: Number,
  total_video_views: Number,
  
  // Average Metrics
  avg_ctr: Number,
  avg_cpc: Number,
  avg_cpp: Number,
  avg_roas: Number,
  avg_hook_rate: Number,
  avg_engagement_rate: Number,
  avg_frequency: Number,
  
  // Weighted Averages (more accurate)
  weighted_avg_ctr: Number, // (total_clicks / total_impressions) * 100
  weighted_avg_cpc: Number, // total_spend / total_clicks
  weighted_avg_cpp: Number, // total_spend / total_orders
  weighted_avg_roas: Number, // total_revenue / total_spend
  
  // Video-Specific Aggregations
  total_video_p25_watched: Number,
  total_video_p50_watched: Number,
  total_video_p100_watched: Number,
  avg_video_p25_watched_rate: Number,
  avg_video_p50_watched_rate: Number,
  avg_video_p100_watched_rate: Number,
  
  // Metadata
  lastCalculatedAt: Date,
  dataVersion: Number, // Match with Creative model version
  
  // Indexes
  // Compound: { brandId: 1, startDate: 1, endDate: 1, creative_type: 1 }
  // Compound: { brandId: 1, creative_type: 1 }
}
```

#### Sync Job Status Model (`server/models/CreativeSync.js`)

**Purpose:** Track background sync jobs and their progress.

```javascript
{
  brandId: ObjectId (ref: 'Brand', indexed),
  startDate: Date,
  endDate: Date,
  status: String (enum: ['pending', 'processing', 'completed', 'failed']),
  progress: {
    totalAds: Number,
    processedAds: Number,
    percentage: Number
  },
  error: String,
  startedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 2. Queue System (BullMQ)

#### Queue Configuration (`server/config/creativeQueues.js`)

```javascript
// Queue for creative data synchronization
export const creativeSyncQueue = new Queue('creative-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 86400, // Keep for 24 hours
      count: 100
    },
    removeOnFail: {
      age: 604800 // Keep failed for 7 days
    },
    timeout: 1800000 // 30 minutes timeout
  }
});
```

#### Job Data Structure

```javascript
{
  brandId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  accessToken: string,
  adAccountIds: string[],
  jobId: string // Unique job identifier
}
```

---

### 3. Background Worker (`server/workers/creativeSyncWorker.js`)

#### Worker Responsibilities

1. **Fetch All Ad IDs** (No Limit)
   - Call `fetchAdIdsFromAccountInsights()` without limit parameter
   - Handle pagination internally until all ads are fetched
   - Store total count for progress tracking

2. **Batch Processing**
   - Process ads in batches (e.g., 100 at a time)
   - Fetch ad details, creatives, insights, videos, thumbnails
   - Update progress after each batch

3. **Database Operations**
   - Use `upsert` operations (update if exists, insert if new)
   - Match on: `brandId + ad_id + startDate + endDate`
   - Batch insert/update for performance

4. **Error Handling**
   - Retry failed batches
   - Log errors for debugging
   - Update sync status on failure

5. **Progress Tracking**
   - Update `CreativeSync` document with progress
   - Emit progress events (optional: via Socket.IO)

6. **Calculate Aggregations** (After all data is stored)
   - Calculate aggregated metrics for all creative types
   - Store in `CreativeAggregation` collection
   - Enables fast filtering without querying all records

#### Worker Flow

```
1. Receive job from queue
2. Create/Update CreativeSync document (status: 'processing')
3. Fetch ALL ad IDs (paginate until complete)
4. For each batch of 100 ads:
   a. Fetch ad details, creatives, insights
   b. Process and transform data
   c. Upsert to MongoDB (update if exists, insert if new)
   d. Update progress
5. After all ads processed:
   a. Calculate aggregations for each creative_type
   b. Store aggregations in CreativeAggregation collection
6. Mark CreativeSync as 'completed'
7. Clean up temporary data
```

---

### 3.1. Data Refresh Strategy

**Problem:** Facebook metrics are real-time and change over time. Stored data becomes stale.

**Solution:** Periodic refresh jobs to update existing records.

#### Refresh Approaches

**Option A: Scheduled Refresh (Recommended)**
- Run refresh job every 6-12 hours (configurable)
- Update metrics for existing ads
- Add new ads if they appear
- Use `upsert` to update existing records

**Option B: On-Demand Refresh**
- User triggers refresh via API
- Useful for immediate updates
- Can be combined with scheduled refresh

**Option C: Incremental Updates**
- Only fetch ads that have changed since last sync
- Faster but requires tracking change timestamps
- Facebook API supports this via `updated_time` field

#### Refresh Worker Flow

```
1. Get all existing ad_ids for brand + date range
2. Fetch latest insights from Facebook API
3. Compare with stored data
4. Update records where metrics have changed
5. Recalculate aggregations
6. Update lastUpdated timestamp
```

#### Refresh Queue Configuration

```javascript
// Queue for refreshing existing creative data
export const creativeRefreshQueue = new Queue('creative-refresh', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000
    },
    removeOnComplete: {
      age: 3600 // Keep for 1 hour
    }
  }
});
```

---

### 3.2. Aggregation Calculation

**Purpose:** Pre-compute aggregated metrics so filtering (e.g., "show all image ads") returns accurate totals without loading all pages.

#### Aggregation Calculation Process

After all creatives are stored/updated, calculate aggregations for:

1. **All creatives** (`creative_type: 'all'`)
2. **By creative type** (`creative_type: 'video'`, `'image'`, `'carousel'`, `'unknown'`)
3. **By ad status** (optional, if needed)

#### Aggregation Calculation Logic

```javascript
// Pseudo-code for aggregation calculation
async function calculateAggregations(brandId, startDate, endDate) {
  const creativeTypes = ['all', 'video', 'image', 'carousel', 'unknown'];
  
  for (const type of creativeTypes) {
    const query = {
      brandId,
      startDate,
      endDate,
      ...(type !== 'all' && { creative_type: type })
    };
    
    const creatives = await Creative.find(query);
    
    const aggregation = {
      brandId,
      startDate,
      endDate,
      creative_type: type,
      total_ads: creatives.length,
      total_spend: sum(creatives.map(c => c.spend)),
      total_revenue: sum(creatives.map(c => c.revenue)),
      total_orders: sum(creatives.map(c => c.orders)),
      total_impressions: sum(creatives.map(c => c.impressions)),
      total_clicks: sum(creatives.map(c => c.clicks)),
      total_video_views: sum(creatives.map(c => c.video_views)),
      
      // Weighted averages (more accurate than simple averages)
      weighted_avg_ctr: (total_clicks / total_impressions) * 100,
      weighted_avg_cpc: total_spend / total_clicks,
      weighted_avg_cpp: total_spend / total_orders,
      weighted_avg_roas: total_revenue / total_spend,
      
      // Simple averages (for reference)
      avg_ctr: average(creatives.map(c => c.ctr)),
      avg_cpc: average(creatives.map(c => c.cpc)),
      // ... other averages
      
      lastCalculatedAt: new Date(),
      dataVersion: getCurrentDataVersion()
    };
    
    await CreativeAggregation.findOneAndUpdate(
      { brandId, startDate, endDate, creative_type: type },
      aggregation,
      { upsert: true }
    );
  }
}
```

#### When to Recalculate Aggregations

1. **After initial sync** - Calculate all aggregations
2. **After refresh** - Recalculate if metrics changed
3. **After manual update** - Recalculate affected aggregations
4. **On-demand** - Via API endpoint if needed

---

### 3.3. Video Analysis Data Storage

**Purpose:** Store complete creative data for future video analysis (ML/AI processing).

#### Data Requirements for Video Analysis

- **Video URLs** - For downloading and processing
- **Thumbnails** - For visual analysis
- **Metrics** - Performance data for correlation
- **Metadata** - Ad names, dates, creative types
- **Historical Data** - Track performance over time

#### Storage Strategy

- Store all data in `Creative` collection (already designed)
- Add indexes for video-specific queries:
  ```javascript
  db.creatives.createIndex({ 
    brandId: 1, 
    creative_type: 'video',
    video_views: -1 
  });
  ```
- Consider separate collection for video analysis results:
  ```javascript
  {
    creativeId: ObjectId (ref: 'Creative'),
    analysisType: String, // 'sentiment', 'object_detection', etc.
    results: Object,
    analyzedAt: Date
  }
  ```

---

### 4. API Endpoints

#### 4.1. Sync Endpoint (Trigger Background Job)

**POST** `/api/creatives/sync/:brandId`

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Creative sync job queued",
  "jobId": "job-123",
  "status": "pending",
  "estimatedTime": "5-10 minutes"
}
```

**Implementation:**
- Validate brand exists
- Check if sync already in progress (prevent duplicates)
- Queue background job
- Return immediately (async processing)

#### 4.2. Get Creatives Endpoint (Paginated Read) - **Smart Fallback Strategy**

**GET** `/api/creatives/:brandId`

**Query Parameters:**
- `startDate` (required): YYYY-MM-DD
- `endDate` (required): YYYY-MM-DD
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page
- `sortBy` (optional, default: 'spend'): Field to sort by
- `sortOrder` (optional, default: 'desc'): 'asc' or 'desc'
- `filters` (optional): JSON string for filtering (e.g., `{"creative_type": "image"}`)

**Response:**
```json
{
  "success": true,
  "brandId": "brand-123",
  "total_creatives": 1500,
  "page": 1,
  "limit": 10,
  "total_pages": 150,
  "hasMore": true,
  "creatives": [...],
  "fetchTime": 45,
  "dataSource": "database", // or "api_fallback"
  "backgroundSyncTriggered": false
}
```

**Implementation - Smart Fallback Strategy:**

```javascript
// Pseudo-code for smart fallback
async function getCreatives(brandId, startDate, endDate, page, limit, filters) {
  // Step 1: Check if data exists in database
  const dbCount = await Creative.countDocuments({
    brandId,
    startDate,
    endDate,
    ...filters
  });
  
  if (dbCount > 0) {
    // ✅ Data exists in DB - Fast path (milliseconds)
    const creatives = await Creative.find({...})
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);
    
    return {
      success: true,
      creatives,
      total_creatives: dbCount,
      dataSource: "database",
      fetchTime: Date.now() - startTime // ~50-200ms
    };
  }
  
  // Step 2: No data in DB - Fallback to immediate API fetch
  // Fetch limited data immediately (like current approach)
  const immediateLimit = limit * 3; // Fetch 3x pages worth for better UX
  const { adIds, nextCursor } = await fetchAdIdsFromAccountInsights(
    adAccountIds,
    accessToken,
    startDate,
    endDate,
    immediateLimit
  );
  
  // Fetch ad details, creatives, insights for immediate display
  const immediateCreatives = await fetchAndProcessAds(adIds, ...);
  
  // Step 3: Trigger background sync in parallel (don't wait)
  // This will populate DB for future requests
  creativeSyncQueue.add('full-sync', {
    brandId,
    startDate,
    endDate,
    accessToken,
    adAccountIds
  }, { 
    priority: 1, // High priority
    jobId: `sync-${brandId}-${startDate}-${endDate}` // Prevent duplicates
  });
  
  // Step 4: Store immediate results in DB (for next request)
  await Creative.insertMany(immediateCreatives);
  
  return {
    success: true,
    creatives: immediateCreatives.slice(0, limit), // Return requested page
    total_creatives: immediateCreatives.length, // Approximate
    hasMore: !!nextCursor,
    nextCursor,
    dataSource: "api_fallback",
    backgroundSyncTriggered: true,
    message: "Initial data loaded. Full sync in progress...",
    fetchTime: Date.now() - startTime // ~2-5 seconds
  };
}
```

**Key Features:**
1. **Fast Path (DB exists):** Returns in milliseconds from database
2. **Fallback Path (No DB):** Fetches limited data immediately (2-5 seconds)
3. **Background Sync:** Triggers full sync in parallel (doesn't block response)
4. **Progressive Enhancement:** First request shows limited data, subsequent requests use DB
5. **User Experience:** Data appears immediately, background job fills DB for future requests

#### 4.2.1. Get Aggregated Metrics Endpoint (For Filtering)

**GET** `/api/creatives/:brandId/aggregations`

**Query Parameters:**
- `startDate` (required): YYYY-MM-DD
- `endDate` (required): YYYY-MM-DD
- `creative_type` (optional): Filter by type ('video', 'image', 'carousel', 'all')

**Response:**
```json
{
  "success": true,
  "brandId": "brand-123",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "creative_type": "image",
  "aggregations": {
    "total_ads": 450,
    "total_spend": 125000.50,
    "total_revenue": 250000.00,
    "total_orders": 1250,
    "total_impressions": 5000000,
    "total_clicks": 25000,
    "weighted_avg_ctr": 0.5,
    "weighted_avg_cpc": 5.00,
    "weighted_avg_cpp": 100.00,
    "weighted_avg_roas": 2.0,
    "avg_ctr": 0.48,
    "avg_cpc": 5.20,
    "avg_cpp": 102.50,
    "avg_roas": 1.95
  },
  "lastCalculatedAt": "2024-01-15T10:30:00Z"
}
```

**Use Case:** 
- User filters for "image ads" in frontend
- Frontend calls this endpoint to get accurate totals
- Displays aggregated metrics without loading all pages
- **This solves the problem of needing all data for accurate filtering!**

**Implementation:**
- Query `CreativeAggregation` collection
- Return pre-computed metrics
- Very fast (single document lookup)
- If aggregation doesn't exist, trigger calculation

#### 4.3. Sync Status Endpoint

**GET** `/api/creatives/sync/status/:brandId`

**Query Parameters:**
- `startDate` (required)
- `endDate` (required)

**Response:**
```json
{
  "success": true,
  "status": "processing",
  "progress": {
    "totalAds": 1500,
    "processedAds": 750,
    "percentage": 50
  },
  "startedAt": "2024-01-15T10:00:00Z",
  "estimatedCompletion": "2024-01-15T10:05:00Z"
}
```

#### 4.4. Refresh Creatives Endpoint (Update Existing Data)

**POST** `/api/creatives/refresh/:brandId`

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Creative refresh job queued",
  "jobId": "refresh-job-123",
  "status": "pending"
}
```

**Implementation:**
- Queue refresh job (updates existing records)
- Fetches latest metrics from Facebook API
- Updates existing creatives in database
- Recalculates aggregations after update

#### 4.5. Delete Creatives Endpoint

**DELETE** `/api/creatives/:brandId`

**Query Parameters:**
- `startDate` (required)
- `endDate` (required)

**Response:**
```json
{
  "success": true,
  "message": "Deleted 1500 creatives",
  "deletedCount": 1500
}
```

**Implementation:**
- Delete creatives for date range
- Also delete corresponding aggregations
- Clear related cache entries

---

## Data Flow Diagrams

### Flow 1: Initial Sync (Background Job)

```
User Action
    │
    ▼
POST /api/creatives/sync/:brandId
    │
    ├─► Validate Request
    ├─► Check Existing Sync Status
    ├─► Queue Job in BullMQ
    └─► Return Job ID (200 OK)
         │
         │ (Async)
         ▼
    Worker Picks Job
         │
         ├─► Create CreativeSync Document (status: 'processing')
         │
         ├─► Fetch ALL Ad IDs (paginate until complete)
         │   └─► Update progress: totalAds = X
         │
         ├─► For Each Batch (100 ads):
         │   ├─► Fetch Ad Details
         │   ├─► Fetch Creatives
         │   ├─► Fetch Insights
         │   ├─► Fetch Videos/Thumbnails
         │   ├─► Transform Data
         │   ├─► Upsert to MongoDB
         │   └─► Update progress: processedAds += 100
         │
         ├─► After All Ads Processed:
         │   ├─► Calculate Aggregations (by creative_type)
         │   └─► Store in CreativeAggregation collection
         │
         └─► Update CreativeSync (status: 'completed')
```

### Flow 2: First-Time Load (Smart Fallback) - **Critical for UX!**

```
User First Visits Page (No Data in DB)
    │
    ▼
GET /api/creatives/:brandId?page=1&limit=10
    │
    ├─► Check MongoDB: Count documents
    │   └─► Result: 0 documents (no data)
    │
    ├─► FALLBACK: Fetch Limited Data Immediately
    │   ├─► Fetch 30 ads (3 pages worth) from Facebook API
    │   ├─► Process: ad details, creatives, insights
    │   ├─► Store in MongoDB (for next request)
    │   └─► Return first 10 ads to frontend
    │   └─► Response Time: ~2-5 seconds ⚡
    │
    ├─► TRIGGER: Background Sync (Parallel, Non-blocking)
    │   └─► Queue full sync job
    │   └─► Worker will fetch ALL ads in background
    │
    └─► Frontend Displays Data Immediately
         │
         ▼
    User Sees Data (2-5 seconds)
    Background Job Continues (5-10 minutes)
    Next Request Uses DB (milliseconds) ✅
```

### Flow 2.1: Subsequent Requests (Fast Path)

```
User Requests Page 2 (Data Exists in DB)
    │
    ▼
GET /api/creatives/:brandId?page=2&limit=10&filters={"creative_type":"image"}
    │
    ├─► Check MongoDB: Count documents
    │   └─► Result: 1500 documents (data exists)
    │
    ├─► Query MongoDB (Fast!)
    │   ├─► Filter: brandId, startDate, endDate, creative_type
    │   ├─► Sort: by spend (desc)
    │   ├─► Skip: (page - 1) * limit
    │   └─► Limit: limit
    │
    ├─► Count Total Documents
    │
    └─► Return Paginated Results
         │
         ▼
    Frontend Displays Data
    Response Time: ~50-200ms ⚡⚡⚡
```

### Flow 3: Filtering with Aggregations (Key Feature!)

```
User Filters for "Image Ads"
    │
    ├─► Request 1: GET /api/creatives/:brandId/aggregations?creative_type=image
    │   └─► Query CreativeAggregation collection
    │   └─► Return pre-computed totals (total_spend, avg_ctr, etc.)
    │   └─► FAST! (single document lookup)
    │
    └─► Request 2: GET /api/creatives/:brandId?filters={"creative_type":"image"}&page=1
        └─► Query Creative collection (paginated)
        └─► Return individual records for display
    
    Frontend:
    - Shows aggregated metrics at top (from Request 1)
    - Shows paginated list below (from Request 2)
    - User doesn't need to load all pages to see accurate totals!
```

### Flow 4: Data Refresh (Keep Data Fresh)

```
Scheduled Job / Manual Trigger
    │
    ▼
POST /api/creatives/refresh/:brandId
    │
    ├─► Queue Refresh Job
    │
    └─► (Async) Worker Processes:
         │
         ├─► Fetch Latest Insights from Facebook API
         │
         ├─► For Each Existing Creative:
         │   ├─► Compare with stored data
         │   ├─► Update if metrics changed
         │   └─► Update lastUpdated timestamp
         │
         ├─► Recalculate Aggregations
         │
         └─► Mark Refresh Complete
```

---

## Alternative Architecture Options

### Option 1: Hybrid Approach (Recommended)

**Concept:** Fetch all data in background, but also support on-demand fetching for new data.

**Benefits:**
- ✅ Complete data available immediately after sync
- ✅ Can still fetch new ads on-demand
- ✅ Best of both worlds

**Implementation:**
- Background job stores all data
- API endpoint reads from database (primary)
- Fallback: If data not in DB, fetch on-demand and store

### Option 2: Incremental Sync

**Concept:** Sync only new/updated ads since last sync.

**Benefits:**
- ✅ Faster sync times
- ✅ Less API quota usage
- ✅ Real-time updates

**Implementation:**
- Store `lastSyncedAt` timestamp
- Only fetch ads modified after `lastSyncedAt`
- Periodic full sync (e.g., weekly)

### Option 3: Streaming with WebSockets

**Concept:** Stream data to frontend as it's being fetched.

**Benefits:**
- ✅ Real-time progress updates
- ✅ Better UX (see data appearing)
- ✅ No need to wait for complete sync

**Implementation:**
- Use Socket.IO to emit progress
- Frontend subscribes to sync job
- Receive creatives as they're processed
- Store in frontend state/cache

### Option 4: Time-Based Partitioning

**Concept:** Store creatives in separate collections/partitions by time period.

**Benefits:**
- ✅ Faster queries (smaller collections)
- ✅ Easy data archival
- ✅ Better performance for large datasets

**Implementation:**
- Collection naming: `creatives_2024_01`, `creatives_2024_02`
- Route queries to appropriate collection
- Archive old collections

---

## Performance Considerations

### Database Indexing Strategy

```javascript
// Compound indexes for efficient queries
db.creatives.createIndex({ 
  brandId: 1, 
  startDate: 1, 
  endDate: 1 
});

db.creatives.createIndex({ 
  brandId: 1, 
  ad_id: 1 
}, { unique: true });

db.creatives.createIndex({ 
  brandId: 1, 
  spend: -1 
}); // For sorting

db.creatives.createIndex({ 
  brandId: 1, 
  creative_type: 1 
}); // For filtering
```

### Batch Processing Strategy

- **Batch Size:** 100 ads per batch (configurable)
- **Concurrency:** Process 2-3 batches in parallel
- **Rate Limiting:** Respect Facebook API rate limits
- **Memory Management:** Process and clear batches to avoid memory issues

### Caching Strategy

- **Redis Cache:** 
  - Cache first page of results (TTL: 1 hour)
  - Cache aggregations (TTL: 30 minutes)
  - **Cache "data exists" flag** (TTL: 5 minutes) - Fast check if DB has data
- **Cache Keys:**
  - `creatives:${brandId}:${startDate}:${endDate}:page:1`
  - `creatives:aggregations:${brandId}:${startDate}:${endDate}:${creative_type}`
  - `creatives:exists:${brandId}:${startDate}:${endDate}` - Boolean flag
- **Invalidation:** 
  - Clear cache when new sync completes
  - Clear aggregations cache when data is refreshed
  - Clear "exists" flag when sync starts

### First-Time Loading Optimization

**Problem:** First request takes 2-5 seconds (API fallback), but user expects milliseconds.

**Solutions:**

1. **Pre-sync Strategy (Recommended)**
   - Sync data proactively before user requests
   - Trigger sync when:
     - User logs in
     - Date range changes
     - Brand is selected
   - User sees "Loading..." while sync completes (better UX than waiting on first request)

2. **Progressive Loading**
   - Show cached/partial data immediately
   - Load more as background sync completes
   - Use WebSockets to push new data as it arrives

3. **Smart Caching**
   - Cache first page of API fallback results
   - Next request within 5 minutes uses cache
   - Background sync fills DB during this time

4. **Optimistic UI**
   - Show skeleton/loading state
   - Display data as soon as available (even if partial)
   - Update UI when full sync completes

---

## Error Handling & Resilience

### Job Failure Handling

1. **Retry Logic:**
   - Max 3 attempts
   - Exponential backoff (5s, 10s, 20s)
   - Mark as failed after max attempts

2. **Partial Failures:**
   - Continue processing other batches
   - Log failed ad IDs
   - Retry failed batches separately

3. **API Rate Limiting:**
   - Detect rate limit errors
   - Implement exponential backoff
   - Resume from last successful batch

### Data Consistency

- **Upsert Operations:** Use `findOneAndUpdate` with `upsert: true`
- **Transaction Support:** Use MongoDB transactions for critical operations
- **Validation:** Validate data before storing

---

## Monitoring & Observability

### Metrics to Track

1. **Sync Job Metrics:**
   - Total sync time
   - Ads processed per second
   - API call count
   - Error rate

2. **API Metrics:**
   - Response time
   - Request count
   - Cache hit rate
   - Database query time

3. **Database Metrics:**
   - Collection size
   - Index usage
   - Query performance

### Logging

- Log sync start/completion
- Log batch processing progress
- Log errors with context
- Log API rate limit hits

---

## Migration Strategy

### Phase 1: Setup (Week 1)
1. Create Creative and CreativeSync models
2. Set up BullMQ queue and worker
3. Implement sync endpoint (background job)
4. Test with small dataset

### Phase 2: Implementation (Week 2)
1. Implement paginated read endpoint **with smart fallback**
2. Implement aggregation calculation logic
3. Implement aggregation endpoint
4. Add sync status endpoint
5. Implement first-time loading optimization
6. Implement error handling
7. Add monitoring/logging

### Phase 3: Testing (Week 3)
1. Test with production-like data volumes
2. Test aggregation accuracy (compare with manual calculations)
3. Test refresh mechanism
4. Performance testing
5. Load testing
6. Error scenario testing

### Phase 4: Deployment (Week 4)
1. Deploy to staging
2. Run sync for all brands
3. Monitor performance
4. Deploy to production
5. Gradual rollout

---

## Security Considerations

1. **Access Token Storage:**
   - Store tokens securely (encrypted)
   - Rotate tokens periodically
   - Never log tokens

2. **API Rate Limiting:**
   - Implement rate limiting on endpoints
   - Prevent abuse of sync endpoint

3. **Data Privacy:**
   - Ensure GDPR compliance
   - Allow data deletion
   - Audit data access

---

## Cost Analysis

### Current Approach
- **API Calls:** Per request (with limits)
- **Cache:** Redis (1 hour TTL)
- **Database:** Minimal (no storage)

### Proposed Approach
- **API Calls:** One-time per sync (all data)
- **Database:** MongoDB storage (persistent)
- **Queue:** Redis (BullMQ)
- **Worker:** Server resources

### Cost Comparison
- **Current:** High API calls, low storage
- **Proposed:** Low API calls (once per sync), higher storage
- **Break-even:** If sync runs < daily, proposed is cheaper

---

## Recommendations

### Recommended Approach: **Background Sync + Aggregations + Periodic Refresh**

**Why:**
1. ✅ Complete data available after sync (for video analysis)
2. ✅ Fast pagination from database
3. ✅ **Accurate aggregations for filtering** (solves the core problem!)
4. ✅ Data stays fresh with periodic refresh
5. ✅ Efficient API usage (one sync vs. multiple requests)

**Implementation Priority:**
1. **Critical:** Background sync job + database storage
2. **Critical:** Aggregation calculation + aggregation endpoint
3. **Critical:** Smart fallback for first-time loading (immediate data display)
4. **High:** Paginated read endpoint with DB-first strategy
5. **High:** Data refresh mechanism (scheduled + on-demand)
6. **High:** Pre-sync strategy (proactive data loading)
7. **Medium:** Sync status endpoint
8. **Medium:** Incremental sync optimization
9. **Low:** WebSocket streaming (Option 3)

### Key Solutions to Your Requirements

1. **✅ Real-time Data Updates:**
   - Scheduled refresh every 6-12 hours
   - On-demand refresh endpoint
   - Updates existing records (upsert)

2. **✅ Accurate Filtering Aggregations:**
   - Pre-computed aggregations by creative_type
   - Fast lookup (single document query)
   - Accurate totals without loading all pages

3. **✅ Video Analysis Support:**
   - All data stored in database
   - Historical data preserved
   - Easy to query for video-specific analysis

4. **✅ First-Time Loading Performance:**
   - Smart fallback: Check DB first (fast path)
   - If no DB: Fetch limited data immediately (2-5 seconds)
   - Trigger background sync in parallel (non-blocking)
   - Subsequent requests use DB (milliseconds)
   - Pre-sync strategy for proactive loading

---

## Conclusion

This architecture provides:
- ✅ **Complete Data:** All ads fetched and stored
- ✅ **Fast Retrieval:** Paginated reads from database
- ✅ **Scalability:** Handles large datasets efficiently
- ✅ **Resilience:** Error handling and retry logic
- ✅ **Flexibility:** Multiple sync strategies supported

The hybrid approach balances performance, cost, and user experience while maintaining data completeness for analytics and reporting.

---

## Next Steps

1. Review and approve architecture
2. Create database models
3. Implement queue and worker
4. Implement API endpoints
5. Add monitoring and logging
6. Test and deploy

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Author:** Architecture Team

