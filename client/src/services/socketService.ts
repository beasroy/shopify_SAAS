import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { addNotification } from '../store/slices/NotificationSlice';

// Singleton socket instance
let socket: Socket | null = null;
let isConnecting = false;
let currentUserId: string | null = null;
let currentBrandId: string | null = null;

const baseURL = import.meta.env.PROD 
  ? import.meta.env.VITE_API_URL 
  : import.meta.env.VITE_LOCAL_API_URL;

// Initialize socket connection
export const initializeSocket = (userId?: string, brandId?: string) => {
  console.log('initializeSocket called with:', { userId, brandId });
  
  // Update current user and brand
  if (userId) currentUserId = userId;
  if (brandId) currentBrandId = brandId;
  
  if (socket?.connected || isConnecting) {
    console.log('Socket already connected or connecting, skipping initialization');
    // If already connected but brand changed, join the new brand room
    if (brandId && brandId !== currentBrandId) {
      joinBrandRoom(brandId);
    }
    return;
  }

  console.log('Creating new socket connection to:', baseURL);
  console.log('Connection options:', {
    withCredentials: true,
    transports: ['polling'],
    timeout: 20000,
    forceNew: true
  });
  isConnecting = true;

  socket = io(baseURL, {
    withCredentials: true,
    transports: ['polling'],
    timeout: 20000,
    forceNew: true
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket?.id);
    isConnecting = false;
    
    // Join user room if userId is provided
    if (currentUserId) {
      console.log('Joining user room:', currentUserId);
      socket?.emit('join-user-room', currentUserId);
    }
    
    // Join brand room if brandId is provided
    if (currentBrandId) {
      console.log('Joining brand room:', currentBrandId);
      socket?.emit('join-brand-room', currentBrandId);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected, reason:', reason);
    isConnecting = false;
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Check if it's an authentication error
    if (error.message?.includes('Authentication error')) {
      console.error('Authentication failed for socket connection');
      // Redirect to login if authentication fails
      window.location.href = '/login';
      return;
    }
    
    // Check if it's a transport error
    if (error.message?.includes('websocket error') || error.message?.includes('transport error')) {
      console.error('Transport error detected, this might be due to proxy/load balancer configuration');
    }
    
    isConnecting = false;
    
    // Retry connection after 5 seconds for non-auth errors
    setTimeout(() => {
      if (!socket?.connected && !isConnecting) {
        console.log('Retrying socket connection...');
        initializeSocket(currentUserId || undefined, currentBrandId || undefined);
      }
    }, 5000);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Listen for brand-specific notifications
  socket.on('brand-notification', (data) => {
    console.log('Brand notification received:', data);
    handleNotification(data);
  });

  // Listen for user-specific notifications (if you keep them)
  socket.on('notification', (data) => {
    console.log('User notification received:', data);
    handleNotification(data);
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
      // Create a simple notification sound
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
      console.warn('Could not play notification sound:', error);
    }
  }
};

// Join brand room
export const joinBrandRoom = (brandId: string) => {
  console.log('joinBrandRoom called with:', brandId);
  console.log('Socket connected:', socket?.connected);
  
  currentBrandId = brandId;
  
  if (socket?.connected) {
    console.log(`Emitting join-brand-room for brand: ${brandId}`);
    socket.emit('join-brand-room', brandId);
    console.log(`Joined brand room: ${brandId}`);
  } else {
    console.warn('Socket not connected, cannot join brand room:', brandId);
  }
};

// Leave brand room
export const leaveBrandRoom = (brandId: string) => {
  if (socket?.connected) {
    socket.emit('leave-brand-room', brandId);
    console.log(`Left brand room: ${brandId}`);
  }
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnecting = false;
    currentUserId = null;
    currentBrandId = null;
  }
};

// Check if socket is connected
export const isSocketConnected = (): boolean => {
  return socket?.connected || false;
};

// Get socket instance (for advanced usage)
export const getSocket = (): Socket | null => {
  return socket;
}; 