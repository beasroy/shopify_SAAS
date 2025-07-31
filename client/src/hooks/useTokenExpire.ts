import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { clearUser } from '@/store/slices/UserSlice';
import { resetBrand } from '@/store/slices/BrandSlice';
import axios from 'axios';
import { baseURL } from '@/data/constant';

interface DecodedToken {
  id?: string;        // Used by Google OAuth and normal login
  userId?: string;    // Used by app_sync
  email: string;      // Used by all
  method?: string;    // Used by Google OAuth and normal login
  exp: number;        // JWT standard - expiration time
  iat: number;        // JWT standard - issued at time
}

export const useTokenExpire = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to get token from cookies
  const getTokenFromCookies = (): string | null => {
    const cookies = document.cookie.split(';');
    console.log('Raw document.cookie:', document.cookie);
    console.log('Length:', document.cookie.length);
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  };

  // Function to decode and validate token
  const decodeToken = (token: string): DecodedToken | null => {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Function to check if token is expired
  const isTokenExpired = (decodedToken: DecodedToken): boolean => {
    const currentTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp < currentTime;
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
  const checkTokenStatus = () => {
    const token = getTokenFromCookies();
    
    if (!token) {
      console.log('No token found');
      return;
    }

    const decodedToken = decodeToken(token);
    if (!decodedToken) {
      console.log('Invalid token');
      handleLogout();
      return;
    }

    if (isTokenExpired(decodedToken)) {
      console.log('Token is expired');
      handleLogout();
      return;
    }

    // Log token info in development
    if (process.env.NODE_ENV === 'development') {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decodedToken.exp - currentTime;
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);
      
      console.log('🔐 Token Status:');
      console.log('📅 Expires at:', new Date(decodedToken.exp * 1000).toLocaleString());
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
    isTokenValid: () => {
      const token = getTokenFromCookies();
      if (!token) return false;
      const decodedToken = decodeToken(token);
      if (!decodedToken) return false;
      return !isTokenExpired(decodedToken);
    }
  };
};
