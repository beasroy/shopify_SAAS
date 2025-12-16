import axios from 'axios';
import User from '../models/User.js';
import NodeCache from 'node-cache';
import nodemailer from 'nodemailer';

const cache = new NodeCache({ stdTTL: 7 * 24 * 60 * 60, checkperiod: 60 });

// Export cache instance for central management
export { cache };

// Email configuration
const smtpConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'team@messold.com',
        pass: process.env.EMAIL_PASS || 'hqik hgtm bcbr eign'
    },
    tls: {
        rejectUnauthorized: false
    }
};

// Function to send email notification
async function sendTicketNotification(brandName, description, departmentName, ticketId) {
    try {
        const transporter = nodemailer.createTransport(smtpConfig);
        
        // Get admin user email
        const adminUser = await User.findOne({ isAdmin: true });
        if (!adminUser || !adminUser.email) {
            console.warn('No admin user email found for ticket notification');
            return;
        }

        const mailOptions = {
            from: `"Ticket System" <${smtpConfig.auth.user}>`,
            to: adminUser.email,
            subject: `New Requirement Request: ${brandName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">New Requirement Request</h2>
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Brand Name:</strong> ${brandName}</p>
                        <p><strong>Department:</strong> ${departmentName}</p>
                        <p><strong>Ticket ID:</strong> ${ticketId}</p>
                    </div>
                    <div style="background-color: #fff; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Description:</h3>
                        <p style="white-space: pre-wrap; color: #666;">${description}</p>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        This ticket has been created in Zoho Desk. You can view and manage it from your Zoho Desk dashboard.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Ticket notification email sent to ${adminUser.email}`);
    } catch (error) {
        console.error('Error sending ticket notification email:', error);
        // Don't throw error - ticket creation should still succeed even if email fails
    }
}

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
        const { brandName, description, departmentId } = req.body;

        // Validate required fields
        if (!brandName || !description || !departmentId) {
            return res.status(400).json({
                success: false,
                message: 'Brand name, description, and department are required'
            });
        }

        const accessToken = await getAccessToken();

        // Get user information for contact (from verifyAuth middleware)
        const user = req.user;
        const userEmail = user?.email || 'support@messold.com';
        const userName = user?.username || 'Customer';
        const firstName = userName.split(' ')[0] || 'Customer';
        const lastName = userName.split(' ').slice(1).join(' ') || 'User';

        // Create ticket with contact information
        // Zoho will automatically create or find the contact based on email
        const ticketResponse = await axios.post(
            'https://desk.zoho.com/api/v1/tickets',
            {
                subject: `Requirement Request - ${brandName}`,
                departmentId: departmentId,
                description: description,
                contact: {
                    firstName: firstName,
                    lastName: lastName,
                    email: userEmail
                },
                cf: {
                    cf_brand: brandName
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


