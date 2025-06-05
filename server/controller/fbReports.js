import Brand from '../models/Brands.js';
import User from "../models/User.js";
import axios from "axios";
import moment from 'moment';
import NodeCache from 'node-cache';

const dataCache = new NodeCache({ stdTTL: 86400 });

function getDateRange(startDate, endDate) {
    return {
        adjustedStartDate: startDate || moment().startOf('month').format('YYYY-MM-DD'),
        adjustedEndDate: endDate || moment().format('YYYY-MM-DD')
    };
}


const calculateBlendedAgeSummary = (accountsData) => {
    // Initialize data structure for blended metrics
    const blendedData = new Map();

    // Aggregate data across all accounts
    accountsData.forEach(account => {
        account.ageData.forEach(ageGroup => {
            if (!blendedData.has(ageGroup.Age)) {
                blendedData.set(ageGroup.Age, {
                    Age: ageGroup.Age,
                    "Total Spend": 0,
                    "Total PCV": 0,
                    MonthlyData: new Map()
                });
            }

            const currentAgeData = blendedData.get(ageGroup.Age);

            // Add to totals
            currentAgeData["Total Spend"] += ageGroup["Total Spend"];
            currentAgeData["Total PCV"] += ageGroup["Total PCV"];

            // Process monthly data
            ageGroup.MonthlyData.forEach(month => {
                const monthKey = month.Month;
                if (!currentAgeData.MonthlyData.has(monthKey)) {
                    currentAgeData.MonthlyData.set(monthKey, {
                        Month: monthKey,
                        "Spend": 0,
                        "Purchase ROAS": 0,
                        "Purchase Conversion Value": 0
                    });
                }

                const currentMonthData = currentAgeData.MonthlyData.get(monthKey);
                currentMonthData["Spend"] += month["Spend"];
                currentMonthData["Purchase Conversion Value"] += month["Purchase Conversion Value"];
            });
        });
    });

    // Transform final data
    const blendedSummary = Array.from(blendedData.values())
        .map(age => ({
            ...age,
            "Total Purchase ROAS": age["Total Spend"] > 0 ?
                age["Total PCV"] / age["Total Spend"] : 0,
            MonthlyData: Array.from(age.MonthlyData.values())
                .map(month => ({
                    ...month,
                    "Purchase ROAS": month["Spend"] > 0 ?
                        month["Purchase Conversion Value"] / month["Spend"] : 0
                }))
                .sort((a, b) => a.Month.localeCompare(b.Month))
        }))
        .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

    return {
        blendedAgeData: blendedSummary
    };
};

export const fetchFbAgeReports = async (req, res) => {
    const { startDate, endDate } = req.body;
    const { brandId } = req.params;
    const userId = req.user.id;

    try {

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        if (!brandId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID and User ID are required.'
            });
        }

        // Fetch brand and user data in parallel
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found'
            });
        }

        const adAccountIds = brand.fbAdAccounts;
        const accessToken = user.fbAccessToken;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        if (!accessToken) {
            return res.status(403).json({
                success: false,
                message: 'User does not have a valid Facebook access token.',
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        async function fetchTopAge(accountId) {
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_AGE = 300;
            const allData = new Map();

            try {

                const aggregateParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'age',
                    limit: 2000,
                    sort: 'spend_descending'
                });

                const aggregateResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${aggregateParams}`
                );

                // 2. Get top platforms by spend
                const topAges = aggregateResponse.data.data
                    .sort((a, b) => parseFloat(b.spend) - parseFloat(a.spend))
                    .slice(0, MAX_AGE)
                    .map(item => item.age)

                if (topAges.length === 0) {
                    return { accountId, data: null };
                }

                // 3. Now fetch monthly data only for top platforms
                const monthlyParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,purchase_roas,action_values,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'age',
                    time_increment: 'monthly',
                    limit: 2000,
                    filtering: JSON.stringify([{
                        field: "age",
                        operator: "IN",
                        value: topAges
                    }])
                });

                const monthlyResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.age)) {
                        allData.set(insight.age, {
                            "Age": insight.age,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
                            "Total PCV": 0,
                            MonthlyData: new Map(),
                            account_name: insight.account_name
                        });
                    }

                    const ageData = allData.get(insight.age);
                    const monthKey = moment(insight.date_start).format('YYYYMM');

                    const spend = parseFloat(insight.spend || 0);
                    const purchaseRoas = parseFloat(
                        insight.purchase_roas?.find(
                            action => action.action_type === 'omni_purchase'
                        )?.value || 0
                    );
                    const conversionValue = parseFloat(
                        insight.action_values?.find(
                            action => action.action_type === 'purchase'
                        )?.value || 0
                    );

                    const monthData = {
                        Month: monthKey,
                        "Spend": spend,
                        "Purchase ROAS": purchaseRoas,
                        "Purchase Conversion Value": conversionValue
                    };

                    ageData.MonthlyData.set(monthKey, monthData);
                    ageData["Total Spend"] += spend;
                    ageData["Total PCV"] += conversionValue;
                }

                // Transform final data
                const formattedAges = Array.from(allData.values())
                    .map(age => ({
                        ...age,
                        "Total Purchase ROAS": age["Total Spend"] > 0 ?
                            age["Total PCV"] / age["Total Spend"] : 0,
                        MonthlyData: Array.from(age.MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month))
                    }))
                    .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

                return {
                    accountId,
                    data: {
                        account_name: formattedAges[0]?.account_name,
                        ageData: formattedAges
                    }
                };

            } catch (error) {
                console.error(`Error fetching data for account ${cleanedAccountId}:`, {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                    config: {
                        url: error.config?.url?.replace(user.fbAccessToken, 'HIDDEN_TOKEN'),
                        method: error.config?.method
                    }
                });
                return { accountId, data: null };
            }
        }

        const BATCH_SIZE = 10;
        const results = [];
        for (let i = 0; i < brand.fbAdAccounts.length; i += BATCH_SIZE) {
            const batch = brand.fbAdAccounts.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(accountId => fetchTopAge(accountId))
            );
            results.push(...batchResults);
        }

        const formattedResults = results
            .filter(result => result.data !== null)
            .map(result => result.data);

        let blendedSummary = null;

        if (brand.fbAdAccounts.length > 1) {
            blendedSummary = calculateBlendedAgeSummary(formattedResults);
        }
        return res.status(200).json({
            success: true,
            data: formattedResults,
            blendedAgeData: blendedSummary ? blendedSummary.blendedAgeData : []
        });

    } catch (error) {
        console.error('Error fetching Facebook Ad Account age data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account age data',
            error: error.message
        });
    }
};

const calculateBlendedGenderSummary = (accountsData) => {
    const blendedData = new Map();
    accountsData.forEach(account => {
        account.genderData.forEach(genderGroup => {
            if (!blendedData.has(genderGroup.Gender)) {
                blendedData.set(genderGroup.Gender, {
                    "Gender": genderGroup.Gender,
                    "Total Spend": 0,
                    "Total PCV": 0,
                    MonthlyData: new Map()
                })
            }
            const currentgenderData = blendedData.get(genderGroup.Gender);

            // Add to totals
            currentgenderData["Total Spend"] += genderGroup["Total Spend"];
            currentgenderData["Total PCV"] += genderGroup["Total PCV"];

            genderGroup.MonthlyData.forEach(month => {
                const monthKey = month.Month;
                if (!currentgenderData.MonthlyData.has(monthKey)) {
                    currentgenderData.MonthlyData.set(monthKey, {
                        Month: monthKey,
                        "Spend": 0,
                        "Purchase ROAS": 0,
                        "Purchase Conversion Value": 0
                    });
                }

                const currentMonthData = currentgenderData.MonthlyData.get(monthKey);
                currentMonthData["Spend"] += month["Spend"];
                currentMonthData["Purchase Conversion Value"] += month["Purchase Conversion Value"];
            })
        })
    })
    const blendedSummary = Array.from(blendedData.values())
        .map(gender => ({
            ...gender,
            "Total Purchase ROAS": gender["Total Spend"] > 0 ?
                gender["Total PCV"] / gender["Total Spend"] : 0,
            MonthlyData: Array.from(gender.MonthlyData.values())
                .map(month => ({
                    ...month,
                    "Purchase ROAS": month["Spend"] > 0 ?
                        month["Purchase Conversion Value"] / month["Spend"] : 0
                }))
                .sort((a, b) => a.Month.localeCompare(b.Month))
        }))
        .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

    return {
        blendedGenderData: blendedSummary
    };
}

export const fetchFbGenderReports = async (req, res) => {
    const { startDate, endDate} = req.body;
    const { brandId } = req.params;
    const userId = req.user.id;

    try {
        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        if (!brandId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID and User ID are required.'
            });
        }

        // Fetch brand and user data in parallel
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found'
            });
        }

        const adAccountIds = brand.fbAdAccounts;
        const accessToken = user.fbAccessToken;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        if (!accessToken) {
            return res.status(403).json({
                success: false,
                message: 'User does not have a valid Facebook access token.',
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        async function fetchTopGeders(accountId) {
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_GENDER = 300;
            const allData = new Map();

            try {

                const aggregateParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'gender',
                    limit: 2000,
                    sort: 'spend_descending'
                });

                const aggregateResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${aggregateParams}`
                );

                // 2. Get top platforms by spend
                const topGenders = aggregateResponse.data.data
                    .sort((a, b) => parseFloat(b.spend) - parseFloat(a.spend))
                    .slice(0, MAX_GENDER)
                    .map(item => item.gender)

                if (topGenders.length === 0) {
                    return { accountId, data: null };
                }

                // 3. Now fetch monthly data only for top platforms
                const monthlyParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,purchase_roas,action_values,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'gender',
                    time_increment: 'monthly',
                    limit: 2000,
                    filtering: JSON.stringify([{
                        field: "gender",
                        operator: "IN",
                        value: topGenders
                    }])
                });

                const monthlyResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.gender)) {
                        allData.set(insight.gender, {
                            "Gender": insight.gender,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
                            "Total PCV": 0,
                            MonthlyData: new Map(),
                            account_name: insight.account_name
                        });
                    }

                    const genderData = allData.get(insight.gender);
                    const monthKey = moment(insight.date_start).format('YYYYMM');

                    const spend = parseFloat(insight.spend || 0);
                    const purchaseRoas = parseFloat(
                        insight.purchase_roas?.find(
                            action => action.action_type === 'omni_purchase'
                        )?.value || 0
                    );
                    const conversionValue = parseFloat(
                        insight.action_values?.find(
                            action => action.action_type === 'purchase'
                        )?.value || 0
                    );

                    const monthData = {
                        Month: monthKey,
                        "Spend": spend,
                        "Purchase ROAS": purchaseRoas,
                        "Purchase Conversion Value": conversionValue
                    };

                    genderData.MonthlyData.set(monthKey, monthData);
                    genderData["Total Spend"] += spend;
                    genderData["Total PCV"] += conversionValue;
                }

                // Transform final data
                const formattedGenders = Array.from(allData.values())
                    .map(gender => ({
                        ...gender,
                        "Total Purchase ROAS": gender["Total Spend"] > 0 ?
                            gender["Total PCV"] / gender["Total Spend"] : 0,
                        MonthlyData: Array.from(gender.MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month))
                    }))
                    .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

                return {
                    accountId,
                    data: {
                        account_name: formattedGenders[0]?.account_name,
                        genderData: formattedGenders,
                    }
                };

            } catch (error) {
                console.error(`Error fetching data for account ${cleanedAccountId}:`, {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                    config: {
                        url: error.config?.url?.replace(user.fbAccessToken, 'HIDDEN_TOKEN'),
                        method: error.config?.method
                    }
                });
                return { accountId, data: null };
            }
        }

        const BATCH_SIZE = 10;
        const results = [];
        for (let i = 0; i < brand.fbAdAccounts.length; i += BATCH_SIZE) {
            const batch = brand.fbAdAccounts.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(accountId => fetchTopGeders(accountId))
            );
            results.push(...batchResults);
        }

        const formattedResults = results
            .filter(result => result.data !== null)
            .map(result => result.data);
        let blendedSummary = null;

        if (brand.fbAdAccounts.length > 1) {
            blendedSummary = calculateBlendedGenderSummary(formattedResults);
        }

        return res.status(200).json({
            success: true,
            data: formattedResults,
            blendedGenderData: blendedSummary ? blendedSummary.blendedGenderData : []
        });

    } catch (error) {
        console.error('Error fetching Facebook Ad Account gender data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account gender data',
            error: error.message
        });
    }
};

const calculateBlendedDeviceSummary = (accountsData) => {
    const blendedData = new Map();
    accountsData.forEach((account) => {
        account.deviceData.forEach((deviceGroup) => {
            if (!blendedData.has(deviceGroup.Device)) {
                blendedData.set(deviceGroup.Device, {
                    "Device": deviceGroup.Device,
                    "Total Spend": 0,
                    "Total PCV": 0,
                    MonthlyData: new Map()
                })
            }
            const currentdeviceData = blendedData.get(deviceGroup.Device);

            // Add to totals
            currentdeviceData["Total Spend"] += deviceGroup["Total Spend"];
            currentdeviceData["Total PCV"] += deviceGroup["Total PCV"];

            deviceGroup.MonthlyData.forEach(month => {
                const monthKey = month.Month;
                if (!currentdeviceData.MonthlyData.has(monthKey)) {
                    currentdeviceData.MonthlyData.set(monthKey, {
                        Month: monthKey,
                        "Spend": 0,
                        "Purchase ROAS": 0,
                        "Purchase Conversion Value": 0
                    });
                }

                const currentMonthData = currentdeviceData.MonthlyData.get(monthKey);
                currentMonthData["Spend"] += month["Spend"];
                currentMonthData["Purchase Conversion Value"] += month["Purchase Conversion Value"];
            })
        })
    })
    const blendedSummary = Array.from(blendedData.values())
        .map(device => ({
            ...device,
            "Total Purchase ROAS": device["Total Spend"] > 0 ?
                device["Total PCV"] / device["Total Spend"] : 0,
            MonthlyData: Array.from(device.MonthlyData.values())
                .map(month => ({
                    ...month,
                    "Purchase ROAS": month["Spend"] > 0 ?
                        month["Purchase Conversion Value"] / month["Spend"] : 0
                }))
                .sort((a, b) => a.Month.localeCompare(b.Month))
        }))
        .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

    return {
        blendedDeviceData: blendedSummary
    };
}

export const fetchFbDeviceReports = async (req, res) => {
    const { startDate, endDate} = req.body;
    const { brandId } = req.params;
    const userId = req.user.id;

    try {

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        if (!brandId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID and User ID are required.'
            });
        }

        // Fetch brand and user data in parallel
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found'
            });
        }

        const adAccountIds = brand.fbAdAccounts;
        const accessToken = user.fbAccessToken;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        if (!accessToken) {
            return res.status(403).json({
                success: false,
                message: 'User does not have a valid Facebook access token.',
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        async function fetchTopDevices(accountId) {
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_DEVICE = 300;
            const allData = new Map();

            try {

                const aggregateParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'impression_device',
                    limit: 2000,
                    sort: 'spend_descending'
                });

                const aggregateResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${aggregateParams}`
                );

                // 2. Get top platforms by spend
                const topDevices = aggregateResponse.data.data
                    .sort((a, b) => parseFloat(b.spend) - parseFloat(a.spend))
                    .slice(0, MAX_DEVICE)
                    .map(item => item.impression_device)

                if (topDevices.length === 0) {
                    return { accountId, data: null };
                }

                // 3. Now fetch monthly data only for top platforms
                const monthlyParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,purchase_roas,action_values,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'impression_device',
                    time_increment: 'monthly',
                    limit: 2000,
                    filtering: JSON.stringify([{
                        field: "impression_device",
                        operator: "IN",
                        value: topDevices
                    }])
                });

                const monthlyResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.impression_device)) {
                        allData.set(insight.impression_device, {
                            "Device": insight.impression_device,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
                            "Total PCV": 0,
                            MonthlyData: new Map(),
                            account_name: insight.account_name
                        });
                    }

                    const deviceData = allData.get(insight.impression_device);
                    const monthKey = moment(insight.date_start).format('YYYYMM');

                    const spend = parseFloat(insight.spend || 0);
                    const purchaseRoas = parseFloat(
                        insight.purchase_roas?.find(
                            action => action.action_type === 'omni_purchase'
                        )?.value || 0
                    );
                    const conversionValue = parseFloat(
                        insight.action_values?.find(
                            action => action.action_type === 'purchase'
                        )?.value || 0
                    );

                    const monthData = {
                        Month: monthKey,
                        "Spend": spend,
                        "Purchase ROAS": purchaseRoas,
                        "Purchase Conversion Value": conversionValue
                    };

                    deviceData.MonthlyData.set(monthKey, monthData);
                    deviceData["Total Spend"] += spend;
                    deviceData["Total PCV"] += conversionValue;
                }

                // Transform final data
                const formattedDevices = Array.from(allData.values())
                    .map(device => ({
                        ...device,
                        "Total Purchase ROAS": device["Total Spend"] > 0 ?
                            device["Total PCV"] / device["Total Spend"] : 0,
                        MonthlyData: Array.from(device.MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month))
                    }))
                    .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

                return {
                    accountId,
                    data: {
                        account_name: formattedDevices[0]?.account_name,
                        deviceData: formattedDevices
                    }
                };

            } catch (error) {
                console.error(`Error fetching data for account ${cleanedAccountId}:`, {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                    config: {
                        url: error.config?.url?.replace(user.fbAccessToken, 'HIDDEN_TOKEN'),
                        method: error.config?.method
                    }
                });
                return { accountId, data: null };
            }
        }

        const BATCH_SIZE = 10;
        const results = [];
        for (let i = 0; i < brand.fbAdAccounts.length; i += BATCH_SIZE) {
            const batch = brand.fbAdAccounts.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(accountId => fetchTopDevices(accountId))
            );
            results.push(...batchResults);
        }

        const formattedResults = results
            .filter(result => result.data !== null)
            .map(result => result.data);

        let blendedSummary = null;

        if (brand.fbAdAccounts.length > 1) {
            blendedSummary = calculateBlendedDeviceSummary(formattedResults);
        }


        return res.status(200).json({
            success: true,
            data: formattedResults,
            blendedDeviceData: blendedSummary ? blendedSummary.blendedDeviceData : []
        });

    } catch (error) {
        console.error('Error fetching Facebook Ad Account device data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account device data',
            error: error.message
        });
    }
};

const calculateBlendedCountrySummary = (accountsData) => {
    const blendedData = new Map();
    accountsData.forEach((account) => {
        account.countryData.forEach((countryGroup) => {
            if (!blendedData.has(countryGroup.Country)) {
                blendedData.set(countryGroup.Country, {
                    "Country": countryGroup.Country,
                    "Total Spend": 0,
                    "Total PCV": 0,
                    MonthlyData: new Map()
                })
            }
            const currentcountryData = blendedData.get(countryGroup.Country);

            // Add to totals
            currentcountryData["Total Spend"] += countryGroup["Total Spend"];
            currentcountryData["Total PCV"] += countryGroup["Total PCV"];

            countryGroup.MonthlyData.forEach(month => {
                const monthKey = month.Month;
                if (!currentcountryData.MonthlyData.has(monthKey)) {
                    currentcountryData.MonthlyData.set(monthKey, {
                        Month: monthKey,
                        "Spend": 0,
                        "Purchase ROAS": 0,
                        "Purchase Conversion Value": 0
                    });
                }

                const currentMonthData = currentcountryData.MonthlyData.get(monthKey);
                currentMonthData["Spend"] += month["Spend"];
                currentMonthData["Purchase Conversion Value"] += month["Purchase Conversion Value"];
            })
        })
    })
    const blendedSummary = Array.from(blendedData.values())
        .map(country => ({
            ...country,
            "Total Purchase ROAS": country["Total Spend"] > 0 ?
                country["Total PCV"] / country["Total Spend"] : 0,
            MonthlyData: Array.from(country.MonthlyData.values())
                .map(month => ({
                    ...month,
                    "Purchase ROAS": month["Spend"] > 0 ?
                        month["Purchase Conversion Value"] / month["Spend"] : 0
                }))
                .sort((a, b) => a.Month.localeCompare(b.Month))
        }))
        .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

    return {
        blendedCountryData: blendedSummary
    };
}

export const fetchFbCountryReports = async (req, res) => {
    const { startDate, endDate } = req.body;
    const { brandId } = req.params;
    const userId = req.user.id;

    try {

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        if (!brandId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID and User ID are required.'
            });
        }

        // Fetch brand and user data in parallel
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found'
            });
        }

        const adAccountIds = brand.fbAdAccounts;
        const accessToken = user.fbAccessToken;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        if (!accessToken) {
            return res.status(403).json({
                success: false,
                message: 'User does not have a valid Facebook access token.',
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        async function fetchTopCountriesForAccount(accountId) {
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_COUNTRY = 300;
            const allData = new Map();

            try {

                const aggregateParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'country',
                    limit: 2000,
                    sort: 'spend_descending'
                });

                const aggregateResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${aggregateParams}`
                );

                // 2. Get top platforms by spend
                const topCountries = aggregateResponse.data.data
                    .sort((a, b) => parseFloat(b.spend) - parseFloat(a.spend))
                    .slice(0, MAX_COUNTRY)
                    .map(item => item.country);

                if (topCountries.length === 0) {
                    return { accountId, data: null };
                }

                // 3. Now fetch monthly data only for top platforms
                const monthlyParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,purchase_roas,action_values,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'country',
                    time_increment: 'monthly',
                    limit: 2000,
                    filtering: JSON.stringify([{
                        field: "country",
                        operator: "IN",
                        value: topCountries
                    }])
                });

                const monthlyResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.country)) {
                        allData.set(insight.country, {
                            "Country": insight.country,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
                            "Total PCV": 0,
                            MonthlyData: new Map(),
                            account_name: insight.account_name
                        });
                    }

                    const countryData = allData.get(insight.country);
                    const monthKey = moment(insight.date_start).format('YYYYMM');

                    const spend = parseFloat(insight.spend || 0);
                    const purchaseRoas = parseFloat(
                        insight.purchase_roas?.find(
                            action => action.action_type === 'omni_purchase'
                        )?.value || 0
                    );
                    const conversionValue = parseFloat(
                        insight.action_values?.find(
                            action => action.action_type === 'purchase'
                        )?.value || 0
                    );

                    const monthData = {
                        Month: monthKey,
                        "Spend": spend,
                        "Purchase ROAS": purchaseRoas,
                        "Purchase Conversion Value": conversionValue
                    };

                    countryData.MonthlyData.set(monthKey, monthData);
                    countryData["Total Spend"] += spend;
                    countryData["Total PCV"] += conversionValue;
                }

                // Transform final data
                const formattedCountries = Array.from(allData.values())
                    .map(country => ({
                        ...country,
                        "Total Purchase ROAS": country["Total Spend"] > 0 ?
                            country["Total PCV"] / country["Total Spend"] : 0,
                        MonthlyData: Array.from(country.MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month))
                    }))
                    .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

                return {
                    accountId,
                    data: {
                        account_name: formattedCountries[0]?.account_name,
                        countryData: formattedCountries
                    }
                };

            } catch (error) {
                console.error(`Error fetching data for account ${cleanedAccountId}:`, {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                    config: {
                        url: error.config?.url?.replace(user.fbAccessToken, 'HIDDEN_TOKEN'),
                        method: error.config?.method
                    }
                });
                return { accountId, data: null };
            }
        }

        const BATCH_SIZE = 10;
        const results = [];
        for (let i = 0; i < brand.fbAdAccounts.length; i += BATCH_SIZE) {
            const batch = brand.fbAdAccounts.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(accountId => fetchTopCountriesForAccount(accountId))
            );
            results.push(...batchResults);
        }

        const formattedResults = results
            .filter(result => result.data !== null)
            .map(result => result.data);

        let blendedSummary = null;

        if (brand.fbAdAccounts.length > 1) {
            blendedSummary = calculateBlendedCountrySummary(formattedResults);
        }

        return res.status(200).json({
            success: true,
            data: formattedResults,
            blendedCountryData: blendedSummary ? blendedSummary.blendedCountryData : []
        });

    } catch (error) {
        console.error('Error fetching Facebook Ad Account country data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account country data',
            error: error.message
        });
    }
};

const calculateBlendedAudienceSummary = (accountsData) => {
    const blendedData = new Map();
    accountsData.forEach((account) => {
        account.audienceData.forEach((audienceGroup) => {
            if (!blendedData.has(audienceGroup["Audience Segments"])) {
                blendedData.set(audienceGroup["Audience Segments"], {
                    "Audience Segments": audienceGroup["Audience Segments"],
                    "Total Spend": 0,
                    "Total PCV": 0,
                    MonthlyData: new Map()
                })
            }
            const currentAudienceData = blendedData.get(audienceGroup["Audience Segments"]);

            // Add to totals
            currentAudienceData["Total Spend"] += audienceGroup["Total Spend"];
            currentAudienceData["Total PCV"] += audienceGroup["Total PCV"];

            audienceGroup.MonthlyData.forEach(month => {
                const monthKey = month.Month;
                if (!currentAudienceData.MonthlyData.has(monthKey)) {
                    currentAudienceData.MonthlyData.set(monthKey, {
                        Month: monthKey,
                        "Spend": 0,
                        "Purchase ROAS": 0,
                        "Purchase Conversion Value": 0
                    });
                }

                const currentMonthData = currentAudienceData.MonthlyData.get(monthKey);
                currentMonthData["Spend"] += month["Spend"];
                currentMonthData["Purchase Conversion Value"] += month["Purchase Conversion Value"];
            })
        })
    })
    const blendedSummary = Array.from(blendedData.values())
        .map(audience => ({
            ...audience,
            "Total Purchase ROAS": audience["Total Spend"] > 0 ?
                audience["Total PCV"] / audience["Total Spend"] : 0,
            MonthlyData: Array.from(audience.MonthlyData.values())
                .map(month => ({
                    ...month,
                    "Purchase ROAS": month["Spend"] > 0 ?
                        month["Purchase Conversion Value"] / month["Spend"] : 0
                }))
                .sort((a, b) => a.Month.localeCompare(b.Month))
        }))
        .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

    return {
        blendedAudienceData: blendedSummary
    };
}

export const fetchFbAudienceReports = async (req, res) => {
    const { startDate, endDate} = req.body;
    const { brandId } = req.params;

    const userId = req.user.id;

    try {

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        if (!brandId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID and User ID are required.'
            });
        }

        // Fetch brand and user data in parallel
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found'
            });
        }

        const adAccountIds = brand.fbAdAccounts;
        const accessToken = user.fbAccessToken;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        if (!accessToken) {
            return res.status(403).json({
                success: false,
                message: 'User does not have a valid Facebook access token.',
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        async function fetchTopAudiencesForAccount(accountId) {
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_AUDIENCE = 500;
            const allData = new Map();

            try {

                const aggregateParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'user_segment_key',
                    limit: 1000,
                    sort: 'spend_descending'
                });

                const aggregateResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${aggregateParams}`
                );

                // 2. Get top platforms by spend
                const topAudiences = aggregateResponse.data.data
                    .sort((a, b) => parseFloat(b.spend) - parseFloat(a.spend))
                    .slice(0, MAX_AUDIENCE)
                    .map(item => item.user_segment_key);

                if (topAudiences.length === 0) {
                    return { accountId, data: null };
                }

                // 3. Now fetch monthly data only for top platforms
                const monthlyParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,purchase_roas,action_values,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'user_segment_key',
                    time_increment: 'monthly',
                    limit: 500,
                    filtering: JSON.stringify([{
                        field: "user_segment_key",
                        operator: "IN",
                        value: topAudiences
                    }])
                });

                const monthlyResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.user_segment_key)) {
                        allData.set(insight.user_segment_key, {
                            "Audience Segments": insight.user_segment_key,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
                            "Total PCV": 0,
                            MonthlyData: new Map(),
                            account_name: insight.account_name
                        });
                    }

                    const audienceData = allData.get(insight.user_segment_key);
                    const monthKey = moment(insight.date_start).format('YYYYMM');

                    const spend = parseFloat(insight.spend || 0);
                    const purchaseRoas = parseFloat(
                        insight.purchase_roas?.find(
                            action => action.action_type === 'omni_purchase'
                        )?.value || 0
                    );
                    const conversionValue = parseFloat(
                        insight.action_values?.find(
                            action => action.action_type === 'purchase'
                        )?.value || 0
                    );

                    const monthData = {
                        Month: monthKey,
                        "Spend": spend,
                        "Purchase ROAS": purchaseRoas,
                        "Purchase Conversion Value": conversionValue
                    };

                    audienceData.MonthlyData.set(monthKey, monthData);
                    audienceData["Total Spend"] += spend;
                    audienceData["Total PCV"] += conversionValue;
                }

                // Transform final data
                const formattedAudiences = Array.from(allData.values())
                    .map(audience => ({
                        ...audience,
                        "Total Purchase ROAS": audience["Total Spend"] > 0 ?
                            audience["Total PCV"] / audience["Total Spend"] : 0,
                        MonthlyData: Array.from(audience.MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month))
                    }))
                    .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

                return {
                    accountId,
                    data: {
                        account_name: formattedAudiences[0]?.account_name,
                        audienceData: formattedAudiences
                    }
                };

            } catch (error) {
                console.error(`Error fetching data for account ${cleanedAccountId}:`, {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                    config: {
                        url: error.config?.url?.replace(user.fbAccessToken, 'HIDDEN_TOKEN'),
                        method: error.config?.method
                    }
                });
                return { accountId, data: null };
            }
        }

        const BATCH_SIZE = 5;
        const results = [];
        for (let i = 0; i < brand.fbAdAccounts.length; i += BATCH_SIZE) {
            const batch = brand.fbAdAccounts.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(accountId => fetchTopAudiencesForAccount(accountId))
            );
            results.push(...batchResults);
        }

        const formattedResults = results
            .filter(result => result.data !== null)
            .map(result => result.data);

        let blendedSummary = null;

        if (brand.fbAdAccounts.length > 1) {
            blendedSummary = calculateBlendedAudienceSummary(formattedResults);
        }

        return res.status(200).json({
            success: true,
            data: formattedResults,
            blendedAudienceData: blendedSummary ? blendedSummary.blendedAudienceData : []
        });

    } catch (error) {
        console.error('Error fetching Facebook Ad Account Audience data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account Audience data',
            error: error.message
        });
    }
};
const calculateBlendedPlatformSummary = (accountsData) => {
    const blendedData = new Map();
    accountsData.forEach((account) => {
        account.platformData.forEach((platformGroup) => {
            if (!blendedData.has(platformGroup.Platforms)) {
                blendedData.set(platformGroup.Platforms, {
                    "Platforms": platformGroup.Platforms,
                    "Total Spend": 0,
                    "Total PCV": 0,
                    MonthlyData: new Map()
                })
            }
            const currentPlatformData = blendedData.get(platformGroup.Platforms);

            // Add to totals
            currentPlatformData["Total Spend"] += platformGroup["Total Spend"];
            currentPlatformData["Total PCV"] += platformGroup["Total PCV"];

            platformGroup.MonthlyData.forEach(month => {
                const monthKey = month.Month;
                if (!currentPlatformData.MonthlyData.has(monthKey)) {
                    currentPlatformData.MonthlyData.set(monthKey, {
                        Month: monthKey,
                        "Spend": 0,
                        "Purchase ROAS": 0,
                        "Purchase Conversion Value": 0
                    });
                }

                const currentMonthData = currentPlatformData.MonthlyData.get(monthKey);
                currentMonthData["Spend"] += month["Spend"];
                currentMonthData["Purchase Conversion Value"] += month["Purchase Conversion Value"];
            })
        })
    })
    const blendedSummary = Array.from(blendedData.values())
        .map(platform => ({
            ...platform,
            "Total Purchase ROAS": platform["Total Spend"] > 0 ?
                platform["Total PCV"] / platform["Total Spend"] : 0,
            MonthlyData: Array.from(platform.MonthlyData.values())
                .map(month => ({
                    ...month,
                    "Purchase ROAS": month["Spend"] > 0 ?
                        month["Purchase Conversion Value"] / month["Spend"] : 0
                }))
                .sort((a, b) => a.Month.localeCompare(b.Month))
        }))
        .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

    return {
        blendedPlatformData: blendedSummary
    };
}

export const fetchFbPlatformReports = async (req, res) => {
    const { startDate, endDate } = req.body;
    const { brandId } = req.params;

    const userId = req.user.id;

    try {

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        if (!brandId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID and User ID are required.'
            });
        }

        // Fetch brand and user data in parallel
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found'
            });
        }

        const adAccountIds = brand.fbAdAccounts;
        const accessToken = user.fbAccessToken;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        if (!accessToken) {
            return res.status(403).json({
                success: false,
                message: 'User does not have a valid Facebook access token.',
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        async function fetchTopPlatformsForAccount(accountId) {
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_PLATFORMS = 300;
            const allData = new Map();

            try {

                const aggregateParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'publisher_platform',
                    limit: 2000,
                    sort: 'spend_descending'
                });

                const aggregateResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${aggregateParams}`
                );

                // 2. Get top platforms by spend
                const topPlatforms = aggregateResponse.data.data
                    .sort((a, b) => parseFloat(b.spend) - parseFloat(a.spend))
                    .slice(0, MAX_PLATFORMS)
                    .map(item => item.publisher_platform);

                if (topPlatforms.length === 0) {
                    return { accountId, data: null };
                }

                // 3. Now fetch monthly data only for top platforms
                const monthlyParams = new URLSearchParams({
                    access_token: user.fbAccessToken,
                    fields: 'spend,purchase_roas,action_values,account_name',
                    time_range: JSON.stringify({
                        since: adjustedStartDate,
                        until: adjustedEndDate
                    }),
                    breakdowns: 'publisher_platform',
                    time_increment: 'monthly',
                    limit: 2000,
                    filtering: JSON.stringify([{
                        field: "publisher_platform",
                        operator: "IN",
                        value: topPlatforms
                    }])
                });

                const monthlyResponse = await axios.get(
                    `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.publisher_platform)) {
                        allData.set(insight.publisher_platform, {
                            "Platforms": insight.publisher_platform,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
                            "Total PCV": 0,
                            MonthlyData: new Map(),
                            account_name: insight.account_name
                        });
                    }

                    const platformData = allData.get(insight.publisher_platform);
                    const monthKey = moment(insight.date_start).format('YYYYMM');

                    const spend = parseFloat(insight.spend || 0);
                    const purchaseRoas = parseFloat(
                        insight.purchase_roas?.find(
                            action => action.action_type === 'omni_purchase'
                        )?.value || 0
                    );
                    const conversionValue = parseFloat(
                        insight.action_values?.find(
                            action => action.action_type === 'purchase'
                        )?.value || 0
                    );

                    const monthData = {
                        Month: monthKey,
                        "Spend": spend,
                        "Purchase ROAS": purchaseRoas,
                        "Purchase Conversion Value": conversionValue
                    };

                    platformData.MonthlyData.set(monthKey, monthData);
                    platformData["Total Spend"] += spend;
                    platformData["Total PCV"] += conversionValue;
                }

                // Transform final data
                const formattedPlatforms = Array.from(allData.values())
                    .map(platform => ({
                        ...platform,
                        "Total Purchase ROAS": platform["Total Spend"] > 0 ?
                            platform["Total PCV"] / platform["Total Spend"] : 0,
                        MonthlyData: Array.from(platform.MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month))
                    }))
                    .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

                return {
                    accountId,
                    data: {
                        account_name: formattedPlatforms[0]?.account_name,
                        platformData: formattedPlatforms
                    }
                };

            } catch (error) {
                console.error(`Error fetching data for account ${cleanedAccountId}:`, {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                    config: {
                        url: error.config?.url?.replace(user.fbAccessToken, 'HIDDEN_TOKEN'),
                        method: error.config?.method
                    }
                });
                return { accountId, data: null };
            }
        }

        const BATCH_SIZE = 10;
        const results = [];
        for (let i = 0; i < brand.fbAdAccounts.length; i += BATCH_SIZE) {
            const batch = brand.fbAdAccounts.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(accountId => fetchTopPlatformsForAccount(accountId))
            );
            results.push(...batchResults);
        }

        const formattedResults = results
            .filter(result => result.data !== null)
            .map(result => result.data);

        let blendedSummary = null;

        if (brand.fbAdAccounts.length > 1) {
            blendedSummary = calculateBlendedPlatformSummary(formattedResults);
        }

        return res.status(200).json({
            success: true,
            data: formattedResults,
            blendedPlatformData: blendedSummary ? blendedSummary.blendedPlatformData : []
        });

    } catch (error) {
        console.error('Error fetching Facebook Ad Account Platform data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account platform data',
            error: error.message
        });
    }
};

const calculateBlendedPlacementSummary = (accountsData) => {
    const blendedData = new Map();
    accountsData.forEach((account) => {
        account.placementData.forEach((placementGroup) => {
            if (!blendedData.has(placementGroup.Placements)) {
                blendedData.set(placementGroup.Placements, {
                    "Placements": placementGroup.Placements,
                    "Total Spend": 0,
                    "Total PCV": 0,
                    MonthlyData: new Map()
                })
            }
            const currentPlacementData = blendedData.get(placementGroup.Placements);

            // Add to totals
            currentPlacementData["Total Spend"] += placementGroup["Total Spend"];
            currentPlacementData["Total PCV"] += placementGroup["Total PCV"];

            placementGroup.MonthlyData.forEach(month => {
                const monthKey = month.Month;
                if (!currentPlacementData.MonthlyData.has(monthKey)) {
                    currentPlacementData.MonthlyData.set(monthKey, {
                        Month: monthKey,
                        "Spend": 0,
                        "Purchase ROAS": 0,
                        "Purchase Conversion Value": 0
                    });
                }

                const currentMonthData = currentPlacementData.MonthlyData.get(monthKey);
                currentMonthData["Spend"] += month["Spend"];
                currentMonthData["Purchase Conversion Value"] += month["Purchase Conversion Value"];
            })
        })
    })
    const blendedSummary = Array.from(blendedData.values())
        .map(placement => ({
            ...placement,
            "Total Purchase ROAS": placement["Total Spend"] > 0 ?
                placement["Total PCV"] / placement["Total Spend"] : 0,
            MonthlyData: Array.from(placement.MonthlyData.values())
                .map(month => ({
                    ...month,
                    "Purchase ROAS": month["Spend"] > 0 ?
                        month["Purchase Conversion Value"] / month["Spend"] : 0
                }))
                .sort((a, b) => a.Month.localeCompare(b.Month))
        }))
        .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

    return {
        blendedPlacementData: blendedSummary
    };
}

export const fetchFbPlacementReports = async (req, res) => {
    const { startDate, endDate} = req.body;
    const { brandId } = req.params;

    const userId = req.user.id;

    try {

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        if (!brandId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Brand ID and User ID are required.'
            });
        }

        // Fetch brand and user data in parallel
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).lean(),
            User.findById(userId).lean()
        ]);

        if (!brand || !user) {
            return res.status(404).json({
                success: false,
                message: !brand ? 'Brand not found.' : 'User not found'
            });
        }

        const adAccountIds = brand.fbAdAccounts;
        const accessToken = user.fbAccessToken;

        if (!adAccountIds || adAccountIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No Facebook Ads accounts found for this brand.',
            });
        }

        if (!accessToken) {
            return res.status(403).json({
                success: false,
                message: 'User does not have a valid Facebook access token.',
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        async function fetchTopPlacementsForAccount(accountId) {
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_PLACEMENTS = 300;
            const allData = new Map();
            let after = null;
            let shouldContinue = true;

            try {
                do {
                    const params = new URLSearchParams({
                        access_token: user.fbAccessToken,
                        fields: 'spend,purchase_roas,action_values,account_name',
                        time_range: JSON.stringify({
                            since: adjustedStartDate,
                            until: adjustedEndDate
                        }),
                        breakdowns: 'publisher_platform,platform_position',
                        time_increment: 'monthly',
                        limit: 2000,
                        sort: 'spend_descending'
                    });

                    if (after) params.append('after', after);

                    const response = await axios.get(
                        `https://graph.facebook.com/v22.0/act_${cleanedAccountId}/insights?${params}`
                    );

                    if (!response.data.data?.length) break;


                    const processedPlacementsInBatch = new Set();

                    for (const insight of response.data.data) {

                        if (allData.size >= MAX_PLACEMENTS && !allData.has(insight.platform_position)) {
                            shouldContinue = false;
                            break;
                        }

                        processedPlacementsInBatch.add(insight.platform_position);

                        if (!allData.has(insight.platform_position)) {
                            allData.set(insight.platform_position, {
                                Placements: insight.platform_position,
                                "Total Spend": 0,
                                "Total Purchase ROAS": 0,
                                "Total PCV": 0,
                                MonthlyData: new Map(),
                                account_name: insight.account_name
                            });
                        }

                        const placementData = allData.get(insight.platform_position);
                        const monthKey = moment(insight.date_start).format('YYYYMM');

                        const spend = parseFloat(insight.spend || 0);
                        const purchaseRoas = parseFloat(
                            insight.purchase_roas?.find(
                                action => action.action_type === 'omni_purchase'
                            )?.value || 0
                        );
                        const conversionValue = parseFloat(
                            insight.action_values?.find(
                                action => action.action_type === 'purchase'
                            )?.value || 0
                        );

                        const monthData = placementData.MonthlyData.get(monthKey) || {
                            Month: monthKey,
                            "Spend": 0,
                            "Purchase ROAS": 0,
                            "Purchase Conversion Value": 0
                        };

                        monthData["Spend"] += spend;
                        monthData["Purchase ROAS"] += purchaseRoas;
                        monthData["Purchase Conversion Value"] += conversionValue;

                        placementData.MonthlyData.set(monthKey, monthData);
                        placementData["Total Spend"] += spend;
                        placementData["Total PCV"] += conversionValue;
                    }

                    after = response.data.paging?.cursors?.after;

                    if (!shouldContinue && processedPlacementsInBatch.size === 0) {
                        break;
                    }
                } while (after && shouldContinue);

                // 4. Efficient final data transformation
                if (allData.size > 0) {
                    const formattedPlacements = Array.from(allData.values())
                        .sort((a, b) => b["Total Spend"] - a["Total Spend"])
                        .slice(0, MAX_PLACEMENTS)
                        .map(placement => ({
                            ...placement,
                            "Total Purchase ROAS": placement["Total Spend"] > 0 ?
                                placement["Total PCV"] / placement["Total Spend"] : 0,
                            MonthlyData: Array.from(placement.MonthlyData.values())
                                .sort((a, b) => a.Month.localeCompare(b.Month))
                        }));

                    return {
                        accountId,
                        data: {
                            account_name: formattedPlacements[0].account_name,
                            placementData: formattedPlacements
                        }
                    };
                }
            } catch (error) {
                console.error(`Error fetching data for account ${cleanedAccountId}:`, {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    headers: error.response?.headers
                });
            }
            return { accountId, data: null };
        }

        const BATCH_SIZE = 10;
        const results = [];
        for (let i = 0; i < brand.fbAdAccounts.length; i += BATCH_SIZE) {
            const batch = brand.fbAdAccounts.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(accountId => fetchTopPlacementsForAccount(accountId))
            );
            results.push(...batchResults);
        }

        const formattedResults = results
            .filter(result => result.data !== null)
            .map(result => result.data);

        let blendedSummary = null;

        if (brand.fbAdAccounts.length > 1) {
            blendedSummary = calculateBlendedPlacementSummary(formattedResults);
        }

        return res.status(200).json({
            success: true,
            data: formattedResults,
            blendedPlacementData: blendedSummary ? blendedSummary.blendedPlacementData : []
        });

    } catch (error) {
        console.error('Error fetching Facebook Ad Account placement data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account placement data',
            error: error.message
        });
    }
};