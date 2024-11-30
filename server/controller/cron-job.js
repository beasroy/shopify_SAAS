
import cron from 'node-cron';
import { calculateMetricsForAllBrands } from '../Report/Report.js';
export const setupCronJobs = () => {
    cron.schedule('00 2 * * *', async () => {
        console.log('Cron job started at:', new Date().toISOString());
        try {
          console.log('Cron job is running at:', new Date().toISOString());
          await calculateMetricsForAllBrands();
          console.log('Cron job finished successfully at:', new Date().toISOString());
        } catch (error) {
          console.error('Error executing metrics calculation:', error);
        }
      }, { timezone: 'UTC' });      
};
