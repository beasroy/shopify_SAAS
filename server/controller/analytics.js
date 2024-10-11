import {BetaAnalyticsDataClient} from "@google-analytics/data";
import { config } from "dotenv";

config();// Load environment variables

const client = new BetaAnalyticsDataClient({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

const propertyId = process.env.GOOGLE_PROPERTY_ID;

console.log('Property ID:', process.env.GOOGLE_PROPERTY_ID);
console.log('Credentials path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

export async function getLandingPageReport(req, res) {
    try {
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: '2024-01-01',  // Set your desired start date
            endDate: 'today',
          },
        ],
        dimensions: [
          { name: 'yearMonth' },                      // Grouping data by month
          { name: 'landingPagePlusQueryString' }   // Landing page path
        ],
        metrics: [
          {name: 'totalUsers'},
          { name: 'sessions' },                   // Total sessions (visitors)
          { name: 'addToCarts' },                 // Add to cart
          { name: 'checkouts' },                  // Reached checkout
          { name: 'conversions' },                // Conversion events                // Active users
        ],
        orderBys: [
          {
            desc: false,
            dimension: { dimensionName: 'yearMonth' }  // Sorting by month
          }
        ]
      });
  
      // Format and send the response
      const reportData = response.rows.map(row => ({
        yearMonth: row.dimensionValues[0]?.value,
        landingPage: row.dimensionValues[1]?.value,
        totalUsers: row.metricValues[0]?.value,
        sessions: row.metricValues[1]?.value,
        addToCarts: row.metricValues[2]?.value,
        checkouts: row.metricValues[3]?.value,
        conversions: row.metricValues[4]?.value,
      }));
  
      res.status(200).json(reportData);
    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({ error: 'Failed to fetch report data.' });
    }
  }

export async function getSessionsByLocation(req, res) {
    try {
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: '2023-01-01',  // Set your desired start date
            endDate: 'today',
          },
        ],
        dimensions: [
          { name: 'city' },         // City of the user
          { name: 'country' },      // Country of the user
          { name: 'region' }        // Region within the country
        ],
        metrics: [
          { name: 'totalUsers' },   // Unique visitors
          { name: 'sessions' },     // Total sessions
        ],
        orderBys: [
          {
            desc: false,            // Sort in ascending order
            dimension: { dimensionName: 'city' }  // Sorting by city
          }
        ]
      });
  
      // Format and send the response
      const reportData = response.rows.map(row => ({
        city: row.dimensionValues[0]?.value,
        country: row.dimensionValues[1]?.value,
        region: row.dimensionValues[2]?.value,
        visitors: row.metricValues[0]?.value,    // Total users (visitors)
        sessions: row.metricValues[1]?.value,    // Sessions
      }));
  
      res.status(200).json(reportData);
    } catch (error) {
      console.error('Error fetching sessions by location:', error);
      res.status(500).json({ error: 'Failed to fetch sessions by location.' });
    }
  }

  export async function getSessionsByReferringChannel(req, res) {
    try {
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: '2023-01-01',  // Set your desired start date
            endDate: 'today',
          },
        ],
        dimensions: [
          { name: 'sessionDefaultChannelGroup' },  // Referring channel
        ],
        metrics: [
          { name: 'totalUsers' },        // Unique visitors
          { name: 'sessions' },          // Total sessions
        ],
        orderBys: [
          {
            desc: false,                 // Sort in ascending order
            dimension: { dimensionName: 'sessionDefaultChannelGroup' }  // Sorting by channel grouping
          }
        ]
      });
  
      // Format and send the response
      const reportData = response.rows.map(row => ({
        channel: row.dimensionValues[0]?.value,   // Referring channel
        visitors: row.metricValues[0]?.value,     // Total users (visitors)
        sessions: row.metricValues[1]?.value,     // Sessions
      }));
  
      res.status(200).json(reportData);
    } catch (error) {
      console.error('Error fetching sessions by referring channel:', error);
      res.status(500).json({ error: 'Failed to fetch sessions by referring channel.' });
    }
  }

//   export async function getReturningCustomerRate(req, res) {
//     try {
//       // Prepare request
//       const request = {
//         property: `properties/${propertyId}`,
//         dateRanges: [
//           {
//             startDate: '2024-01-01', // Set your desired start date
//             endDate: 'today',
//           },
//         ],
//         dimensions: [
//           { name: 'yearMonth' }, // Grouping by month
//           { name: 'userId' },     // To identify unique users
//         ],
//         metrics: [
//         //   { name: 'totalUsers' },  // Total unique users
//           { name: 'transactions' },  // Total transactions
//         ],
//         orderBys: [
//           {
//             desc: false,
//             dimension: { dimensionName: 'yearMonth' },
//           },
//         ],
//       };
  
//       // Make the request
//       const [response] = await client.runReport(request);
  
//       // Initialize variables for calculations
//       const monthlyRates = [];
//       const userTransactionCount = {};
  
//       // Process the response
//       response.rows.forEach((row) => {
//         const month = row.dimensionValues[0]?.value;
//         const userId = row.dimensionValues[1]?.value;
//         const totalUsers = parseInt(row.metricValues[0]?.value) || 0;
//         const transactions = parseInt(row.metricValues[1]?.value) || 0;
  
//         // Track transactions per user
//         if (!userTransactionCount[userId]) {
//           userTransactionCount[userId] = 0;
//         }
//         userTransactionCount[userId] += transactions;
  
//         // Calculate returning customers
//         const returningCustomers = Object.values(userTransactionCount).filter(count => count > 1).length;
  
//         // Calculate returning customer rate
//         const returningCustomerRate = (returningCustomers / totalUsers) * 100;
  
//         // Push results for the month
//         monthlyRates.push({
//           month,
//           returningCustomerRate: isNaN(returningCustomerRate) ? 0 : returningCustomerRate,
//         });
//       });
  
//       // Return the calculated rates
//       res.status(200).json(monthlyRates);
//     } catch (error) {
//       console.error('Error fetching returning customer rate:', error);
//       res.status(500).json({ error: 'Failed to fetch returning customer rate.' });
//     }
//   }

export async function getReturningCustomerRate(req, res) {
    try {
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: '2023-01-01',  // Set your desired start date
            endDate: 'today',
          },
        ],
        metrics: [
            { name: 'totalPurchasers' },
            { name: 'newPurchasers' }
          ],
          dimensions: [{ name: 'year' }, { name: 'month' }],
          orderBys: [
            { dimension: { dimensionName: 'year' } },
            { dimension: { dimensionName: 'month' } }
          ]
      });
  
      // Format and send the response
      if (response.data.rows && response.data.rows.length > 0) {
        return response.data.rows.map(row => {
          const totalPurchasers = parseInt(row.metricValues[0].value);
          const newPurchasers = parseInt(row.metricValues[1].value);
          const returningPurchasers = totalPurchasers - newPurchasers;
          const returnRate = totalPurchasers > 0 ? returningPurchasers / totalPurchasers : 0;
  
          return {
            year: row.dimensionValues[0].value,
            month: row.dimensionValues[1].value,
            returnRate: returnRate
          };
        });
      } else {
        console.log('No data found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  }