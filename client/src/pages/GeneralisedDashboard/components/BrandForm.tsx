import React, { useState } from 'react'
import { Upload, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import ShopifyModalContent from './ShopifyModalContent'
import OtherPlatformModalContent from './OtherPlatformModalContent'
import { FacebookLogo, GoogleLogo } from '@/pages/CampaignMetricsPage'
import { Ga4Logo, shopifyLogo } from './OtherPlatformModalContent'
import axios from 'axios'

const platforms = [
  { name: 'Shopify', color: 'from-green-50 to-green-200', icon: shopifyLogo , border: 'border-green-800'},
  { name: 'Facebook', color: 'from-blue-50 to-blue-200', icon: FacebookLogo , border: 'border-blue-800'},
  { name: 'Google Ads', color: 'from-green-50 to-green-200', icon: GoogleLogo , border: 'border-green-800'},
  { name: 'Google Analytics', color: 'from-yellow-50 to-yellow-200', icon: Ga4Logo, border: 'border-yellow-800' },
]


export default function BrandSetup() {
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [connectedAccounts, setConnectedAccounts] = useState<Record<string, string[]>>({})
  const [brandName, setBrandName] = useState('')
  const [brandLogo, setBrandLogo] = useState<File | null>(null)
  const [googleAdId , setGoogleAdId] = useState<string>('')
  const [ga4Id , setGa4Id] = useState<string>('')
  const [fbAdId , setFBAdId] = useState<string[]>([])
  const { toast } = useToast()
  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL

  const handleConnect = (platform: string, account: string, accountId: string) => {
    setConnectedAccounts(prev => ({
      ...prev,
      [platform]: [...(prev[platform] || []), account]
    }))
    if (platform.toLowerCase() === 'google ads') {
      setGoogleAdId(accountId);
    } else if (platform.toLowerCase() === 'google analytics') {
      setGa4Id(accountId);
    } else {
      setFBAdId(prev => [...prev, accountId]);
    }
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

  function getConnectedId(platformName: string): string {
    switch (platformName.toLowerCase()) {
      case 'google ads':
        return googleAdId;
      case 'google analytics':
        return ga4Id;
      case 'facebook':
        return fbAdId.join(',');
      default:
        return '';
    }
  }

  const handleSubmit = async () => {
    if (!brandName || Object.keys(connectedAccounts).length === 0) {
      return toast({ description: 'Please complete all fields before submitting.', variant: "destructive" });
    }

    const payload = {
      name: brandName,
      logoUrl: brandLogo || '',
      googleAdAccount: googleAdId || '',
      ga4Account: { PropertyID: ga4Id || '' },
      fbAdAccounts: fbAdId.map((accountId) => ( accountId )), 
    };
  
    try {
      const response = await axios.post(
        `${baseURL}/api/brands/add`,
        payload, 
        {
          withCredentials: true,
        }
      );
  
      toast({ description: 'Brand setup completed successfully!', variant: "default" });
      console.log(response.data);
    } catch (error) {
      console.error(error);
      toast({ description: 'Error creating brand. Please try again.', variant: "destructive" });
    }
  };
  

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
                      <platform.icon width="1.75rem" height="1.75rem" />
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
                    <OtherPlatformModalContent platform={platform.name} onConnect={handleConnect} connectedId={getConnectedId(platform.name) || ''} />
                  )}
                </DialogContent>
              </Dialog>
            ))}
          </div>

          <Button 
            className={`w-full `} 
            disabled={!brandName || !brandLogo || Object.keys(connectedAccounts).length === 0}
            onClick={handleSubmit}
          >
            Complete Setup
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

