import { useState, useEffect } from 'react'
import axios, { AxiosError } from 'axios'
import { Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/context/UserContext'
import { GoogleLogo } from '@/pages/CampaignMetricsPage'

interface ga4LogoProps {
  width?: string | number;
  height?: string | number;
}

interface shopifyLogoProps {
  width?: string | number;
  height?: string | number;
}

export const Ga4Logo: React.FC<ga4LogoProps> = ({ width = '1.25rem', height = '1.25rem' }) => (
  <svg viewBox="0 0 24 24" style={{ height, width }}>
    <rect x="17" y="2" width="2rem" height="2rem" rx="2.5" fill="#F9AB00"></rect>
    <path d="M9.5 13.5C9.5 12.1193 10.6193 11 12 11C13.3807 11 14.5 12.1193 14.5 13.5V19.5C14.5 20.8807 13.3807 22 12 22C10.6193 22 9.5 20.8807 9.5 19.5V13.5Z" fill="#E37400"></path>
    <path d="M2 19.5C2 18.1193 3.11929 17 4.5 17C5.88071 17 7 18.1193 7 19.5C7 20.8807 5.88071 22 4.5 22C3.11929 22 2 20.8807 2 19.5Z" fill="#E37400"></path><path d="M6.92162 10C6.36184 10 5.95724 9.68838 5.95724 9.05977V8.55474H3.2304C2.49881 8.55474 2 8.1088 2 7.45332C2 7.07723 2.12193 6.70651 2.40459 6.22297C2.93666 5.29349 3.57403 4.31565 4.31116 3.23573C4.92637 2.31162 5.39747 2 6.20111 2C7.2209 2 7.88044 2.54265 7.88044 3.38617V7.02351H8.19082C8.72842 7.02351 9 7.34587 9 7.79181C9 8.23774 8.72288 8.55474 8.19082 8.55474H7.88044V9.05977C7.88044 9.68838 7.47585 10 6.92162 10ZM6.01267 7.09335V3.48287H5.97387C5.0095 4.8368 4.34996 5.83076 3.7015 7.03962V7.09335H6.01267Z" fill="#E37400"></path>
  </svg>
);

export const shopifyLogo: React.FC<shopifyLogoProps> = ({ width = '1.25rem', height = '1.25rem' }) => (
  <svg viewBox="0 0 64 64" style={{ height, width }}
    xmlns="http://www.w3.org/2000/svg" ><g>
      <g><path d="M51.759,12.659c-0.221-0.021-4.94-0.371-4.94-0.371s-3.28-3.271-3.639-3.631    c-0.36-0.362-1.063-0.254-1.337-0.171c-0.039,0.011-0.715,0.222-1.834,0.567c-1.096-3.167-3.027-6.077-6.426-6.077    c-0.094,0-0.191,0.004-0.289,0.01c-0.966-1.283-2.164-1.844-3.199-1.844c-7.919,0-11.703,9.951-12.889,15.008    c-3.078,0.956-5.266,1.638-5.542,1.728C9.943,18.42,9.89,18.474,9.667,20.1C9.495,21.331,5,56.264,5,56.264l35.022,6.594    L59,58.731c0,0-6.661-45.261-6.703-45.572C52.255,12.849,51.983,12.677,51.759,12.659z M33.034,10.88    c0,0.119-0.002,0.231-0.002,0.344c-1.928,0.601-4.02,1.251-6.121,1.906c1.179-4.57,3.387-6.78,5.32-7.613    C32.716,6.743,33.034,8.505,33.034,10.88z M29.876,3.278c0.346,0,0.688,0.116,1.018,0.345c-2.539,1.199-5.258,4.224-6.408,10.261    c-1.679,0.522-3.319,1.034-4.838,1.506C20.994,10.783,24.188,3.278,29.876,3.278z M31.241,30.19c0,0-2.05-1.099-4.561-1.099    c-3.686,0-3.872,2.324-3.872,2.908c0,3.195,8.287,4.42,8.287,11.903c0,5.888-3.714,9.678-8.726,9.678    c-6.012,0-9.088-3.761-9.088-3.761l1.609-5.345c0,0,3.16,2.729,5.83,2.729c1.74,0,2.449-1.38,2.449-2.387    c0-4.168-6.799-4.354-6.799-11.203c0-5.761,4.116-11.341,12.428-11.341c3.199,0,4.783,0.923,4.783,0.923L31.241,30.19z     M35.11,10.578c0-0.211,0.002-0.417,0.002-0.644c0-1.966-0.273-3.551-0.709-4.807c1.752,0.219,2.919,2.223,3.67,4.528    C37.194,9.931,36.194,10.241,35.11,10.578z" fill="#95C675" /></g><g><path d="M51.759,12.659c-0.221-0.021-4.94-0.371-4.94-0.371s-3.28-3.271-3.639-3.631    c-0.36-0.362-1.063-0.254-1.337-0.171c-0.039,0.011-0.715,0.222-1.834,0.567c-1.096-3.167-3.027-6.077-6.426-6.077    c-0.094,0-0.191,0.004-0.289,0.01c-0.966-1.283-2.164-1.844-3.199-1.844c-7.919,0-9.873,9.951-11.059,15.008    c-3.078,0.956-5.44,6.219-5.719,6.307c-1.719,0.542-1.772,0.596-1.996,2.223C11.148,25.91,5,56.264,5,56.264l35.022,6.594    L59,58.731c0,0-6.661-45.261-6.703-45.572C52.255,12.849,51.983,12.677,51.759,12.659z M33.034,10.88    c0,0.119-0.002,0.231-0.002,0.344c-1.928,0.601-4.02,1.251-6.121,1.906c1.179-4.57,3.387-6.78,5.32-7.613    C32.716,6.743,33.034,8.505,33.034,10.88z M29.876,3.278c0.346,0,0.688,0.116,1.018,0.345c-2.539,1.199-5.258,4.224-6.408,10.261    c-1.679,0.522-3.319,1.034-4.838,1.506C20.994,10.783,24.188,3.278,29.876,3.278z M31.241,30.19c0,0-2.05-1.099-4.561-1.099    c-3.686,0-3.872,2.324-3.872,2.908c0,3.195,8.287,4.42,8.287,11.903c0,5.888-3.714,9.678-8.726,9.678    c-6.012,0-9.088-3.761-9.088-3.761l1.609-5.345c0,0,3.16,2.729,5.83,2.729c1.74,0,2.449-1.38,2.449-2.387    c0-4.168-6.799-4.354-6.799-11.203c0-5.761,4.116-11.341,12.428-11.341c3.199,0,4.783,0.923,4.783,0.923L31.241,30.19z     M35.11,10.578c0-0.211,0.002-0.417,0.002-0.644c0-1.966-0.273-3.551-0.709-4.807c1.752,0.219,2.919,2.223,3.67,4.528    C37.194,9.931,36.194,10.241,35.11,10.578z" fill="#79B259" /></g><path d="M40.022,62.857L59,58.731c0,0-6.661-45.261-6.703-45.572c-0.042-0.311-0.313-0.482-0.538-0.5   c-0.221-0.021-4.94-0.371-4.94-0.371s-3.28-3.271-3.639-3.631c-0.192-0.194-0.479-0.249-0.75-0.251   c-0.72,1.22-0.571,3.537-0.571,3.537l-2.232,50.839L40.022,62.857z" fill="#55932C" /><path d="M33.583,2.977c-0.094,0-0.191,0.004-0.289,0.01c-0.966-1.283-2.164-1.844-3.199-1.844   c-7.887,0-11.674,9.873-12.875,14.947l2.447-0.759c1.354-4.609,4.545-12.053,10.209-12.053c0.346,0,0.688,0.116,1.018,0.345   c-2.532,1.195-5.244,4.209-6.398,10.213l2.43-0.75c1.182-4.541,3.381-6.739,5.307-7.569c0.484,1.227,0.803,2.988,0.803,5.363   c0,0.108,0,0.211-0.002,0.314l2.078-0.643c0-0.2,0.002-0.4,0.002-0.617c0-1.966-0.273-3.551-0.709-4.807   c1.746,0.218,2.912,2.213,3.662,4.508l1.938-0.601C38.906,5.876,36.976,2.977,33.583,2.977z" fill="#4A7A2B" /><path d="M47.611,12.348c-0.474-0.037-0.793-0.06-0.793-0.06s-3.28-3.271-3.639-3.631   c-0.192-0.194-0.479-0.249-0.75-0.251c-0.72,1.22-0.571,3.537-0.571,3.537l-2.232,50.839l0.396,0.075l10.098-2.196L47.611,12.348z" fill="#4C822A" />
    </g></svg>
)

interface OtherPlatformModalContentProps {
  platform: string;
  onConnect: (platform: string, account: string, accountId: string) => void;
  connectedId: string;
}

interface GoogleAdsAccount {
  name: string;
  clientId: string;
  hidden?: boolean;
}

interface GoogleAnalyticsAccount {
  propertyName: string
  propertyId: string
}

interface FacebookAdsAccount {
  propertyName: string
  propertyId: string
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

  const user = useUser();

  useEffect(() => {
    const fetchGoogleAdsAccounts = async () => {
      try {
          const userId = user.user?.id;
          const response = await axios.post(
              'http://localhost:8000/api/setup/google-accounts',
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
        const axiosError = error as AxiosError;
          if (axiosError.response) {
              if (axiosError.response.status === 403) {
                  setShowLoginButton(true);
              } else {
                  console.error('Error status:', axiosError.response.status);
                  console.error('Error message:', axiosError.response.data);
              }
          } else {
              console.error('Error fetching Google Ads accounts:', axiosError.message);
          }
      }
  };
  
    

    const fetchGoogleAnalyticsAccounts = async () => {
      try {
        const userId = user.user?.id;
        const response = await axios.post(
          'http://localhost:8000/api/setup/ga4-propertyIds',
          { userId },
          { withCredentials: true }
        );
        if (response.status === 200) {
          setShowLoginButton(false);
          setGoogleAnalyticsAccounts(response.data.propertiesList || []);
        }  else {
          console.log('Unexpected status code:', response.status);
      }
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
            if (axiosError.response.status === 403) {
                setShowLoginButton(true);
            } else {
                console.error('Error status:', axiosError.response.status);
                console.error('Error message:', axiosError.response.data);
            }
        } else {
            console.error('Error fetching Google Analytics accounts:', axiosError.message);
        }
      }
    };

    const fetchFacebookAdsAccounts = async () => {
      try {
        const userId = user.user?.id;
        const response = await axios.post(
          'http://localhost:8000/api/setup/facebook-accounts',
          { userId },
          { withCredentials: true }
        );
        setFacebookAdsAccounts(response.data.accounts || []);
      } catch (error) {
        console.error('Error fetching Facebook Ads accounts:', error);
      }
    };

    if (platform.toLowerCase() === 'google ads') fetchGoogleAdsAccounts();
    if (platform.toLowerCase() === 'google analytics') fetchGoogleAnalyticsAccounts();
    if (platform.toLowerCase() === 'facebook ads') fetchFacebookAdsAccounts();
  }, [platform, user]);

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
    } else if (platform.toLowerCase() === 'facebook ads') {
      if (!facebookAdsAccounts || facebookAdsAccounts.length === 0) {
        return null; // Return null if there are no Facebook Ads accounts
      }
      return facebookAdsAccounts.filter((account) =>
        account.propertyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return [];
    }
  };

  const handleConnect = (account: GoogleAdsAccount | GoogleAnalyticsAccount | FacebookAdsAccount) => {
    let accountId: string;
    let displayName: string;

    if ('clientId' in account) {
      accountId = (account as GoogleAdsAccount).clientId;
      displayName = `${account.name} (${accountId})`;
    } else {
      accountId = (account as GoogleAnalyticsAccount | FacebookAdsAccount).propertyId;
      displayName = `${account.propertyName} (${accountId})`;
    }
    // Call the passed callback for additional handling
    onConnect(platform, displayName, accountId);
  };

  return (
    <>
      {showLoginButton ? (
        <Button size="sm" className="bg-green-600">Login</Button>
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
          <div className="max-h-[50vh] overflow-auto">
            {filteredAccounts()?.map((account) => (
              <div
                key={
                  platform.toLowerCase() === 'google ads'
                    ? (account as GoogleAdsAccount).clientId
                    : (account as GoogleAnalyticsAccount | FacebookAdsAccount).propertyId
                }
                className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
              >
                <span>
                  {platform.toLowerCase() === 'google ads' ? (
                    <div className="flex flex-row gap-3">
                      <GoogleLogo height="1rem" width="1rem" />
                      {`${(account as GoogleAdsAccount).name} (${(account as GoogleAdsAccount).clientId})`}
                    </div>
                  ) : (
                    <div className="flex flex-row gap-3">
                      <Ga4Logo height="1rem" width="1rem" />
                      {`${(account as GoogleAnalyticsAccount | FacebookAdsAccount).propertyName} (${(account as GoogleAnalyticsAccount | FacebookAdsAccount).propertyId})`}
                    </div>
                  )}
                </span>
                <Button
                  size="sm"
                  onClick={() => handleConnect(account)}
                  disabled={connectedId.includes(
                    platform.toLowerCase() === 'google ads'
                      ? (account as GoogleAdsAccount).clientId
                      : (account as GoogleAnalyticsAccount | FacebookAdsAccount).propertyId
                  )}
                  className="bg-blue-600"
                >
                  {connectedId.includes(
                    platform.toLowerCase() === 'google ads'
                      ? (account as GoogleAdsAccount).clientId
                      : (account as GoogleAnalyticsAccount | FacebookAdsAccount).propertyId
                  ) ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : null}
                  {connectedId.includes(
                    platform.toLowerCase() === 'google ads'
                      ? (account as GoogleAdsAccount).clientId
                      : (account as GoogleAnalyticsAccount | FacebookAdsAccount).propertyId
                  )
                    ? 'Connected'
                    : 'Connect'}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )}