import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FacebookLogo, GoogleLogo, Ga4Logo } from "@/data/logo";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setBrands } from '@/store/slices/BrandSlice';


interface PlatformModalProps {
  platform: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onSuccess?: (platform: string, accountName: string, accountId: string) => void;
}

interface GoogleAdsAccount {
  name: string;
  clientId: string;
  managerId?: string;
  hidden?: boolean;
}


interface GoogleAnalyticsAccount {
  propertyName: string;
  propertyId: string;
}

interface FacebookAdsAccount {
  adname: string;
  id: string;
}

export default function PlatformModal({
  platform,
  open,
  onOpenChange,
  brandId,
  onSuccess
}: PlatformModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [googleAdsAccounts, setGoogleAdsAccounts] = useState<GoogleAdsAccount[]>([]);
  const [googleAnalyticsAccounts, setGoogleAnalyticsAccounts] = useState<GoogleAnalyticsAccount[]>([]);
  const [facebookAdsAccounts, setFacebookAdsAccounts] = useState<FacebookAdsAccount[]>([]);
  const [showLoginButton, setShowLoginButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;
  const user = useSelector((state: RootState) => state.user.user);
  const userId = user?.id;
  const dispatch = useDispatch();
  const brands = useSelector((state: RootState) => state.brand.brands);

  // Check URL parameters for modal opening
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modalToOpen = params.get('openModal');
    
    if (modalToOpen && onOpenChange) {
      switch (modalToOpen.toLowerCase()) {
        case 'googleads':
          if (platform.toLowerCase() === 'google ads') {
            onOpenChange(true);
          }
          break;
        case 'googleanalytics':
          if (platform.toLowerCase() === 'google analytics') {
            onOpenChange(true);
          }
          break;
        case 'facebook':
          if (platform.toLowerCase() === 'facebook') {
            onOpenChange(true);
          }
          break;
      }
      
      // Remove the modal parameter from URL
      params.delete('openModal');
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [platform, onOpenChange]);

  useEffect(() => {
    const fetchConnectedAccounts = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/brands/${brandId}`, {
          withCredentials: true,
        });
        const brand = response.data;

        const connectedIds: string[] = [];
        if (brand.fbAdAccounts?.length) connectedIds.push(...brand.fbAdAccounts);
        if (brand.googleAdAccount) connectedIds.push(brand.googleAdAccount);
        if (brand.ga4Account?.PropertyID) connectedIds.push(brand.ga4Account.PropertyID);

        setConnectedAccounts(connectedIds);
      } catch (error) {
        console.error('Error fetching connected accounts:', error);
      }
    };

    if (open && brandId) {
      fetchConnectedAccounts();
    }
  }, [brandId, open]);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!open) return;

      setLoading(true);
      try {
        let endpoint = '';
        let accountsSetter: any = null;

        switch (platform.toLowerCase()) {
          case 'google ads':
            endpoint = '/api/setup/google-accounts';
            accountsSetter = setGoogleAdsAccounts;
            break;
          case 'google analytics':
            endpoint = '/api/setup/ga4-propertyIds';
            accountsSetter = setGoogleAnalyticsAccounts;
            break;
          case 'facebook':
            endpoint = '/api/setup/fb-ad-accounts';
            accountsSetter = setFacebookAdsAccounts;
            break;
        }
        console.log(`Calling API: ${baseURL}${endpoint} with userId: ${userId}`);

        if (!endpoint) {
          throw new Error('Invalid platform');
        }
        const response = await axios.post(
          `${baseURL}${endpoint}`,{},
          { withCredentials: true }
        );

        if (response.status === 200) {
          setShowLoginButton(false);
          if (platform.toLowerCase() === 'google ads') {
            accountsSetter(response.data?.clientAccounts.filter((account: GoogleAdsAccount) => !account.hidden));
          } else if (platform.toLowerCase() === 'google analytics') {
            accountsSetter(response.data.propertiesList || []);
          } else if (platform.toLowerCase() === 'facebook') {
            accountsSetter(response.data.adAccounts || []);
          }
        }
      } catch (error) {
        handleError(error as AxiosError, setShowLoginButton);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [platform, userId, open]);

  const handleError = (error: unknown, setShowLoginButton: (value: boolean) => void) => {
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      const { status, data } = axiosError.response;
      const code = axiosError.code;
      if (status === 400) {
        setShowLoginButton(true);
      } else if (status === 403) {
        setShowLoginButton(true);
      } else if (status === 401 || code === 'TOKEN_EXPIRED') {
        alert('Your Google session has expired. Please log in again.');
        setShowLoginButton(true);
      } else {
        console.error('Unhandled Error Status:', status);
        console.error('Error Message:', data);
      }
    } else if (axiosError.request) {
      console.error('No response received:', axiosError.request);
    } else {
      console.error('Unexpected Error:', axiosError.message);
    }
  };

  const updateBrandWithAccount = async (accountIds: string[], accountNames: string[], managerIds: (string | undefined)[]) => {
    try {
      let updateData = {};
      
      switch (platform.toLowerCase()) {
        case 'facebook':
          // Get current brand to append to existing accounts
          const currentBrand = brands.find(brand => brand._id === brandId);
          const existingFbAccounts = currentBrand?.fbAdAccounts || [];
          const newFbAccounts = [...new Set([...existingFbAccounts, ...accountIds])];
          updateData = { fbAdAccounts: newFbAccounts };
          break;
        case 'google ads':
          // Get current brand to append to existing accounts
          const currentBrandForGoogle = brands.find(brand => brand._id === brandId);
          const existingGoogleAccounts = currentBrandForGoogle?.googleAdAccount || [];
          const newGoogleAccounts = accountIds.map((accountId, index) => ({
            clientId: accountId,
            managerId: managerIds[index] || ''
          }));
          // Merge existing and new accounts, avoiding duplicates
          const mergedGoogleAccounts = [...existingGoogleAccounts];
          newGoogleAccounts.forEach(newAccount => {
            const exists = mergedGoogleAccounts.some(existing => 
              existing.clientId === newAccount.clientId && existing.managerId === newAccount.managerId
            );
            if (!exists) {
              mergedGoogleAccounts.push({
                clientId: newAccount.clientId,
                managerId: newAccount.managerId || ''
              });
            }
          });
          updateData = { googleAdAccount: mergedGoogleAccounts };
          break;
        case 'google analytics':
          // For GA4, we typically only have one account, but we can support multiple
          const currentBrandForGA = brands.find(brand => brand._id === brandId);
          const existingGAAccount = currentBrandForGA?.ga4Account?.PropertyID;
          if (!existingGAAccount) {
            updateData = { ga4Account: { PropertyID: accountIds[0] } };
          } else {
            // If GA4 account already exists, we might want to replace it or handle differently
            updateData = { ga4Account: { PropertyID: accountIds[0] } };
          }
          break;
      }
  
      const response = await axios.patch(
        `${baseURL}/api/brands/update/${brandId}`,
        updateData,
        { withCredentials: true }
      );
  
      if (response.status === 200) {
        
        const updatedBrand = response.data;
        
        
        const updatedBrands = brands.map(brand => 
          brand._id === brandId ? updatedBrand : brand
        );
        
        dispatch(setBrands(updatedBrands));
        
        // Call onSuccess for each account
        accountIds.forEach((accountId, index) => {
          onSuccess?.(platform, accountNames[index], accountId);
        });
        
        // Don't automatically close modal - let handleConnectSelected handle it
        // setSelectedAccounts([]);
        // onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating brand:', error);
    }
  };

  // const handleConnect = async (account: GoogleAdsAccount | GoogleAnalyticsAccount | FacebookAdsAccount) => {
  //   let accountId: string;

  //   if ('clientId' in account) {
  //     accountId = account.clientId;
  //   } else if ('propertyId' in account) {
  //     accountId = account.propertyId;
  //   } else if ('id' in account) {
  //     accountId = account.id;
  //   } else {
  //     return;
  //   }

  //   // Instead of immediately connecting, add to selected accounts
  //   setSelectedAccounts(prev => {
  //     if (prev.includes(accountId)) {
  //       return prev.filter(id => id !== accountId);
  //     } else {
  //       return [...prev, accountId];
  //     }
  //   });
  // };

  const handleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleConnectSelected = async () => {
    if (selectedAccounts.length === 0) return;

    const selectedAccountData = selectedAccounts.map(accountId => {
      const account = filteredAccounts()?.find(acc => {
        if (platform.toLowerCase() === 'google ads') {
          return (acc as GoogleAdsAccount).clientId === accountId;
        } else if (platform.toLowerCase() === 'facebook') {
          return (acc as FacebookAdsAccount).id === accountId;
        } else {
          return (acc as GoogleAnalyticsAccount).propertyId === accountId;
        }
      });

      if (!account) return null;

      let displayName: string;
      let managerId: string | undefined;

      if ('clientId' in account) {
        managerId = account.managerId;
        displayName = managerId
          ? `${account.name} (${account.clientId}/${managerId})`
          : `${account.name} (${account.clientId})`;
      } else if ('propertyId' in account) {
        displayName = `${account.propertyName} (${account.propertyId})`;
      } else if ('id' in account) {
        displayName = `${account.adname}`;
      } else {
        return null;
      }

      return { accountId, displayName, managerId };
    }).filter(Boolean);

    if (selectedAccountData.length > 0) {
      const accountIds = selectedAccountData.map(data => data!.accountId);
      const accountNames = selectedAccountData.map(data => data!.displayName);
      const managerIds = selectedAccountData.map(data => data!.managerId);

      await updateBrandWithAccount(accountIds, accountNames, managerIds);
      
      // Show success message
      console.log(`Successfully connected ${selectedAccountData.length} account(s)`);
      
      // Reset selected accounts and close modal
      setSelectedAccounts([]);
      onOpenChange(false);
    }
  };

  const handleGoogleAdLogin = async () => {
    try {
      const response = await axios.get(
        `${baseURL}/api/auth/google?context=googleAdSetup&source=${encodeURIComponent(window.location.pathname)}`, 
        { withCredentials: true }
      );
      const { authUrl } = response.data;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error getting Google Auth URL:', error);
    }
  };

  const handleGoogleAnalyticsLogin = async () => {
    try {
      const response = await axios.get(
        `${baseURL}/api/auth/google?context=googleAnalyticsSetup&source=${encodeURIComponent(window.location.pathname)}`, 
        { withCredentials: true }
      );
      const { authUrl } = response.data;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error getting Google Auth URL:', error);
    }
  };

  const handleFbLogin = async () => {
    try {
      const response = await axios.get(
        `${baseURL}/api/auth/facebook?source=${encodeURIComponent(window.location.pathname)}`, 
        { withCredentials: true }
      );
      if (response.data.success) {
        window.location.href = response.data.authURL;
      }
    } catch (error) {
      console.error('Error getting Facebook Auth URL:', error);
    }
  };

  const filteredAccounts = () => {
    if (platform.toLowerCase() === 'google ads') {
      if (!googleAdsAccounts || googleAdsAccounts.length === 0) {
        return null;
      }
      return googleAdsAccounts.filter((account) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          account.name.toLowerCase().includes(searchLower) ||
          account.clientId.toLowerCase().includes(searchLower) ||
          (account.managerId && account.managerId.toLowerCase().includes(searchLower))
        );
      });
    } else if (platform.toLowerCase() === 'google analytics') {
      if (!googleAnalyticsAccounts || googleAnalyticsAccounts.length === 0) {
        return null;
      }
      return googleAnalyticsAccounts.filter((account) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          account.propertyName.toLowerCase().includes(searchLower) ||
          account.propertyId.toLowerCase().includes(searchLower)
        );
      });
    } else if (platform.toLowerCase() === 'facebook') {
      if (!facebookAdsAccounts || facebookAdsAccounts.length === 0) {
        return null; // Return null if there are no Facebook Ads accounts
      }
      return facebookAdsAccounts.filter((account) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          account.adname.toLowerCase().includes(searchLower) ||
          account.id.toLowerCase().includes(searchLower)
        );
      });
    } else {
      return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Connect {platform} Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">Loading...</div>
          ) : showLoginButton ? (
            <Button
              size="sm"
              onClick={platform.toLowerCase() === 'facebook' ? handleFbLogin : platform.toLowerCase()=== 'google ads' ? handleGoogleAdLogin : handleGoogleAnalyticsLogin}
              className="flex items-center gap-2 bg-white text-black border border-green-800 hover:bg-green-50"
            >
              {platform.toLowerCase() === 'google ads' && (
                <>
                  <GoogleLogo height="1rem" width="1rem" />
                  Connect to your Google Ads account
                </>
              )}
              {platform.toLowerCase() === 'google analytics' && (
                <>
                  <Ga4Logo height="1rem" width="1rem" />
                  Connect to your GA4 account
                </>
              )}
              {platform.toLowerCase() === 'facebook' && (
                <>
                  <FacebookLogo height="1rem" width="1rem" />
                  Connect to your Facebook account
                </>
              )}
            </Button>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search accounts..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Selected accounts section - sticky at top */}
              {selectedAccounts.length > 0 && (
                <div className="sticky top-0 z-10 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      {selectedAccounts.length} account(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAccounts([]);
                          onOpenChange(false);
                        }}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleConnectSelected}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Save ({selectedAccounts.length})
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scrollable accounts list */}
              <div className="max-h-[50vh] overflow-auto">
                {(() => {
                  const filtered = filteredAccounts();  
                  if (!filtered || filtered.length === 0) {
                    return (
                      <div className="text-center py-4 text-gray-500">
                        {searchTerm ? 'No accounts found matching your search.' : 'No accounts available.'}
                      </div>
                    );
                  }
                  
                  return filtered.map((account, _) => {
                    const isGoogleAds = platform.toLowerCase() === 'google ads';
                    const isFacebook = platform.toLowerCase() === 'facebook';

                    const accountId = isGoogleAds
                      ? (account as GoogleAdsAccount).clientId
                      : isFacebook
                        ? (account as FacebookAdsAccount).id
                        : (account as GoogleAnalyticsAccount).propertyId;

                    const managerId = isGoogleAds
                      ? (account as GoogleAdsAccount).managerId
                      : undefined;

                    const accountName = isGoogleAds
                      ? (account as GoogleAdsAccount).name
                      : isFacebook
                        ? (account as FacebookAdsAccount).adname
                        : (account as GoogleAnalyticsAccount).propertyName;

                    // Create unique key to prevent duplicates
                    const uniqueKey = isGoogleAds && managerId 
                      ? `${accountId}-${managerId}`
                      : accountId;

                    const platformLogo = isGoogleAds ? (
                      <GoogleLogo height="1rem" width="1rem" />
                    ) : isFacebook ? (
                      <FacebookLogo height="1rem" width="1rem" />
                    ) : (
                      <Ga4Logo height="1rem" width="1rem" />
                    );

                    const isConnected = connectedAccounts.includes(accountId);
                    const isSelected = selectedAccounts.includes(accountId);

                    const displayText = isGoogleAds && managerId
                      ? `${accountName} (${accountId}/${managerId})`
                      : isFacebook
                        ? `${accountName}`
                        : `${accountName} (${accountId})`;

                    return (
                      <div
                        key={uniqueKey}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                     
                          <span>
                            <div className="flex flex-row items-center gap-3">
                              {platformLogo}
                              {displayText}
                            </div>
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAccountSelection(accountId)}
                          disabled={isConnected}
                          className={isConnected ? "bg-gray-400" : isSelected ? "bg-green-600" : "bg-blue-600"}
                        >
                          {isConnected && <Check className="h-4 w-4 mr-2" />}
                          {isConnected ? 'Connected' : isSelected ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}