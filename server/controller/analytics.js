import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { config } from "dotenv";
import Brand from "../models/Brands.js";

config();

// const getCredentialsPath = (brandId) => {
//   switch (brandId) {
//     case '671b68bed3c4f462d681ef45':
//       return process.env.GOOGLE_APPLICATION_CREDENTIALS_UDDSTUDIO;
//     case '671b6925d3c4f462d681ef47':
//       return process.env.GOOGLE_APPLICATION_CREDENTIALS_FISHERMANHUB;
//     case '671b90c83aee55a69981a0c9':
//       return process.env.GOOGLE_APPLICATION_CREDENTIALS_KOLORTHERAPI;
//     case '671b7d85f99634509a5f2693':
//       return process.env.GOOGLE_APPLICATION_CREDENTIALS_REPRISE;
//     default:
//       console.warn(`No credentials path found for brand ID: ${brandId}`);
//       return null; 
//   }
// };

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
