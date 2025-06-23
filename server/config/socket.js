import { Server } from 'socket.io';


let io;

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
export const initializeSocket = (server) => {
    console.log('Initializing Socket.IO server...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('CORS origin:', process.env.NODE_ENV === 'production' ? "https://parallels.messold.com" : ["http://localhost:5173", "http://localhost:3000", "http://13.203.31.8"]);
    
    io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production' 
                ? "https://parallels.messold.com"  // Single string instead of array
                : ["http://localhost:5173", "http://localhost:3000", "http://13.203.31.8"],
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
        },
        allowEIO3: true,
        transports: ['polling', 'websocket'] // Server supports both, client will use polling
    });

 
    // Socket.IO connection handling
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id, 'from:', socket.handshake.headers.origin);
        
        // Join user to their personal room for notifications
        socket.on('join-user-room', (userId) => {
            socket.join(`user-${userId}`);
            console.log(`User ${userId} joined their notification room`);
        });
        
        // Handle brand-specific notifications
        socket.on('join-brand-room', (brandId) => {
            socket.join(`brand-${brandId}`);
            console.log(`Client joined brand room: ${brandId}`);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });

        // Handle custom events
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
    });

    // Add error handling
    io.engine.on('connection_error', (err) => {
        console.error('Socket.IO connection error:', err);
        console.error('Connection error details:', {
            message: err.message,
            code: err.code,
            context: err.context
        });
    });

    io.engine.on('initial_headers', (headers, req) => {
        console.log('Socket.IO initial headers:', headers);
    });

    io.engine.on('headers', (headers, req) => {
        console.log('Socket.IO headers:', headers);
    });

    console.log('Socket.IO server created successfully');
    return io;
};

/**
 * Get Socket.IO instance
 * @returns {Object} Socket.IO server instance
 */
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeSocket first.');
    }
    return io;
};

/**
 * Send notification to a specific user
 * @param {string} userId - The user ID to send notification to
 * @param {string} event - Event name
 * @param {Object} data - Notification data
 */
export const sendToUser = (userId, event, data) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }
    
    try {
        io.to(`user-${userId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log(`Event '${event}' sent to user ${userId}:`, data);
    } catch (error) {
        console.error('Error sending to user:', error);
    }
};

/**
 * Send notification to all clients watching a specific brand
 * @param {string} brandId - The brand ID
 * @param {string} event - Event name
 * @param {Object} data - Notification data
 */
export const sendToBrand = (brandId, event, data) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }
    
    try {
        io.to(`brand-${brandId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log(`Event '${event}' sent to brand ${brandId}:`, data);
    } catch (error) {
        console.error('Error sending to brand:', error);
    }
};

/**
 * Broadcast to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Notification data
 */
export const broadcastToAll = (event, data) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }
    
    try {
        io.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log(`Event '${event}' broadcasted to all clients:`, data);
    } catch (error) {
        console.error('Error broadcasting to all:', error);
    }
}; 