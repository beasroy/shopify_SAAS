import React, { useState } from 'react'
import { Upload, ShoppingBag, Facebook, Target, BarChart, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import ShopifyModalContent from './ShopifyModalContent'
import OtherPlatformModalContent from './OtherPlatformModalContent'

const platforms = [
  { name: 'Shopify', color: 'from-green-200 to-green-400', icon: ShoppingBag , border: 'border-green-800'},
  { name: 'Facebook', color: 'from-blue-200 to-blue-400', icon: Facebook , border: 'border-blue-800'},
  { name: 'Google Ads', color: 'from-yellow-200 to-yellow-400', icon: Target , border: 'border-yellow-800'},
  { name: 'Google Analytics', color: 'from-indigo-200 to-indigo-400', icon: BarChart, border: 'border-indigo-800' },
]

export default function BrandSetup() {
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [connectedAccounts, setConnectedAccounts] = useState<Record<string, string[]>>({})
  const [brandName, setBrandName] = useState('')
  const [brandLogo, setBrandLogo] = useState<File | null>(null)
  const { toast } = useToast()

  const handleConnect = (platform: string, account: string) => {
    setConnectedAccounts(prev => ({
      ...prev,
      [platform]: [...(prev[platform] || []), account]
    }))
    toast({ description: `Successfully connected ${account} to ${platform}`, variant: "default" })
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setBrandLogo(file)
      toast({ description: 'Logo uploaded successfully', variant:"default" })
    }
  }

  const isConnected = (platform: string) => {
    return (connectedAccounts[platform]?.length || 0) > 0
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">Set Up Your Brand</CardTitle>
          <CardDescription>
            Connect your accounts and set up your brand details to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                id="brandName"
                placeholder="Enter your brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Input
                  id="brandLogo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('brandLogo')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {brandLogo ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {brandLogo && <span className="text-sm text-gray-500">{brandLogo.name}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platforms.map((platform) => (
              <Dialog key={platform.name} open={openModal === platform.name} onOpenChange={(isOpen) => setOpenModal(isOpen ? platform.name : null)}>
                <DialogTrigger asChild>
                  <Button className={`w-full h-24 bg-gradient-to-br ${platform.color} border ${platform.border} text-black relative`}>
                    <div className="flex flex-col items-center">
                      <platform.icon className="h-8 w-8 mb-2" />
                      <span>{platform.name}</span>
                    </div>
                    {isConnected(platform.name) && (
                      <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Connect to {platform.name}</DialogTitle>
                    <DialogDescription>
                      {platform.name === 'Shopify' 
                        ? 'Enter your Shopify store name and login to connect.'
                        : 'Select an account to connect with your brand.'}
                    </DialogDescription>
                  </DialogHeader>
                  {platform.name === 'Shopify' ? (
                    <ShopifyModalContent onConnect={handleConnect} />
                  ) : (
                    <OtherPlatformModalContent platform={platform.name} onConnect={handleConnect} />
                  )}
                </DialogContent>
              </Dialog>
            ))}
          </div>

          <Button 
            className="w-full" 
            disabled={!brandName || !brandLogo || Object.keys(connectedAccounts).length === 0}
          >
            Complete Setup
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

