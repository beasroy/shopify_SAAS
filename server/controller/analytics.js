import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { config } from "dotenv";
import Brand from "../models/Brands.js";

config();


const getCredentials = (brandId) => {
  switch (brandId) {
    case '671b68bed3c4f462d681ef45':
      return {
        client_email: process.env.GOOGLE_CLIENT_EMAIL_UDDSTUDIO,
        private_key: process.env.GOOGLE_PRIVATE_KEY_UDDSTUDIO.replace(/\\n/g, '\n')
      };
    case '671b6925d3c4f462d681ef47':
      return {
        client_email: process.env.GOOGLE_CLIENT_EMAIL_FISHERMANHUB,
        private_key: process.env.GOOGLE_PRIVATE_KEY_FISHERMANHUB.replace(/\\n/g, '\n')
      };
    case '671b90c83aee55a69981a0c9':
      return {
        client_email: process.env.GOOGLE_CLIENT_EMAIL_KOLORTHERAPI,
        private_key: process.env.GOOGLE_PRIVATE_KEY_KOLORTHERAPI.replace(/\\n/g, '\n')
      };
    case '671b7d85f99634509a5f2693':
      return {
        client_email: process.env.GOOGLE_CLIENT_EMAIL_REPRISE,
        private_key: process.env.GOOGLE_PRIVATE_KEY_REPRISE.replace(/\\n/g, '\n')
      };
    case '671cc01d00989c5fdf2dcb11':
      return {
        client_email: process.env.GOOGLE_CLIENT_EMAIL_MAYINCLOTHING,
        private_key: process.env.GOOGLE_PRIVATE_KEY_MAYINCLOTHING.replace(/\\n/g, '\n')
      };
    default:
      console.warn(`No credentials found for brand ID: ${brandId}`);
      return null;
  }
};


// Batch request handler
export async function getBatchReports(req, res) {
  try {
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const credentials = getCredentials(brandId);

    if (!credentials) {
      console.warn(`No credentials found for brand ID: ${brandId}`);
      return res.status(200).json([]);
    }

    const client = new BetaAnalyticsDataClient({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });


    const propertyId = brand.ga4Account?.PropertyID;

    // Get the startDate and endDate from the request body
    let { startDate, endDate } = req.body;

    // Check if startDate and endDate are empty strings
    if (!startDate || !endDate) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Format the dates to YYYY-MM-DD
      startDate = firstDayOfMonth.toISOString().split('T')[0];
      endDate = lastDayOfMonth.toISOString().split('T')[0];
    }

    // Construct the batch request with individual report requests
    const [batchResponse] = await client.batchRunReports({
      property: `properties/${propertyId}`,
      requests: [
        // First report: Landing Page Report (limited monthly data)
        {
          dateRanges: [
            {
              startDate, // Using startDate from req.body
              endDate,   // Using endDate from req.body
            },
          ],
          dimensions: [
            { name: 'yearMonth' },                   // Group by month
            { name: 'landingPagePlusQueryString' }    // Landing page path
          ],
          metrics: [
            { name: 'totalUsers' },
            { name: 'sessions' },
            { name: 'addToCarts' },
            { name: 'checkouts' },
            { name: 'conversions' },
          ],
          orderBys: [
            {
              desc: false,
              dimension: { dimensionName: 'yearMonth' }
            }
          ],
          limit: 50, // Limit the response to 100 rows
        },
        // Second report: Sessions by Location (monthly data)
        {
          dateRanges: [
            {
              startDate, // Using startDate from req.body
              endDate,   // Using endDate from req.body
            },
          ],
          dimensions: [
            { name: 'yearMonth' },                   // Group by month
            { name: 'city' },                        // City of the user
            { name: 'country' },                     // Country of the user
            { name: 'region' }                       // Region within the country
          ],
          metrics: [
            { name: 'totalUsers' },
            { name: 'sessions' },
          ],
          orderBys: [
            {
              desc: false,
              dimension: { dimensionName: 'yearMonth' }
            }
          ],
          limit: 50, // Limit the response to 100 rows
        },
        // Third report: Sessions by Referring Channel (monthly data)
        {
          dateRanges: [
            {
              startDate, // Using startDate from req.body
              endDate,   // Using endDate from req.body
            },
          ],
          dimensions: [
            { name: 'yearMonth' },
            { name: "source" },
            { name: "medium" },                  // Group by month
            { name: 'sessionDefaultChannelGroup' }   // Referring channel
          ],
          metrics: [
            { name: 'totalUsers' },
            { name: 'sessions' }
          ],
          orderBys: [
            {
              desc: false,
              dimension: { dimensionName: 'yearMonth' }
            }
          ],
          limit: 50, // Limit the response to 100 rows
        },
        // Fourth report: Returning Customer Rate (monthly data)
        {
          dateRanges: [
            {
              startDate, // Using startDate from req.body
              endDate,   // Using endDate from req.body
            },
          ],
          dimensions: [
            { name: 'yearMonth' },  // Group by month
          ],
          metrics: [
            { name: 'totalUsers' },   // Total users (including both new and returning)
            { name: 'newUsers' },     // New users in the given period
          ],
          limit: 50, // Limit the response to 100 rows
        },
        {
          dateRanges: [
            { startDate, endDate }
          ],
          dimensions: [
            { name: 'transactionId' }, 
            { name: 'yearMonth' },        // Unique ID for each purchase               // Date of the transaction
          ],
          metrics: [
       {name:'sessions'}       // Number of items purchased            // Sessions that resulted in purchase
          ],
        },
        //
      ]
    });

    // Format the batch responses
    const batchData = batchResponse.reports.map((report, index) => {
      // Add a unique report type for each report
      switch (index) {
        case 0: // Landing Page Report
          return {
            reportType: 'Landing Page Report',
            data: report.rows.map(row => ({
              yearMonth: row.dimensionValues[0]?.value,
              landingPage: row.dimensionValues[1]?.value,
              visitors: row.metricValues[0]?.value,
              sessions: row.metricValues[1]?.value,
              addToCarts: row.metricValues[2]?.value,
              checkouts: row.metricValues[3]?.value,
              conversions: row.metricValues[4]?.value,
            }))
          };
        case 1: // Sessions by Location
          return {
            reportType: 'Sessions by Location',
            data: report.rows.map(row => ({
              yearMonth: row.dimensionValues[0]?.value,
              city: row.dimensionValues[1]?.value,
              country: row.dimensionValues[2]?.value,
              region: row.dimensionValues[3]?.value,
              visitors: row.metricValues[0]?.value,
              sessions: row.metricValues[1]?.value,
            }))
          };
        case 2: // Sessions by Referring Channel
          return {
            reportType: 'Sessions by Referring Channel',
            data: report.rows.map(row => ({
              yearMonth: row.dimensionValues[0]?.value,
              source: row.dimensionValues[1]?.value,
              medium: row.dimensionValues[2]?.value,  // Medium (e.g., cpc, organic, referral)
              channel: row.dimensionValues[3]?.value,
              visitors: row.metricValues[0]?.value,
              sessions: row.metricValues[1]?.value,
            }))
          };
        case 3: // Returning Customer Rate
          return {
            reportType: 'Returning Customer Rate',
            data: report.rows.map(row => {
              const totalUsers = parseInt(row.metricValues[0].value);
              const newUsers = parseInt(row.metricValues[1].value);
              const returningUsers = totalUsers - newUsers;
              const returnRate = totalUsers > 0 ? (returningUsers / totalUsers) * 100 : 0;

              return {
                yearMonth: row.dimensionValues[0]?.value,
                returnRate: returnRate.toFixed(2)  // Returning customer rate as percentage
              };
            })
          };
        case 4: // Purchase Data
        return {
          reportType: 'Purchase Data',
          data: report.rows.map(row => ({
            transactionId: row.dimensionValues[0]?.value,
            yearMonth: row.dimensionValues[1]?.value,  // Date of the transaction
            sessions: row.metricValues[0]?.value,
          }))
        };
        default:
          return [];
      }
    });


    // Send the batch report data
    res.status(200).json(batchData);
  } catch (error) {
    console.error('Error fetching batch reports:', error);
    res.status(500).json({ error: 'Failed to fetch batch reports.' });
  }
}


export async function getDailyAddToCartAndCheckouts(req, res) {
  try {
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const credentials = getCredentials(brandId);
    if (!credentials) {
      console.warn(`No credentials found for brand ID: ${brandId}`);
      return res.status(200).json([]);
    }

    const client = new BetaAnalyticsDataClient({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const propertyId = brand.ga4Account?.PropertyID;

    // Get the startDate and endDate from the request body
    let { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Format the dates to YYYY-MM-DD
      startDate = firstDayOfMonth.toISOString().split('T')[0];
      endDate = lastDayOfMonth.toISOString().split('T')[0];
    }

    // Convert startDate and endDate to Date objects for iteration
    // const start = new Date(startDate + 'T00:00:00+00:00'); // Set to start of the day in UTC
    // const end = new Date(endDate + 'T23:59:59+00:00'); // Set to end of the day in UTC

    const start = new Date(startDate + 'T00:00:00+05:30'); // Start of the day in IST
    const end = new Date(endDate + 'T23:59:59+05:30'); // End of the day in IST

    const data = [];

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const formattedDate = date.toISOString().split('T')[0];
      console.log(`IST Date: ${formattedDate} ${date.toISOString()}`);

      // Calculate the same day one week prior
      const oneWeekPrior = new Date(date);
      oneWeekPrior.setDate(date.getDate() - 7);
      const formattedOneWeekPrior = oneWeekPrior.toISOString().split('T')[0];
      console.log(`IST Date: ${formattedOneWeekPrior} ${date.toISOString()}`);

      // Run the report for the current date
      const [currentResponse] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: formattedDate, endDate: formattedDate }],
        dimensions: [{ name: 'date' }], // Group by date
        metrics: [
          { name: 'addToCarts' },
          { name: 'checkouts' },
          { name: 'sessions' }
        ],
      });

      // Run the report for the date one week prior
      const [priorResponse] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: formattedOneWeekPrior, endDate: formattedOneWeekPrior }],
        dimensions: [{ name: 'date' }], // Group by date
        metrics: [
          { name: 'addToCarts' },
          { name: 'checkouts' },
          { name: 'sessions' }
        ],
      });

      // Extract data from both responses
      const todayData = currentResponse.rows[0];
      const lastWeekData = priorResponse.rows[0];

      // Push the formatted result into the data array
      data.push({
        date: formattedDate,
        addToCarts: todayData ? todayData.metricValues[0]?.value : 0,
        checkouts: todayData ? todayData.metricValues[1]?.value : 0,
        sessions: todayData ? todayData.metricValues[2]?.value : 0,
        lastWeek: {
          date: formattedOneWeekPrior,
          addToCarts: lastWeekData ? lastWeekData.metricValues[0]?.value : 0,
          checkouts: lastWeekData ? lastWeekData.metricValues[1]?.value : 0,
          sessions: lastWeekData ? lastWeekData.metricValues[2]?.value : 0,
        }
      });
    }

    // Send the data as response
    res.status(200).json({
      reportType: 'Daily Add to Cart, Checkout, and Session Data for Date Range and One Week Prior',
      data,
    });
  } catch (error) {
    console.error('Error fetching daily Add to Cart and Checkout data:', error);
    res.status(500).json({ error: 'Failed to fetch daily Add to Cart and Checkout data.' });
  }
}






