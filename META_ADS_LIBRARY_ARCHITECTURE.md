# Meta Ads Library API Integration Architecture

## Overview
This document outlines the architecture for integrating Meta Ads Library API to search and track ads from different brands. The system allows users to search for brands, save them, and automatically track their ad creatives.

## Key Differences from Current Implementation

### Current System (Meta Graph API)
- Requires Facebook access tokens
- Fetches ads from user's own ad accounts
- Needs platform integration setup

### New System (Meta Ads Library API)
- Public API - no access tokens needed
- Searches ads by advertiser/brand name
- Can track competitor brands
- No platform integration required

---

## Architecture Flow

### 1. User Search Flow
```
User searches brand name → API validates/search → Save to DB → Initial fetch (4 ads) → Display
```

### 2. Data Sync Flow
```
Background Job (Cron) → Check for new ads → Update DB → Notify frontend (WebSocket) → Auto-refresh
```

### 3. Load More Flow
```
User clicks "Load More" → API call for specific brand → Fetch next batch → Append to existing ads
```

---

## Database Schema Changes

### 1. Update Brand Model (`server/models/Brands.js`)

Add new fields to track Meta Ads Library brands:

```javascript
const brandSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // Meta Ads Library tracking
  metaAdsLibrary: {
    isTracked: { type: Boolean, default: false }, // If brand is tracked via Ads Library
    advertiserName: { type: String }, // Exact advertiser name from Meta
    advertiserId: { type: String }, // Meta's advertiser ID (if available)
    searchQuery: { type: String }, // Original search query used
    lastSyncedAt: { type: Date }, // Last time ads were synced
    totalAdsTracked: { type: Number, default: 0 }, // Total ads found
    activeAdsCount: { type: Number, default: 0 }, // Currently active ads
  },
  
  // ... rest of existing fields ...
}, { timestamps: true });
```

### 2. Create AdCreative Model (`server/models/AdCreative.js`)

Store individual ad creatives from Meta Ads Library:

```javascript
import mongoose from 'mongoose';

const adCreativeSchema = new mongoose.Schema({
  brandId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Brand', 
    required: true,
    index: true 
  },
  
  // Meta Ads Library identifiers
  adId: { type: String, unique: true, required: true, index: true }, // Meta's ad ID
  pageId: { type: String }, // Facebook page ID
  pageName: { type: String }, // Page name
  
  // Ad details
  adCreativeBody: { type: String }, // Ad text/copy
  adCreativeLinkTitle: { type: String }, // Link title
  adCreativeLinkDescription: { type: String }, // Link description
  adCreativeLinkCaption: { type: String }, // Link caption
  
  // Media
  imageUrl: { type: String }, // For image ads
  videoUrl: { type: String }, // For video ads
  thumbnailUrl: { type: String }, // Video thumbnail
  
  // Ad metadata
  adDeliveryStartDate: { type: Date }, // When ad started running
  adSnapshotUrl: { type: String }, // Link to ad in Ads Library
  adType: { 
    type: String, 
    enum: ['IMAGE', 'VIDEO', 'CAROUSEL', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  
  // Engagement metrics (if available)
  impressions: { type: Number, default: 0 },
  spend: { type: Number, default: 0 }, // Estimated spend range
  
  // Tracking
  firstSeenAt: { type: Date, default: Date.now }, // When we first saw this ad
  lastSeenAt: { type: Date, default: Date.now }, // Last time we saw this ad
  isActive: { type: Boolean, default: true }, // If ad is still active
  
}, { timestamps: true });

// Indexes for efficient queries
adCreativeSchema.index({ brandId: 1, lastSeenAt: -1 });
adCreativeSchema.index({ brandId: 1, isActive: 1 });
adCreativeSchema.index({ adId: 1 });

const AdCreative = mongoose.model('AdCreative', adCreativeSchema);
export default AdCreative;
```

---

## API Endpoints

### 1. Search Brands (`POST /api/ads-library/search`)

Search for brands in Meta Ads Library:

```javascript
// server/controller/adsLibrary.js
export const searchBrands = async (req, res) => {
  const { query, country = 'US', limit = 10 } = req.body;
  
  try {
    // Call Meta Ads Library API
    const response = await axios.get(
      `https://graph.facebook.com/v21.0/ads_archive`,
      {
        params: {
          access_token: process.env.META_ADS_LIBRARY_ACCESS_TOKEN, // App access token
          search_terms: query,
          ad_reached_countries: country,
          ad_active_status: 'ALL',
          limit: limit,
          fields: 'ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,page_name,page_id'
        }
      }
    );
    
    // Process and return results
    return res.json({
      success: true,
      results: response.data.data,
      paging: response.data.paging
    });
  } catch (error) {
    // Handle errors
  }
};
```

### 2. Add Brand to Tracking (`POST /api/ads-library/track/:brandId`)

Save brand for tracking:

```javascript
export const trackBrand = async (req, res) => {
  const { brandId } = req.params;
  const { advertiserName, searchQuery } = req.body;
  
  try {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    
    // Update brand with tracking info
    brand.metaAdsLibrary = {
      isTracked: true,
      advertiserName,
      searchQuery,
      lastSyncedAt: new Date()
    };
    await brand.save();
    
    // Initial fetch of 4 ads
    await fetchAndStoreAds(brandId, advertiserName, 4);
    
    return res.json({ success: true, brand });
  } catch (error) {
    // Handle errors
  }
};
```

### 3. Get Brand Ads (`GET /api/ads-library/brand/:brandId/ads`)

Get ads for a specific brand with pagination:

```javascript
export const getBrandAds = async (req, res) => {
  const { brandId } = req.params;
  const { limit = 4, after = null } = req.query;
  
  try {
    const brand = await Brand.findById(brandId);
    if (!brand || !brand.metaAdsLibrary?.isTracked) {
      return res.status(404).json({ 
        success: false, 
        message: 'Brand not found or not tracked' 
      });
    }
    
    // Get ads from database
    const query = { brandId, isActive: true };
    const ads = await AdCreative.find(query)
      .sort({ lastSeenAt: -1 })
      .limit(parseInt(limit))
      .skip(after ? parseInt(after) : 0);
    
    const total = await AdCreative.countDocuments(query);
    const hasMore = (after ? parseInt(after) : 0) + ads.length < total;
    
    return res.json({
      success: true,
      ads,
      hasMore,
      total,
      nextCursor: hasMore ? (after ? parseInt(after) : 0) + ads.length : null
    });
  } catch (error) {
    // Handle errors
  }
};
```

### 4. Load More Ads (`POST /api/ads-library/brand/:brandId/load-more`)

Fetch more ads from Meta API and store them:

```javascript
export const loadMoreAds = async (req, res) => {
  const { brandId } = req.params;
  const { limit = 4, cursor = null } = req.body;
  
  try {
    const brand = await Brand.findById(brandId);
    if (!brand || !brand.metaAdsLibrary?.isTracked) {
      return res.status(404).json({ 
        success: false, 
        message: 'Brand not tracked' 
      });
    }
    
    // Fetch from Meta API
    const newAds = await fetchAndStoreAds(
      brandId, 
      brand.metaAdsLibrary.advertiserName, 
      parseInt(limit),
      cursor
    );
    
    // Get stored ads
    const ads = await AdCreative.find({ brandId })
      .sort({ lastSeenAt: -1 })
      .limit(parseInt(limit));
    
    return res.json({
      success: true,
      ads,
      hasMore: newAds.hasMore,
      nextCursor: newAds.nextCursor
    });
  } catch (error) {
    // Handle errors
  }
};
```

### 5. Sync All Brands (`POST /api/ads-library/sync-all`)

Background job endpoint to sync all tracked brands:

```javascript
export const syncAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ 
      'metaAdsLibrary.isTracked': true 
    });
    
    const results = await Promise.allSettled(
      brands.map(brand => 
        fetchAndStoreAds(
          brand._id, 
          brand.metaAdsLibrary.advertiserName,
          50 // Fetch more for background sync
        )
      )
    );
    
    return res.json({
      success: true,
      synced: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    });
  } catch (error) {
    // Handle errors
  }
};
```

---

## Core Helper Functions

### Fetch and Store Ads (`server/utils/adsLibrary.js`)

```javascript
import axios from 'axios';
import AdCreative from '../models/AdCreative.js';
import Brand from '../models/Brands.js';

export const fetchAndStoreAds = async (
  brandId, 
  advertiserName, 
  limit = 4, 
  cursor = null
) => {
  try {
    const params = {
      access_token: process.env.META_ADS_LIBRARY_ACCESS_TOKEN,
      search_terms: advertiserName,
      ad_reached_countries: 'US', // Make configurable
      ad_active_status: 'ALL',
      limit: limit,
      fields: [
        'ad_creative_bodies',
        'ad_creative_link_titles',
        'ad_creative_link_descriptions',
        'ad_creative_link_captions',
        'ad_snapshot_url',
        'page_name',
        'page_id',
        'ad_delivery_start_time',
        'ad_delivery_stop_time',
        'impressions',
        'spend',
        'ad_creative_bodies',
        'ad_snapshot_url'
      ].join(',')
    };
    
    if (cursor) {
      params.after = cursor;
    }
    
    const response = await axios.get(
      'https://graph.facebook.com/v21.0/ads_archive',
      { params }
    );
    
    const ads = response.data.data || [];
    const paging = response.data.paging || {};
    
    // Process and store each ad
    const storedAds = [];
    for (const ad of ads) {
      const adData = {
        brandId,
        adId: ad.id || `${pageId}_${Date.now()}`, // Generate unique ID if needed
        pageId: ad.page_id,
        pageName: ad.page_name,
        adCreativeBody: ad.ad_creative_bodies?.[0] || '',
        adCreativeLinkTitle: ad.ad_creative_link_titles?.[0] || '',
        adCreativeLinkDescription: ad.ad_creative_link_descriptions?.[0] || '',
        adCreativeLinkCaption: ad.ad_creative_link_captions?.[0] || '',
        adSnapshotUrl: ad.ad_snapshot_url,
        adDeliveryStartDate: ad.ad_delivery_start_time 
          ? new Date(ad.ad_delivery_start_time) 
          : null,
        impressions: ad.impressions?.lower_bound || 0,
        spend: ad.spend?.lower_bound || 0,
        adType: determineAdType(ad), // Helper function
        lastSeenAt: new Date()
      };
      
      // Upsert: Update if exists, create if new
      const stored = await AdCreative.findOneAndUpdate(
        { adId: adData.adId },
        { 
          ...adData,
          $setOnInsert: { firstSeenAt: new Date() } // Only set on insert
        },
        { upsert: true, new: true }
      );
      
      storedAds.push(stored);
    }
    
    // Update brand's last synced time
    await Brand.findByIdAndUpdate(brandId, {
      'metaAdsLibrary.lastSyncedAt': new Date(),
      'metaAdsLibrary.totalAdsTracked': await AdCreative.countDocuments({ brandId })
    });
    
    return {
      ads: storedAds,
      hasMore: !!paging.next,
      nextCursor: paging.cursors?.after || null
    };
    
  } catch (error) {
    console.error('Error fetching ads:', error);
    throw error;
  }
};

const determineAdType = (ad) => {
  // Logic to determine if ad is image, video, carousel, etc.
  // This might require additional API calls or parsing
  return 'UNKNOWN'; // Placeholder
};
```

---

## Background Jobs (Cron)

### Sync Job (`server/controller/cron-job.js`)

Add to existing cron jobs:

```javascript
import cron from 'node-cron';
import { fetchAndStoreAds } from '../utils/adsLibrary.js';
import Brand from '../models/Brands.js';
import { getIO } from '../config/socket.js';

// Sync all tracked brands every 6 hours
export const setupAdsLibrarySyncJob = () => {
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Starting Ads Library sync job...');
    
    try {
      const brands = await Brand.find({ 
        'metaAdsLibrary.isTracked': true 
      });
      
      for (const brand of brands) {
        try {
          await fetchAndStoreAds(
            brand._id,
            brand.metaAdsLibrary.advertiserName,
            50 // Fetch more in background
          );
          
          // Notify frontend via WebSocket
          const io = getIO();
          io.emit('adsLibrary:brandUpdated', {
            brandId: brand._id.toString(),
            message: 'New ads synced'
          });
          
          console.log(`✅ Synced ads for brand: ${brand.name}`);
        } catch (error) {
          console.error(`❌ Error syncing brand ${brand.name}:`, error);
        }
      }
      
      console.log('✅ Ads Library sync job completed');
    } catch (error) {
      console.error('❌ Ads Library sync job failed:', error);
    }
  });
};
```

---

## Frontend Components

### 1. Brand Search Component (`client/src/pages/AdsLibrary/BrandSearch.tsx`)

```typescript
import { useState } from 'react';
import { Search, Plus } from 'lucide-react';

export const BrandSearch = ({ onBrandSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/ads-library/search', {
        query,
        limit: 10
      });
      setResults(response.data.results);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for brand..."
      />
      <button onClick={handleSearch}>Search</button>
      {/* Display results */}
    </div>
  );
};
```

### 2. Brand Ads Dashboard (`client/src/pages/AdsLibrary/BrandAdsDashboard.tsx`)

```typescript
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export const BrandAdsDashboard = ({ brandId }) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  
  useEffect(() => {
    fetchAds();
  }, [brandId]);
  
  const fetchAds = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/ads-library/brand/${brandId}/ads?limit=4`
      );
      setAds(response.data.ads);
      setHasMore(response.data.hasMore);
      setNextCursor(response.data.nextCursor);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoadMore = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/ads-library/brand/${brandId}/load-more`,
        { limit: 4, cursor: nextCursor }
      );
      setAds(prev => [...prev, ...response.data.ads]);
      setHasMore(response.data.hasMore);
      setNextCursor(response.data.nextCursor);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ads.map(ad => (
          <AdCard key={ad.adId} ad={ad} />
        ))}
      </div>
      {hasMore && (
        <Button onClick={handleLoadMore} disabled={loading}>
          Load More
        </Button>
      )}
    </div>
  );
};
```

### 3. Multi-Brand Dashboard (`client/src/pages/AdsLibrary/MultiBrandDashboard.tsx`)

```typescript
export const MultiBrandDashboard = () => {
  const [brands, setBrands] = useState([]);
  
  // Fetch all tracked brands
  useEffect(() => {
    fetchTrackedBrands();
  }, []);
  
  return (
    <div className="space-y-8">
      {brands.map(brand => (
        <div key={brand._id} className="border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">{brand.name}</h2>
          <BrandAdsDashboard brandId={brand._id} />
        </div>
      ))}
    </div>
  );
};
```

---

## Routes Setup

### Update `server/routes/creative.js` or create `server/routes/adsLibrary.js`

```javascript
import express from 'express';
import {
  searchBrands,
  trackBrand,
  getBrandAds,
  loadMoreAds,
  syncAllBrands
} from '../controller/adsLibrary.js';
import { verifyAuth } from '../middleware/verifyAuth.js';

const router = express.Router();

router.post('/search', verifyAuth, searchBrands);
router.post('/track/:brandId', verifyAuth, trackBrand);
router.get('/brand/:brandId/ads', verifyAuth, getBrandAds);
router.post('/brand/:brandId/load-more', verifyAuth, loadMoreAds);
router.post('/sync-all', verifyAuth, syncAllBrands); // Admin only

export default router;
```

### Update `server/index.js`

```javascript
import adsLibraryRoutes from './routes/adsLibrary.js';

// ... existing code ...

dataOperationRouter.use('/ads-library', adsLibraryRoutes);
```

---

## Environment Variables

Add to `.env`:

```env
META_ADS_LIBRARY_ACCESS_TOKEN=your_app_access_token_here
```

**Note:** Meta Ads Library API requires an App Access Token (not user access token). You can get this from Meta App Dashboard.

---

## Additional Suggestions

### 1. **Caching Strategy**
- Cache search results for 1 hour
- Cache brand ads for 30 minutes
- Use Redis for caching (you already have it)

### 2. **Rate Limiting**
- Meta Ads Library API has rate limits
- Implement request queuing
- Add exponential backoff for retries

### 3. **Error Handling**
- Handle API rate limits gracefully
- Retry failed requests
- Log errors for monitoring

### 4. **Real-time Updates**
- Use WebSocket (you have Socket.IO) to notify when new ads are found
- Show toast notifications for new ads

### 5. **Filtering & Search**
- Filter ads by date range
- Filter by ad type (image/video/carousel)
- Search within ad text

### 6. **Analytics**
- Track which brands are most viewed
- Track which ads get most engagement
- Show trends over time

### 7. **Pagination Strategy**
- Initial load: 4 ads per brand
- Load more: 4 more ads
- Use cursor-based pagination (better than offset)

### 8. **Data Deduplication**
- Use `adId` as unique identifier
- Update existing ads instead of creating duplicates
- Track when ads become inactive

### 9. **Background Processing**
- Use Bull Queue (you have Redis) for async ad fetching
- Process multiple brands in parallel
- Handle failures gracefully

### 10. **UI/UX Improvements**
- Show loading skeletons
- Infinite scroll option (in addition to load more button)
- Group ads by date
- Show "New" badge for recently added ads

---

## Implementation Priority

1. **Phase 1: Core Functionality**
   - Database models
   - Search API
   - Track brand API
   - Basic frontend

2. **Phase 2: Display & Pagination**
   - Get ads API
   - Load more functionality
   - Frontend dashboard

3. **Phase 3: Background Sync**
   - Cron job setup
   - WebSocket notifications
   - Auto-refresh

4. **Phase 4: Enhancements**
   - Filtering
   - Analytics
   - Performance optimization

---

## Testing Checklist

- [ ] Search returns relevant brands
- [ ] Brand tracking saves correctly
- [ ] Initial 4 ads load properly
- [ ] Load more fetches next batch
- [ ] Background sync finds new ads
- [ ] WebSocket notifications work
- [ ] Multiple brands display correctly
- [ ] Pagination works for each brand independently
- [ ] Error handling works
- [ ] Rate limiting is respected

---

## Notes

1. **Meta Ads Library API Limitations:**
   - Requires App Access Token
   - Has rate limits (check Meta docs)
   - May not return all ads (privacy restrictions)
   - Some metrics may be estimated ranges

2. **Data Privacy:**
   - Ads Library is public data
   - No PII concerns
   - But respect Meta's terms of service

3. **Performance:**
   - API calls can be slow
   - Consider background processing
   - Cache aggressively
   - Use pagination wisely

---

## Questions to Consider

1. Should users be able to untrack brands?
2. How long should we keep inactive ads?
3. Should we store ad images/videos locally or just URLs?
4. Do we need to support multiple countries?
5. Should there be a limit on brands per user?
6. Do we need admin approval for brand tracking?
