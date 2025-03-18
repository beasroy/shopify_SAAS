import cron from 'node-cron'; 
import { calculateMetricsForAllBrands } from '../Report/Report.js';
import { sendAllBrandMetricsReports } from './summaryEmail.js';

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
    
    // cron job for sending email reports at 6 AM UTC
    cron.schedule('00 6 * * *', async () => { 
        console.log('Email reports cron job started at:', new Date().toISOString()); 
        try { 
          console.log('Email reports cron job is running at:', new Date().toISOString()); 
          await sendAllBrandMetricsReports(); 
          console.log('Email reports cron job finished successfully at:', new Date().toISOString()); 
        } catch (error) { 
          console.error('Error sending brand metrics emails:', error); 
        } 
    }, { timezone: 'UTC' });       
};