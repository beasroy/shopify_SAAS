import cron from 'node-cron';
import { generateHolidaysWithGPT } from '../services/holidayGenerationService.js';
import FestivalDate from '../models/FestivalDate.js';

/**
 * Yearly cron job to generate holidays for default countries
 * Runs on January 1st at 2 AM UTC
 */
export const setupHolidayGenerationCron = () => {
  // Run on January 1st at 2 AM UTC
  cron.schedule('0 6 1 1 *', async () => {
    console.log('🔄 [Cron] Starting yearly holiday generation job...');
    
    try {
      const currentYear = new Date().getFullYear();
      const defaultCountries = ['IN']; // Start with India, can be expanded
      
      for (const country of defaultCountries) {
        try {
          console.log(`📅 [Cron] Generating holidays for ${country} in ${currentYear}...`);
          
          // Check if holidays already exist for this country and year
          const yearStart = new Date(currentYear, 0, 1);
          yearStart.setHours(0, 0, 0, 0);
          const yearEnd = new Date(currentYear, 11, 31);
          yearEnd.setHours(23, 59, 59, 999);

          const existingHolidays = await FestivalDate.find({
            type: 'global',
            country: country.toUpperCase(),
            date: { $gte: yearStart, $lte: yearEnd }
          });

          if (existingHolidays.length > 0) {
            console.log(`✅ [Cron] Holidays for ${country} in ${currentYear} already exist (${existingHolidays.length} holidays)`);
            continue;
          }

          // Generate holidays using GPT
          const holidays = await generateHolidaysWithGPT(country, currentYear);

            // Save holidays to database
            const holidayDocuments = holidays.map(holiday => ({
              type: 'global',
              country: country.toUpperCase(),
              date: holiday.date,
              festivalName: holiday.name,
              description: holiday.description || '',
              scope: holiday.scope,
              state: holiday.state || null,
              isRecurring: holiday.isRecurring,
              recurrencePattern: holiday.recurrencePattern
            }));

          // Insert in batches
          const batchSize = 50;
          let insertedCount = 0;

          for (let i = 0; i < holidayDocuments.length; i += batchSize) {
            const batch = holidayDocuments.slice(i, i + batchSize);
            await FestivalDate.insertMany(batch, { ordered: false });
            insertedCount += batch.length;
          }

          console.log(`✅ [Cron] Successfully generated and stored ${insertedCount} holidays for ${country} in ${currentYear}`);
        } catch (error) {
          console.error(`❌ [Cron] Error generating holidays for ${country}:`, error);
          // Continue with other countries even if one fails
        }
      }

      console.log('✅ [Cron] Yearly holiday generation job completed');
    } catch (error) {
      console.error('❌ [Cron] Error in yearly holiday generation job:', error);
    }
  }, { timezone: 'UTC' });

  console.log('✅ [Cron] Yearly holiday generation cron scheduled (January 1st, 2 AM UTC)');
};

