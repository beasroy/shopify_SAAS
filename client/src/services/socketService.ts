import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { addNotification } from '../store/slices/NotificationSlice';

// Singleton socket instance
let socket: Socket | null = null;
let isConnecting = false;
let isConnected = false;
let currentUserId: string | null = null;
let currentBrandId: string | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let reconnectTimer: NodeJS.Timeout | null = null;

const baseURL = import.meta.env.PROD 
  ? import.meta.env.VITE_API_URL 
  : import.meta.env.VITE_LOCAL_API_URL;

console.log('Socket Service Environment:', {
  PROD: import.meta.env.PROD,
  baseURL: baseURL
});

// Initialize socket connection
export const initializeSocket = (userId?: string, brandId?: string) => {
  console.log('🔄 initializeSocket called with:', { userId, brandId, isConnecting, isConnected });
  
  // Prevent multiple simultaneous connections
  if (isConnecting) {
    console.log('⏳ Connection already in progress, skipping...');
    return;
  }

  // Update current user and brand
  if (userId) currentUserId = userId;
  if (brandId) currentBrandId = brandId;
  
  // If already connected, just handle room changes
  if (socket?.connected && isConnected) {
    console.log('✅ Socket already connected, handling room changes...');
    handleRoomChanges();
    return;
  }

  // Clean up existing socket if any
  if (socket && !socket.connected) {
    console.log('🧹 Cleaning up disconnected socket...');
    socket.removeAllListeners();
    socket = null;
    isConnected = false;
  }

  createSocketConnection();
};

const createSocketConnection = () => {
  console.log('🔌 Creating new socket connection to:', baseURL);
  console.log('🔍 Connection details:', {
    withCredentials: true,
    transports: ['polling', 'websocket'],
    timeout: 20000,
    autoConnect: true,
    reconnection: false,
    forceNew: true
  });
  
  isConnecting = true;
  reconnectAttempts++;

  // Clear any existing reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  socket = io(baseURL, {
    withCredentials: true,
    transports: ['polling', 'websocket'], // Match server configuration
    timeout: 20000,
    autoConnect: true,
    reconnection: false, // Handle reconnection manually
    forceNew: true, // Force new connection
    extraHeaders: {
      // Ensure cookies are sent with the connection
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  // Connection successful
  socket.on('connect', () => {
    console.log('✅ Socket connected successfully:', socket?.id);
    isConnecting = false;
    isConnected = true;
    reconnectAttempts = 0;
    
    handleRoomChanges();
  });

  // Connection failed
  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
    isConnecting = false;
    isConnected = false;
    
    handleConnectionError(error);
  });

  // Disconnected
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected, reason:', reason);
    isConnecting = false;
    isConnected = false;
    
    // Only attempt reconnection for certain disconnect reasons
    if (reason === 'io server disconnect') {
      console.log('Server initiated disconnect, not reconnecting');
      return;
    }
    
    attemptReconnection();
  });

  // Socket errors
  socket.on('error', (error) => {
    console.error('🚨 Socket error:', error);
  });

  // Setup event listeners
  setupEventListeners();
};

const handleConnectionError = (error: any) => {
  console.error('Connection error details:', {
    message: error.message,
    name: error.name,
    type: error.type,
    code: error.code
  });
  
  // Check for authentication errors
  if (error.message?.includes('Authentication') || error.message?.includes('Unauthorized')) {
    console.error('🔐 Authentication failed for socket connection');
    
    // Show user-friendly notification
    store.dispatch(addNotification({
      type: 'error',
      title: 'Connection Error',
      message: 'Authentication failed. Please log in again.'
    }));
    
    // Don't attempt reconnection for auth errors
    return;
  }
  
  // Check for server errors
  if (error.message?.includes('server error')) {
    console.error('🔥 Server error detected - check server logs');
  }
  
  // Check for network errors
  if (error.message?.includes('Network Error') || error.message?.includes('timeout')) {
    console.error('🌐 Network error detected');
  }
  
  attemptReconnection();
};

const attemptReconnection = () => {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('🔄 Max reconnection attempts reached, giving up');
    return;
  }
  
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff
  console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
  
  reconnectTimer = setTimeout(() => {
    if (!isConnected && !isConnecting) {
      createSocketConnection();
    }
  }, delay);
};

const handleRoomChanges = () => {
  if (!socket?.connected) {
    console.warn('⚠️ Socket not connected, cannot handle room changes');
    return;
  }

  // Join user room if userId is provided
  if (currentUserId) {
    console.log('🏠 Joining user room:', currentUserId);
    socket.emit('join-user-room', currentUserId);
  }
  
  // Join brand room if brandId is provided
  if (currentBrandId) {
    console.log('🏢 Joining brand room:', currentBrandId);
    socket.emit('join-brand-room', currentBrandId);
  }
};

const setupEventListeners = () => {
  if (!socket) return;

  // Listen for brand-specific notifications
  socket.on('brand-notification', (data) => {
    console.log('📢 Brand notification received:', data);
    handleNotification(data);
  });

  // Listen for user-specific notifications
  socket.on('notification', (data) => {
    console.log('📬 User notification received:', data);
    handleNotification(data);
  });

  // Ping-pong for connection health
  socket.on('pong', (data) => {
    console.log('🏓 Pong received:', data);
  });
};

// Handle incoming notifications
const handleNotification = (data: any) => {
  const { type, data: notificationData } = data;
  
  let notificationType: 'success' | 'error' | 'info' | 'warning' = 'info';
  let title = 'Notification';
  let message = 'You have a new notification';

  // Map notification types to UI-friendly formats
  switch (type) {
    case 'metrics-calculation-complete':
      notificationType = notificationData.success ? 'success' : 'error';
      title = 'Metrics Calculation';
      message = notificationData.success 
        ? 'Metrics calculation completed successfully!' 
        : `Calculation failed: ${notificationData.message}`;
      break;
      
    case 'metrics-calculation-error':
      notificationType = 'error';
      title = 'Calculation Error';
      message = `Error calculating metrics: ${notificationData.error}`;
      break;
      
    default:
      title = 'System Notification';
      message = notificationData.message || 'You have a new notification';
  }

  // Add notification to Redux store
  store.dispatch(addNotification({
    type: notificationType,
    title,
    message,
    brandId: notificationData.brandId,
    actionUrl: notificationData.actionUrl,
  }));

  // Play notification sound if enabled
  playNotificationSound();
};

// Play notification sound
const playNotificationSound = () => {
  const { isSoundEnabled } = store.getState().notifications;
  
  if (isSoundEnabled) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('🔇 Could not play notification sound:', error);
    }
  }
};

// Join brand room
export const joinBrandRoom = (brandId: string) => {
  console.log('🏢 joinBrandRoom called with:', brandId);
  
  currentBrandId = brandId;
  
  if (socket?.connected && isConnected) {
    console.log(`🏢 Emitting join-brand-room for brand: ${brandId}`);
    socket.emit('join-brand-room', brandId);
  } else {
    console.warn('⚠️ Socket not connected, will join brand room after connection');
  }
};

// Leave brand room
export const leaveBrandRoom = (brandId: string) => {
  if (socket?.connected && isConnected) {
    socket.emit('leave-brand-room', brandId);
    console.log(`🚪 Left brand room: ${brandId}`);
  }
};

// Disconnect socket
export const disconnectSocket = () => {
  console.log('🔌 Disconnecting socket...');
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  
  isConnecting = false;
  isConnected = false;
  currentUserId = null;
  currentBrandId = null;
  reconnectAttempts = 0;
};

// Check if socket is connected
export const isSocketConnected = (): boolean => {
  return !!(socket?.connected && isConnected);
};

// Send ping to test connection
export const pingSocket = () => {
  if (socket?.connected && isConnected) {
    socket.emit('ping');
  }
};

// Get socket instance (for advanced usage)
export const getSocket = (): Socket | null => {
  return socket;
};

// Get connection status
export const getConnectionStatus = () => {
  return {
    isConnected: isConnected,
    isConnecting: isConnecting,
    socketId: socket?.id || null,
    currentUserId: currentUserId,
    currentBrandId: currentBrandId,
    reconnectAttempts: reconnectAttempts
  };
};