import NodeCache from 'node-cache';
import { cache as brandSetupCache } from './brandSetup.js';
import { dataCache as fbReportsCache } from './fbReports.js';
import { cache as segmentReportCache } from './segmentReport.js';
import { cache as zohoTicketCache } from './zohoTicket.js';

// Create a centralized cache manager
const cacheManager = {
    caches: new Map(),
    
    // Initialize and register all cache instances
    initialize() {
        this.registerCache('brandSetup', brandSetupCache);
        this.registerCache('fbReports', fbReportsCache);
        this.registerCache('segmentReport', segmentReportCache);
        this.registerCache('zohoTicket', zohoTicketCache);
        
        console.log('Cache manager initialized with', this.caches.size, 'cache instances');
    },
    
    // Register a cache instance
    registerCache(name, cacheInstance) {
        this.caches.set(name, cacheInstance);
    },
    
    // Get all cache instances
    getAllCaches() {
        return this.caches;
    },
    
    // Clear all caches
    clearAllCaches() {
        const results = {};
        for (const [name, cache] of this.caches) {
            try {
                cache.flushAll();
                results[name] = { success: true, message: 'Cache cleared successfully' };
            } catch (error) {
                results[name] = { success: false, message: error.message };
            }
        }
        return results;
    },
    
    // Clear specific cache
    clearCache(cacheName) {
        const cache = this.caches.get(cacheName);
        if (!cache) {
            throw new Error(`Cache '${cacheName}' not found`);
        }
        cache.flushAll();
        return { success: true, message: `Cache '${cacheName}' cleared successfully` };
    },
    
    // Get stats for all caches
    getAllCacheStats() {
        const stats = {};
        for (const [name, cache] of this.caches) {
            stats[name] = cache.getStats();
        }
        return stats;
    },
    
    // Get stats for specific cache
    getCacheStats(cacheName) {
        const cache = this.caches.get(cacheName);
        if (!cache) {
            throw new Error(`Cache '${cacheName}' not found`);
        }
        return cache.getStats();
    }
};

// Initialize cache manager
cacheManager.initialize();

// Cache management endpoints
export const getCacheStats = async (req, res) => {
    try {
        const { cacheName } = req.params;
        
        if (cacheName) {
            // Get stats for specific cache
            const stats = cacheManager.getCacheStats(cacheName);
            res.json({
                success: true,
                cacheName,
                stats
            });
        } else {
            // Get stats for all caches
            const stats = cacheManager.getAllCacheStats();
            res.json({
                success: true,
                stats
            });
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const clearCache = async (req, res) => {
    try {
        const { cacheName } = req.params;
        
        if (cacheName) {
            // Clear specific cache
            const result = cacheManager.clearCache(cacheName);
            res.json({
                success: true,
                message: result.message
            });
        } else {
            // Clear all caches
            const results = cacheManager.clearAllCaches();
            res.json({
                success: true,
                message: 'All caches cleared successfully',
                results
            });
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const clearCacheKey = async (req, res) => {
    try {
        const { cacheName, key } = req.params;
        
        if (!cacheName || !key) {
            return res.status(400).json({
                success: false,
                message: 'Cache name and key are required'
            });
        }
        
        const cache = cacheManager.caches.get(cacheName);
        if (!cache) {
            return res.status(404).json({
                success: false,
                message: `Cache '${cacheName}' not found`
            });
        }
        
        const deleted = cache.del(key);
        res.json({
            success: true,
            message: deleted ? `Key '${key}' deleted from cache '${cacheName}'` : `Key '${key}' not found in cache '${cacheName}'`,
            deleted
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export default cacheManager; 