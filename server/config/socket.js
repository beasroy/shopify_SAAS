import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
let io;

/**
 * Parse cookies from cookie string
 * @param {string} cookieString - The cookie string from headers
 * @returns {Object} - Parsed cookies object
 */
const parseCookies = (cookieString) => {
    if (!cookieString) return {};
    
    return cookieString.split(';').reduce((cookies, cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
            cookies[name] = decodeURIComponent(value);
        }
        return cookies;
    }, {});
};

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
export const initializeSocket = (server) => {
    console.log('🔄 Initializing Socket.IO server...');
    console.log('Environment:', process.env.NODE_ENV);
    
    io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production' 
                ? ["https://parallels.messold.com"] // Replace with your actual domain
                : true, // Allow all origins in development
            credentials: true,
            methods: ["GET", "POST"]
        },
        transports: ['polling', 'websocket'],
        allowEIO3: true, // Allow Engine.IO v3 clients
        pingTimeout: 60000,
        pingInterval: 25000
    });

    console.log('✅ Socket.IO server created successfully');

    // Add middleware for authentication (if needed)
    io.use((socket, next) => {
        try {
            console.log('🔐 Socket authentication attempt:', {
                hasCookies: !!socket.handshake.headers.cookie,
                cookieLength: socket.handshake.headers.cookie?.length || 0,
                hasAuthToken: !!socket.handshake.auth?.token,
                hasAuthHeader: !!socket.handshake.headers?.authorization,
                origin: socket.handshake.headers.origin,
                userAgent: socket.handshake.headers['user-agent'],
                workerType: socket.handshake.headers['x-worker-type'],
                workerId: socket.handshake.headers['x-worker-id']
            });
            
            // Check if this is a worker connection
            const isWorker = socket.handshake.headers['x-worker-type'] === 'metrics-worker';
            
            if (isWorker) {
                console.log('🔧 Worker connection detected:', socket.handshake.headers['x-worker-id']);
                socket.isWorker = true;
                socket.workerId = socket.handshake.headers['x-worker-id'] || 'metrics-worker';
                return next();
            }
            
            // In development, allow connections without authentication for testing
            if (process.env.NODE_ENV !== 'production') {
                console.log('🔧 Development mode: Allowing connection without authentication');
                socket.userId = 'dev-user';
                return next();
            }
            
            // Read token from cookies instead of handshake auth
            const cookies = parseCookies(socket.handshake.headers.cookie);
            let token = cookies.token;
            
            // Fallback to handshake auth if cookie not found
            if (!token) {
                token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
            }
            
            if (!token && process.env.NODE_ENV === 'production') {
                console.log('❌ No authentication token provided');
                return next(new Error('Authentication error'));
            }
            
            // If you have token verification logic, add it here
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-default-secret");
                socket.userId = decoded.id || decoded.userId; // Handle both id and userId fields
                console.log('✅ Socket authentication successful for user:', socket.userId);
            }
            
            next();
        } catch (error) {
            console.error('❌ Socket authentication failed:', error.message);
            next(new Error('Authentication error'));
        }
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
        console.log('✅ Client connected successfully:', {
            id: socket.id,
            origin: socket.handshake.headers.origin,
            transport: socket.conn.transport.name,
            userAgent: socket.handshake.headers['user-agent'],
            isWorker: socket.isWorker,
            workerId: socket.workerId
        });
        
        // Handle worker-specific events
        if (socket.isWorker) {
            setupWorkerEventHandlers(socket);
        } else {
            setupClientEventHandlers(socket);
        }

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log('🔌 Client disconnected:', {
                id: socket.id,
                reason: reason,
                isWorker: socket.isWorker,
                workerId: socket.workerId,
                timestamp: new Date().toISOString()
            });
        });

        // Handle ping for connection health check
        socket.on('ping', () => {
            try {
                socket.emit('pong', { 
                    timestamp: new Date().toISOString(),
                    serverId: process.env.SERVER_ID || 'unknown'
                });
            } catch (error) {
                console.error('❌ Error handling ping:', error);
            }
        });

        // Handle any errors within socket events
        socket.on('error', (error) => {
            console.error('🚨 Socket event error:', error);
        });
    });

    // Add global error handling for the io instance
    io.engine.on('connection_error', (err) => {
        console.error('❌ Socket.IO connection error:', {
            message: err.message,
            code: err.code,
            context: err.context,
            type: err.type,
            timestamp: new Date().toISOString()
        });
    });

    // Handle server errors
    io.on('error', (error) => {
        console.error('🚨 Socket.IO server error:', error);
    });

    console.log('✅ Socket.IO server initialized successfully');
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
        console.error('❌ Socket.IO not initialized');
        return false;
    }
    
    try {
        const room = `user-${userId}`;
        const clientsInRoom = io.sockets.adapter.rooms.get(room);
        
        if (!clientsInRoom || clientsInRoom.size === 0) {
            console.warn(`⚠️ No clients in user room: ${room}`);
            return false;
        }
        
        io.to(room).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            serverId: process.env.SERVER_ID || 'unknown'
        });
        
        console.log(`✅ Event '${event}' sent to user ${userId} (${clientsInRoom.size} clients)`);
        return true;
    } catch (error) {
        console.error('❌ Error sending to user:', error);
        return false;
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
        console.error('❌ Socket.IO not initialized');
        return false;
    }
    
    try {
        const room = `brand-${brandId}`;
        const clientsInRoom = io.sockets.adapter.rooms.get(room);
        
        if (!clientsInRoom || clientsInRoom.size === 0) {
            console.warn(`⚠️ No clients in brand room: ${room}`);
            return false;
        }
        
        io.to(room).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            serverId: process.env.SERVER_ID || 'unknown'
        });
        
        console.log(`✅ Event '${event}' sent to brand ${brandId} (${clientsInRoom.size} clients)`);
        return true;
    } catch (error) {
        console.error('❌ Error sending to brand:', error);
        return false;
    }
};

/**
 * Broadcast to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Notification data
 */
export const broadcastToAll = (event, data) => {
    if (!io) {
        console.error('❌ Socket.IO not initialized');
        return false;
    }
    
    try {
        const connectedClients = io.sockets.sockets.size;
        
        if (connectedClients === 0) {
            console.warn('⚠️ No connected clients for broadcast');
            return false;
        }
        
        io.emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            serverId: process.env.SERVER_ID || 'unknown'
        });
        
        console.log(`✅ Event '${event}' broadcasted to all clients (${connectedClients} clients)`);
        return true;
    } catch (error) {
        console.error('❌ Error broadcasting to all:', error);
        return false;
    }
};

/**
 * Get connection statistics
 * @returns {Object} Connection stats
 */
export const getConnectionStats = () => {
    if (!io) {
        return { error: 'Socket.IO not initialized' };
    }
    
    try {
        const stats = {
            totalConnections: io.sockets.sockets.size,
            rooms: Array.from(io.sockets.adapter.rooms.keys()),
            roomStats: {},
            timestamp: new Date().toISOString()
        };
        
        // Get room-specific stats
        io.sockets.adapter.rooms.forEach((clients, roomName) => {
            stats.roomStats[roomName] = clients.size;
        });
        
        return stats;
    } catch (error) {
        console.error('❌ Error getting connection stats:', error);
        return { error: error.message };
    }
};