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


export async function getRegionWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, limit } = req.body;

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
      dimensions: [{ name: 'region' }, { name: 'yearMonth' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'sessionKeyEventRate' },
      ],
      orderBys: [
        {
          desc: true,
          dimension: { dimensionName: 'yearMonth' },
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
      console.warn('No data found in the response.');
      return res.status(200).json({
        reportType: `Monthly Data for All Regions`,
        data: [],
      });
    }

    const groupedData = rows.reduce((acc, row) => {
      const Region = row.dimensionValues[0]?.value;
      const YearMonth = row.dimensionValues[1]?.value; // Format: YYYYMM
      const Sessions = parseInt(row.metricValues[1]?.value || 0, 10); // Ensure Sessions are parsed as integers
      const Visitors = parseInt(row.metricValues[0]?.value || 0, 10);
      const ConversionRate = parseFloat(row.metricValues[2]?.value || 0);

      if (!acc[Region]) {
        acc[Region] = {
          MonthlyData: [],
          TotalSessions: 0,
          TotalConversionRate: 0,
          DataPoints: 0,
        };
      }

      acc[Region].MonthlyData.push({
        "Month": YearMonth,
        "Visitors": Visitors,
        "Sessions": Sessions,
        "Conv. Rate": ConversionRate,
      });

      acc[Region].TotalSessions += Sessions;
      acc[Region].TotalConversionRate += ConversionRate;
      acc[Region].DataPoints += 1;

      return acc;
    }, {});

    // Convert grouped data to an array format and calculate the average conversion rate
    const data = Object.entries(groupedData).map(([Region, RegionData]) => ({
      "Region": Region,
      "Total Sessions": RegionData.TotalSessions,
      "Avg Conv. Rate": RegionData.DataPoints
        ? RegionData.TotalConversionRate / RegionData.DataPoints // Calculate the average conversion rate
        : 0,
      "MonthlyData": RegionData.MonthlyData,
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);;


    res.status(200).json({
      reportType: `Monthly Data for All Regions Sorted by Conversions`,
      data,
    });
  } catch (error) {
    console.error('Error fetching Regions-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Regions-Based Monthly Data.' });
  }
}

export async function getChannelWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, limit } = req.body;

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
      dimensions: [{ name: 'source' }, { name: 'yearMonth' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'sessionKeyEventRate' },
      ],
      orderBys: [
        {
          desc: true,
          dimension: { dimensionName: 'yearMonth' },
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
      console.warn('No data found in the response.');
      return res.status(200).json({
        reportType: `Monthly Data for All Channels`,
        data: [],
      });
    }

    // Group data by region and month
   const groupedData = rows.reduce((acc, row) => {
      const Channel = row.dimensionValues[0]?.value;
      const YearMonth = row.dimensionValues[1]?.value; // Format: YYYYMM
      const Sessions = parseInt(row.metricValues[1]?.value || 0, 10); // Ensure Sessions are parsed as integers
      const Visitors = parseInt(row.metricValues[0]?.value || 0, 10);
      const ConversionRate = parseFloat(row.metricValues[2]?.value || 0);

      if (!acc[Channel]) {
        acc[Channel] = {
          MonthlyData: [],
          TotalSessions: 0,
          TotalConversionRate: 0,
          DataPoints: 0,
        };
      }

      acc[Channel].MonthlyData.push({
        "Month": YearMonth,
        "Visitors": Visitors,
        "Sessions": Sessions,
        "Conv. Rate": ConversionRate,
      });

      acc[Channel].TotalSessions += Sessions;
      acc[Channel].TotalConversionRate += ConversionRate;
      acc[Channel].DataPoints += 1;

      return acc;
    }, {});

    // Convert grouped data to an array format and calculate the average conversion rate
    const data = Object.entries(groupedData).map(([Channel, channelData]) => ({
      "Channel": Channel,
      "Total Sessions": channelData.TotalSessions,
      "Avg Conv. Rate": channelData.DataPoints
        ? channelData.TotalConversionRate / channelData.DataPoints // Calculate the average conversion rate
        : 0,
      "MonthlyData": channelData.MonthlyData,
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);;


    res.status(200).json({
      reportType: `Monthly Data for All Reffering Channels Sorted by Month`,
      data,
    });
  } catch (error) {
    console.error('Error fetching Reffering Channels-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Reffering Channels-Based Monthly Data.' });
  }
}

export async function getPageWiseConversions(req, res) {
  try {
    const { brandId } = req.params;
    const { startDate, endDate, userId, limit } = req.body;

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
      dimensions: [{ name: 'landingPage' }, { name: 'yearMonth' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'sessionKeyEventRate' },
      ],
      orderBys: [
        {
          desc: true,
          dimension: { dimensionName: 'yearMonth' },
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
      console.warn('No data found in the response.');
      return res.status(200).json({
        reportType: `Monthly Data for All Landing Pages`,
        data: [],
      });
    }

    // Group data by region and month
    const groupedData = rows.reduce((acc, row) => {
      const LandingPage = row.dimensionValues[0]?.value;
      const YearMonth = row.dimensionValues[1]?.value; // Format: YYYYMM
      const Sessions = parseInt(row.metricValues[1]?.value || 0, 10); // Ensure Sessions are parsed as integers
      const Visitors = parseInt(row.metricValues[0]?.value || 0, 10);
      const ConversionRate = parseFloat(row.metricValues[2]?.value || 0);

      if (!acc[LandingPage]) {
        acc[LandingPage] = {
          MonthlyData: [],
          TotalSessions: 0,
          TotalConversionRate: 0,
          DataPoints: 0,
        };
      }

      acc[LandingPage].MonthlyData.push({
        "Month": YearMonth,
        "Visitors": Visitors,
        "Sessions": Sessions,
        "Conv. Rate": ConversionRate,
      });

      acc[LandingPage].TotalSessions += Sessions;
      acc[LandingPage].TotalConversionRate += ConversionRate;
      acc[LandingPage].DataPoints += 1;

      return acc;
    }, {});

    // Convert grouped data to an array format and calculate the average conversion rate
    const data = Object.entries(groupedData).map(([LandingPage, pageData]) => ({
      "Landing Page": LandingPage,
      "Total Sessions": pageData.TotalSessions,
      "Avg Conv. Rate": pageData.DataPoints
        ? pageData.TotalConversionRate / pageData.DataPoints // Calculate the average conversion rate
        : 0,
      "MonthlyData": pageData.MonthlyData,
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);;


    res.status(200).json({
      reportType: `Monthly Data for All Landing Pages Sorted by Month`,
      data,
    });
  } catch (error) {
    console.error('Error fetching Landing Pages-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Landing Pages-Based Monthly Data.' });
  }
}
// all these apis are fixed
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

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [{ name: 'itemCategory' }, { name: 'yearMonth' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'sessionKeyEventRate' },
      ],
      orderBys: [
        {
          desc: true,
          dimension: { dimensionName: 'yearMonth' },
        },
      ],
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
        reportType: `Monthly Data for All Product Types`,
        data: [],
      });
    }

    // Group data by product type and calculate totals
    const groupedData = rows.reduce((acc, row) => {
      const ProductType = row.dimensionValues[0]?.value || "Unknow Product Type";
      const YearMonth = row.dimensionValues[1]?.value; // Format: YYYYMM
      const Sessions = parseInt(row.metricValues[1]?.value || 0, 10); // Ensure Sessions are parsed as integers
      const Visitors = parseInt(row.metricValues[0]?.value || 0, 10);
      const ConversionRate = parseFloat(row.metricValues[2]?.value || 0);

      if (!acc[ProductType]) {
        acc[ProductType] = {
          MonthlyData: [],
          TotalSessions: 0,
          TotalConversionRate: 0,
          DataPoints: 0,
        };
      }

      acc[ProductType].MonthlyData.push({
        "Month": YearMonth,
        "Visitors": Visitors,
        "Sessions": Sessions,
        "Conv. Rate": ConversionRate,
      });

      acc[ProductType].TotalSessions += Sessions;
      acc[ProductType].TotalConversionRate += ConversionRate;
      acc[ProductType].DataPoints += 1;

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
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);;

    res.status(200).json({
      reportType: `Monthly Data for All Product Types Sorted by Month`,
      data,
    });
  } catch (error) {
    console.error('Error fetching Landing Product Types-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Product Types-Based Monthly Data.' });
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
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5,  now.getDate());
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
      dimensions: [{ name: 'deviceCategory' }, { name: 'yearMonth' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'sessionKeyEventRate' },
      ],
      orderBys: [
        {
          desc: true,
          dimension: { dimensionName: 'yearMonth' },
        },
      ],
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
        reportType: `Monthly Data for All Device Types`,
        data: [],
      });
    }

    // Group data by device type and calculate totals
    const groupedData = rows.reduce((acc, row) => {
      const DeviceType = row.dimensionValues[0]?.value || "Unknown Device Type";
      const YearMonth = row.dimensionValues[1]?.value || "Unknown Date";
      const TotalSessions = parseInt(row.metricValues[1]?.value || 0, 10);
      const Visitors = parseInt(row.metricValues[0]?.value || 0, 10);
      const ConversionRate = parseFloat(row.metricValues[2]?.value || 0);

      if (!acc[DeviceType]) {
        acc[DeviceType] = {
          MonthlyData: [],
          TotalSessions: 0,
          TotalConversionRate: 0,
          DataPoints: 0, 
        };
      }
      acc[DeviceType].MonthlyData.push({
        "Month": YearMonth,
        "Visitors": Visitors,
        "Sessions": TotalSessions,
        "Conv. Rate": ConversionRate,
      });

      // Aggregate total sessions and conversion rates
      acc[DeviceType].TotalSessions += TotalSessions;
      acc[DeviceType].TotalConversionRate += ConversionRate;
      acc[DeviceType].DataPoints += 1;

      return acc;
    }, {});

    // Convert grouped data to an array format
    const data = Object.entries(groupedData).map(([deviceType, deviceData]) => ({
      "Device": deviceType,
      "Total Sessions": deviceData.TotalSessions,
      "Avg Conv. Rate": deviceData.TotalConversionRate / deviceData.DataPoints || 0,
      "MonthlyData": deviceData.MonthlyData,
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);;

    res.status(200).json({
      reportType: `Monthly Data for All Device Types Sorted by Month`,
      data,
    });
  } catch (error) {
    console.error('Error fetching Device Types-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Device Types-Based Monthly Data.' });
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

    const requestBody = {
      dateRanges: [{ startDate: adjustedStartDate, endDate: adjustedEndDate }],
      dimensions: [{ name: 'campaignName' }, { name: 'yearMonth' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'sessionKeyEventRate' },
      ],
      orderBys: [
        {
          desc: true,
          dimension: { dimensionName: 'yearMonth' },
        },
      ],
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
        reportType: `Monthly Data for All Campaigns`,
        data: [],
      });
    }

    // Group data by region and month
    const groupedData = rows.reduce((acc, row) => {
      const CampaignName = row.dimensionValues[0]?.value || "Unknown Campaign"; 
      const YearMonth = row.dimensionValues[1]?.value || "Unknown Date"; 
      const TotalSessions = parseInt(row.metricValues[1]?.value || 0, 10);
      const Visitors = parseInt(row.metricValues[0]?.value || 0, 10);
      const ConversionRate = parseFloat(row.metricValues[2]?.value || 0);

      if (!acc[CampaignName]) {
        acc[CampaignName] = {
          MonthlyData: [],
          TotalSessions: 0,
          TotalConversionRate: 0,
          DataPoints: 0, // To calculate average conversion rate
        };
      }

      // Add the current month's data to the campaign's MonthlyData array
      acc[CampaignName].MonthlyData.push({
        "Month": YearMonth,
        "Visitors": Visitors,
        "Sessions": TotalSessions,
        "Conv. Rate": ConversionRate,
      })

      // Aggregate total sessions and conversion rates
      acc[CampaignName].TotalSessions += TotalSessions;
      acc[CampaignName].TotalConversionRate += ConversionRate;
      acc[CampaignName].DataPoints += 1;

      return acc;
    }, {});


    // Convert grouped data to an array format
    const data = Object.entries(groupedData).map(([campaignName, campaignData]) => ({
      "Campaign": campaignName,
      "Total Sessions": campaignData.TotalSessions,
      "Avg Conv. Rate": campaignData.TotalConversionRate / campaignData.DataPoints || 0,
      "MonthlyData": campaignData.MonthlyData,
    })).sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);


    res.status(200).json({
      reportType: `Monthly Data for All Campaigns Sorted by Month`,
      data,
    });
  } catch (error) {
    console.error('Error fetching Campaigns-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch Campaigns-Based Monthly Data.' });
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
      dimensions: [{ name: 'city' }, { name: 'yearMonth' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'sessionKeyEventRate' },
      ],
      orderBys: [
        {
          desc: true, // Sort in descending order
          metric: { metricName: 'sessions' }, // Sort by sessions
        },
      ],
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
        reportType: `Monthly Data for All Cities`,
        data: [],
      });
    }

    // Group data by region and month
    const groupedData = rows.reduce((acc, row) => {
      const City = row.dimensionValues[0]?.value || "Unknown City";
      const YearMonth = row.dimensionValues[1]?.value; // Format: YYYYMM
      const TotalSessions = parseInt(row.metricValues[1]?.value || 0, 10);
      const Visitors = parseInt(row.metricValues[0]?.value || 0, 10);
      const ConversionRate = parseFloat(row.metricValues[2]?.value || 0);

      if (!acc[City]) {
        acc[City] = {
          MonthlyData: [],
          TotalSessions: 0,
          TotalConversionRate: 0,
          DataPoints: 0, // To calculate average conversion rate
        };
      }

      // Add the current month's data to the city's MonthlyData array
      acc[City].MonthlyData.push({
        "Month": YearMonth,
        "Visitors": Visitors,
        "Sessions": TotalSessions,
        "Conv. Rate": ConversionRate,
      });

      // Aggregate total sessions and conversion rates
      acc[City].TotalSessions += TotalSessions;
      acc[City].TotalConversionRate += ConversionRate;
      acc[City].DataPoints += 1;

      return acc;
    }, {});

    // Convert grouped data to an array format and calculate average conversion rate
    const data = Object.entries(groupedData)
      .map(([city, cityData]) => ({
        "City": city,
        "Total Sessions": cityData.TotalSessions,
        "Avg Conv. Rate": cityData.TotalConversionRate / cityData.DataPoints || 0,
        "MonthlyData": cityData.MonthlyData,
      }))
      .sort((a, b) => b["Total Sessions"] - a["Total Sessions"]);


    res.status(200).json({
      reportType: `Monthly Data for All City Sorted by Month`,
      data,
    });
  } catch (error) {
    console.error('Error fetching City-Based Monthly Data:', error);

    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Access to Google Analytics API is forbidden. Check your credentials or permissions.' });
    }

    res.status(500).json({ error: 'Failed to fetch City-Based Monthly Data.' });
  }
}