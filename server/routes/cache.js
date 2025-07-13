import express from 'express';
import { getCacheStats, clearCache, clearCacheKey } from '../controller/cacheManager.js';

const router = express.Router();

// Get cache statistics
router.get('/stats/:cacheName?', getCacheStats);

// Clear cache (all or specific)
router.delete('/clear/:cacheName?', clearCache);

// Clear specific cache key
router.delete('/clear/:cacheName/key/:key', clearCacheKey);

export default router; 