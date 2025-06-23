import {sendToBrand, getIO } from '../config/socket.js';

/**
 * Check if any clients are connected to a specific room
 * @param {string} roomName - The room name to check
 * @returns {boolean} - True if clients are connected
 */
const hasConnectedClients = (roomName) => {
    try {
        const io = getIO();
        const room = io.sockets.adapter.rooms.get(roomName);
        return room && room.size > 0;
    } catch (error) {
        console.error('Error checking connected clients:', error);
        return false;
    }
};

/**
 * Send notification to a specific user
 * @param {string} userId - The user ID to send notification to
 * @param {string} type - Type of notification
 * @param {Object} data - Notification data
 */
// export const sendUserNotification = (userId, type, data) => {
//     try {
//         const roomName = `user-${userId}`;
//         if (hasConnectedClients(roomName)) {
//             console.log(`Sending notification to user ${userId} (${roomName} has connected clients)`);
//             sendToUser(userId, 'notification', {
//                 type,
//                 data
//             });
//         } else {
//             console.log(`No connected clients in user room ${roomName}, skipping notification`);
//         }
//     } catch (error) {
//         console.error('Error sending user notification:', error);
//     }
// };

/**
 * Send notification to all clients watching a specific brand
 * @param {string} brandId - The brand ID
 * @param {string} type - Type of notification
 * @param {Object} data - Notification data
 */
export const sendBrandNotification = (brandId, type, data) => {
    try {
        const roomName = `brand-${brandId}`;
        if (hasConnectedClients(roomName)) {
            console.log(`Sending notification to brand ${brandId} (${roomName} has connected clients)`);
            sendToBrand(brandId, 'brand-notification', {
                type,
                data
            });
        } else {
            console.log(`No connected clients in brand room ${roomName}, skipping notification`);
        }
    } catch (error) {
        console.error('Error sending brand notification:', error);
    }
};

/**
 * Send metrics calculation completion notification
 * @param {string} userId - The user ID who initiated the calculation
 * @param {string} brandId - The brand ID
 * @param {Object} result - The calculation result
 */
export const sendMetricsCompletionNotification = (userId, brandId, result) => {
    const notificationData = {
        brandId,
        success: result.success,
        message: result.message,
        completedAt: new Date().toISOString()
    };

    // Add a small delay to ensure clients have time to connect and join rooms
    setTimeout(() => {
        // Send to specific user
        // sendUserNotification(userId, 'metrics-calculation-complete', notificationData);
        
        // Send to brand room (for any clients watching this brand)
        sendBrandNotification(brandId, 'metrics-calculation-complete', notificationData);
    }, 2000); // 2 second delay
};


/**
 * Send metrics calculation error notification
 * @param {string} userId - The user ID
 * @param {string} brandId - The brand ID
 * @param {string} error - Error message
 */
export const sendMetricsErrorNotification = (userId, brandId, error) => {
    const notificationData = {
        brandId,
        error,
        timestamp: new Date().toISOString()
    };

    // Add a small delay to ensure clients have time to connect and join rooms
    setTimeout(() => {
        //sendUserNotification(userId, 'metrics-calculation-error', notificationData);
        sendBrandNotification(brandId, 'metrics-calculation-error', notificationData);
    }, 2000); // 2 second delay
}; 