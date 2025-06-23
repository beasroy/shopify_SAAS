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

  useEffect(() => {
    // Initialize socket when user is available
    if (user?.id) {
      console.log('Initializing socket connection for user:', user.id, 'brand:', selectedBrandId);
      initializeSocket(user.id, selectedBrandId || undefined);
    }

    // Cleanup on unmount
    return () => {
      console.log('Disconnecting socket');
      disconnectSocket();
    };
  }, [user?.id]);

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