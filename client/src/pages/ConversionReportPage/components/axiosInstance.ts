import axios, { AxiosInstance, AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setFbTokenError , setGoogleAdsTokenError, setGoogleAnalyticsTokenError } from '@/store/slices/TokenSllice';


interface TokenErrorResponse {
  tokenType?: 'facebook' | 'google_analytics' | 'google_ads';
  message?: string;
}

const createAxiosInstance = (): AxiosInstance => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const axiosInstance: AxiosInstance = axios.create({
    baseURL: import.meta.env.PROD
      ? import.meta.env.VITE_API_URL as string
      : import.meta.env.VITE_LOCAL_API_URL as string,
    withCredentials: true,
  });


  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('user');
        navigate('/');
      } else if (error.response?.status === 403) {
      
        const errorData = error.response?.data as TokenErrorResponse;
        
        switch (errorData?.tokenType) {
          case 'facebook':
            dispatch(setFbTokenError(true));
            break;
          case 'google_analytics':
            dispatch(setGoogleAnalyticsTokenError(true));
            break;
          case 'google_ads':
            dispatch(setGoogleAdsTokenError(true));
            break;
          default:
            
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
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

// Create a hook to use this Axios instance
export const useAxiosInstance = () => {
  return createAxiosInstance();
};

export default createAxiosInstance;