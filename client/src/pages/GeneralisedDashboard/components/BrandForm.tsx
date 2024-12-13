import React, { useEffect, useState } from 'react'
import { Upload, Check, ArrowRight, Building2 } from 'lucide-react'
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
  { name: 'Shopify', color: 'from-emerald-50 to-emerald-100', icon: shopifyLogo, border: 'border-emerald-600', description: 'Connect your e-commerce store' },
  { name: 'Facebook', color: 'from-blue-50 to-blue-100', icon: FacebookLogo, border: 'border-blue-600', description: 'Link your ad accounts' },
  { name: 'Google Ads', color: 'from-rose-50 to-rose-100', icon: GoogleLogo, border: 'border-rose-600', description: 'Import campaign data' },
  { name: 'Google Analytics', color: 'from-yellow-50 to-yellow-100', icon: Ga4Logo, border: 'border-yellow-600', description: 'Track website metrics' },
];

export default function BrandSetup() {
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [connectedAccounts, setConnectedAccounts] = useState<Record<string, string[]>>({})
  const [brandName, setBrandName] = useState('')
  const [brandLogo, setBrandLogo] = useState<File | null>(null)
  const [googleAdId , setGoogleAdId] = useState<string>('')
  const [ga4Id , setGa4Id] = useState<string>('')
  const [fbAdId , setFBAdId] = useState<string[]>([])
  const [shop, setShop] = useState<string>('')
  const [shopifyAccessToken, setShopifyAccessToken] = useState('')
  const { toast } = useToast()
  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const shopName = params.get('shop_name');

    if (accessToken && shopName) {
      setShopifyAccessToken(accessToken); 
      setShop(shopName); 

      setConnectedAccounts(prev => ({
        ...prev,
        Shopify: [shopName], 
      }));
    }
  }, []);

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
      shopifyAccount:{ shopName: shop || '' , shopifyAccessToken: shopifyAccessToken || ''}
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
    <Card className="border-2 border-gray-100 shadow-lg">
      <CardHeader className="space-y-4 pb-8">
        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Brand Setup</CardTitle>
            <CardDescription className="mt-1 text-gray-500">
              Connect your accounts and configure your brand settings
            </CardDescription>
          </div>
        </div>
        <div className="mt-4 h-2 w-full rounded-full bg-gray-100">
          <div 
            className="h-2 rounded-full bg-primary transition-all bg-green-700"
            style={{ 
              width: `${Math.min(
                ((!!brandName ? 25 : 0) + 
                (!!brandLogo ? 25 : 0) + 
                (Object.keys(connectedAccounts).length * 12.5)), 
                100)}%` 
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Brand Name</label>
            <Input
              id="brandName"
              placeholder="Enter your brand name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Brand Logo</label>
            <div className="flex items-center gap-3">
              <Input
                id="brandLogo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById('brandLogo')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {brandLogo ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {brandLogo && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-md">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">{brandLogo.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Platforms</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((platform) => (
              <Dialog 
                key={platform.name} 
                open={openModal === platform.name} 
                onOpenChange={(isOpen) => setOpenModal(isOpen ? platform.name : null)}
              >
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className={`w-full h-32 bg-gradient-to-br ${platform.color} hover:shadow-md transition-all duration-200 border ${platform.border} relative group`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <platform.icon width='1.5rem' height='1.5rem' />
                      <span className="font-medium">{platform.name}</span>
                      <span className="text-xs text-gray-600">{platform.description}</span>
                    </div>
                    {isConnected(platform.name) && (
                      <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
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
                    <ShopifyModalContent />
                  ) : (
                    <OtherPlatformModalContent 
                      platform={platform.name} 
                      onConnect={handleConnect} 
                      connectedId={getConnectedId(platform.name)} 
                    />
                  )}
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>

        <Button 
          className="w-full mt-8 text-sm font-medium"
          disabled={!brandName || !brandLogo || Object.keys(connectedAccounts).length === 0}
          onClick={handleSubmit}
        >
          Complete Setup
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}