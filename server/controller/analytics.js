import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { config } from "dotenv";
import Brand from "../models/Brands.js";
import moment from "moment";

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

 
    let { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      const now = new Date();
      
     
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      console.log("firstDayOfMonth (IST):", firstDayOfMonth);
      
     
      const currentDayOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentDayOfMonth.setHours(23, 59, 59, 999);  
      console.log("currentDayOfMonth (IST):", currentDayOfMonth);
      
        const formatToLocalDateString = (date) => {
        return date.toLocaleDateString('en-CA'); 
      };
    
      startDate = formatToLocalDateString(firstDayOfMonth);
      endDate = formatToLocalDateString(currentDayOfMonth);
    }
    
    console.log("Date Range:", startDate, "to", endDate);

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
          dimensions: [                // Group by month
            { name: 'landingPage' }    // Landing page path
          ],
          metrics: [
            { name: 'totalUsers' },
            { name: 'sessions' },
            { name: 'addToCarts' },
            { name: 'checkouts' },
            { name: 'ecommercePurchases' },
          ],
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
            { name: 'city' },                        // City of the user
            { name: 'country' },                     // Country of the user
            { name: 'region' }                       // Region within the country
          ],
          metrics: [
            { name: 'totalUsers' },
            { name: 'sessions' },
            { name: 'addToCarts' },
            { name: 'checkouts' },
            { name: 'ecommercePurchases' }
          ]
        
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
            // { name: "source" },
            // { name: "medium" },                  // Group by month
            { name: 'sessionDefaultChannelGroup' }   // Referring channel
          ],
          metrics: [
            { name: 'totalUsers' },
            { name: 'sessions' },
            { name: 'addToCarts' },
            { name: 'checkouts' },
            { name: 'ecommercePurchases' },
          ]
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
        },
        {
          dateRanges: [
            { startDate, endDate }
          ],
          dimensions: [
            { name: 'yearMonth' },        // Unique ID for each purchase               // Date of the transaction
          ],
          metrics: [
            { name: 'sessions' },
            {name: 'ecommercePurchases'}       // Number of items purchased            // Sessions that resulted in purchase
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
              LandingPage: row.dimensionValues[0]?.value,
              Visitors: row.metricValues[0]?.value,
              Sessions: row.metricValues[1]?.value,
              AddToCarts: row.metricValues[2]?.value,
              AddToCartRate: ((row.metricValues[2]?.value/row.metricValues[1]?.value)*100).toFixed(2) || 0,
              Checkouts: row.metricValues[3]?.value,
              Purchases:row.metricValues[4]?.value,
              PurchaseRate:((row.metricValues[4]?.value/row.metricValues[1]?.value)*100).toFixed(2) || 0,
            }))
          };
        case 1: // Sessions by Location
          return {
            reportType: 'Sessions by Location',
            data: report.rows.map(row => ({
              City: row.dimensionValues[0]?.value,
              Country: row.dimensionValues[1]?.value,
              Region: row.dimensionValues[2]?.value,
              Visitors: row.metricValues[0]?.value,
              Sessions: row.metricValues[1]?.value,
              AddToCarts: row.metricValues[2]?.value,
              AddToCartRate: ((row.metricValues[2]?.value/row.metricValues[1]?.value)*100).toFixed(2) || 0,
              Checkouts: row.metricValues[3]?.value,
              Purchases:row.metricValues[4]?.value,
              PurchaseRate:((row.metricValues[4]?.value/row.metricValues[1]?.value)*100).toFixed(2) || 0,
            }))
          };
        case 2: // Sessions by Referring Channel
          return {
            reportType: 'Sessions by Referring Channel',
            data: report.rows.map(row => ({
              Channel: row.dimensionValues[0]?.value,
              Visitors: row.metricValues[0]?.value,
              Sessions: row.metricValues[1]?.value,
              AddToCarts: row.metricValues[2]?.value,
              AddToCartRate: ((row.metricValues[2]?.value/row.metricValues[1]?.value)*100).toFixed(2) || 0,
              Checkouts: row.metricValues[3]?.value,
              Purchases:row.metricValues[4]?.value,
              PurchaseRate:((row.metricValues[4]?.value/row.metricValues[1]?.value)*100).toFixed(2) || 0,
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
              yearMonth: row.dimensionValues[0]?.value,  // Date of the transaction
              sessions: row.metricValues[0]?.value,
              Purchase:row.metricValues[1]?.value,
              ConversionRate: ((row.metricValues[1]?.value/row.metricValues[0]?.value)*100).toFixed(2) || 0, // Conversion rate as percentage
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
  
  // First day of the current month in local time
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  console.log("firstDayOfMonth (IST):", firstDayOfMonth);
  
  // Today's date in local time, setting time to 23:59:59.999 (last moment of the day)
  const currentDayOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  currentDayOfMonth.setHours(23, 59, 59, 999);  // Set to the last moment of the day
  console.log("currentDayOfMonth (IST):", currentDayOfMonth);
  
  // Format the dates to YYYY-MM-DD in local time
  const formatToLocalDateString = (date) => {
    return date.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format
  };

  startDate = formatToLocalDateString(firstDayOfMonth);
  endDate = formatToLocalDateString(currentDayOfMonth);
}

console.log("Date Range:", startDate, "to", endDate);


    const data = [];


    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }], // Group by date
      metrics: [
        { name: 'sessions' },
        { name: 'addToCarts' },
        { name: 'checkouts' },
        { name: 'ecommercePurchases' }
      ],
      orderBys: [
        {
          desc: false,
          dimension: { dimensionName: 'date' }
        }
      ],
    });

    // Parse the data from the response
    response.rows.forEach(row => {
      const Date = row.dimensionValues[0]?.value;
      const formattedDate = moment(Date).format("DD-MM-YYYY");
      data.push({
        Date:formattedDate,
        Sessions: row.metricValues[0]?.value || 0,
        AddToCarts: row.metricValues[1]?.value || 0,
        AddToCartRate: ((row.metricValues[1]?.value/row.metricValues[0]?.value)*100).toFixed(2) || 0,
        Checkouts: row.metricValues[2]?.value || 0,
        Purchases: row.metricValues[3]?.value || 0,
        PurchaseRate:((row.metricValues[3]?.value/row.metricValues[0]?.value)*100).toFixed(2) || 0,
      });
    });

    // Send the data as response
    res.status(200).json({
      reportType: 'Daily Add to Cart, Checkout, and Session Data for Date Range',
      data,
    });
  } catch (error) {
    console.error('Error fetching daily Add to Cart and Checkout data:', error);
    res.status(500).json({ error: 'Failed to fetch daily Add to Cart and Checkout data.' });
  }
}







