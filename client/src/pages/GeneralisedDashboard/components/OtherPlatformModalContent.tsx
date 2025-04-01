import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Ga4Logo, FacebookLogo, GoogleLogo } from '@/data/logo'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'




interface OtherPlatformModalContentProps {
  platform: string;
  onConnect: (
    platform: string,
    account: string,
    accountId: string,
    managerId?: string,
  ) => void;
  onRemove?: (platform: string, accountId: string, managerId?: string) => void;
  connectedId: string;
}

interface GoogleAdsAccount {
  name: string;
  clientId: string;
  managerId?: string;
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
  onRemove
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
        handleError(error);
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
        handleError(error);
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
        handleError(error);
      } finally {
        setLoading(false); // End loading
      }
    };

    if (platform.toLowerCase() === 'google ads') fetchGoogleAdsAccounts();
    if (platform.toLowerCase() === 'google analytics') fetchGoogleAnalyticsAccounts();
    if (platform.toLowerCase() === 'facebook') fetchFacebookAdsAccounts();
  }, [platform, user]);

  const handleError = (error: any) => {
    // Axios error handling
    if (axios.isAxiosError(error)) {
      const axiosError = error;
      const { response, request } = axiosError;

      // If response received from server
      if (response) {
        const { status, data, config } = response;
        const code = data?.error?.code || data?.code;

        // Common authentication and authorization errors
        const authErrors = [
          401,  // Unauthorized
          403,  // Forbidden
          'UNAUTHENTICATED',
          'TOKEN_EXPIRED',
          'INVALID_CREDENTIALS'
        ];

        // Check if the error is related to authentication
        const isAuthError = authErrors.some(
          authCode => status === authCode || code === authCode
        );

        if (isAuthError) {
          console.error('Authentication Error:', { status, code, message: data?.message });
          setShowLoginButton(true);
          return;
        }

        // Specific Google Ads API error handling
        if (data?.errors && data.errors.length > 0) {
          const googleAdsError = data.errors[0];
          const googleAdsErrorMessage = googleAdsError.message || 'Google Ads API Error';

          console.error('Google Ads API Error:', googleAdsErrorMessage);

          // Common Google Ads authentication scenarios
          const googleAuthErrors = [
            'not associated with any Ads accounts',
            'missing required authentication credential',
            'OAuth access token invalid'
          ];

          const isGoogleAuthError = googleAdsErrorMessage &&
            googleAuthErrors.some(errText =>
              googleAdsErrorMessage.toLowerCase().includes(errText.toLowerCase())
            );

          if (isGoogleAuthError) {
            setShowLoginButton(true);
            return;
          }
        }

        // General server error handling
        console.error('Server Error:', {
          status,
          url: config?.url,
          method: config?.method
        });
        setShowLoginButton(true);

      }
      // No response received
      else if (request) {
        console.error('No response received:', request);
        setShowLoginButton(true);
      }
      // Network or other axios error
      else {
        console.error('Request Setup Error:', axiosError.message);
        setShowLoginButton(true);
      }
    }
    // Non-axios error handling
    else {
      console.error('Unexpected Error:', error);
      setShowLoginButton(true);
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
                    <div className="flex items-center gap-2">
                      {connectedId && onRemove && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onRemove(
                            platform,
                            accountId,
                            platform.toLowerCase() === 'google ads' ? managerId : undefined
                          )}
                          className="flex items-center"
                        >
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleConnect(account)}
                        disabled={connectedId.includes(accountId)}
                        className={connectedId.includes(accountId) ? "bg-green-600" : "bg-blue-600"}
                      >
                        {connectedId.includes(accountId) && <Check className="h-4 w-4 mr-2" />}
                        {connectedId.includes(accountId) ? 'Connected' : 'Connect'}
                      </Button>
                    </div>
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