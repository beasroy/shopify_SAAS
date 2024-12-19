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

    let { startDate, endDate, userId,limit } = req.body;

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

export async function getLocationMetrics(req,res){
  try {
    const { brandId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const propertyId = brand.ga4Account?.PropertyID;
    let { startDate, endDate, userId, filters, limit} = req.body;

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
    const data=  rows.map(row => {
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
    let { startDate, endDate, userId, limit} = req.body;

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




