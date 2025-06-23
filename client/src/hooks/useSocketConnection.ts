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
  const previousBrandId = useRef<string | null>(null);

  // Debug logging
  console.log('useSocketConnection - Current state:', {
    hasUser: !!user,
    userId: user?.id,
    selectedBrandId,
    previousBrandId: previousBrandId.current
  });

  useEffect(() => {
    // Initialize socket when user is available
    if (user?.id) {
      try {
        console.log('Initializing socket connection for user:', user.id, 'brand:', selectedBrandId);
        initializeSocket(user.id, selectedBrandId || undefined);
      } catch (error) {
        console.error('Error initializing socket connection:', error);
      }
    } else {
      console.log('No user ID available, skipping socket initialization');
    }

    // Cleanup on unmount
    return () => {
      try {
        console.log('Disconnecting socket');
        disconnectSocket();
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
    };
  }, [user?.id, selectedBrandId]);

  useEffect(() => {
    // Handle brand changes
    if (selectedBrandId && selectedBrandId !== previousBrandId.current) {
      console.log('Brand changed from', previousBrandId.current, 'to', selectedBrandId);
      
      // Leave previous brand room
      if (previousBrandId.current) {
        leaveBrandRoom(previousBrandId.current);
      }
      
      // Join new brand room
      joinBrandRoom(selectedBrandId);
      previousBrandId.current = selectedBrandId;
    }
  }, [selectedBrandId]);

  return {
    isConnected: isSocketConnected(),
  };
}; 