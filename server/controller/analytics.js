import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { config } from "dotenv";

config(); // Load environment variables

const client = new BetaAnalyticsDataClient({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

const propertyId = process.env.GOOGLE_PROPERTY_ID;

console.log('Property ID:', process.env.GOOGLE_PROPERTY_ID);
console.log('Credentials path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Batch request handler
export async function getBatchReports(req, res) {
  try {
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
        }
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
