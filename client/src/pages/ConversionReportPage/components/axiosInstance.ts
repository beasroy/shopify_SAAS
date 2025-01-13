import axios, { AxiosInstance, AxiosError} from 'axios';

import { useNavigate } from 'react-router-dom';
import { useTokenError } from "@/context/TokenErrorContext";

/**
 * Creates a custom Axios instance with cancelable requests.
 * @returns {AxiosInstance} Configured Axios instance.
 */
const createAxiosInstance = (): AxiosInstance => {

    const navigate = useNavigate();
    const { setTokenError } = useTokenError();

  const axiosInstance: AxiosInstance = axios.create({
    baseURL: import.meta.env.PROD
      ? import.meta.env.VITE_API_URL as string
      : import.meta.env.VITE_LOCAL_API_URL as string,
    withCredentials: true, // Include cookies with requests
  });


  // Add a response interceptor
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
    
          localStorage.removeItem('user');
          navigate('/');
        
      }else if (error.response?.status === 403) {
        setTokenError(true);
      }
      return Promise.reject(error); // Forward error for further handling if needed
    }
  );

  return axiosInstance;
};

export default createAxiosInstance;