import cron from 'node-cron';
import { calculateMetricsForAllBrands, syncAllBrandProducts as syncYesterdayProductsForAllBrands } from '../Report/Report.js';
import { sendAllBrandMetricsReports } from './summaryEmail.js';
import { setupHolidayGenerationCron } from '../cron/holidayGenerationCron.js';
import { metricsQueue } from '../config/redis.js';
import Brand from '../models/Brands.js';
import User from '../models/User.js';


export const setupCronJobs = () => {

  // Yesterday Shopify product sync (01:00 UTC)
  cron.schedule('0 1 * * *', async () => {
    console.log('Yesterday product sync started at:', new Date().toISOString());
    try {
      await syncYesterdayProductsForAllBrands();
      console.log('Yesterday product sync finished at:', new Date().toISOString());
    } catch (error) {
      console.error('Error in yesterday product sync:', error);
    }
  }, { timezone: 'UTC' });

  // cron job for metrics calculation
  cron.schedule('00 3 * * *', async () => {
    console.log('Metrics calculation cron job started at:', new Date().toISOString());
    try {
      console.log('Metrics calculation cron job is running at:', new Date().toISOString());
      await calculateMetricsForAllBrands();
      console.log('Metrics calculation cron job finished successfully at:', new Date().toISOString());
    } catch (error) {
      console.error('Error executing metrics calculation:', error);
    }
  }, { timezone: 'UTC' });

  // cron job for sending email reports at 6 AM IST
  cron.schedule('30 0 * * *', async () => {
    console.log('Email reports cron job started at:', new Date().toISOString());
    try {
      console.log('Email reports cron job is running at:', new Date().toISOString());
      await sendAllBrandMetricsReports();
      console.log('Email reports cron job finished successfully at:', new Date().toISOString());
    } catch (error) {
      console.error('Error sending brand metrics emails:', error);
    }
  }, { timezone: 'UTC' });

  // Weekly backfill/update of last 2 years metrics (Monday 02:00 UTC)
  // This queues jobs into BullMQ so the API server doesn't do heavy work.
  cron.schedule('0 2 * * 1', async () => {
    console.log('Weekly metrics update enqueue started at:', new Date().toISOString());
    try {
      const admin = await User.findOne({ isAdmin: true }, { _id: 1 }).lean();
      if (!admin?._id) {
        console.warn('No admin user found; skipping weekly metrics update enqueue.');
        return;
      }

      const brands = await Brand.find({}, { _id: 1 }).lean();
      if (!brands.length) {
        console.warn('No brands found; skipping weekly metrics update enqueue.');
        return;
      }

      await Promise.all(
        brands.map(b =>
          metricsQueue.add('update-metrics', {
            brandId: b._id.toString(),
            userId: admin._id.toString()
          })
        )
      );

      console.log(`Weekly metrics update queued for ${brands.length} brands at:`, new Date().toISOString());
    } catch (error) {
      console.error('Error queueing weekly metrics update jobs:', error);
    }
  }, { timezone: 'UTC' });

  // Setup yearly holiday generation cron (runs on January 1st at 2 AM UTC)
  setupHolidayGenerationCron();

};