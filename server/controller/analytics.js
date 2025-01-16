import { config } from "dotenv";
import Brand from "../models/Brands.js";
import User from "../models/User.js";
import moment from "moment";
import axios from 'axios'
import { OAuth2Client } from 'google-auth-library';
config();

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
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(LastSixMonths);
      adjustedEndDate = formatToLocalDateString(now);
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
          TotalConversionRate: 0.00,
          DataPoints: 0,
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

      // Update total conversion rate
      acc[city].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[city].DataPoints = Object.keys(acc[city].MonthlyData).length;

      return acc;
    }, {});

    // Convert grouped data to array format
    const data = Object.entries(groupedData).map(([city, cityData]) => ({
      City: city,
      "Total Sessions": cityData.TotalSessions,
      "Total Purchases": cityData.TotalPurchases,
      "Data Points": cityData.DataPoints,  // Now showing the number of months
      "Avg Conv. Rate": cityData.DataPoints > 0 ? (cityData.TotalConversionRate / cityData.DataPoints) : 0,
      MonthlyData: Object.values(cityData.MonthlyData)
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Cities Sorted by Month`,
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
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(LastSixMonths);
      adjustedEndDate = formatToLocalDateString(now);
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

    // First API call: Get total sessions
    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'region' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases'}
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
          TotalConversionRate: 0.00,
          DataPoints: 0,
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

      // Update total conversion rate
      acc[region].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[region].DataPoints = Object.keys(acc[region].MonthlyData).length;

      return acc;
    }, {});

    // Convert grouped data to array format
    const data = Object.entries(groupedData).map(([region, regionData]) => ({
      Region: region,
      "Total Sessions": regionData.TotalSessions,
      "Total Purchases": regionData.TotalPurchases,
      "Data Points": regionData.DataPoints,
      "Avg Conv. Rate": (regionData.TotalConversionRate / regionData.DataPoints),
      MonthlyData: Object.values(regionData.MonthlyData)
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Regions Sorted by Conversions`,
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
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(LastSixMonths);
      adjustedEndDate = formatToLocalDateString(now);
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
          TotalConversionRate: 0.00,
          DataPoints: 0,
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

      // Update total conversion rate
      acc[landingPage].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[landingPage].DataPoints = Object.keys(acc[landingPage].MonthlyData).length;

      return acc;
    }, {});

    // Convert grouped data to array format
    const data = Object.entries(groupedData).map(([LandingPage, LandingPageData]) => ({
      "Landing Page": LandingPage,
      "Total Sessions": LandingPageData.TotalSessions,
      "Total Purchases": LandingPageData.TotalPurchases,
      "Data Points": LandingPageData.DataPoints,  // Now showing the number of months
      "Avg Conv. Rate": ((LandingPageData.TotalConversionRate / LandingPageData.DataPoints)),
      MonthlyData: Object.values(LandingPageData.MonthlyData)
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Landing Page Sorted by Conversions`,
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
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(sixMonthsAgo);
      adjustedEndDate = formatToLocalDateString(now);
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
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'deviceCategory' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases'}
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
          TotalConversionRate: 0.00,
          DataPoints: 0,
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

      // Update total conversion rate
      acc[DeviceType].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[DeviceType].DataPoints = Object.keys(acc[DeviceType].MonthlyData).length;

      return acc;
    }, {});

    // Convert grouped data to an array format
    const data = Object.entries(groupedData).map(([deviceType, deviceData]) => ({
      "Device": deviceType,
      "Total Sessions": deviceData.TotalSessions,
      "Avg Conv. Rate": deviceData.TotalConversionRate / deviceData.DataPoints || 0,
      MonthlyData: Object.values(deviceData.MonthlyData)
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);;

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Device Types Sorted by Month`,
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
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(LastSixMonths);
      adjustedEndDate = formatToLocalDateString(now);
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
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'sessionDefaultChannelGroup' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases'}
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
          TotalConversionRate: 0.00,
          DataPoints: 0,
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

      // Update total conversion rate
      acc[Channel].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[Channel].DataPoints = Object.keys(acc[Channel].MonthlyData).length;

      return acc;
    }, {});

    // Convert grouped data to array format
    const data = Object.entries(groupedData).map(([channel, channelData]) => ({
      Channel: channel,
      "Total Sessions": channelData.TotalSessions,
      "Total Purchases": channelData.TotalPurchases,
      "Data Points": channelData.DataPoints,  // Now showing the number of months
      "Avg Conv. Rate": ((channelData.TotalConversionRate / channelData.DataPoints)),
      MonthlyData: Object.values(channelData.MonthlyData)
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Channels Sorted by Conversions`,
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
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(LastSixMonths);
      adjustedEndDate = formatToLocalDateString(now);
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
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'userAgeBracket' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases'}
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
          TotalConversionRate: 0.00,
          DataPoints: 0,
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

      // Update total conversion rate
      acc[Age].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[Age].DataPoints = Object.keys(acc[Age].MonthlyData).length;

      return acc;
    }, {});

    // Convert grouped data to array format
    const data = Object.entries(groupedData).map(([Age, AgeData]) => ({
       Age: Age,
      "Total Sessions": AgeData.TotalSessions,
      "Total Purchases": AgeData.TotalPurchases,
      "Data Points": AgeData.DataPoints,  // Now showing the number of months
      "Avg Conv. Rate": ((AgeData.TotalConversionRate / AgeData.DataPoints)),
      MonthlyData: Object.values(AgeData.MonthlyData)
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Ages Sorted by Conversions`,
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
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(LastSixMonths);
      adjustedEndDate = formatToLocalDateString(now);
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
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'userGender' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases'}
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
          TotalConversionRate: 0.00,
          DataPoints: 0,
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

      // Update total conversion rate
      acc[Gender].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[Gender].DataPoints = Object.keys(acc[Gender].MonthlyData).length;

      return acc;
    }, {});

    // Convert grouped data to array format
    const data = Object.entries(groupedData).map(([Gender, GenderData]) => ({
       Gender: Gender,
      "Total Sessions": GenderData.TotalSessions,
      "Total Purchases": GenderData.TotalPurchases,
      "Data Points": GenderData.DataPoints,  // Now showing the number of months
      "Avg Conv. Rate": ((GenderData.TotalConversionRate / GenderData.DataPoints)),
      MonthlyData: Object.values(GenderData.MonthlyData)
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Genders Sorted by Conversions`,
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
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(LastSixMonths);
      adjustedEndDate = formatToLocalDateString(now);
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
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'brandingInterest' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'ecommercePurchases'}
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
          TotalConversionRate: 0.00,
          DataPoints: 0,
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

      // Update total conversion rate
      acc[Interest].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[Interest].DataPoints = Object.keys(acc[Interest].MonthlyData).length;

      return acc;
    }, {});

    // Convert grouped data to array format
    const data = Object.entries(groupedData).map(([Interest, InterestData]) => ({
      Interest: Interest,
      "Total Sessions": InterestData.TotalSessions,
      "Total Purchases": InterestData.TotalPurchases,
      "Data Points": InterestData.DataPoints,  // Now showing the number of months
      "Avg Conv. Rate": ((InterestData.TotalConversionRate / InterestData.DataPoints)),
      MonthlyData: Object.values(InterestData.MonthlyData)
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Interest Sorted by Conversions`,
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

export async function getProductTypeWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(LastSixMonths);
      adjustedEndDate = formatToLocalDateString(now);
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

    const sessionsRequestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'itemCategory' }
      ],
      metrics: [
        { name: 'sessions' },
      ]
    };

    // Second API call: Get purchase events
    const purchasesRequestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'itemCategory' }
      ],
      metrics: [
        { name: 'eventCount' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            value: 'purchase',
            matchType: 'EXACT'
          }
        }
      }
    };

    const [sessionResponse, purchaseResponse] = await Promise.all([
      axios.post(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        sessionsRequestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
        axios.post(
          `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
          purchasesRequestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        )
        ])

   const sessionRows = sessionResponse?.data?.rows || [];
   const purchaseRows = purchaseResponse?.data?.rows || [];

   const purchaseData = {};
    purchaseRows.forEach(row => {
      const yearMonth = row.dimensionValues[0]?.value;
      const ProductType = row.dimensionValues[1]?.value;
      const key = `${yearMonth}-${ProductType}`;
      purchaseData[key] = parseInt(row.metricValues[0]?.value || 0, 10);
    });

    // Process data starting with sessions
    const groupedData = sessionRows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const ProductType = row.dimensionValues[1]?.value;
      const key = `${yearMonth}-${ProductType}`;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = purchaseData[key] || 0;  // Get purchases if they exist, otherwise 0

      // Initialize region if it doesn't exist
      if (!acc[ProductType]) {
        acc[ProductType] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
          TotalConversionRate: 0.00,
          DataPoints: 0,
        };
      }

      // Initialize month data if it doesn't exist
      if (!acc[ProductType].MonthlyData[yearMonth]) {
        acc[ProductType].MonthlyData[yearMonth] = {
          Month: yearMonth,
          Sessions: 0,
          Purchases: 0,
          "Conv. Rate": 0.00
        };
      }

      // Update metrics
      acc[ProductType].MonthlyData[yearMonth].Sessions += sessions;
      acc[ProductType].MonthlyData[yearMonth].Purchases += purchases;
      acc[ProductType].TotalSessions += sessions;
      acc[ProductType].TotalPurchases += purchases;

      // Calculate monthly conversion rate
      const monthlyConvRate = sessions > 0 ? (purchases / sessions) * 100 : 0.00;
      acc[ProductType].MonthlyData[yearMonth]["Conv. Rate"] = monthlyConvRate;

      // Update total conversion rate
      acc[ProductType].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[ProductType].DataPoints = Object.keys(acc[ProductType].MonthlyData).length;

      return acc;
    }, {});

    // Convert grouped data to an array format and calculate the average conversion rate
    const data = Object.entries(groupedData).map(([productType, productData]) => ({
      "Product Type": productType,
      "Total Sessions": productData.TotalSessions,
      "Avg Conv. Rate": productData.DataPoints
        ? productData.TotalConversionRate / productData.DataPoints // Calculate the average conversion rate
        : 0,
      "MonthlyData": productData.MonthlyData,
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Product Types Sorted by Month`,
      data: limitedData,
    });
  } catch (error) {
    console.error('Error fetching Landing Product Types-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Product Types-Based Monthly Data.' });
  }
}

export async function getCampaignWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;

    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const LastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
      now.setHours(23, 59, 59, 999);

      const formatToLocalDateString = (date) => date.toISOString().split('T')[0];
      adjustedStartDate = formatToLocalDateString(LastSixMonths);
      adjustedEndDate = formatToLocalDateString(now);
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

    const sessionsRequestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'campaign' }
      ],
      metrics: [
        { name: 'sessions' },
      ]
    };

    // Second API call: Get purchase events
    const purchasesRequestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'campaign' }
      ],
      metrics: [
        { name: 'eventCount' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            value: 'purchase',
            matchType: 'EXACT'
          }
        }
      }
    };


    const [sessionResponse, purchaseResponse] = await Promise.all([
      axios.post(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        sessionsRequestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
        axios.post(
          `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
          purchasesRequestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        )
        ])

   const sessionRows = sessionResponse?.data?.rows || [];
   const purchaseRows = purchaseResponse?.data?.rows || [];

   const purchaseData = {};
    purchaseRows.forEach(row => {
      const yearMonth = row.dimensionValues[0]?.value;
      const Campaign = row.dimensionValues[1]?.value;
      const key = `${yearMonth}-${Campaign}`;
      purchaseData[key] = parseInt(row.metricValues[0]?.value || 0, 10);
    });

    // Process data starting with sessions
    const groupedData = sessionRows.reduce((acc, row) => {
      const yearMonth = row.dimensionValues[0]?.value;
      const Campaign = row.dimensionValues[1]?.value;
      const key = `${yearMonth}-${Campaign}`;
      const sessions = parseInt(row.metricValues[0]?.value || 0, 10);
      const purchases = purchaseData[key] || 0;  // Get purchases if they exist, otherwise 0

      // Initialize region if it doesn't exist
      if (!acc[Campaign]) {
        acc[Campaign] = {
          MonthlyData: {},
          TotalSessions: 0,
          TotalPurchases: 0,
          TotalConversionRate: 0.00,
          DataPoints: 0,
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

      // Update total conversion rate
      acc[Campaign].TotalConversionRate += monthlyConvRate;

      // Update DataPoints
      acc[Campaign].DataPoints = Object.keys(acc[Campaign].MonthlyData).length;

      return acc;
    }, {});


    // Convert grouped data to an array format
    const data = Object.entries(groupedData).map(([campaignName, campaignData]) => ({
      "Campaign": campaignName,
      "Total Sessions": campaignData.TotalSessions,
      "Avg Conv. Rate": campaignData.TotalConversionRate / campaignData.DataPoints || 0,
      "MonthlyData": campaignData.MonthlyData,
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);

    const limitedData = data.slice(0, 500);

    res.status(200).json({
      reportType: `Monthly Data for All Campaigns Sorted by Month`,
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