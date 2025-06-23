import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
let io;

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
            // Add your authentication logic here
            // For example, verify JWT token from handshake
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
            
            if (!token && process.env.NODE_ENV === 'production') {
                console.log('❌ No authentication token provided');
                return next(new Error('Authentication error'));
            }
            
            // If you have token verification logic, add it here
             const decoded = jwt.verify(token, process.env.JWT_SECRET);
             socket.userId = decoded.userId;
            
            console.log('✅ Socket authentication successful');
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
            userAgent: socket.handshake.headers['user-agent']
        });
        
        // Join user to their personal room for notifications
        socket.on('join-user-room', (userId) => {
            try {
                if (!userId) {
                    console.warn('⚠️ Invalid userId provided for room join');
                    return;
                }
                
                socket.join(`user-${userId}`);
                console.log(`✅ User ${userId} joined their notification room`);
                
                // Confirm room join
                socket.emit('room-joined', { 
                    type: 'user', 
                    roomId: `user-${userId}`,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error joining user room:', error);
                socket.emit('error', { message: 'Failed to join user room' });
            }
        });
        
        // Handle brand-specific notifications
        socket.on('join-brand-room', (brandId) => {
            try {
                if (!brandId) {
                    console.warn('⚠️ Invalid brandId provided for room join');
                    return;
                }
                
                socket.join(`brand-${brandId}`);
                console.log(`✅ Client joined brand room: ${brandId}`);
                
                // Confirm room join
                socket.emit('room-joined', { 
                    type: 'brand', 
                    roomId: `brand-${brandId}`,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error joining brand room:', error);
                socket.emit('error', { message: 'Failed to join brand room' });
            }
        });

        // Handle leaving brand room
        socket.on('leave-brand-room', (brandId) => {
            try {
                if (!brandId) {
                    console.warn('⚠️ Invalid brandId provided for room leave');
                    return;
                }
                
                socket.leave(`brand-${brandId}`);
                console.log(`✅ Client left brand room: ${brandId}`);
                
                // Confirm room leave
                socket.emit('room-left', { 
                    type: 'brand', 
                    roomId: `brand-${brandId}`,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error leaving brand room:', error);
            }
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log('🔌 Client disconnected:', {
                id: socket.id,
                reason: reason,
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