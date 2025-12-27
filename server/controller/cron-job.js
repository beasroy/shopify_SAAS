import cron from 'node-cron'; 
import { calculateMetricsForAllBrands } from '../Report/Report.js';
import { sendAllBrandMetricsReports } from './summaryEmail.js';
import { fetchCompetitorAdsForAllBrands } from './competitorAds.js';

export const setupCronJobs = () => { 
    // cron job for metrics calculation
    cron.schedule('00 2 * * *', async () => { 
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

    // cron job for fetching competitor ads every 6 hours
    // This ensures users see the newest ads first since Meta doesn't provide webhooks
    cron.schedule('0 */6 * * *', async () => { 
        console.log('Competitor ads fetch cron job started at:', new Date().toISOString()); 
        try { 
          console.log('Competitor ads fetch cron job is running at:', new Date().toISOString()); 
          await fetchCompetitorAdsForAllBrands(); 
          console.log('Competitor ads fetch cron job finished successfully at:', new Date().toISOString()); 
        } catch (error) { 
          console.error('Error fetching competitor ads:', error); 
        } 
    }, { timezone: 'UTC' });       
};