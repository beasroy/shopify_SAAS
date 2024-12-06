import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ShopifyModalContentProps {
  onConnect: (platform: string, account: string,accountId:string) => void
}

export default function ShopifyModalContent({ onConnect }: ShopifyModalContentProps) {
  const [storeName, setStoreName] = useState('')

  const handleLogin = () => {
    // Here you would typically initiate the Shopify OAuth flow
    // For now, we'll just simulate a connection
    if (storeName) {
      onConnect('Shopify', storeName,'')
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
      <Button className="w-full" onClick={handleLogin} disabled={!storeName}>
        Login to Shopify
      </Button>
    </div>
  )
}

