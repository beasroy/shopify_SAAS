import { config } from "dotenv";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
import moment from "moment";
import axios from 'axios'
import { OAuth2Client } from 'google-auth-library';
config();

// Helper function to compare values based on operator
const compareValues = (value, filterValue, operator) => {
  switch (operator.toLowerCase()) {
    case 'gt':
    case '>':
      return value > filterValue;
    case 'gte':
    case '>=':
      return value >= filterValue;
    case 'lt':
    case '<':
      return value < filterValue;
    case 'lte':
    case '<=':
      return value <= filterValue;
    case 'eq':
    case '===':
    case '==':
      return value === filterValue;
    default:
      console.warn(`Unknown operator: ${operator}, defaulting to greater than or equal`);
      return value >= filterValue;
  }
};

export async function getGoogleAccessToken(refreshToken) {
  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { token } = await oAuth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw new Error('Failed to generate access token.');
  }
}


export async function getDailyAddToCartAndCheckouts(req, res) {
  try {
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let { startDate, endDate, userId, limit } = req.body;

    if (!startDate || !endDate) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentDayOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentDayOfMonth.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) =>
        date.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format

      startDate = formatToLocalDateString(firstDayOfMonth);
      endDate = formatToLocalDateString(currentDayOfMonth);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'sessions' },
        { name: 'addToCarts' },
        { name: 'checkouts' },
        { name: 'ecommercePurchases' },
      ],
      orderBys: [
        {
          desc: false,
          dimension: { dimensionName: 'date' },
        },
      ],
      limit: limit
    };

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const rows = response?.data?.rows;
    if (!rows || rows.length === 0) {
      console.warn("No data found in the response.");
      return res.status(200).json({
        reportType: 'Daily Add to Cart, Checkout, and Session Data for Date Range',
        data: [],
      });
    }

    const data = rows.map((row) => {
      const Date = row.dimensionValues[0]?.value;
      const formattedDate = moment(Date).format("DD-MM-YYYY");
      return {
        Date: formattedDate,
        Sessions: row.metricValues[0]?.value || 0,
        "Add To Cart": row.metricValues[1]?.value || 0,
        "Add To Cart Rate": `${((row.metricValues[1]?.value / row.metricValues[0]?.value) * 100).toFixed(2)} %` || 0,
        Checkouts: row.metricValues[2]?.value || 0,
        "Checkout Rate": `${((row.metricValues[2]?.value / row.metricValues[0]?.value) * 100).toFixed(2)} %` || 0,
        Purchases: row.metricValues[3]?.value || 0,
        "Purchase Rate": `${((row.metricValues[3]?.value / row.metricValues[0]?.value) * 100).toFixed(2)} %` || 0,
      };
    });

    res.status(200).json({
      reportType: 'Daily Add to Cart, Checkout, and Session Data for Date Range',
      data,
    });
  } catch (error) {
    console.error('Error fetching daily Add to Cart and Checkout data:', error.response?.data || error.message);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }
    res.status(500).json({ error: 'Failed to fetch daily Add to Cart and Checkout data.' });
  }
}

export async function getLandingPageMetrics(req, res) {
  try {
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let { startDate, endDate, userId, limit } = req.body;

    if (!startDate || !endDate) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentDayOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentDayOfMonth.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) =>
        date.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format

      startDate = formatToLocalDateString(firstDayOfMonth);
      endDate = formatToLocalDateString(currentDayOfMonth);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      "dateRanges": [
        { "startDate": startDate, "endDate": endDate }
      ],
      "dimensions": [
        { "name": "landingPage" }
      ],
      "metrics": [
        { "name": "totalUsers" },
        { "name": "sessions" },
        { "name": "addToCarts" },
        { "name": "checkouts" },
        { "name": "ecommercePurchases" }
      ],
      "limit": limit
    };

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const rows = response?.data?.rows;
    if (!rows || rows.length === 0) {
      console.warn("No data found in the response.");
      return res.status(200).json({
        reportType: 'Landing page based data',
        data: [],
      });
    }

    const data = rows.map(row => ({
      "Landing Page": row.dimensionValues[0]?.value,
      "Visitors": row.metricValues[0]?.value,
      "Sessions": row.metricValues[1]?.value,
      "Add To Cart": row.metricValues[2]?.value,
      "Add To Cart Rate": ((row.metricValues[2]?.value / row.metricValues[1]?.value) * 100).toFixed(2) || 0,
      "Checkouts": row.metricValues[3]?.value,
      "Checkout Rate": ((row.metricValues[3]?.value / row.metricValues[1]?.value) * 100).toFixed(2) || 0,
      "Purchases": row.metricValues[4]?.value,
      "Purchase Rate": ((row.metricValues[4]?.value / row.metricValues[1]?.value) * 100).toFixed(2) || 0,
    }))

    res.status(200).json({
      reportType: 'Landing page data',
      data,
    });
  } catch (error) {
    console.error('Error fetching Landing page data:', error.response?.data || error.message);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }
    res.status(500).json({ error: 'Failed to fetch Landing page data.' });
  }
}
export async function getChannelMetrics(req, res) {
  try {
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let { startDate, endDate, userId, limit } = req.body;

    if (!startDate || !endDate) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentDayOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentDayOfMonth.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) =>
        date.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format

      startDate = formatToLocalDateString(firstDayOfMonth);
      endDate = formatToLocalDateString(currentDayOfMonth);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      "dateRanges": [
        { "startDate": startDate, "endDate": endDate }
      ],
      "dimensions": [
        { "name": "sessionDefaultChannelGroup" }
      ],
      "metrics": [
        { "name": "totalUsers" },
        { "name": "sessions" },
        { "name": "addToCarts" },
        { "name": "checkouts" },
        { "name": "ecommercePurchases" }
      ],
      "limit": limit
    };

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const rows = response?.data?.rows;
    if (!rows || rows.length === 0) {
      console.warn("No data found in the response.");
      return res.status(200).json({
        reportType: 'Reffering Channel based data',
        data: [],
      });
    }

    const data = rows.map(row => ({
      "Channel": row.dimensionValues[0]?.value,
      "Visitors": row.metricValues[0]?.value,
      "Sessions": row.metricValues[1]?.value,
      "Add To Cart": row.metricValues[2]?.value,
      "Add To Cart Rate": ((row.metricValues[2]?.value / row.metricValues[1]?.value) * 100).toFixed(2) || 0,
      "Checkouts": row.metricValues[3]?.value,
      "Checkout Rate": ((row.metricValues[3]?.value / row.metricValues[1]?.value) * 100).toFixed(2) || 0,
      "Purchases": row.metricValues[4]?.value,
      "Purchase Rate": ((row.metricValues[4]?.value / row.metricValues[1]?.value) * 100).toFixed(2) || 0,
    }))

    res.status(200).json({
      reportType: 'Reffering Channel data',
      data,
    });
  } catch (error) {
    console.error('Error fetching Reffering Channel data:', error.response?.data || error.message);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }
    res.status(500).json({ error: 'Failed to fetch Reffering Channel data.' });
  }
}

export async function getLocationMetrics(req, res) {
  try {
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;
    let { startDate, endDate, userId, filters, limit } = req.body;

    if (!startDate || !endDate) {
      const now = new Date();
      const fourYearsAgo = new Date(now.getFullYear() - 4, now.getMonth(), now.getDate());
      console.log(fourYearsAgo)

      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];

      startDate = formatToLocalDateString(fourYearsAgo);
      endDate = formatToLocalDateString(now);
    }


    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const locationDimensionsSet = new Set();
    if (!filters || !filters.location) {
      locationDimensionsSet.add('city');
      locationDimensionsSet.add('country');
      locationDimensionsSet.add('region');
    } else {
      if (filters.location.includes('city')) {
        locationDimensionsSet.add('country');
      }
      if (filters.location.includes('region')) {
        locationDimensionsSet.add('city');
        locationDimensionsSet.add('country');
      }
      if (filters.location.includes('country')) {
        locationDimensionsSet.add('city');
        locationDimensionsSet.add('region');
      }
    }

    const locationDimensions = Array.from(locationDimensionsSet).map(name => ({ name }));


    const requestBody = {
      "dateRanges": [
        { "startDate": startDate, "endDate": endDate }
      ],
      "dimensions": locationDimensions,
      "metrics": [
        { "name": "totalUsers" },
        { "name": "sessions" },
        { "name": "addToCarts" },
        { "name": "checkouts" },
        { "name": "ecommercePurchases" }
      ],
      "limit": limit
    };

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const rows = response?.data?.rows;
    if (!rows || rows.length === 0) {
      console.warn("No data found in the response.");
      return res.status(200).json({
        reportType: 'Location based data',
        data: [],
      });
    }
    const data = rows.map(row => {
      const rowData = {};
      locationDimensions.forEach((dim, idx) => {
        rowData[dim.name] = row.dimensionValues[idx]?.value;
      });
      return {
        ...rowData,
        "Visitors": row.metricValues[0]?.value,
        "Sessions": row.metricValues[1]?.value,
        "Add To Cart": row.metricValues[2]?.value,
        "Add To Cart Rate": ((row.metricValues[2]?.value / row.metricValues[1]?.value) * 100).toFixed(2) || 0,
        "Checkouts": row.metricValues[3]?.value,
        "Checkout Rate": ((row.metricValues[3]?.value / row.metricValues[1]?.value) * 100).toFixed(2) || 0,
        "Purchases": row.metricValues[4]?.value,
        "Purchase Rate": ((row.metricValues[4]?.value / row.metricValues[1]?.value) * 100).toFixed(2) || 0,
      };
    })

    // Send the data as response
    res.status(200).json({
      reportType: 'Location based Data',
      data,
    });
  } catch (error) {
    console.error('Error fetching Location data:', error);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }
    res.status(500).json({ error: 'Failed to fetch Location data.' });
  }
}

export async function getAgeMetrics(req, res) {
  try {
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;
    let { startDate, endDate, userId, limit } = req.body;

    if (!startDate || !endDate) {
      const now = new Date();
      const fourYearsAgo = new Date(now.getFullYear() - 4, now.getMonth(), now.getDate());
      console.log(fourYearsAgo)

      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];

      startDate = formatToLocalDateString(fourYearsAgo);
      endDate = formatToLocalDateString(now);
    }


    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'userAgeBracket' }],
      metrics: [
        { name: 'sessions' },
        { name: 'addToCarts' },
        { name: 'checkouts' },
        { name: 'ecommercePurchases' },
      ],
      orderBys: [
        {
          desc: false,
          dimension: { dimensionName: 'userAgeBracket' },
        },
      ],
      limit: limit
    };

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const rows = response?.data?.rows;
    if (!rows || rows.length === 0) {
      console.warn("No data found in the response.");
      return res.status(200).json({
        reportType: 'Age based data',
        data: [],
      });
    }
    // Parse the data from the response
    const data = rows.map((row) => {
      const Age = row.dimensionValues[0]?.value;
      return {
        Age: Age,
        Sessions: row.metricValues[0]?.value || 0,
        "Add To Cart": row.metricValues[1]?.value || 0,
        "Add To Cart Rate": `${((row.metricValues[1]?.value / row.metricValues[0]?.value) * 100).toFixed(2)} %` || 0,
        Checkouts: row.metricValues[2]?.value || 0,
        "Checkout Rate": `${((row.metricValues[2]?.value / row.metricValues[0]?.value) * 100).toFixed(2)} %` || 0,
        Purchases: row.metricValues[3]?.value || 0,
        "Purchase Rate": `${((row.metricValues[3]?.value / row.metricValues[0]?.value) * 100).toFixed(2)} %` || 0,
      };
    });

    // Send the data as response
    res.status(200).json({
      reportType: 'Agebased Data',
      data,
    });
  } catch (error) {
    console.error('Error fetching Age data:', error);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }
    res.status(500).json({ error: 'Failed to fetch Age data.' });
  }
}

export async function getGenderMetrics(req, res) {
  try {
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;
    let { startDate, endDate, userId, limit } = req.body;

    if (!startDate || !endDate) {
      const now = new Date();
      const fourYearsAgo = new Date(now.getFullYear() - 4, now.getMonth(), now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      startDate = formatToLocalDateString(fourYearsAgo);
      endDate = formatToLocalDateString(now);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'userGender' }],
      metrics: [
        { name: 'sessions' },
        { name: 'addToCarts' },
        { name: 'checkouts' },
        { name: 'ecommercePurchases' },
      ],
      orderBys: [
        {
          desc: false,
          dimension: { dimensionName: 'userGender' },
        },
      ],
      limit: limit,
    };

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const rows = response?.data?.rows;
    if (!rows || rows.length === 0) {
      console.warn('No data found in the response.');
      return res.status(200).json({
        reportType: 'Gender Based Data',
        data: [],
      });
    }

    const data = rows.map((row) => {
      const Gender = row.dimensionValues[0]?.value;
      return {
        Gender: Gender,
        Sessions: row.metricValues[0]?.value || 0,
        'Add To Cart': row.metricValues[1]?.value || 0,
        'Add To Cart Rate': `${((row.metricValues[1]?.value / row.metricValues[0]?.value) * 100).toFixed(2)} %` || 0,
        Checkouts: row.metricValues[2]?.value || 0,
        'Checkout Rate': `${((row.metricValues[2]?.value / row.metricValues[0]?.value) * 100).toFixed(2)} %` || 0,
        Purchases: row.metricValues[3]?.value || 0,
        'Purchase Rate': `${((row.metricValues[3]?.value / row.metricValues[0]?.value) * 100).toFixed(2)} %` || 0,
      };
    });

    res.status(200).json({
      reportType: 'Gender Based Data',
      data,
    });
  } catch (error) {
    console.error('Error fetching Gender data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Gender data.' });
  }
}


export async function getCityWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'city' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' },
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    )

    const Rows = response?.data?.rows || [];
    // Group data by region and month
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const city = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      if (!acc[city]) {
        acc[city] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[city].MonthlyData[yearMonth]) {
        acc[city].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[city].MonthlyData[yearMonth].Sessions += sessions;
      acc[city].MonthlyData[yearMonth].Purchases += purchases;
      acc[city].TotalSessions += sessions;
      acc[city].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[city].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});

    // Convert grouped data to array format
    let data = Object.entries(groupedData).map(([city, cityData]) => ({
      City: city,
      "Total Sessions": cityData.TotalSessions,
      "Total Purchases": cityData.TotalPurchases,
      "Avg Conv. Rate": cityData.TotalSessions > 0 ? (cityData.TotalPurchases / cityData.TotalSessions) * 100 : 0.00,
      MonthlyData: Object.values(cityData.MonthlyData)
    }))


    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);
    
    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }
    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;


    res.status(200).json({
      reportType: `Monthly Data for All Cities Sorted by Month`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });
  } catch (error) {
    console.error('Error fetching City-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch City-Based Monthly Data.' });
  }
}

export async function getRegionWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }
    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'region' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };



    // Make both API calls concurrently
    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    )

    const Rows = response?.data?.rows || [];

    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const region = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);  // Get purchases if they exist, otherwise 0

      // Initialize region if it doesn't exist
      if (!acc[region]) {
        acc[region] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[region].MonthlyData[yearMonth]) {
        acc[region].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[region].MonthlyData[yearMonth].Sessions += sessions;
      acc[region].MonthlyData[yearMonth].Purchases += purchases;
      acc[region].TotalSessions += sessions;
      acc[region].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[region].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});

    // Convert grouped data to array format
    let data = Object.entries(groupedData).map(([region, regionData]) => ({
      Region: region,
      "Total Sessions": regionData.TotalSessions,
      "Total Purchases": regionData.TotalPurchases,
      "Avg Conv. Rate": regionData.TotalSessions > 0 ? (regionData.TotalPurchases / regionData.TotalSessions) * 100 : 0.00,
      MonthlyData: Object.values(regionData.MonthlyData)
    }))


    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);

    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All Regions Sorted by Conversions`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });

  } catch (error) {
    console.error('Error fetching Regions-Based Monthly Data:', error);
    console.error('Detailed error:', error.response?.data || error.message);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Regions-Based Monthly Data.' });
  }
}

export async function getPageWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [user, brand] = await Promise.all([
      User.findById(userId).lean(),
      Brand.findById(brandId).lean(),
    ])
    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'landingPage' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };



    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    )

    const Rows = response?.data?.rows || [];


    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const landingPage = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);  // Get purchases if they exist, otherwise 0

      // Initialize region if it doesn't exist
      if (!acc[landingPage]) {
        acc[landingPage] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[landingPage].MonthlyData[yearMonth]) {
        acc[landingPage].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[landingPage].MonthlyData[yearMonth].Sessions += sessions;
      acc[landingPage].MonthlyData[yearMonth].Purchases += purchases;
      acc[landingPage].TotalSessions += sessions;
      acc[landingPage].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[landingPage].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;


      return acc;
    }, {});

    let data = Object.entries(groupedData).map(([LandingPage, LandingPageData]) => ({
      "Landing Page": LandingPage,
      "Total Sessions": LandingPageData.TotalSessions,
      "Total Purchases": LandingPageData.TotalPurchases,
      "Avg Conv. Rate": LandingPageData.TotalSessions > 0 ? (LandingPageData.TotalPurchases / LandingPageData.TotalSessions) * 100 : 0.00,
      MonthlyData: Object.values(LandingPageData.MonthlyData)
    }))


    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);

    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All Landing Page Sorted by Conversions`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });

  } catch (error) {
    console.error('Error fetching Landing Pages-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Landing Pages-Based Monthly Data.' });
  }
}

export async function getDeviceTypeWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;
    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);
    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'deviceCategory' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };



    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const DeviceType = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[DeviceType]) {
        acc[DeviceType] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[DeviceType].MonthlyData[yearMonth]) {
        acc[DeviceType].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[DeviceType].MonthlyData[yearMonth].Sessions += sessions;
      acc[DeviceType].MonthlyData[yearMonth].Purchases += purchases;
      acc[DeviceType].TotalSessions += sessions;
      acc[DeviceType].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[DeviceType].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});

    // Convert grouped data to an array format
    let data = Object.entries(groupedData).map(([deviceType, deviceData]) => ({
      "Device": deviceType,
      "Total Sessions": deviceData.TotalSessions,
      "Avg Conv. Rate": deviceData.TotalSessions > 0 ? (deviceData.TotalPurchases / deviceData.TotalSessions) * 100 : 0.00,
      "Total Purchases": deviceData.TotalPurchases,
      MonthlyData: Object.values(deviceData.MonthlyData)
    }))

    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);

    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All Device Types Sorted by Month`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });
  } catch (error) {
    console.error('Error fetching Device Types-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Device Types-Based Monthly Data.' });
  }
}
export async function getChannelWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'firstUserPrimaryChannelGroup' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const Channel = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[Channel]) {
        acc[Channel] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[Channel].MonthlyData[yearMonth]) {
        acc[Channel].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[Channel].MonthlyData[yearMonth].Sessions += sessions;
      acc[Channel].MonthlyData[yearMonth].Purchases += purchases;
      acc[Channel].TotalSessions += sessions;
      acc[Channel].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[Channel].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});

    // Convert grouped data to array format
    let data = Object.entries(groupedData).map(([channel, channelData]) => ({
      Channel: channel,
      "Total Sessions": channelData.TotalSessions,
      "Total Purchases": channelData.TotalPurchases,
      "Avg Conv. Rate": channelData.TotalSessions > 0 ? (channelData.TotalPurchases / channelData.TotalSessions) * 100 : 0.00,
      MonthlyData: Object.values(channelData.MonthlyData)
    }))

    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);

    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All Channels Sorted by Conversions`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });

  } catch (error) {
    console.error('Error fetching Reffering Channels-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Reffering Channels-Based Monthly Data.' });
  }
}

export async function getAgeWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }
    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'userAgeBracket' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const Age = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[Age]) {
        acc[Age] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[Age].MonthlyData[yearMonth]) {
        acc[Age].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[Age].MonthlyData[yearMonth].Sessions += sessions;
      acc[Age].MonthlyData[yearMonth].Purchases += purchases;
      acc[Age].TotalSessions += sessions;
      acc[Age].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[Age].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});

    // Convert grouped data to array format
    let data = Object.entries(groupedData).map(([Age, AgeData]) => ({
      Age: Age,
      "Total Sessions": AgeData.TotalSessions,
      "Total Purchases": AgeData.TotalPurchases,
      "Avg Conv. Rate": AgeData.TotalSessions > 0 ? (AgeData.TotalPurchases / AgeData.TotalSessions) * 100 : 0.00,
      MonthlyData: Object.values(AgeData.MonthlyData)
    }))

    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);
    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All Ages Sorted by Conversions`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });

  } catch (error) {
    console.error('Error fetching Age-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Age-Based Monthly Data.' });
  }
}

export async function getGenderWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'userGender' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const Gender = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[Gender]) {
        acc[Gender] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[Gender].MonthlyData[yearMonth]) {
        acc[Gender].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[Gender].MonthlyData[yearMonth].Sessions += sessions;
      acc[Gender].MonthlyData[yearMonth].Purchases += purchases;
      acc[Gender].TotalSessions += sessions;
      acc[Gender].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[Gender].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});

    // Convert grouped data to array format
    let data = Object.entries(groupedData).map(([Gender, GenderData]) => ({
      Gender: Gender,
      "Total Sessions": GenderData.TotalSessions,
      "Total Purchases": GenderData.TotalPurchases,
      "Avg Conv. Rate": GenderData.TotalSessions > 0 ? (GenderData.TotalPurchases / GenderData.TotalSessions) * 100 : 0.00,
      MonthlyData: Object.values(GenderData.MonthlyData)
    }))

    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    let limitedData = data.slice(0, 500);
    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    res.status(200).json({
      reportType: `Monthly Data for All Genders Sorted by Conversions`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });

  } catch (error) {
    console.error('Error fetching Gender-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Gender-Based Monthly Data.' });
  }
}

export async function getInterestWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'brandingInterest' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const Interest = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[Interest]) {
        acc[Interest] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[Interest].MonthlyData[yearMonth]) {
        acc[Interest].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[Interest].MonthlyData[yearMonth].Sessions += sessions;
      acc[Interest].MonthlyData[yearMonth].Purchases += purchases;
      acc[Interest].TotalSessions += sessions;
      acc[Interest].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[Interest].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});

    // Convert grouped data to array format
    let data = Object.entries(groupedData).map(([Interest, InterestData]) => ({
      Interest: Interest,
      "Total Sessions": InterestData.TotalSessions,
      "Total Purchases": InterestData.TotalPurchases,
      "Avg Conv. Rate": InterestData.TotalSessions > 0 ? (InterestData.TotalPurchases / InterestData.TotalSessions) * 100 : 0.00,
      MonthlyData: Object.values(InterestData.MonthlyData)
    }))

  
    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);

    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All Interest Sorted by Conversions`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });

  } catch (error) {
    console.error('Error fetching Interest-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Interest-Based Monthly Data.' });
  }
}

export async function getOperatingSystemWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }
    const propertyId = brand.ga4Account?.PropertyID;
    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'operatingSystem' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const OperatingSystem = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[OperatingSystem]) {
        acc[OperatingSystem] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[OperatingSystem].MonthlyData[yearMonth]) {
        acc[OperatingSystem].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[OperatingSystem].MonthlyData[yearMonth].Sessions += sessions;
      acc[OperatingSystem].MonthlyData[yearMonth].Purchases += purchases;
      acc[OperatingSystem].TotalSessions += sessions;
      acc[OperatingSystem].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[OperatingSystem].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});


    // Convert grouped data to an array format
    let data = Object.entries(groupedData).map(([operatingSystemName, operatingSystemData]) => ({
      "Operating System": operatingSystemName,
      "Total Sessions": operatingSystemData.TotalSessions,
      "Total Purchases": operatingSystemData.TotalPurchases,
      "Avg Conv. Rate": operatingSystemData.TotalSessions > 0 ? (operatingSystemData.TotalPurchases / operatingSystemData.TotalSessions) * 100 : 0.00,
      "MonthlyData": Object.values(operatingSystemData.MonthlyData),
    }))

    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);
    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All Operating Systems Sorted by Month`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });
  } catch (error) {
    console.error('Error fetching Operating Systems-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Operating Systems-Based Monthly Data.' });
  }
}

export async function getCampaignWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;
    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'firstUserCampaignName' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const Campaign = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[Campaign]) {
        acc[Campaign] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[Campaign].MonthlyData[yearMonth]) {
        acc[Campaign].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[Campaign].MonthlyData[yearMonth].Sessions += sessions;
      acc[Campaign].MonthlyData[yearMonth].Purchases += purchases;
      acc[Campaign].TotalSessions += sessions;
      acc[Campaign].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[Campaign].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});


    // Convert grouped data to an array format
    let data = Object.entries(groupedData).map(([campaignName, campaignData]) => ({
      "Campaign": campaignName,
      "Total Sessions": campaignData.TotalSessions,
      "Total Purchases": campaignData.TotalPurchases,
      "Avg Conv. Rate": campaignData.TotalSessions > 0 ? (campaignData.TotalPurchases / campaignData.TotalSessions) * 100 : 0.00,
      "MonthlyData": Object.values(campaignData.MonthlyData),
    }))

    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);
    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All Campaigns Sorted by Month`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });
  } catch (error) {
    console.error('Error fetching Campaigns-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Campaigns-Based Monthly Data.' });
  }
}

export async function getBrowserWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'browser' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const Browser = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[Browser]) {
        acc[Browser] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[Browser].MonthlyData[yearMonth]) {
        acc[Browser].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[Browser].MonthlyData[yearMonth].Sessions += sessions;
      acc[Browser].MonthlyData[yearMonth].Purchases += purchases;
      acc[Browser].TotalSessions += sessions;
      acc[Browser].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[Browser].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});


    // Convert grouped data to an array format
    let data = Object.entries(groupedData).map(([browser, browserData]) => ({
      "Browser": browser,
      "Total Sessions": browserData.TotalSessions,
      "Total Purchases": browserData.TotalPurchases,
      "Avg Conv. Rate": browserData.TotalSessions > 0 ? (browserData.TotalPurchases / browserData.TotalSessions) * 100 : 0.00,
      "MonthlyData": Object.values(browserData.MonthlyData),
    }))

    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);
    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All Browser Sorted by Month`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });
  } catch (error) {
    console.error('Error fetching Browser-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Browser-Based Monthly Data.' });
  }
}

export async function getSourceWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'firstUserSource' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const Source = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[Source]) {
        acc[Source] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[Source].MonthlyData[yearMonth]) {
        acc[Source].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[Source].MonthlyData[yearMonth].Sessions += sessions;
      acc[Source].MonthlyData[yearMonth].Purchases += purchases;
      acc[Source].TotalSessions += sessions;
      acc[Source].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[Source].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});


    // Convert grouped data to an array format
    let data = Object.entries(groupedData).map(([source, sourceData]) => ({
      "Source": source,
      "Total Sessions": sourceData.TotalSessions,
      "Total Purchases": sourceData.TotalPurchases,
      "Avg Conv. Rate": sourceData.TotalSessions > 0 ? (sourceData.TotalPurchases / sourceData.TotalSessions) * 100 : 0.00,
      "MonthlyData": Object.values(sourceData.MonthlyData),
    }))

    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);
    let limitedData = data.slice(0, 500);
    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }
    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;


    res.status(200).json({
      reportType: `Monthly Data for All Source Sorted by Month`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });
  } catch (error) {
    console.error('Error fetching Source-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Source-Based Monthly Data.' });
  }
}

export async function getPagePathWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, sessionsFilter, convRateFilter } = req.body;

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);


    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'pagePath' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };


    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];


    // Process data starting with sessions
    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const PagePath = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      // Initialize region if it doesn't exist
      if (!acc[PagePath]) {
        acc[PagePath] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[PagePath].MonthlyData[yearMonth]) {
        acc[PagePath].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[PagePath].MonthlyData[yearMonth].Sessions += sessions;
      acc[PagePath].MonthlyData[yearMonth].Purchases += purchases;
      acc[PagePath].TotalSessions += sessions;
      acc[PagePath].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[PagePath].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;


      return acc;
    }, {});


    // Convert grouped data to an array format
    let data = Object.entries(groupedData).map(([pagePath, pagePathData]) => ({
      "Page Path": pagePath,
      "Total Sessions": pagePathData.TotalSessions,
      "Total Purchases": pagePathData.TotalPurchases,
      "Avg Conv. Rate": pagePathData.TotalSessions > 0 ? (pagePathData.TotalPurchases / pagePathData.TotalSessions) * 100 : 0.00,
      "MonthlyData": Object.values(pagePathData.MonthlyData),
    }))

    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"])

    let limitedData = data.slice(0, 500);
    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }
    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;


    res.status(200).json({
      reportType: `Monthly Data for All Pagepath Sorted by Month`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });
  } catch (error) {
    console.error('Error fetching Pagepath-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Pagepath-Based Monthly Data.' });
  }
}

export async function getPageTitleWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const {
      startDate,
      endDate,
      userId,
      sessionsFilter,
      convRateFilter
    } = req.body;

    // Validate filter formats if provided
    if (sessionsFilter && (!sessionsFilter.value || !sessionsFilter.operator)) {
      return res.status(400).json({
        success: false,
        message: 'Sessions filter must include both value and operator'
      });
    }

    if (convRateFilter && (!convRateFilter.value || !convRateFilter.operator)) {
      return res.status(400).json({
        success: false,
        message: 'Conversion rate filter must include both value and operator'
      });
    }

    const [brand, user] = await Promise.all([
      Brand.findById(brandId).lean(),
      User.findById(userId).lean(),
    ]);

    if (!brand || !user) {
      return res.status(404).json({
        success: false,
        message: !brand ? 'Brand not found.' : 'User not found.'
      });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    const { adjustedStartDate, adjustedEndDate } = getAdjustedDates(startDate, endDate);

    const refreshToken = user.googleRefreshToken;
    if (!refreshToken) {
      console.warn(`No refresh token found for User ID: ${userId}`);
      return res.status(200).json([]);
    }

    const accessToken = await getGoogleAccessToken(refreshToken);

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'pageTitle' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases' }
      ]
    };

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

    const Rows = response?.data?.rows || [];

    const groupedData = Rows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const PageTitle = row.dimensionValues[1]?.value;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = parseInt(row.metricValues[1]?.value || 0, 10);

      if (!acc[PageTitle]) {
        acc[PageTitle] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
        };
      }

      if (!acc[PageTitle].MonthlyData[yearMonth]) {
        acc[PageTitle].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      acc[PageTitle].MonthlyData[yearMonth].Sessions += sessions;
      acc[PageTitle].MonthlyData[yearMonth].Purchases += purchases;
      acc[PageTitle].TotalSessions += sessions;
      acc[PageTitle].TotalPurchases += purchases;

      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[PageTitle].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      return acc;
    }, {});

    let data = Object.entries(groupedData)
      .map(([pageTitle, pageTitleData]) => ({
        "Page Title": pageTitle,
        "Total Sessions": pageTitleData.TotalSessions,
        "Total Purchases": pageTitleData.TotalPurchases,
        "Avg Conv. Rate": pageTitleData.TotalSessions > 0 ? (pageTitleData.TotalPurchases / pageTitleData.TotalSessions) * 100 : 0.00,
        "MonthlyData": Object.values(pageTitleData.MonthlyData),
      }));


    data = data.sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    let limitedData = data.slice(0, 500);

    if (sessionsFilter || convRateFilter) {
      limitedData = limitedData.filter(item => {
        const sessionCondition = sessionsFilter
          ? compareValues(item["Total Sessions"], sessionsFilter.value, sessionsFilter.operator)
          : true;

        const convRateCondition = convRateFilter
          ? compareValues(item["Avg Conv. Rate"], convRateFilter.value, convRateFilter.operator)
          : true;

        return sessionCondition && convRateCondition;
      });
    }

    const activeFilters = {};
    if (sessionsFilter) activeFilters.sessions = sessionsFilter;
    if (convRateFilter) activeFilters.conversionRate = convRateFilter;

    res.status(200).json({
      reportType: `Monthly Data for All PageTitle Sorted by Month`,
      activeFilters: Object.keys(activeFilters).length > 0 ? activeFilters : 'none',
      data: limitedData,
    });
  } catch (error) {
    console.error('Error fetching PageTitle-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Pagetitle-Based Monthly Data.' });
  }
}

function getAdjustedDates(startDate, endDate) {
  if (startDate && endDate) {
    return { adjustedStartDate: startDate, adjustedEndDate: endDate };
  }

  const now = new Date();
  const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
  now.setHours(23, 59, 59, 999);

  return {
    adjustedStartDate: LastSixMonths.toISOString().split('T')[0],
    adjustedEndDate: now.toISOString().split('T')[0]
  };
}