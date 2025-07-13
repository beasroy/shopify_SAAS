import axios from 'axios';
import User from '../models/User.js';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 7 * 24 * 60 * 60, checkperiod: 60 });

// Export cache instance for central management
export { cache };

async function getAccessTokenWithRefreshToken(refreshToken) {
    try {
        const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
            params: {
                refresh_token: refreshToken,
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                grant_type: 'refresh_token'
            }
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Error refreshing Zoho access token:', error.response?.data || error.message);
        throw new Error('Failed to refresh Zoho access token');
    }
}
async function getAccessToken() {
    const adminUser = await User.findOne({ isAdmin: true });
    if (!adminUser || !adminUser.zohoRefreshToken) {
        throw new Error('No Zoho refresh token available');
    }
    return getAccessTokenWithRefreshToken(adminUser.zohoRefreshToken);
}

export const getAllDepartments = async (req, res) => {
    try {
        const cacheKey = 'zoho_departments';
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json({
                success: true,
                source: 'cache',
                departments: cachedData,
                count: cachedData.length
            });
        }

        // Get access token
        const accessToken = await getAccessToken();

        // Make request to Zoho Departments API
        const response = await axios.get('https://desk.zoho.com/api/v1/departments', {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`
            },
        });

        // Check if response contains departments
        if (!response.data || !response.data.data) {
            return res.status(404).json({ success: false, message: 'No departments returned from Zoho' });
        }

        // Extract only the id and name from each department
        const simplifiedDepartments = response.data.data
            .filter(dept => dept.isEnabled === true)
            .map(dept => ({
                id: dept.id,
                name: dept.name
            }));

        // Cache the result for 7 days
        cache.set(cacheKey, simplifiedDepartments);

        return res.json({
            success: true,
            source: 'api',
            departments: simplifiedDepartments,
            count: simplifiedDepartments.length
        });

    } catch (error) {
        console.error('Error fetching Zoho departments:', error);

        // Provide appropriate error response
        if (error.message.includes('No Zoho refresh token')) {
            return res.status(401).json({
                success: false,
                message: 'Zoho integration not configured'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch departments from Zoho',
            error: error.message
        });
    }
};

export const getAllAgents = async (req, res) => {
    try {
        // Get access token
        const accessToken = await getAccessToken();

        // Make request to Zoho Departments API
        const response = await axios.get('https://desk.zoho.com/api/v1/agents', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // Check if response contains departments
        if (!response.data) {
            return res.status(404).json({ success: false, message: 'No data returned from Zoho' });
        }

        return res.json({
            success: true,
            agents: response.data,
            count: response.data.length
        });

    } catch (error) {
        console.error('Error fetching Zoho agents:', error);

        // Provide appropriate error response
        if (error.message.includes('No Zoho refresh token')) {
            return res.status(401).json({
                success: false,
                message: 'Zoho integration not configured'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch departments from Zoho',
            error: error.message
        });
    }


}

export const createDepartments = async (req, res) => {

    try {
        const accessToken = await getAccessToken();

        const departments = [
            { name: 'Technical Support', description: 'For technical issues and bugs', associatedAgentIds: ['1071090000000307417'] },
            { name: 'Feature Requests', description: 'For new feature requests and enhancements', associatedAgentIds: ['1071090000000307417'] },
            { name: 'Customer Support', description: 'For customer support and inquiries', associatedAgentIds: ['1071090000000139001', '1071090000000307417'] },
            { name: 'Marketing', description: 'For marketing campaigns and promotional materials', associatedAgentIds: ['1071090000000139001'] },
            { name: 'Data Validation & Reconciliation', description: 'Investigates discrepancies in sales and marketing data.', associatedAgentIds: ['1071090000000139001'] }
        ];

        const results = [];

        for (const dept of departments) {
            try {
                const response = await axios.post(
                    'https://desk.zoho.com/api/v1/departments',
                    dept,
                    {
                        headers: {
                            'Authorization': `Zoho-oauthtoken ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                results.push({
                    name: dept.name,
                    id: response.data.id,
                    success: true
                });
            } catch (error) {
                results.push({
                    name: dept.name,
                    success: false,
                    error: error.response?.data || error.message
                });
            }
        }

        res.status(200).json({
            success: true,
            results: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create departments',
            error: error.message
        });
    }

}

export const ListOfAgentsindepartments = async (req, res) => {

    try {
        const accessToken = await getAccessToken();
        const { departmentId } = req.params;

        const response = await axios.get(
            `https://desk.zoho.com/api/v1/departments/${departmentId}/agents`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json({
            success: true,
            results: response.data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create departments',
            error: error.message
        });
    }

}

export const createTicket = async (req, res) => {
    try {
        const accessToken = await getAccessToken();

        const ticketResponse = await axios.post(
            'https://desk.zoho.com/api/v1/tickets',
            {
                subject: req.body.subject,
                departmentId: req.body.departmentId,
                description: req.body.description,
                contact: {
                    firstName: req.body.firstName || 'Customer',
                    lastName: req.body.lastName || 'Customer',
                    email: req.body.email
                },
                cf: {
                    cf_brand: req.body.brand
                }
            },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json({
            success: true,
            ticketId: ticketResponse.data.id,
            message: 'Ticket created successfully'
        });
    } catch (error) {
        console.error('Error creating ticket:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket',
            error: error.response?.data || error.message
        });
    }
}



export const deleteDepartment = async (req, res) => {
    try {

        const accessToken = await getAccessToken();
        const orgId = process.env.ZOHO_ORG_ID;

        // Department IDs to delete
        const departmentIds = [
            '1071090000000357029',
            '1071090000000350029'
        ];

        // Array to store results of deletion operations
        const results = [];

        // Delete each department
        for (const departmentId of departmentIds) {
            try {
                const response = await axios({
                    method: 'DELETE',
                    url: `https://desk.zoho.com/api/v1/departments/${departmentId}`,
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${accessToken}`,
                        'orgId': orgId,
                        'Content-Type': 'application/json'
                    }
                });

                results.push({
                    departmentId,
                    success: true,
                    status: response.status,
                    data: response.data
                });
            } catch (deleteError) {
                results.push({
                    departmentId,
                    success: false,
                    error: deleteError.response?.data || deleteError.message
                });
            }
        }

        // Return the results
        return res.status(200).json({
            success: true,
            message: 'Department deletion process completed',
            results
        });

    } catch (error) {
        console.error('Error deleting departments:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete departments',
            error: error.message
        });
    }
};


