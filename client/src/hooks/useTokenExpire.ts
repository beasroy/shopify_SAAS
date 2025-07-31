import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearUser } from '@/store/slices/UserSlice';
import { resetBrand } from '@/store/slices/BrandSlice';
import axios from 'axios';
import { baseURL } from '@/data/constant';

interface TokenValidityResponse {
  success: boolean;
  message: string;
  isValid: boolean;
  expiresAt?: number;
  user?: {
    id: string;
    email: string;
    method: string;
  };
}

export const useTokenExpire = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check token validity via backend
  const checkTokenValidity = async (): Promise<TokenValidityResponse | null> => {
    try {
      const response = await axios.get(`${baseURL}/api/auth/check-token`, {
        withCredentials: true
      });
      return response.data;
    } catch (error: any) {
      console.error('Error checking token validity:', error);
      return null;
    }
  };

  // Function to handle logout
  const handleLogout = async () => {
    try {
      // Call logout API
      await axios.post(`${baseURL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Error during logout API call:', error);
    }

    // Clear Redux state
    dispatch(clearUser());
    dispatch(resetBrand());

    // Navigate to login page
    navigate('/login');
  };

  // Function to check token status
  const checkTokenStatus = async () => {
    const tokenResponse = await checkTokenValidity();
    
    if (!tokenResponse) {
      console.log('Failed to check token validity');
      return;
    }

    if (!tokenResponse.isValid) {
      console.log('Token is invalid or expired:', tokenResponse.message);
      handleLogout();
      return;
    }

    // Log token info in development
    if (process.env.NODE_ENV === 'development' && tokenResponse.expiresAt) {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = tokenResponse.expiresAt - currentTime;
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);
      
      console.log('🔐 Token Status:');
      console.log('📅 Expires at:', new Date(tokenResponse.expiresAt * 1000).toLocaleString());
      console.log('⏰ Minutes until expiry:', minutesUntilExpiry);
      
      if (minutesUntilExpiry <= 5) {
        console.log('⚠️ Token expires soon!');
      }
    }
  };

  // Set up periodic token checking
  useEffect(() => {
    // Initial check
    checkTokenStatus();

    // Check every minute
    intervalRef.current = setInterval(checkTokenStatus, 60000);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    checkTokenStatus,
    isTokenValid: async () => {
      const tokenResponse = await checkTokenValidity();
      return tokenResponse?.isValid || false;
    }
  };
};
