import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import axios from 'axios'


export default function ShopifyModalContent() {
  const [storeName, setStoreName] = useState('')
  const baseURL = import.meta.env.PROD? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;

  const handleShopifyLogin = async () => {
    try {
      const response = await axios.post(`${baseURL}/api/auth/facebook`,{shop:storeName}, { withCredentials: true });
      if (response.data.success) {
        window.location.href = response.data.authURL;
      } else {
        console.error('Failed to get shopify Auth URL');
      }
    } catch (error) {
      console.error('Error getting shopify Auth URL:', error);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <Input
        type="text"
        placeholder="Enter your Shopify store name"
        value={storeName}
        onChange={(e) => setStoreName(e.target.value)}
      />
      <Button className="w-full" onClick={handleShopifyLogin} disabled={!storeName}>
        Login to Shopify
      </Button>
    </div>
  )
}

