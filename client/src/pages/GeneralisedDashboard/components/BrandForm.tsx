import React, { useEffect, useState } from 'react';
import { Upload, Check, ArrowRight, Building2, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import ShopifyModalContent from './ShopifyModalContent';
import OtherPlatformModalContent from './OtherPlatformModalContent';
import { FacebookLogo,  GoogleLogo, Ga4Logo, ShopifyLogo } from '@/data/logo';
import axios from 'axios';
import { setUser } from '@/store/slices/UserSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Label } from '@radix-ui/react-label';



const platforms = [
  { name: 'Shopify', color: 'bg-emerald-50', icon: ShopifyLogo, textColor: 'text-emerald-700', ringColor: 'ring-emerald-200', description: 'Connect your e-commerce store' },
  { name: 'Facebook', color: 'bg-blue-50', icon: FacebookLogo, textColor: 'text-blue-700', ringColor: 'ring-blue-200', description: 'Link your ad accounts' },
  { name: 'Google Ads', color: 'bg-rose-50', icon: GoogleLogo, textColor: 'text-rose-700', ringColor: 'ring-rose-200', description: 'Import campaign data' },
  { name: 'Google Analytics', color: 'bg-yellow-50', icon: Ga4Logo, textColor: 'text-yellow-700', ringColor: 'ring-yellow-200', description: 'Track website metrics' },
];

const steps = ['Brand Details', 'Platform Connections', 'Review'];

export default function BrandSetup() {
  const [currentStep, setCurrentStep] = useState(0);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<Record<string, string[]>>({});
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState<File | null>(null);
  const [googleAdsConnections, setGoogleAdsConnections] = useState<{
    clientId: string;
    managerId?: string;
  }[]>([]);
  const [ga4Id, setGa4Id] = useState<string>('');
  const [fbAdId, setFBAdId] = useState<string[]>([]);
  const [shop, setShop] = useState<string>('');
  const [shopifyAccessToken, setShopifyAccessToken] = useState('');
  const { toast } = useToast();
  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;
  const user = useSelector((state: RootState) => state.user.user)
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

  const handleConnect = (
    platform: string, 
    account: string, 
    accountId: string, 
    managerId?: string, 
  ) => {
    // Update connected accounts
    setConnectedAccounts(prev => ({
      ...prev,
      [platform]: [...(prev[platform] || []), account]
    }));

    // Handle platform-specific connection logic
    if (platform.toLowerCase() === 'google ads') {
      // Store comprehensive Google Ads connection details
      setGoogleAdsConnections(prev => [
        ...prev, 
        {
          clientId:  accountId,
          managerId:  managerId,
        }
      ]);
    } else if (platform.toLowerCase() === 'google analytics') {
      setGa4Id(accountId);
    } else if (platform.toLowerCase() === 'facebook') {
      setFBAdId(prev => [...prev, accountId]);
    }

    toast({ description: `Successfully connected ${account} to ${platform}`, variant: "default" });
  };


  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBrandLogo(file);
      toast({ description: 'Logo uploaded successfully', variant: "default" });
    }
  };

  const isConnected = (platform: string) => {
    return (connectedAccounts[platform]?.length || 0) > 0;
  };

  const getConnectedId = (platformName: string): string => {
    switch (platformName.toLowerCase()) {
      case 'google ads':
        return googleAdsConnections.map(conn => conn.clientId).join(',');
      case 'google analytics':
        return ga4Id;
      case 'facebook':
        return fbAdId.join(',');
      default:
        return '';
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!brandName && !!brandLogo;
      case 1:
        return Object.keys(connectedAccounts).length > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!brandName || Object.keys(connectedAccounts).length === 0) {
      return toast({ description: 'Please complete all fields before submitting.', variant: "destructive" });
    }

    const payload = {
      name: brandName,
      logoUrl: brandLogo || '',
      googleAdAccount: googleAdsConnections.map(connection => ({
        clientId: connection.clientId,
        managerId: connection.managerId || ''
      })),
      ga4Account: { PropertyID: ga4Id || '' },
      fbAdAccounts: fbAdId.map((accountId) => accountId),
      shopifyAccount: { shopName: shop || '', shopifyAccessToken: shopifyAccessToken || '' }
    };

    try {
      // First create the brand
      const brandResponse = await axios.post(
        `${baseURL}/api/brands/add`,
        payload,
        { withCredentials: true }
      );

      const newBrandId = brandResponse.data.brand._id;

      // Then add the brand to user
      if (user) {
        await axios.post(
          `${baseURL}/api/users/add-brand`,
          {
            userId: user?.id,
            brandId: newBrandId
          },
          { withCredentials: true }
        );
      }

      // Update local state
      const updatedUser = user ? {
        ...user,
        brands: [...user.brands, newBrandId]
      } : null;

      if (updatedUser) {
        console.log(updatedUser);
        dispatch(setUser(updatedUser));
        console.log("after updating the state",user);
        navigate('/dashboard');
      }

      toast({ description: 'Brand setup completed successfully!', variant: "default" });

    } catch (error) {
      console.error(error);
      toast({ description: 'Error creating brand. Please try again.', variant: "destructive" });
    }
  };


  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="block text-sm font-medium text-gray-700">Brand Name</Label>
              <Input
                placeholder="Enter your brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-4">
              <Label className="block text-sm font-medium text-gray-700">Brand Logo</Label>
              <div className="flex items-center gap-4">
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
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">{brandLogo.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {platforms.map((platform) => (
              <Dialog
                key={platform.name}
                open={openModal === platform.name}
                onOpenChange={(isOpen) => setOpenModal(isOpen ? platform.name : null)}
              >
                <DialogTrigger asChild>
                  <button
                    className={`relative group p-6 rounded-xl ${platform.color} ring-1 ${platform.ringColor} transition-all duration-200 hover:scale-[1.02]`}
                  >
                    <div className="flex items-start gap-4">
                      <platform.icon width="2rem" height="2rem" />
                      <div className="flex-1 text-left">
                        <h3 className={`font-semibold ${platform.textColor}`}>{platform.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{platform.description}</p>
                      </div>
                      {isConnected(platform.name) ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>
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
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-gray-50 p-6">
              <h3 className="font-medium text-gray-900">Brand Details</h3>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name</span>
                  <span className="font-medium">{brandName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Logo</span>
                  <span className="font-medium">{brandLogo?.name}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-6">
              <h3 className="font-medium text-gray-900">Connected Platforms</h3>
              <div className="mt-4 space-y-3">
                {Object.entries(connectedAccounts).map(([platform, accounts]) => (
                  <div key={platform} className="flex justify-between">
                    <span className="text-gray-600">{platform}</span>
                    <span className="font-medium">{accounts.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="mx-auto shadow-lg">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-full bg-primary/10 p-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Brand Setup</h2>
            <p className="text-gray-500">Complete the steps below to set up your brand</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${index <= currentStep ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className={`ml-2 ${index <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-24 h-0.5 mx-4 ${index < currentStep ? 'bg-primary' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {renderStepContent()}

        <div className="flex justify-between mt-8">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(current => current - 1)}
            >
              Back
            </Button>
          )}
          <Button
            className="ml-auto"
            disabled={!canProceed()}
            onClick={() => {
              if (currentStep === steps.length - 1) {
                handleSubmit();
              } else {
                setCurrentStep(current => current + 1);
              }
            }}
          >
            {currentStep === steps.length - 1 ? (
              <>
                Complete Setup
                <Check className="ml-2 h-5 w-5" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}