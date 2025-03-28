import { useState, useEffect } from 'react'
import axios, { AxiosError } from 'axios'
import { Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Ga4Logo, FacebookLogo, GoogleLogo } from '@/data/logo'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'




interface OtherPlatformModalContentProps {
  platform: string;
  onConnect: (platform: string, account: string, accountId: string, managerId?: string) => void;
  connectedId: string;
}

interface GoogleAdsAccount {
  name: string;
  clientId: string;
  managerId?: string;  // Added managerId
  hidden?: boolean;
}

interface GoogleAnalyticsAccount {
  propertyName: string
  propertyId: string
}

interface FacebookAdsAccount {
  adname: string
  id: string
}

export default function OtherPlatformModalContent({
  platform,
  onConnect,
  connectedId,
}: OtherPlatformModalContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [googleAdsAccounts, setGoogleAdsAccounts] = useState<GoogleAdsAccount[]>([]);
  const [googleAnalyticsAccounts, setGoogleAnalyticsAccounts] = useState<GoogleAnalyticsAccount[]>([]);
  const [facebookAdsAccounts, setFacebookAdsAccounts] = useState<FacebookAdsAccount[]>([]);
  const [showLoginButton, setShowLoginButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL

  const user = useSelector((state: RootState) => state.user.user);

  useEffect(() => {
    const fetchGoogleAdsAccounts = async () => {
      setLoading(true); // Start loading
      try {
        const userId = user?.id;
        const response = await axios.post(
          `${baseURL}/api/setup/google-accounts`,
          { userId },
          { withCredentials: true }
        );

        if (response.status === 200) {
          setShowLoginButton(false);
          setGoogleAdsAccounts(
            response.data?.clientAccounts.filter((account: GoogleAdsAccount) => !account.hidden)
          );
        } else {
          console.log('Unexpected status code:', response.status);
        }
      } catch (error) {
        handleError(error, setShowLoginButton);
      } finally {
        setLoading(false); // End loading
      }
    };

    const fetchGoogleAnalyticsAccounts = async () => {
      setLoading(true); // Start loading
      try {
        const userId = user?.id;
        const response = await axios.post(
          `${baseURL}/api/setup/ga4-propertyIds`,
          { userId },
          { withCredentials: true }
        );

        if (response.status === 200) {
          setShowLoginButton(false);
          setGoogleAnalyticsAccounts(response.data.propertiesList || []);
        } else {
          console.log('Unexpected status code:', response.status);
        }
      } catch (error) {
        handleError(error, setShowLoginButton);
      } finally {
        setLoading(false); // End loading
      }
    };

    const fetchFacebookAdsAccounts = async () => {
      setLoading(true); // Start loading
      try {
        const userId = user?.id;
        const response = await axios.post(
          `${baseURL}/api/setup/fb-ad-accounts`,
          { userId },
          { withCredentials: true }
        );

        setFacebookAdsAccounts(response.data.adAccounts || []);
      } catch (error) {
        handleError(error, setShowLoginButton);
      } finally {
        setLoading(false); // End loading
      }
    };

    if (platform.toLowerCase() === 'google ads') fetchGoogleAdsAccounts();
    if (platform.toLowerCase() === 'google analytics') fetchGoogleAnalyticsAccounts();
    if (platform.toLowerCase() === 'facebook') fetchFacebookAdsAccounts();
  }, [platform, user]);

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


  const filteredAccounts = () => {
    if (platform.toLowerCase() === 'google ads') {
      if (!googleAdsAccounts || googleAdsAccounts.length === 0) {
        return null;
      }
      return googleAdsAccounts.filter((account) =>
        account.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else if (platform.toLowerCase() === 'google analytics') {
      if (!googleAnalyticsAccounts || googleAnalyticsAccounts.length === 0) {
        return null;
      }
      return googleAnalyticsAccounts.filter((account) =>
        account.propertyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else if (platform.toLowerCase() === 'facebook') {
      if (!facebookAdsAccounts || facebookAdsAccounts.length === 0) {
        return null; // Return null if there are no Facebook Ads accounts
      }
      return facebookAdsAccounts.filter((account) =>
        account.adname.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return [];
    }
  };

  const handleConnect = (account: GoogleAdsAccount | GoogleAnalyticsAccount | FacebookAdsAccount) => {
    let accountId: string;
    let displayName: string;
    let managerId: string | undefined;

    if ('clientId' in account) {
      accountId = account.clientId;
      managerId = account.managerId;

      // Include manager ID in the display name if available
      displayName = managerId
        ? `${account.name} (${accountId}/${managerId})`
        : `${account.name} (${accountId})`;
    } else if ('propertyId' in account) {
      accountId = account.propertyId;
      displayName = `${account.propertyName} (${accountId})`;
    } else if ('id' in account) {
      accountId = account.id;
      displayName = `${account.adname}`;
    } else {
      accountId = '';
      displayName = '';
    }

    onConnect(platform, displayName, accountId, managerId);
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/auth/google?context=brandSetup`, { withCredentials: true });
      const { authUrl } = response.data;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error getting Google Auth URL:', error);
    }
  }

  const handleFbLogin = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/auth/facebook`, { withCredentials: true });
      if (response.data.success) {
        window.location.href = response.data.authURL;
      } else {
        console.error('Failed to get Facebook Auth URL');
      }
    } catch (error) {
      console.error('Error getting Facebook Auth URL:', error);
    }
  }

  return (
    loading ? <div>Loading...</div> : (
      <>
        {showLoginButton ? (
          <Button
            size="sm"
            onClick={platform.toLowerCase() === 'facebook' ? handleFbLogin : handleGoogleLogin}
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
          // Handle the case where the button is not shown
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
            <div className="max-h-[50vh] overflow-auto">
              {filteredAccounts()?.map((account) => {
                // Extract platform-specific details
                const isGoogleAds = platform.toLowerCase() === 'google ads';
                const isFacebook = platform.toLowerCase() === 'facebook';
                // const isGoogleAnalytics = platform.toLowerCase() === 'google analytics';

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

                const platformLogo = isGoogleAds ? (
                  <GoogleLogo height="1rem" width="1rem" />
                ) : isFacebook ? (
                  <FacebookLogo height="1rem" width="1rem" />
                ) : (
                  <Ga4Logo height="1rem" width="1rem" />
                );

                // Create display text based on account type
                const displayText = isGoogleAds && managerId
                  ? `${accountName} (${accountId}/${managerId})`
                  : isFacebook
                    ? `${accountName}`
                    : `${accountName} (${accountId})`;

                return (
                  <div
                    key={`${platform}-${accountId}-${managerId || ""}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                  >
                    <span>
                      <div className="flex flex-row items-center gap-3">
                        {platformLogo}
                        {displayText}
                      </div>
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleConnect(account)}
                      disabled={connectedId.includes(accountId)}
                      className="bg-blue-600"
                    >
                      {connectedId.includes(accountId) && <Check className="h-4 w-4 mr-2" />}
                      {connectedId.includes(accountId) ? 'Connected' : 'Connect'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </>
    )
  );
}