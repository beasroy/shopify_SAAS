import cron from 'node-cron';
import { calculateMetricsForAllBrands } from '../Report/Report.js';
import { sendAllBrandMetricsReports } from './summaryEmail.js';
import { syncAllBrandProducts as syncYesterdayProductsForAllBrands } from '../Report/Report.js';
import { setupHolidayGenerationCron } from '../cron/holidayGenerationCron.js';


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

  // export const setupCronJobs = () => { 
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

  // // Setup location classification cron (runs at 6 AM UTC daily)
  // setupLocationClassificationCron();

  // Setup yearly holiday generation cron (runs on January 1st at 2 AM UTC)
  setupHolidayGenerationCron();

};