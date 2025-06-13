import mongoose from 'mongoose';
import AdMetrics from '../models/AdMetrics.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAdMetricsDeletions() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get all unique brandIds
        const brands = await AdMetrics.distinct('brandId');
        console.log(`Found ${brands.length} brands with AdMetrics data`);

        for (const brandId of brands) {
            // Get the earliest and latest dates for this brand
            const metrics = await AdMetrics.find({ brandId })
                .sort({ date: 1 })
                .select('date');

            if (metrics.length === 0) {
                console.log(`No data found for brand ${brandId}`);
                continue;
            }

            const earliestDate = metrics[0].date;
            const latestDate = metrics[metrics.length - 1].date;

            // Check for missing dates in the range
            const expectedDates = [];
            let currentDate = new Date(earliestDate);
            while (currentDate <= latestDate) {
                expectedDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Find missing dates
            const existingDates = metrics.map(m => m.date.toISOString().split('T')[0]);
            const missingDates = expectedDates
                .map(d => d.toISOString().split('T')[0])
                .filter(d => !existingDates.includes(d));

            if (missingDates.length > 0) {
                console.log(`\nMissing dates found for brand ${brandId}:`);
                console.log(`Date range: ${earliestDate.toISOString()} to ${latestDate.toISOString()}`);
                console.log(`Total missing dates: ${missingDates.length}`);
                console.log('Missing dates:', missingDates);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

checkAdMetricsDeletions();