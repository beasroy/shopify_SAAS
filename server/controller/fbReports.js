import Brand from '../models/Brands.js';
import User from "../models/User.js";
import axios from "axios";
import moment from 'moment';

function getDateRange(startDate, endDate) {
    return {
        adjustedStartDate: startDate || moment().startOf('month').format('YYYY-MM-DD'),
        adjustedEndDate: endDate || moment().format('YYYY-MM-DD')
    };
}

export const fetchFbAgeReports = async(req,res)=>{
    const { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).select('fbAdAccounts').lean(),
            User.findById(userId).select('fbAccessToken').lean()
        ]);

        if (!brand?.fbAdAccounts?.length || !user?.fbAccessToken) {
            return res.status(404).json({
                success: false,
                message: !brand?.fbAdAccounts?.length
                    ? 'No Facebook Ads accounts found for this brand.'
                    : 'No Facebook accesstoken found for this user.'
            });
        }

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        async function fetchTopAge(accountId){
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_AGE=300;
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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${aggregateParams}`
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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.age)) {
                        allData.set(insight.age, {
                            "Age": insight.age,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
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
                    ageData["Total Purchase ROAS"] += purchaseRoas;
                }

                // Transform final data
                const formattedAges = Array.from(allData.values())
                    .map(age => ({
                        ...age,
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

        const BATCH_SIZE = 5;
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

        return res.status(200).json({
            success: true,
            data: formattedResults,
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

export const fetchFbGenderReports = async(req,res)=>{
    const { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).select('fbAdAccounts').lean(),
            User.findById(userId).select('fbAccessToken').lean()
        ]);

        if (!brand?.fbAdAccounts?.length || !user?.fbAccessToken) {
            return res.status(404).json({
                success: false,
                message: !brand?.fbAdAccounts?.length
                    ? 'No Facebook Ads accounts found for this brand.'
                    : 'No Facebook accesstoken found for this user.'
            });
        }

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        async function fetchTopGeders(accountId){
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_GENDER=300;
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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${aggregateParams}`
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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.gender)) {
                        allData.set(insight.gender, {
                            "Gender": insight.gender,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
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
                    genderData["Total Purchase ROAS"] += purchaseRoas;
                }

                // Transform final data
                const formattedGenders = Array.from(allData.values())
                    .map(gender => ({
                        ...gender,
                        MonthlyData: Array.from(gender.MonthlyData.values())
                            .sort((a, b) => a.Month.localeCompare(b.Month))
                    }))
                    .sort((a, b) => b["Total Spend"] - a["Total Spend"]);

                return {
                    accountId, 
                    data: {
                        account_name: formattedGenders[0]?.account_name,
                        genderData: formattedGenders
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
                batch.map(accountId => fetchTopGeders(accountId))
            );
            results.push(...batchResults);
        }

        const formattedResults = results
            .filter(result => result.data !== null)
            .map(result => result.data);

        return res.status(200).json({
            success: true,
            data: formattedResults,
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

export const fetchFbDeviceReports = async(req,res)=>{
    const { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).select('fbAdAccounts').lean(),
            User.findById(userId).select('fbAccessToken').lean()
        ]);

        if (!brand?.fbAdAccounts?.length || !user?.fbAccessToken) {
            return res.status(404).json({
                success: false,
                message: !brand?.fbAdAccounts?.length
                    ? 'No Facebook Ads accounts found for this brand.'
                    : 'No Facebook accesstoken found for this user.'
            });
        }

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        async function fetchTopDevices(accountId){
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_DEVICE=300;
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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${aggregateParams}`
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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.impression_device)) {
                        allData.set(insight.impression_device, {
                            "Device": insight.impression_device,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
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
                    deviceData["Total Purchase ROAS"] += purchaseRoas;
                }

                // Transform final data
                const formattedDevices = Array.from(allData.values())
                    .map(device => ({
                        ...device,
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

        const BATCH_SIZE = 5;
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

        return res.status(200).json({
            success: true,
            data: formattedResults,
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

export const fetchFbCountryReports = async (req, res) => {
    const { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).select('fbAdAccounts').lean(),
            User.findById(userId).select('fbAccessToken').lean()
        ]);

        if (!brand?.fbAdAccounts?.length || !user?.fbAccessToken) {
            return res.status(404).json({
                success: false,
                message: !brand?.fbAdAccounts?.length
                    ? 'No Facebook Ads accounts found for this brand.'
                    : 'No Facebook accesstoken found for this user.'
            });
        }

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${aggregateParams}`
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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.country)) {
                        allData.set(insight.country, {
                            "Country": insight.country,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
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
                    countryData["Total Purchase ROAS"] += purchaseRoas;
                }

                // Transform final data
                const formattedCountries = Array.from(allData.values())
                    .map(country => ({
                        ...country,
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

        const BATCH_SIZE = 5;
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

        return res.status(200).json({
            success: true,
            data: formattedResults,
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

export const fetchFbRegionReports = async (req, res) => {
    const { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).select('fbAdAccounts').lean(),
            User.findById(userId).select('fbAccessToken').lean()
        ]);

        if (!brand?.fbAdAccounts?.length || !user?.fbAccessToken) {
            return res.status(404).json({
                success: false,
                message: !brand?.fbAdAccounts?.length
                    ? 'No Facebook Ads accounts found for this brand.'
                    : 'No Facebook accesstoken found for this user.'
            });
        }

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        async function fetchTopRegionsForAccount(accountId) {
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_REGIONS = 300;
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
                        breakdowns: 'region',
                        time_increment: 'monthly',
                        limit: 500,
                        sort: 'spend_descending'
                    });

                    if (after) params.append('after', after);

                    const response = await axios.get(
                        `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${params}`
                    );

                    if (!response.data.data?.length) break;


                    const processedRegionsInBatch = new Set();

                    for (const insight of response.data.data) {

                        if (allData.size >= MAX_REGIONS && !allData.has(insight.region)) {
                            shouldContinue = false;
                            break;
                        }

                        processedRegionsInBatch.add(insight.region);

                        if (!allData.has(insight.region)) {
                            allData.set(insight.region, {
                                Region: insight.region,
                                "Total Spend": 0,
                                "Total Purchase ROAS": 0,
                                MonthlyData: new Map(),
                                account_name: insight.account_name
                            });
                        }

                        const regionData = allData.get(insight.region);
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

                        const monthData = regionData.MonthlyData.get(monthKey) || {
                            Month: monthKey,
                            "Spend": 0,
                            "Purchase ROAS": 0,
                            "Purchase Conversion Value": 0
                        };

                        monthData["Spend"] += spend;
                        monthData["Purchase ROAS"] += purchaseRoas;
                        monthData["Purchase Conversion Value"] += conversionValue;

                        regionData.MonthlyData.set(monthKey, monthData);
                        regionData["Total Spend"] += spend;
                        regionData["Total Purchase ROAS"] += purchaseRoas;
                    }

                    after = response.data.paging?.cursors?.after;

                    if (!shouldContinue && processedRegionsInBatch.size === 0) {
                        break;
                    }
                } while (after && shouldContinue);

                // 4. Efficient final data transformation
                if (allData.size > 0) {
                    const formattedRegions = Array.from(allData.values())
                        .sort((a, b) => b["Total Spend"] - a["Total Spend"])
                        .slice(0, MAX_REGIONS)
                        .map(region => ({
                            ...region,
                            MonthlyData: Array.from(region.MonthlyData.values())
                                .sort((a, b) => a.Month.localeCompare(b.Month))
                        }));

                    return {
                        accountId,
                        data: {
                            account_name: formattedRegions[0].account_name,
                            regionData: formattedRegions
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

        const BATCH_SIZE = 5;
        const results = [];
        for (let i = 0; i < brand.fbAdAccounts.length; i += BATCH_SIZE) {
            const batch = brand.fbAdAccounts.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(accountId => fetchTopRegionsForAccount(accountId))
            );
            results.push(...batchResults);
        }

        const formattedResults = results
            .filter(result => result.data !== null)
            .map(result => result.data);

        return res.status(200).json({
            success: true,
            data: formattedResults,
            metadata: {
                dateRange: { start: adjustedStartDate, end: adjustedEndDate }
            }
        });

    } catch (error) {
        console.error('Error fetching Facebook Ad Account region data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching Facebook Ad Account region data',
            error: error.message
        });
    }
};

export const fetchFbAudienceReports = async (req, res) => {
    const { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).select('fbAdAccounts').lean(),
            User.findById(userId).select('fbAccessToken').lean()
        ]);

        if (!brand?.fbAdAccounts?.length || !user?.fbAccessToken) {
            return res.status(404).json({
                success: false,
                message: !brand?.fbAdAccounts?.length
                    ? 'No Facebook Ads accounts found for this brand.'
                    : 'No Facebook accesstoken found for this user.'
            });
        }

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

        async function fetchTopAudiencesForAccount(accountId) {
            const cleanedAccountId = accountId.replace(/^act_/, '');
            const MAX_AUDIENCE = 300;
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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${aggregateParams}`
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
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.user_segment_key)) {
                        allData.set(insight.user_segment_key, {
                            "Audience Segments": insight.user_segment_key,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
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
                    audienceData["Total Purchase ROAS"] += purchaseRoas;
                }

                // Transform final data
                const formattedAudiences = Array.from(allData.values())
                    .map(audience => ({
                        ...audience,
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

        return res.status(200).json({
            success: true,
            data: formattedResults,
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

export const fetchFbPlatformReports = async (req, res) => {
    const { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).select('fbAdAccounts').lean(),
            User.findById(userId).select('fbAccessToken').lean()
        ]);

        if (!brand?.fbAdAccounts?.length || !user?.fbAccessToken) {
            return res.status(404).json({
                success: false,
                message: !brand?.fbAdAccounts?.length
                    ? 'No Facebook Ads accounts found for this brand.'
                    : 'No Facebook accesstoken found for this user.'
            });
        }

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

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
                    limit: 1000,
                    sort: 'spend_descending'
                });

                const aggregateResponse = await axios.get(
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${aggregateParams}`
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
                    limit: 500,
                    filtering: JSON.stringify([{
                        field: "publisher_platform",
                        operator: "IN",
                        value: topPlatforms
                    }])
                });

                const monthlyResponse = await axios.get(
                    `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${monthlyParams}`
                );

                // Process monthly data
                for (const insight of monthlyResponse.data.data) {
                    if (!allData.has(insight.publisher_platform)) {
                        allData.set(insight.publisher_platform, {
                            "Platforms": insight.publisher_platform,
                            "Total Spend": 0,
                            "Total Purchase ROAS": 0,
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
                    platformData["Total Purchase ROAS"] += purchaseRoas;
                }

                // Transform final data
                const formattedPlatforms = Array.from(allData.values())
                    .map(platform => ({
                        ...platform,
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

        const BATCH_SIZE = 5;
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

        return res.status(200).json({
            success: true,
            data: formattedResults,
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

export const fetchFbPlacementReports = async (req, res) => {
    const { startDate, endDate, userId } = req.body;
    const { brandId } = req.params;

    try {
        const [brand, user] = await Promise.all([
            Brand.findById(brandId).select('fbAdAccounts').lean(),
            User.findById(userId).select('fbAccessToken').lean()
        ]);

        if (!brand?.fbAdAccounts?.length || !user?.fbAccessToken) {
            return res.status(404).json({
                success: false,
                message: !brand?.fbAdAccounts?.length
                    ? 'No Facebook Ads accounts found for this brand.'
                    : 'No Facebook accesstoken found for this user.'
            });
        }

        const { adjustedStartDate, adjustedEndDate } = getDateRange(startDate, endDate);

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
                        limit: 500,
                        sort: 'spend_descending'
                    });

                    if (after) params.append('after', after);

                    const response = await axios.get(
                        `https://graph.facebook.com/v21.0/act_${cleanedAccountId}/insights?${params}`
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
                        placementData["Total Purchase ROAS"] += purchaseRoas;
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

        const BATCH_SIZE = 5;
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

        return res.status(200).json({
            success: true,
            data: formattedResults,
            metadata: {
                dateRange: { start: adjustedStartDate, end: adjustedEndDate }
            }
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