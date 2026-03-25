import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import axios from 'axios'

interface ShopifyModalContentProps {
  onConnect?: (platform: string, account: string, accountId: string, shopDomain?: string) => void;
  /** When false, ignore URL callback params so Shopify is not applied before a brand exists on this flow. */
  allowOAuthCallback?: boolean;
  sourcePath?: string;
  flowType?: "brandSetup" | "dashboard" | "login";
  brandId?: string;
}

export default function ShopifyModalContent({
  onConnect,
  allowOAuthCallback = false,
  sourcePath = globalThis.location.pathname,
  flowType = "brandSetup",
  brandId
}: ShopifyModalContentProps) {
  const [storeName, setStoreName] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const baseURL = import.meta.env.PROD? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;

  // Check for callback parameters on component mount
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const accessToken = params.get('access_token');
    const shopName = params.get('shop_name');
    const shop = params.get('shop');

    // For dashboard flow we persist server-side and redirect back without tokens.
    if (accessToken && shopName && shop && allowOAuthCallback && flowType !== "dashboard") {
      // Call the onConnect function to pass data to parent
      if (onConnect) {
        onConnect('Shopify', shopName, accessToken, shop);
      }
      
      // Clean up URL parameters
      params.delete('access_token');
      params.delete('shop_name');
      params.delete('shop');
      const querySuffix = params.toString() ? `?${params.toString()}` : "";
      const newUrl = `${globalThis.location.pathname}${querySuffix}`;
      globalThis.history.replaceState({}, '', newUrl);
    }
  }, [onConnect, allowOAuthCallback]);

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
          flowType,
          source: sourcePath,
          brandId
        }, 
        { withCredentials: true }
      );
      
      if (response.data.success) {
        const { authUrl } = response.data;
        console.log('Generated Shopify Auth URL:', authUrl); 
        globalThis.location.href = authUrl;
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
        onKeyDown={(e) => {
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

