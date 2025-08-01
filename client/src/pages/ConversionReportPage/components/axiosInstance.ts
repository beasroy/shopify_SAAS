import axios, { AxiosInstance, AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  setFbTokenError, 
  setGoogleAdsTokenError, 
  setGoogleAnalyticsTokenError 
} from '@/store/slices/TokenSllice';
import { store } from '@/store';
import { clearUser } from '@/store/slices/UserSlice';
import { resetBrand } from '@/store/slices/BrandSlice';
import { baseURL } from '@/data/constant';

const createAxiosInstance = (): AxiosInstance => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const axiosInstance: AxiosInstance = axios.create({
    baseURL: import.meta.env.PROD
      ? import.meta.env.VITE_API_URL as string
      : import.meta.env.VITE_LOCAL_API_URL as string,
    withCredentials: true,
  });
  
  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response) => {
      // Reset token errors on successful responses based on URL
      if (response.config?.url?.includes('/meta')) {
        dispatch(setFbTokenError(false));
      } else if (response.config?.url?.includes('/analytics')) {
        dispatch(setGoogleAnalyticsTokenError(false));
      } else if (response.config?.url?.includes('/google')) {
        dispatch(setGoogleAdsTokenError(false));
      }
      
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        console.log('401 Unauthorized - Token expired or invalid');
        
        // Clear Redux state
        store.dispatch(clearUser());
        store.dispatch(resetBrand());
        
        // Call logout API
        axios.post(`${baseURL}/api/auth/logout`, {}, { withCredentials: true })
          .catch(() => {
            // Ignore logout API errors
          });
        
        // Navigate to login page
        navigate('/login');
      } else if (error.response?.status === 403) {
        if (error.config?.url?.includes('/meta')) {
          dispatch(setFbTokenError(true));
        } else if (error.config?.url?.includes('/analytics')) {
          dispatch(setGoogleAnalyticsTokenError(true));
        } else if (error.config?.url?.includes('/google')) {
          dispatch(setGoogleAdsTokenError(true));
        } else {
          console.warn('Token error occurred but type could not be determined:', error);
        }
      }
      return Promise.reject(error);
    }
  );
  
  return axiosInstance;
};

export const useAxiosInstance = () => {
  return createAxiosInstance();
};

export default createAxiosInstance;