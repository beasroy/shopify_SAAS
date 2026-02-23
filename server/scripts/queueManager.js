/**
 * Queue Management Utility
 * 
 * This script helps you check and manage BullMQ queues
 * 
 * Usage:
 *   node server/scripts/queueManager.js status                    - Check all queue statuses
 *   node server/scripts/queueManager.js status city-classification - Check specific queue
 *   node server/scripts/queueManager.js clean city-classification  - Clean completed/failed jobs
 *   node server/scripts/queueManager.js drain city-classification  - Remove all jobs
 *   node server/scripts/queueManager.js pause city-classification - Pause queue
 *   node server/scripts/queueManager.js resume city-classification - Resume queue
 */

import { cityClassificationQueue, shopifyOrderQueue, revenueCalculationQueue, historicalSyncQueue } from '../config/shopifyQueues.js';
import { metricsQueue, connection as redis } from '../config/redis.js';
import { releaseLock } from '../utils/lockUtils.js';

const queues = {
  'city-classification': cityClassificationQueue,
  'shopify-order': shopifyOrderQueue,
  'revenue-calculation': revenueCalculationQueue,
  'historical-sync': historicalSyncQueue,
  'metrics-calculation': metricsQueue,
};

/**
 * Get queue status
 */
async function getQueueStatus(queueName, queue) {
  try {
    // BullMQ handles Redis connection automatically with lazyConnect
    // Just call the methods and they will connect if needed
    const counts = await queue.getJobCounts();
    const isPaused = await queue.isPaused();
    
    // Also try to get some actual jobs for debugging
    const waitingJobs = await queue.getWaiting(0, 5);
    const activeJobs = await queue.getActive(0, 5);
    const completedJobs = await queue.getCompleted(0, 5);
    const failedJobs = await queue.getFailed(0, 5);
    
    return {
      name: queueName,
      paused: isPaused,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      total: (counts.waiting || 0) + (counts.active || 0) + (counts.completed || 0) + (counts.failed || 0) + (counts.delayed || 0),
      // Debug info
      _debug: {
        waitingJobsCount: waitingJobs.length,
        activeJobsCount: activeJobs.length,
        completedJobsCount: completedJobs.length,
        failedJobsCount: failedJobs.length
      }
    };
  } catch (error) {
    console.error(`❌ Error getting status for ${queueName}:`, error.message);
    console.error('   Stack:', error.stack);
    return { name: queueName, error: error.message };
  }
}

/**
 * Display queue status
 */
async function showStatus(queueName = null) {
  console.log('\n📊 Queue Status\n');
  console.log('═'.repeat(80));
  
  // BullMQ handles Redis connection automatically with lazyConnect
  // The connection will be established when we call queue methods
  // No need to manually connect
  
  if (queueName && queues[queueName]) {
    // Show specific queue
    const status = await getQueueStatus(queueName, queues[queueName]);
    displayQueueStatus(status);
  } else {
    // Show all queues
    const statuses = await Promise.all(
      Object.entries(queues).map(([name, queue]) => getQueueStatus(name, queue))
    );
    
    statuses.forEach(status => displayQueueStatus(status));
  }
  
  console.log('═'.repeat(80));
  console.log('\n💡 Tips:');
  console.log('  - Use "clean" to remove completed/failed jobs');
  console.log('  - Use "drain" to remove ALL jobs (use with caution!)');
  console.log('  - Use "pause" to pause processing');
  console.log('  - Use "resume" to resume processing\n');
}

/**
 * Display single queue status
 */
function displayQueueStatus(status) {
  if (status.error) {
    console.log(`\n❌ ${status.name}: ${status.error}`);
    return;
  }
  
  const statusIcon = status.paused ? '⏸️' : '▶️';
  console.log(`\n${statusIcon} ${status.name}`);
  console.log(`   Waiting:    ${status.waiting}`);
  console.log(`   Active:     ${status.active}`);
  console.log(`   Completed:  ${status.completed}`);
  console.log(`   Failed:     ${status.failed}`);
  console.log(`   Delayed:    ${status.delayed}`);
  console.log(`   Total:      ${status.total}`);
  
  // Show debug info if available
  if (status._debug) {
    if (status.total === 0 && (status._debug.waitingJobsCount > 0 || status._debug.activeJobsCount > 0 || 
        status._debug.completedJobsCount > 0 || status._debug.failedJobsCount > 0)) {
      console.log(`   ⚠️  Debug: Found jobs but counts show 0 (possible Redis connection issue)`);
      console.log(`      Waiting samples: ${status._debug.waitingJobsCount}`);
      console.log(`      Active samples: ${status._debug.activeJobsCount}`);
      console.log(`      Completed samples: ${status._debug.completedJobsCount}`);
      console.log(`      Failed samples: ${status._debug.failedJobsCount}`);
    }
  }
}

/**
 * Clean completed and failed jobs
 */
async function cleanQueue(queueName, queue, options = {}) {
  try {
    console.log(`\n🧹 Cleaning queue: ${queueName}`);
    
    const { completed = true, failed = true, age = 3600 } = options;
    
    let cleaned = 0;
    
    if (completed) {
      const completedCount = await queue.clean(age, 1000, 'completed');
      cleaned += completedCount.length;
      console.log(`   ✅ Removed ${completedCount.length} completed jobs`);
    }
    
    if (failed) {
      const failedCount = await queue.clean(age, 1000, 'failed');
      cleaned += failedCount.length;
      console.log(`   ✅ Removed ${failedCount.length} failed jobs`);
    }
    
    console.log(`\n✅ Total cleaned: ${cleaned} jobs`);
    return cleaned;
  } catch (error) {
    console.error(`❌ Error cleaning queue ${queueName}:`, error.message);
    throw error;
  }
}

/**
 * Drain queue (remove all jobs)
 */
async function drainQueue(queueName, queue) {
  try {
    console.log(`\n⚠️  Draining queue: ${queueName}`);
    console.log('   This will remove ALL jobs (waiting, active, completed, failed)');
    
    // Get counts before draining
    const counts = await queue.getJobCounts();
    const total = (counts.waiting || 0) + (counts.active || 0) + (counts.completed || 0) + (counts.failed || 0);
    
    // Remove all job types
    await queue.obliterate({ force: true });
    
    console.log(`\n✅ Drained ${total} jobs from ${queueName}`);
  } catch (error) {
    console.error(`❌ Error draining queue ${queueName}:`, error.message);
    throw error;
  }
}

/**
 * Pause queue
 */
async function pauseQueue(queueName, queue) {
  try {
    const wasPaused = await queue.isPaused();
    
    if (wasPaused) {
      console.log(`\nℹ️  Queue ${queueName} is already paused`);
      return;
    }
    
    await queue.pause();
    console.log(`\n⏸️  Paused queue: ${queueName}`);
    console.log('   Workers will finish current jobs but will not pick up new jobs');
    console.log('   Use "resume" command to start processing again');
    
    // Show current job counts
    const counts = await queue.getJobCounts();
    if (counts.active > 0) {
      console.log(`\n   ⚠️  Note: ${counts.active} job(s) are currently being processed`);
      console.log('   These will complete before the pause takes full effect');
    }
  } catch (error) {
    console.error(`❌ Error pausing queue ${queueName}:`, error.message);
    throw error;
  }
}

/**
 * Resume queue
 */
async function resumeQueue(queueName, queue) {
  try {
    const wasPaused = await queue.isPaused();
    
    if (!wasPaused) {
      console.log(`\nℹ️  Queue ${queueName} is already running`);
      return;
    }
    
    await queue.resume();
    console.log(`\n▶️  Resumed queue: ${queueName}`);
    console.log('   Workers will now process jobs from the queue');
    
    // Show waiting job counts
    const counts = await queue.getJobCounts();
    if (counts.waiting > 0) {
      console.log(`\n   📋 ${counts.waiting} job(s) waiting to be processed`);
    }
  } catch (error) {
    console.error(`❌ Error resuming queue ${queueName}:`, error.message);
    throw error;
  }
}

/**
 * Release a lock
 */
async function releaseLockCommand(lockKey) {
  try {
    const fullKey = lockKey.startsWith('lock:') ? lockKey : `lock:${lockKey}`;
    const exists = await redis.exists(fullKey);
    
    if (exists === 0) {
      console.log(`\nℹ️  Lock "${lockKey}" does not exist (already released or never acquired)`);
      return false;
    }
    
    const released = await releaseLock(lockKey);
    
    if (released) {
      console.log(`\n✅ Released lock: ${lockKey}`);
    } else {
      console.log(`\n❌ Failed to release lock: ${lockKey}`);
    }
    
    return released;
  } catch (error) {
    console.error(`❌ Error releasing lock ${lockKey}:`, error.message);
    throw error;
  }
}

/**
 * Check lock status
 */
async function checkLock(lockKey) {
  try {
    const fullKey = lockKey.startsWith('lock:') ? lockKey : `lock:${lockKey}`;
    const exists = await redis.exists(fullKey);
    const ttl = exists > 0 ? await redis.ttl(fullKey) : -2;
    
    console.log(`\n🔒 Lock Status: ${lockKey}`);
    console.log(`   Exists: ${exists > 0 ? 'Yes' : 'No'}`);
    
    if (exists > 0) {
      if (ttl > 0) {
        const minutes = Math.floor(ttl / 60);
        const seconds = ttl % 60;
        console.log(`   TTL: ${minutes}m ${seconds}s (expires in ${ttl} seconds)`);
      } else if (ttl === -1) {
        console.log(`   TTL: No expiration (permanent lock)`);
      }
    }
    
    return exists > 0;
  } catch (error) {
    console.error(`❌ Error checking lock ${lockKey}:`, error.message);
    throw error;
  }
}

/**
 * List all locks
 */
async function listLocks() {
  try {
    const keys = await redis.keys('lock:*');
    
    console.log(`\n🔒 Active Locks: ${keys.length}\n`);
    
    if (keys.length === 0) {
      console.log('   No active locks found');
      return;
    }
    
    for (const key of keys) {
      const lockKey = key.replace('lock:', '');
      const ttl = await redis.ttl(key);
      
      if (ttl > 0) {
        const minutes = Math.floor(ttl / 60);
        const seconds = ttl % 60;
        console.log(`   ${lockKey}`);
        console.log(`      TTL: ${minutes}m ${seconds}s`);
      } else if (ttl === -1) {
        console.log(`   ${lockKey}`);
        console.log(`      TTL: No expiration`);
      }
      console.log('');
    }
  } catch (error) {
    console.error(`❌ Error listing locks:`, error.message);
    throw error;
  }
}

/**
 * Get failed jobs
 */
async function getFailedJobs(queueName, queue, limit = 10) {
  try {
    const failed = await queue.getFailed(0, limit);
    
    console.log(`\n❌ Failed Jobs in ${queueName}: ${failed.length}\n`);
    
    failed.forEach((job, index) => {
      console.log(`${index + 1}. Job ID: ${job.id}`);
      console.log(`   Name: ${job.name}`);
      console.log(`   Failed at: ${job.failedReason ? new Date(job.failedReason) : 'N/A'}`);
      console.log(`   Error: ${job.failedReason || 'N/A'}`);
      console.log(`   Attempts: ${job.attemptsMade}/${job.opts.attempts || 3}`);
      console.log('');
    });
    
    return failed;
  } catch (error) {
    console.error(`❌ Error getting failed jobs:`, error.message);
    throw error;
  }
}

/**
 * Check Redis keys for a queue
 */
async function checkRedisKeys(queueName) {
  try {
    console.log(`\n🔍 Checking Redis keys for queue: ${queueName}\n`);
    
    // BullMQ uses specific key patterns
    const keyPatterns = [
      `${queueName}:wait`,
      `${queueName}:active`,
      `${queueName}:completed`,
      `${queueName}:failed`,
      `${queueName}:delayed`,
      `${queueName}:meta`,
      `${queueName}:id`,
      `${queueName}:events`,
      `${queueName}:priority`,
    ];
    
    console.log('Checking for Redis keys with patterns:');
    keyPatterns.forEach(pattern => console.log(`  - ${pattern}*`));
    console.log('');
    
    // Get all keys matching the queue name
    const allKeys = await redis.keys(`${queueName}:*`);
    
    if (allKeys.length === 0) {
      console.log('❌ No Redis keys found for this queue!');
      console.log('   This means:');
      console.log('   1. Jobs were never added to Redis');
      console.log('   2. Jobs were added to a different Redis database');
      console.log('   3. Jobs were added to a different Redis instance');
      console.log('   4. All jobs were processed and cleaned up');
      console.log('');
      const db = redis.options?.db || 0;
      console.log(`   Current Redis config: host=${redis.options?.host || '127.0.0.1'}, port=${redis.options?.port || '6379'}, db=${db}`);
    } else {
      console.log(`✅ Found ${allKeys.length} Redis keys:\n`);
      
      // Group keys by type
      const grouped = {};
      allKeys.forEach(key => {
        const parts = key.split(':');
        const type = parts[parts.length - 1] || 'unknown';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(key);
      });
      
      Object.entries(grouped).forEach(([type, keys]) => {
        console.log(`   ${type}: ${keys.length} key(s)`);
        if (keys.length <= 5) {
          keys.forEach(key => console.log(`      - ${key}`));
        } else {
          keys.slice(0, 5).forEach(key => console.log(`      - ${key}`));
          console.log(`      ... and ${keys.length - 5} more`);
        }
        console.log('');
      });
      
      // Check for job IDs in wait/active lists
      const waitKey = `${queueName}:wait`;
      const activeKey = `${queueName}:active`;
      
      if (allKeys.includes(waitKey)) {
        const waitCount = await redis.llen(waitKey);
        console.log(`   Waiting jobs (list length): ${waitCount}`);
      }
      
      if (allKeys.includes(activeKey)) {
        const activeCount = await redis.llen(activeKey);
        console.log(`   Active jobs (list length): ${activeCount}`);
      }
    }
    
    return allKeys;
  } catch (error) {
    console.error(`❌ Error checking Redis keys:`, error.message);
    throw error;
  }
}

/**
 * List recent jobs (all states)
 */
async function listRecentJobs(queueName, queue, limit = 20) {
  try {
    console.log(`\n📋 Recent Jobs in ${queueName} (showing up to ${limit} of each type)\n`);
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(0, limit),
      queue.getActive(0, limit),
      queue.getCompleted(0, limit),
      queue.getFailed(0, limit),
      queue.getDelayed(0, limit)
    ]);
    
    if (waiting.length > 0) {
      console.log(`⏳ Waiting (${waiting.length}):`);
      waiting.forEach((job, index) => {
        console.log(`   ${index + 1}. ID: ${job.id}, Name: ${job.name}, Created: ${new Date(job.timestamp).toISOString()}`);
        if (job.data.batchNumber) {
          console.log(`      Batch: ${job.data.batchNumber}/${job.data.totalBatches || '?'}, Cities: ${job.data.cities?.length || 0}`);
        }
      });
      console.log('');
    }
    
    if (active.length > 0) {
      console.log(`🔄 Active (${active.length}):`);
      active.forEach((job, index) => {
        console.log(`   ${index + 1}. ID: ${job.id}, Name: ${job.name}, Started: ${job.processedOn ? new Date(job.processedOn).toISOString() : 'N/A'}`);
        if (job.data.batchNumber) {
          console.log(`      Batch: ${job.data.batchNumber}/${job.data.totalBatches || '?'}, Cities: ${job.data.cities?.length || 0}`);
        }
      });
      console.log('');
    }
    
    if (completed.length > 0) {
      console.log(`✅ Completed (${completed.length}):`);
      completed.forEach((job, index) => {
        console.log(`   ${index + 1}. ID: ${job.id}, Name: ${job.name}`);
        console.log(`      Finished: ${job.finishedOn ? new Date(job.finishedOn).toISOString() : 'N/A'}`);
        if (job.data.batchNumber) {
          console.log(`      Batch: ${job.data.batchNumber}/${job.data.totalBatches || '?'}`);
        }
        if (job.returnvalue) {
          console.log(`      Result: ${JSON.stringify(job.returnvalue)}`);
        }
      });
      console.log('');
    }
    
    if (failed.length > 0) {
      console.log(`❌ Failed (${failed.length}):`);
      failed.forEach((job, index) => {
        console.log(`   ${index + 1}. ID: ${job.id}, Name: ${job.name}`);
        console.log(`      Failed: ${job.failedReason || 'N/A'}`);
        if (job.data.batchNumber) {
          console.log(`      Batch: ${job.data.batchNumber}/${job.data.totalBatches || '?'}`);
        }
      });
      console.log('');
    }
    
    if (delayed.length > 0) {
      console.log(`⏰ Delayed (${delayed.length}):`);
      delayed.forEach((job, index) => {
        console.log(`   ${index + 1}. ID: ${job.id}, Name: ${job.name}, Delayed until: ${job.opts.delay ? new Date(Date.now() + job.opts.delay).toISOString() : 'N/A'}`);
      });
      console.log('');
    }
    
    if (waiting.length === 0 && active.length === 0 && completed.length === 0 && failed.length === 0 && delayed.length === 0) {
      console.log('   No jobs found in any state');
      console.log('   This could mean:');
      console.log('   1. Jobs were processed and removed (check removeOnComplete settings)');
      console.log('   2. Jobs were never added (check for errors during queue.add)');
      console.log('   3. Redis connection issue (different Redis instance/database)');
      console.log('');
    }
    
    return { waiting, active, completed, failed, delayed };
  } catch (error) {
    console.error(`❌ Error listing jobs:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];
  const queueName = process.argv[3];
  
  if (!command) {
    console.log(`
📋 Queue Manager - BullMQ Queue Management Tool

Usage:
  node server/scripts/queueManager.js <command> [queue-name]

Commands:
  status [queue-name]              Show queue status(es)
  clean [queue-name]                 Clean completed/failed jobs
  drain [queue-name]                 Remove ALL jobs (use with caution!)
  pause [queue-name]                 Pause queue processing
  resume [queue-name]                Resume queue processing
  failed [queue-name] [limit]        Show failed jobs (default: 10)
  list [queue-name] [limit]          List recent jobs in all states (default: 20)
  check-keys [queue-name]            Check Redis keys directly for a queue
  locks                              List all active locks
  lock-status <lock-key>              Check if a lock exists
  release-lock <lock-key>             Release a lock (e.g., backfill-city-metadata)

Available Queues:
  - city-classification
  - shopify-orders
  - revenue-calculation
  - historical-sync
  - metrics-calculation

Examples:
  node server/scripts/queueManager.js status
  node server/scripts/queueManager.js status city-classification
  node server/scripts/queueManager.js list city-classification
  node server/scripts/queueManager.js check-keys city-classification
  node server/scripts/queueManager.js clean city-classification
  node server/scripts/queueManager.js failed city-classification 20
  node server/scripts/queueManager.js locks
  node server/scripts/queueManager.js release-lock backfill-city-metadata
    `);
    process.exit(0);
  }
  
  try {
    switch (command) {
      case 'status':
        await showStatus(queueName);
        break;
        
      case 'clean':
        if (!queueName) {
          console.error('❌ Please specify a queue name');
          process.exit(1);
        }
        if (!queues[queueName]) {
          console.error(`❌ Queue "${queueName}" not found`);
          process.exit(1);
        }
        await cleanQueue(queueName, queues[queueName]);
        break;
        
      case 'drain':
        if (!queueName) {
          console.error('❌ Please specify a queue name');
          process.exit(1);
        }
        if (!queues[queueName]) {
          console.error(`❌ Queue "${queueName}" not found`);
          process.exit(1);
        }
        await drainQueue(queueName, queues[queueName]);
        break;
        
      case 'pause':
        if (!queueName) {
          console.error('❌ Please specify a queue name');
          process.exit(1);
        }
        if (!queues[queueName]) {
          console.error(`❌ Queue "${queueName}" not found`);
          process.exit(1);
        }
        await pauseQueue(queueName, queues[queueName]);
        break;
        
      case 'resume':
        if (!queueName) {
          console.error('❌ Please specify a queue name');
          process.exit(1);
        }
        if (!queues[queueName]) {
          console.error(`❌ Queue "${queueName}" not found`);
          process.exit(1);
        }
        await resumeQueue(queueName, queues[queueName]);
        break;
        
      case 'failed': {
        if (!queueName) {
          console.error('❌ Please specify a queue name');
          process.exit(1);
        }
        if (!queues[queueName]) {
          console.error(`❌ Queue "${queueName}" not found`);
          process.exit(1);
        }
        const limit = Number.parseInt(process.argv[4]) || 10;
        await getFailedJobs(queueName, queues[queueName], limit);
        break;
      }
        
      case 'list': {
        if (!queueName) {
          console.error('❌ Please specify a queue name');
          process.exit(1);
        }
        if (!queues[queueName]) {
          console.error(`❌ Queue "${queueName}" not found`);
          process.exit(1);
        }
        const limit = Number.parseInt(process.argv[4]) || 20;
        await listRecentJobs(queueName, queues[queueName], limit);
        break;
      }
        
      case 'check-keys': {
        if (!queueName) {
          console.error('❌ Please specify a queue name');
          process.exit(1);
        }
        await checkRedisKeys(queueName);
        break;
      }
        
      case 'locks':
        await listLocks();
        break;
        
      case 'lock-status':
        if (!queueName) {
          console.error('❌ Please specify a lock key');
          process.exit(1);
        }
        await checkLock(queueName);
        break;
        
      case 'release-lock':
        if (!queueName) {
          console.error('❌ Please specify a lock key');
          console.log('Common lock keys:');
          console.log('  - backfill-city-metadata');
          process.exit(1);
        }
        await releaseLockCommand(queueName);
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run without arguments to see usage');
        process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { showStatus, cleanQueue, drainQueue, pauseQueue, resumeQueue, getFailedJobs };

