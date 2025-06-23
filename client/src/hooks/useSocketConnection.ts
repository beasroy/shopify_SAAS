import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  initializeSocket, 
  joinBrandRoom, 
  leaveBrandRoom, 
  disconnectSocket, 
  isSocketConnected 
} from '../services/socketService';

export const useSocketConnection = () => {
  const user = useSelector((state: RootState) => state.user.user);
  const selectedBrandId = useSelector((state: RootState) => state.brand.selectedBrandId);
  
  // Refs to track previous values and prevent multiple calls
  const previousBrandId = useRef<string | null>(null);
  const previousUserId = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);

  // Debug logging
  console.log('useSocketConnection - Current state:', {
    hasUser: !!user,
    userId: user?.id,
    selectedBrandId,
    previousBrandId: previousBrandId.current,
    isInitialized: isInitializedRef.current,
    isInitializing: isInitializingRef.current,
    isSocketConnected: isSocketConnected()
  });

  // Main socket initialization effect
  useEffect(() => {
    const currentUserId = user?.id;
    
    // If no user, cleanup and return
    if (!currentUserId) {
      console.log('🚫 No user ID available, cleaning up socket connection');
      if (isInitializedRef.current) {
        disconnectSocket();
        isInitializedRef.current = false;
        isInitializingRef.current = false;
        previousUserId.current = null;
        previousBrandId.current = null;
      }
      return;
    }

    // Check if user changed
    const userChanged = previousUserId.current !== currentUserId;
    const isFirstTime = !isInitializedRef.current;
    const socketNotConnected = !isSocketConnected();

    // Only initialize if:
    // 1. First time with valid user
    // 2. User changed  
    // 3. Socket is not connected and not currently initializing
    const shouldInitialize = (isFirstTime || userChanged || socketNotConnected) && !isInitializingRef.current;

    if (shouldInitialize) {
      console.log('🔄 Initializing socket connection for user:', currentUserId, 'brand:', selectedBrandId);
      console.log('🔍 Initialization reason:', { isFirstTime, userChanged, socketNotConnected });
      
      isInitializingRef.current = true;
      
      try {
        initializeSocket(currentUserId, selectedBrandId || undefined);
        isInitializedRef.current = true;
        previousUserId.current = currentUserId;
        previousBrandId.current = selectedBrandId;
      } catch (error) {
        console.error('❌ Error initializing socket connection:', error);
        isInitializingRef.current = false;
      }
    } else {
      console.log('⏭️ Skipping socket initialization:', { 
        shouldInitialize, 
        isFirstTime, 
        userChanged, 
        socketNotConnected, 
        isInitializing: isInitializingRef.current 
      });
    }

    // Reset initializing flag after a short delay to allow connection to establish
    const resetInitializingFlag = setTimeout(() => {
      isInitializingRef.current = false;
    }, 1000);

    // Cleanup function
    return () => {
      clearTimeout(resetInitializingFlag);
      // Only disconnect on unmount, not on re-renders
    };
  }, [user?.id]); // Only depend on user.id, not selectedBrandId

  // Separate effect for brand changes
  useEffect(() => {
    const currentBrandId = selectedBrandId;
    const brandChanged = previousBrandId.current !== currentBrandId;
    
    // Only handle brand changes if socket is connected and brand actually changed
    if (brandChanged && isSocketConnected() && isInitializedRef.current) {
      console.log('🏢 Brand changed from', previousBrandId.current, 'to', currentBrandId);
      
      try {
        // Leave previous brand room if it exists
        if (previousBrandId.current) {
          console.log('🚪 Leaving previous brand room:', previousBrandId.current);
          leaveBrandRoom(previousBrandId.current);
        }
        
        // Join new brand room if it exists
        if (currentBrandId) {
          console.log('🏢 Joining new brand room:', currentBrandId);
          joinBrandRoom(currentBrandId);
        }
        
        // Update the ref
        previousBrandId.current = currentBrandId;
      } catch (error) {
        console.error('❌ Error handling brand change:', error);
      }
    } else if (brandChanged) {
      console.log('⏭️ Skipping brand change:', { 
        brandChanged, 
        isSocketConnected: isSocketConnected(), 
        isInitialized: isInitializedRef.current 
      });
    }
  }, [selectedBrandId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        console.log('🧹 Component unmounting, disconnecting socket');
        disconnectSocket();
        isInitializedRef.current = false;
        isInitializingRef.current = false;
        previousUserId.current = null;
        previousBrandId.current = null;
      } catch (error) {
        console.error('❌ Error disconnecting socket on unmount:', error);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  return {
    isConnected: isSocketConnected(),
  };
};