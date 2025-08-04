import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import axios from 'axios'

interface ShopifyModalContentProps {
  onConnect?: (platform: string, account: string, accountId: string) => void;
}

export default function ShopifyModalContent({ onConnect }: ShopifyModalContentProps) {
  const [storeName, setStoreName] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const baseURL = import.meta.env.PROD? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;

  // Check for callback parameters on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const shopName = params.get('shop_name');
    const shop = params.get('shop');

    if (accessToken && shopName && shop) {
      // Call the onConnect function to pass data to parent
      if (onConnect) {
        onConnect('Shopify', shopName, accessToken);
      }
      
      // Clean up URL parameters
      params.delete('access_token');
      params.delete('shop_name');
      params.delete('shop');
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [onConnect]);

  const handleShopifyLogin = async () => {
    if (!storeName.trim()) {
      return;
    }

    setIsConnecting(true);
    try {
      const response = await axios.post(
        `${baseURL}/api/auth/shopify`, 
        { 
          shop: storeName, 
          flowType: "brandSetup" 
        }, 
        { withCredentials: true }
      );
      
      if (response.data.success) {
        const { authUrl } = response.data;
        console.log('Generated Shopify Auth URL:', authUrl); 
        window.location.href = authUrl;
      } else {
        console.error('Failed to get Shopify Auth URL');
      }
    } catch (error) {
      console.error('Error getting Shopify Auth URL:', error);
    } finally {
      setIsConnecting(false);
    }
  };
  

  return (
    <div className="mt-4 space-y-4">
      <Input
        type="text"
        placeholder="Enter your Shopify store name (e.g., mystore)"
        value={storeName}
        onChange={(e) => setStoreName(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && storeName.trim()) {
            handleShopifyLogin();
          }
        }}
      />
      <Button 
        className="w-full" 
        onClick={handleShopifyLogin} 
        disabled={!storeName.trim() || isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Login to Shopify'}
      </Button>
      <p className="text-sm text-gray-500 text-center">
        Enter your store name without .myshopify.com
      </p>
    </div>
  )
}

