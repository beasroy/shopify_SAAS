import axios, { AxiosInstance, AxiosError } from 'axios';
import { store } from '@/store';
import { clearUser } from '@/store/slices/UserSlice';
import { resetBrand } from '@/store/slices/BrandSlice';
import { baseURL } from '@/data/constant';

// Create global axios instance with auto logout functionality
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.PROD
    ? import.meta.env.VITE_API_URL as string
    : import.meta.env.VITE_LOCAL_API_URL as string,
  withCredentials: true,
});

// Response interceptor to handle 401 errors and auto logout
axiosInstance.interceptors.response.use(
  (response) => {
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
      
      // Redirect to login page
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Export both the configured instance and the original axios
export { axios as defaultAxios };
export default axiosInstance; 