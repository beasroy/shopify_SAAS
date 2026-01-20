import cron from 'node-cron';
import { cityClassificationQueue } from '../config/shopifyQueues.js';
import Order from '../models/Order.js';
import CityMetadata from '../models/CityMetadata.js';


/**
 * Daily cron job to classify unknown cities from yesterday's orders
 * Runs at 6 AM every day
 */
export const setupLocationClassificationCron = () => {
    cron.schedule('0 6 * * *', async () => {
        console.log('🔄 [Cron] Starting daily city classification job...');
        
        try {
            // 1. Get all unique city/state from yesterday's orders
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            console.log(`📅 [Cron] Checking orders from ${yesterday.toISOString()} to ${today.toISOString()}`);
            
            // Get unique city/state combinations from orders
            const unknownCities = await Order.aggregate([
                {
                    $match: {
                        orderCreatedAt: {
                            $gte: yesterday,
                            $lt: today
                        },
                        city: { $exists: true, $ne: null, $ne: '' },
                        state: { $exists: true, $ne: null, $ne: '' }
                    }
                },
                {
                    $group: {
                        _id: {
                            city: { $toLower: { $trim: { input: "$city" }}},
                            state: { $toLower: { $trim: { input: "$state" }}}
                        },
                        originalCity: { $first: "$city" },
                        originalState: { $first: "$state" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        cityNormalized: "$_id.city",
                        city: "$originalCity",
                        state: "$originalState",
                        lookupKey: {
                            $concat: ["$_id.city", "_", "$_id.state", "_india"]
                        }
                    }
                }
            ]);
            
            if (unknownCities.length === 0) {
                console.log('✅ [Cron] No cities found in yesterday\'s orders');
                return;
            }
            
            console.log(`📊 [Cron] Found ${unknownCities.length} unique city/state combinations`);
            
            // 2. Check which cities are already in CityMetadata
            const lookupKeys = unknownCities.map(c => c.lookupKey);
            const existingCities = await CityMetadata.find({
                lookupKey: { $in: lookupKeys }
            }).select('lookupKey');
            
            const existingLookupKeys = new Set(
                existingCities.map(c => c.lookupKey)
            );
            
            // 3. Filter out already classified cities
            const newCities = unknownCities.filter(
                c => !existingLookupKeys.has(c.lookupKey)
            );
            
            if (newCities.length === 0) {
                console.log('✅ [Cron] All cities already classified');
                return;
            }
            
            console.log(`🆕 [Cron] Found ${newCities.length} new cities to classify`);
            
            // 4. Batch cities (20 per GPT call)
            const batchSize = 20;
            const batches = [];
            
            for (let i = 0; i < newCities.length; i += batchSize) {
                batches.push(newCities.slice(i, i + batchSize));
            }
            
            console.log(`📦 [Cron] Creating ${batches.length} batch jobs`);
            
            // 5. Queue batch jobs
            const jobPromises = batches.map((batch, index) => {
                return cityClassificationQueue.add('classify-cities-batch', {
                    type: 'batch',
                    cities: batch,
                    batchNumber: index + 1,
                    totalBatches: batches.length
                }, {
                    priority: 1, // Normal priority for cron jobs
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                });
            });
            
            await Promise.all(jobPromises);
            
            console.log(`✅ [Cron] Queued ${batches.length} batch jobs for city classification`);
            
        } catch (error) {
            console.error('❌ [Cron] Error in city classification job:', error);
        }
    }, { timezone: 'UTC' });
    
    console.log('✅ [Cron] Daily city classification cron scheduled (6 AM UTC)');
};

