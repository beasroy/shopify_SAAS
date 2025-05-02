import { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { baseURL } from '@/data/constant';

function ShopifyAuth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    async function handleShopifyRedirect() {
      try {
        // Get all URL parameters
        const searchParams = new URLSearchParams(location.search);
        const params: Record<string, string> = {};
        
        // Extract all parameters from the URL
        for (const [key, value] of searchParams.entries()) {
          params[key] = value;
        }
        
        // Ensure we have the required shop parameter
        if (!params.shop) {
          setError('Shop parameter is missing');
          setLoading(false);
          return;
        }

        // Send all parameters to the backend for validation and auth URL generation
        const response = await axios.post(`${baseURL}/api/auth/shopify-install`, params);
        
        if (response.data && response.data.success && response.data.authUrl) {
          // Redirect the browser to Shopify's OAuth page
          window.location.href = response.data.authUrl;
        } else {
          setError('Failed to get authorization URL');
          setLoading(false);
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error || err.message || 'An error occurred');
        } else {
          setError((err as Error)?.message || 'An error occurred');
        }
        setLoading(false);
      }
    }

    handleShopifyRedirect();
  }, [location]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="spinner mb-4"></div>
        <p className="text-lg">Connecting to Shopify...</p>
      </div>
    </div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen">
      <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
        <h2 className="text-red-700 text-lg font-medium mb-2">Authentication Error</h2>
        <p className="text-red-600">{error}</p>
        <button 
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          onClick={() => window.location.href = '/'}
        >
          Return to Home
        </button>
      </div>
    </div>;
  }

  return null; // This component should redirect before rendering
}

export default ShopifyAuth;