/**
 * Emergency Redis Cleanup Script
 * 
 * This script helps clean up Redis when it's running out of memory.
 * It removes old completed and failed jobs from BullMQ queues.
 * 
 * Usage:
 *   node server/scripts/cleanupRedis.js                              - Clean all queues
 *   node server/scripts/cleanupRedis.js city-classification         - Clean specific queue
 *   node server/scripts/cleanupRedis.js --aggressive                 - More aggressive cleanup
 *   node server/scripts/cleanupRedis.js --clean-cache                - Clean ALL cache keys (location-analytics, creatives, locks)
 *   node server/scripts/cleanupRedis.js --clean-all                   - Clean ALL queue data (safer than flush)
 *   node server/scripts/cleanupRedis.js --list-keys [queue-name]     - List all Redis keys (or matching queue)
 *   node server/scripts/cleanupRedis.js --clean-orphaned city-classification - Clean orphaned Redis keys
 *   node server/scripts/cleanupRedis.js --drain city-classification  - Remove ALL jobs from a queue
 *   node server/scripts/cleanupRedis.js --flush                      - Delete ALL data in Redis (WARNING!)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cityClassificationQueue, shopifyOrderQueue, revenueCalculationQueue, historicalSyncQueue } from '../config/shopifyQueues.js';
import { metricsQueue, connection as redis } from '../config/redis.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

const queues = {
  'city-classification': cityClassificationQueue,
  'shopify-orders': shopifyOrderQueue,
  'revenue-calculation': revenueCalculationQueue,
  'historical-sync': historicalSyncQueue,
  'metrics-calculation': metricsQueue,
};

/**
 * Clean up a specific queue
 */
async function cleanupQueue(queueName, queue, options = {}) {
  try {
    const { aggressive = false } = options;
    
    console.log(`\n🧹 Cleaning queue: ${queueName}`);
    
    // Get counts before cleanup
    const beforeCounts = await queue.getJobCounts().catch(() => ({}));
    const beforeTotal = (beforeCounts.waiting || 0) + (beforeCounts.active || 0) + 
                       (beforeCounts.completed || 0) + (beforeCounts.failed || 0) + 
                       (beforeCounts.delayed || 0);
    
    console.log(`   Before: ${beforeTotal} total jobs`);
    console.log(`   - Waiting: ${beforeCounts.waiting || 0}`);
    console.log(`   - Active: ${beforeCounts.active || 0}`);
    console.log(`   - Completed: ${beforeCounts.completed || 0}`);
    console.log(`   - Failed: ${beforeCounts.failed || 0}`);
    console.log(`   - Delayed: ${beforeCounts.delayed || 0}`);
    
    let cleaned = 0;
    
    // Clean completed jobs (keep only last hour if aggressive, otherwise 24 hours)
    const completedAge = aggressive ? 3600 : 86400; // 1 hour vs 24 hours
    try {
      const completedJobs = await queue.clean(completedAge, 10000, 'completed');
      cleaned += completedJobs.length;
      console.log(`   ✅ Removed ${completedJobs.length} completed jobs (older than ${completedAge}s)`);
    } catch (error) {
      console.error(`   ⚠️  Error cleaning completed jobs: ${error.message}`);
    }
    
    // Clean failed jobs (keep only last 24 hours if aggressive, otherwise 7 days)
    const failedAge = aggressive ? 86400 : 604800; // 1 day vs 7 days
    try {
      const failedJobs = await queue.clean(failedAge, 10000, 'failed');
      cleaned += failedJobs.length;
      console.log(`   ✅ Removed ${failedJobs.length} failed jobs (older than ${failedAge}s)`);
    } catch (error) {
      console.error(`   ⚠️  Error cleaning failed jobs: ${error.message}`);
    }
    
    // If aggressive, also clean stalled jobs
    if (aggressive) {
      try {
        const stalledJobs = await queue.clean(3600, 1000, 'stalled');
        cleaned += stalledJobs.length;
        console.log(`   ✅ Removed ${stalledJobs.length} stalled jobs`);
      } catch (error) {
        // Stalled cleaning might not be available in all BullMQ versions
        console.log(`   ℹ️  Stalled job cleanup not available: ${error.message}`);
      }
    }
    
    // Get counts after cleanup
    const afterCounts = await queue.getJobCounts().catch(() => ({}));
    const afterTotal = (afterCounts.waiting || 0) + (afterCounts.active || 0) + 
                      (afterCounts.completed || 0) + (afterCounts.failed || 0) + 
                      (afterCounts.delayed || 0);
    
    console.log(`\n   After: ${afterTotal} total jobs`);
    console.log(`   - Waiting: ${afterCounts.waiting || 0}`);
    console.log(`   - Active: ${afterCounts.active || 0}`);
    console.log(`   - Completed: ${afterCounts.completed || 0}`);
    console.log(`   - Failed: ${afterCounts.failed || 0}`);
    console.log(`   - Delayed: ${afterCounts.delayed || 0}`);
    console.log(`\n   ✅ Total cleaned: ${cleaned} jobs`);
    console.log(`   📉 Reduced by: ${beforeTotal - afterTotal} jobs`);
    
    return { cleaned, beforeTotal, afterTotal };
  } catch (error) {
    console.error(`❌ Error cleaning queue ${queueName}:`, error.message);
    if (error.message.includes('OOM')) {
      console.error(`   ⚠️  Redis is out of memory! Try using --aggressive flag or drain the queue.`);
    }
    throw error;
  }
}

/**
 * Check Redis memory usage
 */
async function checkRedisMemory() {
  try {
    const info = await redis.info('memory');
    const lines = info.split('\r\n');
    const memoryInfo = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        memoryInfo[key] = value;
      }
    });
    
    // Also get maxmemory-policy
    let maxmemoryPolicy = 'unknown';
    try {
      const policy = await redis.config('GET', 'maxmemory-policy');
      maxmemoryPolicy = policy[1] || 'unknown';
    } catch (e) {
      // Ignore
    }
    
    console.log('\n📊 Redis Memory Status:');
    console.log(`   Used memory: ${(Number.parseInt(memoryInfo.used_memory || 0, 10) / 1024 / 1024).toFixed(2)} MB`);
    if (memoryInfo.maxmemory && memoryInfo.maxmemory !== '0') {
      const maxMB = Number.parseInt(memoryInfo.maxmemory, 10) / 1024 / 1024;
      const usedMB = Number.parseInt(memoryInfo.used_memory || 0, 10) / 1024 / 1024;
      const percent = ((usedMB / maxMB) * 100).toFixed(2);
      console.log(`   Max memory: ${maxMB.toFixed(2)} MB`);
      console.log(`   Usage: ${percent}%`);
      console.log(`   Eviction policy: ${maxmemoryPolicy}`);
      
      if (percent > 90) {
        console.log(`   ⚠️  WARNING: Redis memory usage is above 90%!`);
        console.log(`   💡 This is likely causing OOM errors!`);
      }
      
      if (maxmemoryPolicy === 'noeviction') {
        console.log(`   ⚠️  WARNING: Eviction policy is 'noeviction'`);
        console.log(`   💡 When maxmemory is reached, Redis will reject write commands (OOM errors)`);
        console.log(`   💡 Consider: redis-cli CONFIG SET maxmemory-policy allkeys-lru`);
        console.log(`   💡 Or increase maxmemory: redis-cli CONFIG SET maxmemory <size>`);
      }
    } else {
      console.log(`   Max memory: Not set (unlimited)`);
      console.log(`   Eviction policy: ${maxmemoryPolicy}`);
      console.log(`   ℹ️  If you're getting OOM errors, maxmemory might be set elsewhere`);
      console.log(`   💡 Check: redis-cli CONFIG GET maxmemory`);
    }
    
    return memoryInfo;
  } catch (error) {
    console.error(`❌ Error checking Redis memory:`, error.message);
    if (error.message.includes('OOM')) {
      console.error(`   ⚠️  Redis is out of memory! Cannot check memory status.`);
      console.error(`   💡 Try: redis-cli CONFIG SET maxmemory-policy allkeys-lru`);
      console.error(`   💡 Or: redis-cli FLUSHDB (WARNING: deletes ALL data)`);
    }
    return null;
  }
}

/**
 * List all Redis keys matching a pattern (for debugging)
 */
async function listRedisKeys(pattern = '*') {
  try {
    console.log(`\n🔍 Listing Redis keys matching pattern: ${pattern}`);
    
    // Check current database
    const db = redis.options?.db || 0;
    console.log(`   Redis DB: ${db}`);
    console.log(`   Redis Host: ${redis.options?.host || '127.0.0.1'}`);
    console.log(`   Redis Port: ${redis.options?.port || 6379}`);
    
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      console.log(`   ℹ️  No keys found matching pattern: ${pattern}`);
      console.log(`   💡 Checking all keys in database...`);
      
      // Try to get all keys
      const allKeys = await redis.keys('*');
      if (allKeys.length > 0) {
        console.log(`   Found ${allKeys.length} total keys in database ${db}:`);
        
        // Group keys by prefix
        const grouped = {};
        allKeys.forEach(key => {
          const prefix = key.split(':')[0];
          if (!grouped[prefix]) grouped[prefix] = [];
          grouped[prefix].push(key);
        });
        
        Object.entries(grouped).forEach(([prefix, prefixKeys]) => {
          console.log(`   ${prefix}: ${prefixKeys.length} key(s)`);
          if (prefixKeys.length <= 10) {
            prefixKeys.slice(0, 10).forEach(key => console.log(`      - ${key}`));
          } else {
            prefixKeys.slice(0, 10).forEach(key => console.log(`      - ${key}`));
            console.log(`      ... and ${prefixKeys.length - 10} more`);
          }
        });
      } else {
        console.log(`   ℹ️  No keys found in database ${db} at all`);
        console.log(`   💡 The OOM error might be from a different Redis instance or database`);
      }
      
      return [];
    }
    
    console.log(`   Found ${keys.length} keys:\n`);
    
    // Group keys by prefix
    const grouped = {};
    keys.forEach(key => {
      const prefix = key.split(':')[0];
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix].push(key);
    });
    
    Object.entries(grouped).forEach(([prefix, prefixKeys]) => {
      console.log(`   ${prefix}: ${prefixKeys.length} key(s)`);
      if (prefixKeys.length <= 10) {
        prefixKeys.forEach(key => console.log(`      - ${key}`));
      } else {
        prefixKeys.slice(0, 10).forEach(key => console.log(`      - ${key}`));
        console.log(`      ... and ${prefixKeys.length - 10} more`);
      }
      console.log('');
    });
    
    return keys;
  } catch (error) {
    console.error(`❌ Error listing Redis keys:`, error.message);
    if (error.message.includes('OOM')) {
      console.error(`   ⚠️  Redis is out of memory! Cannot list keys.`);
      console.error(`   💡 Try: redis-cli --scan --pattern "*" | head -20`);
      console.error(`   💡 Or check Redis server config: redis-cli CONFIG GET maxmemory`);
    }
    throw error;
  }
}

/**
 * Find and clean orphaned Redis keys for a queue
 */
async function cleanOrphanedKeys(queueName) {
  try {
    console.log(`\n🔍 Searching for orphaned Redis keys for queue: ${queueName}`);
    
    // BullMQ uses various patterns - try all common ones
    const patterns = [
      `${queueName}:*`,           // Standard BullMQ pattern
      `bull:${queueName}:*`,      // Old Bull pattern (from error message)
      `bullmq:${queueName}:*`,    // Alternative BullMQ pattern
    ];
    
    let totalKeys = 0;
    let deletedKeys = 0;
    const allKeys = [];
    
    for (const pattern of patterns) {
      try {
        const keys = await redis.keys(pattern);
        totalKeys += keys.length;
        allKeys.push(...keys);
        
        if (keys.length > 0) {
          console.log(`   Found ${keys.length} keys matching pattern: ${pattern}`);
          
          // Delete keys in batches to avoid blocking Redis
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            try {
              const deleted = await redis.del(...batch);
              deletedKeys += deleted;
            } catch (delError) {
              if (delError.message.includes('OOM')) {
                console.error(`   ⚠️  OOM error while deleting batch, but continuing...`);
              } else {
                throw delError;
              }
            }
          }
          
          console.log(`   ✅ Deleted ${keys.length} keys from pattern: ${pattern}`);
        }
      } catch (patternError) {
        if (patternError.message.includes('OOM')) {
          console.error(`   ⚠️  OOM error checking pattern ${pattern}, skipping...`);
        } else {
          throw patternError;
        }
      }
    }
    
    if (totalKeys === 0) {
      console.log(`   ℹ️  No orphaned keys found with standard patterns`);
      console.log(`   💡 Try running with --list-keys to see all Redis keys`);
    } else {
      console.log(`\n   ✅ Total deleted: ${deletedKeys} orphaned keys`);
    }
    
    return { totalKeys, deletedKeys, keys: allKeys };
  } catch (error) {
    console.error(`❌ Error cleaning orphaned keys:`, error.message);
    if (error.message.includes('OOM')) {
      console.error(`   ⚠️  Redis is out of memory! Cannot clean keys.`);
      console.error(`   💡 Try: redis-cli FLUSHDB (WARNING: deletes ALL data in current DB)`);
      console.error(`   💡 Or increase Redis maxmemory`);
    }
    throw error;
  }
}

/**
 * Drain a queue completely (use with caution!)
 */
async function drainQueue(queueName, queue) {
  try {
    console.log(`\n⚠️  DRAINING queue: ${queueName}`);
    console.log(`   This will remove ALL jobs (waiting, active, completed, failed)`);
    
    const beforeCounts = await queue.getJobCounts().catch(() => ({}));
    const beforeTotal = (beforeCounts.waiting || 0) + (beforeCounts.active || 0) + 
                       (beforeCounts.completed || 0) + (beforeCounts.failed || 0);
    
    // Use obliterate to remove all queue data including orphaned keys
    await queue.obliterate({ force: true });
    
    // Also clean any orphaned keys that might remain
    try {
      await cleanOrphanedKeys(queueName);
    } catch (error) {
      console.log(`   ⚠️  Could not clean orphaned keys: ${error.message}`);
    }
    
    console.log(`\n✅ Drained ${beforeTotal} jobs from ${queueName}`);
    return beforeTotal;
  } catch (error) {
    console.error(`❌ Error draining queue ${queueName}:`, error.message);
    if (error.message.includes('OOM')) {
      console.error(`\n   ⚠️  Redis OOM error during drain. Trying to clean orphaned keys directly...`);
      try {
        const result = await cleanOrphanedKeys(queueName);
        console.log(`   ✅ Cleaned ${result.deletedKeys} orphaned keys`);
        console.log(`   💡 Try running drain again after orphaned keys are cleaned.`);
      } catch (cleanError) {
        console.error(`   ❌ Could not clean orphaned keys: ${cleanError.message}`);
      }
    }
    throw error;
  }
}

/**
 * Flush Redis database (WARNING: deletes ALL data)
 */
async function flushRedis() {
  try {
    console.log('\n⚠️  WARNING: This will delete ALL data in the current Redis database!');
    console.log('   This cannot be undone!\n');
    
    const db = redis.options?.db || 0;
    let keyCount = 0;
    
    try {
      keyCount = await redis.dbsize();
    } catch (e) {
      console.log(`   ⚠️  Could not get key count (might be OOM): ${e.message}`);
      console.log(`   Proceeding with flush anyway...`);
    }
    
    console.log(`   Current database: ${db}`);
    if (keyCount > 0) {
      console.log(`   Keys to be deleted: ${keyCount}`);
    }
    
    // Try to flush
    await redis.flushdb();
    
    console.log(`\n✅ Flushed database ${db}`);
    if (keyCount > 0) {
      console.log(`   Deleted ${keyCount} keys`);
    } else {
      console.log(`   Database cleared`);
    }
    
    // Check memory after flush
    try {
      const info = await redis.info('memory');
      const usedMemoryLine = info.split('\r\n').find(line => line.startsWith('used_memory:'));
      if (usedMemoryLine) {
        const usedMemory = Number.parseInt(usedMemoryLine.split(':')[1], 10);
        console.log(`   Memory after flush: ${(usedMemory / 1024 / 1024).toFixed(2)} MB`);
      }
    } catch (e) {
      // Ignore
    }
    
    return { deleted: keyCount };
  } catch (error) {
    console.error(`❌ Error flushing Redis:`, error.message);
    if (error.message.includes('OOM')) {
      console.error(`   ⚠️  Redis is out of memory! Cannot flush via script.`);
      console.error(`   💡 Try using Redis CLI directly:`);
      console.error(`      redis-cli -h <host> -p <port> -a <password> FLUSHDB`);
      console.error(`   💡 Or use Redis Cloud dashboard to flush database`);
    }
    throw error;
  }
}

/**
 * Clean all cache keys from Redis
 */
async function cleanAllCache() {
  try {
    console.log('\n🧹 Cleaning ALL cache keys from Redis...\n');
    
    // Cache key patterns found in the codebase
    const cachePatterns = [
      'location-analytics:*',  // From locationAnalytics.js
      'creatives:*',          // From creative.js
      'lock:*',                // From lockUtils.js
    ];
    
    let totalDeleted = 0;
    
    for (const pattern of cachePatterns) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          console.log(`   Found ${keys.length} keys matching: ${pattern}`);
          
          // Delete in batches
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            const deleted = await redis.del(...batch);
            totalDeleted += deleted;
          }
          
          console.log(`   ✅ Deleted ${keys.length} keys from pattern: ${pattern}`);
        }
      } catch (error) {
        if (error.message.includes('OOM')) {
          console.error(`   ⚠️  OOM error cleaning ${pattern}, skipping...`);
        } else {
          console.error(`   ⚠️  Error cleaning ${pattern}: ${error.message}`);
        }
      }
    }
    
    // Also try to find any other cache-like keys
    try {
      const allKeys = await redis.keys('*');
      const cacheLikeKeys = allKeys.filter(key => 
        key.includes('cache') || 
        key.includes('analytics') || 
        key.includes('creative') ||
        key.startsWith('lock:')
      );
      
      if (cacheLikeKeys.length > 0) {
        console.log(`\n   Found ${cacheLikeKeys.length} additional cache-like keys`);
        const batchSize = 100;
        for (let i = 0; i < cacheLikeKeys.length; i += batchSize) {
          const batch = cacheLikeKeys.slice(i, i + batchSize);
          const deleted = await redis.del(...batch);
          totalDeleted += deleted;
        }
        console.log(`   ✅ Deleted ${cacheLikeKeys.length} additional cache keys`);
      }
    } catch (error) {
      if (!error.message.includes('OOM')) {
        console.error(`   ⚠️  Error finding additional cache keys: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Total cache keys deleted: ${totalDeleted}`);
    return { deleted: totalDeleted };
  } catch (error) {
    console.error(`❌ Error cleaning cache:`, error.message);
    throw error;
  }
}

/**
 * Clean all queue-related keys (safer than full flush)
 */
async function cleanAllQueues() {
  try {
    console.log('\n🧹 Cleaning ALL queue data from Redis...\n');
    
    let totalDeleted = 0;
    
    // Clean each queue
    for (const [queueName, queue] of Object.entries(queues)) {
      try {
        console.log(`Cleaning ${queueName}...`);
        const result = await cleanupQueue(queueName, queue, { aggressive: true });
        totalDeleted += result.cleaned;
      } catch (error) {
        console.error(`   ⚠️  Error cleaning ${queueName}: ${error.message}`);
      }
    }
    
    // Also clean orphaned keys for all queues
    for (const queueName of Object.keys(queues)) {
      try {
        const result = await cleanOrphanedKeys(queueName);
        totalDeleted += result.deletedKeys;
      } catch (error) {
        console.error(`   ⚠️  Error cleaning orphaned keys for ${queueName}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Total cleaned: ${totalDeleted} keys`);
    return { deleted: totalDeleted };
  } catch (error) {
    console.error(`❌ Error cleaning queues:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  // Parse arguments - filter out flags and get queue name
  const args = process.argv.slice(2);
  const aggressive = args.includes('--aggressive');
  const drain = args.includes('--drain');
  const flush = args.includes('--flush') || args.includes('--flushdb');
  
  // Get queue name (first non-flag argument)
  const queueName = args.find(arg => !arg.startsWith('--'));
  
  try {
    // Check Redis memory first
    await checkRedisMemory();
    
    // Check for flags
    const cleanOrphaned = args.includes('--clean-orphaned');
    const listKeys = args.includes('--list-keys');
    const cleanAll = args.includes('--clean-all');
    const cleanCache = args.includes('--clean-cache');
    
    if (flush) {
      // Flush entire Redis database
      await flushRedis();
    } else if (cleanCache) {
      // Clean all cache keys
      await cleanAllCache();
    } else if (cleanAll) {
      // Clean all queue data (safer than flush)
      await cleanAllQueues();
    } else if (listKeys) {
      // List all Redis keys (or matching pattern if queue name provided)
      const pattern = queueName ? `*${queueName}*` : '*';
      await listRedisKeys(pattern);
      
      // Also check Redis server info for actual maxmemory
      try {
        console.log(`\n📊 Additional Redis Info:`);
        const info = await redis.info('memory');
        const lines = info.split('\r\n');
        const memoryInfo = {};
        
        lines.forEach(line => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            memoryInfo[key] = value;
          }
        });
        
        // Check both CONFIG and INFO for maxmemory
        const configMaxmemory = await redis.config('GET', 'maxmemory').catch(() => null);
        const infoMaxmemory = memoryInfo.maxmemory;
        
        console.log(`   CONFIG maxmemory: ${configMaxmemory ? configMaxmemory[1] : 'unknown'}`);
        console.log(`   INFO maxmemory: ${infoMaxmemory || 'unknown'}`);
        
        if (infoMaxmemory && infoMaxmemory !== '0') {
          const maxMB = Number.parseInt(infoMaxmemory, 10) / 1024 / 1024;
          const usedMB = Number.parseInt(memoryInfo.used_memory || 0, 10) / 1024 / 1024;
          const percent = ((usedMB / maxMB) * 100).toFixed(2);
          
          console.log(`   ⚠️  Server has maxmemory set to ${maxMB.toFixed(2)} MB`);
          console.log(`   Current usage: ${usedMB.toFixed(2)} MB (${percent}%)`);
          
          if (percent > 90) {
            console.log(`   ⚠️  WARNING: Memory usage is above 90%!`);
            console.log(`   💡 This is causing OOM errors!`);
          }
          
          console.log(`   💡 This is set in redis.conf file (not via CONFIG)`);
          console.log(`   💡 To fix: redis-cli CONFIG SET maxmemory-policy allkeys-lru`);
          console.log(`   💡 Or increase: redis-cli CONFIG SET maxmemory <size>`);
        } else if (configMaxmemory && configMaxmemory[1] === '0' && infoMaxmemory === '0') {
          console.log(`   ℹ️  No maxmemory limit detected`);
          console.log(`   💡 OOM errors might be from a different Redis instance`);
          console.log(`   💡 Or maxmemory might be set very low in redis.conf`);
          console.log(`   💡 Check: cat /usr/local/etc/redis.conf | grep maxmemory`);
          console.log(`   💡 Or: docker exec <container> cat /etc/redis/redis.conf | grep maxmemory`);
        }
      } catch (e) {
        console.log(`   ⚠️  Could not get additional info: ${e.message}`);
      }
    } else if (cleanOrphaned) {
      if (queueName) {
        // Clean orphaned keys for specific queue
        await cleanOrphanedKeys(queueName);
      } else {
        console.error('❌ Please specify a queue name to clean orphaned keys');
        console.log(`\nAvailable queues: ${Object.keys(queues).join(', ')}`);
        console.log('\nUsage: node server/scripts/cleanupRedis.js --clean-orphaned <queue-name>');
        process.exit(1);
      }
    } else if (drain) {
      if (queueName) {
        // Drain specific queue
        if (!queues[queueName]) {
          console.error(`❌ Queue "${queueName}" not found`);
          console.log(`\nAvailable queues: ${Object.keys(queues).join(', ')}`);
          process.exit(1);
        }
        await drainQueue(queueName, queues[queueName]);
      } else {
        console.error('❌ Please specify a queue name to drain');
        console.log(`\nAvailable queues: ${Object.keys(queues).join(', ')}`);
        console.log('\nUsage: node server/scripts/cleanupRedis.js --drain <queue-name>');
        process.exit(1);
      }
    } else if (queueName && queues[queueName]) {
      // Clean specific queue
      await cleanupQueue(queueName, queues[queueName], { aggressive });
      
      // Also check for orphaned keys if there are OOM issues
      const counts = await queues[queueName].getJobCounts().catch(() => ({}));
      const total = (counts.waiting || 0) + (counts.active || 0) + 
                   (counts.completed || 0) + (counts.failed || 0);
      
      if (total === 0) {
        console.log(`\n🔍 Checking for orphaned Redis keys (queue shows 0 jobs but OOM errors persist)...`);
        try {
          await cleanOrphanedKeys(queueName);
        } catch (error) {
          console.log(`   ⚠️  Could not check orphaned keys: ${error.message}`);
        }
      }
    } else if (queueName) {
      console.error(`❌ Queue "${queueName}" not found`);
      console.log(`\nAvailable queues: ${Object.keys(queues).join(', ')}`);
      process.exit(1);
    } else {
      // Clean all queues
      console.log('\n🧹 Cleaning all queues...\n');
      let totalCleaned = 0;
      
      for (const [name, queue] of Object.entries(queues)) {
        try {
          const result = await cleanupQueue(name, queue, { aggressive });
          totalCleaned += result.cleaned;
        } catch (error) {
          console.error(`   ⚠️  Failed to clean ${name}: ${error.message}`);
        }
      }
      
      console.log(`\n✅ Total cleaned across all queues: ${totalCleaned} jobs`);
    }
    
    // Check memory again
    await checkRedisMemory();
    
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('OOM')) {
      console.error('\n💡 Redis is out of memory. Try:');
      console.error('   1. Run with --aggressive flag for more aggressive cleanup');
      console.error('   2. Drain specific queue: node server/scripts/cleanupRedis.js --drain city-classification');
      console.error('   3. Increase Redis maxmemory or set eviction policy');
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { cleanupQueue, checkRedisMemory, drainQueue };

