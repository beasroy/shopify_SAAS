import { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { format } from "date-fns";
import { BriefcaseBusiness, RefreshCw, ChevronDown, CalendarDays, IndianRupee, TrendingUp } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { useBrand } from '@/context/BrandContext';
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

// Facebook and Google Logos (SVGs)
interface FacebookLogoProps {
  width?: string | number;
  height?: string | number;
}

interface GoogleLogoProps {
  width?: string | number;
  height?: string | number;
}

export const FacebookLogo: React.FC<FacebookLogoProps> = ({ width = '1.25rem', height = '1.25rem' }) => (
  <svg viewBox="0 0 24 24" style={{ height, width, fill: '#1877F2' }}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const GoogleLogo: React.FC<GoogleLogoProps> = ({ width = '1.25rem', height = '1.25rem' }) => (
  <svg viewBox="0 0 24 24" style={{ height,width }}>
    <path d="M13.5437 4.24116L13.5441 4.24138C13.904 4.43971 14.2179 4.70303 14.4689 5.01529C14.7198 5.3275 14.903 5.68264 15.009 6.0601L15.4904 5.92486L15.009 6.0601C15.115 6.43752 15.1422 6.83078 15.0891 7.21776C15.0361 7.60457 14.9038 7.97861 14.6989 8.31855C14.6988 8.31873 14.6987 8.31891 14.6986 8.3191L8.41444 18.701C7.9918 19.3741 7.30557 19.868 6.49825 20.0687C5.68937 20.2699 4.83087 20.1586 4.10949 19.7614C3.38872 19.3646 2.86649 18.7168 2.64727 17.9633C2.42868 17.212 2.5264 16.4083 2.92214 15.7226L9.20689 5.33823C9.20695 5.33813 9.20702 5.33802 9.20708 5.33792C9.62451 4.65082 10.3142 4.14383 11.1301 3.93599C11.9464 3.72804 12.8151 3.83872 13.5437 4.24116Z" fill="#FFB70A" stroke="#FFB70A"></path>
    <path d="M21.5404 15.4544L15.24 5.04127C14.7453 4.25097 13.9459 3.67817 13.0138 3.44633C12.0817 3.21448 11.0917 3.34215 10.2572 3.80182C9.4226 4.26149 8.8103 5.01636 8.55224 5.90372C8.29418 6.79108 8.41102 7.73988 8.87757 8.54562L15.178 18.9587C15.6726 19.749 16.4721 20.3218 17.4042 20.5537C18.3362 20.7855 19.3262 20.6579 20.1608 20.1982C20.9953 19.7385 21.6076 18.9836 21.8657 18.0963C22.1238 17.2089 22.0069 16.2601 21.5404 15.4544Z" fill="#3B8AD8"></path>
    <path d="M9.23018 16.2447C9.07335 15.6884 8.77505 15.1775 8.36166 14.7572C7.94827 14.3369 7.43255 14.0202 6.86011 13.835C6.28768 13.6499 5.67618 13.6021 5.07973 13.6958C4.48328 13.7895 3.92026 14.0219 3.44049 14.3723C2.96071 14.7227 2.57898 15.1804 2.32906 15.7049C2.07914 16.2294 1.96873 16.8045 2.00762 17.3794C2.0465 17.9542 2.23347 18.5111 2.55199 19.0007C2.8705 19.4902 3.31074 19.8975 3.83376 20.1863C4.46363 20.5354 5.1882 20.6983 5.91542 20.6542C6.64264 20.6101 7.33969 20.361 7.91802 19.9386C8.49636 19.5162 8.92988 18.9395 9.16351 18.2817C9.39715 17.624 9.42035 16.915 9.23018 16.2447Z" fill="#2CAA14"></path>
  </svg>
);

// Interface definitions
interface PurchaseRoas {
  value: string;
}

interface BaseCampaignMetric {
  spend: string;
}

interface GoogleCampaignMetric extends BaseCampaignMetric {
  campaignName: string;
  roas: string;
}

interface FacebookCampaignMetric extends BaseCampaignMetric {
  campaign_name: string;
  purchase_roas: PurchaseRoas[];
}

interface DisplayCampaignMetric {
  campaignName: string;
  spend: string;
  roas: string;
}

interface SummaryMetrics {
  totalSpend: number;
  averageRoas: number;
}

interface GoogleData {
  adAccountName: string;
  campaignData: GoogleCampaignMetric[];
}

interface FacebookAccount {
  account_name: string;
  campaigns: FacebookCampaignMetric[];
}

// Helper function to format values
const formatValue = (value: string | number | null): string => {
  if (value === null || value === undefined) return '₹0.00';
  const numberValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numberValue)) return '₹0.00';
  return numberValue.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  });
};

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// MetricsCards Component
const MetricsCards: React.FC<{
  summaryMetrics: SummaryMetrics;
  startDate: string;
  endDate: string;
}> = ({ summaryMetrics, startDate, endDate }) => (
  <div className="grid grid-cols-2 gap-6 mb-6">
    <Card className="transition-all duration-200 hover:shadow-lg hover:scale-105 hover:border-blue-600">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <IndianRupee className="h-5 w-5 text-black-500" />
          <CardTitle>Total Spend</CardTitle>
        </div>
        <CardDescription className="flex items-center mt-1">
          <CalendarDays className="h-3 w-3 mr-1" />
          {formatDate(startDate)} - {formatDate(endDate)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-3xl font-bold text-[#071952]">
            {formatValue(summaryMetrics.totalSpend)}
          </p>
        </div>
      </CardContent>
    </Card>
    
    <Card className="transition-all duration-200 hover:shadow-lg hover:scale-105 hover:border-blue-600">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-black-500" />
          <CardTitle>Average ROAS</CardTitle>
        </div>
        <CardDescription className="flex items-center mt-1">
          <CalendarDays className="h-3 w-3 mr-1" />
          {formatDate(startDate)} - {formatDate(endDate)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-3xl font-bold text-[#071952]">
            {summaryMetrics.averageRoas.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

// MetricsTable Component
const MetricsTable: React.FC<{
  campaigns: DisplayCampaignMetric[];
  isLoading: boolean;
}> = ({ campaigns, isLoading }) => (
  <Card>
    <CardContent className="p-0">
      <ScrollArea className="h-[300px] rounded-lg">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-cyan-800 text-white font-medium z-10">
              <TableRow>
                <TableCell className="font-semibold">Campaign Name</TableCell>
                <TableCell className="font-semibold">Spend</TableCell>
                <TableCell className="font-semibold">ROAS</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                  <TableCell>{formatValue(campaign.spend)}</TableCell>
                  <TableCell>{campaign.roas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </CardContent>
  </Card>
);

// Main Component
const CampaignMetricsPage: React.FC = () => {
  // State Management
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [facebookData, setFacebookData] = useState<FacebookAccount[]>([]);
  const [selectedFacebookAccount, setSelectedFacebookAccount] = useState<string>("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { selectedBrandId } = useBrand();
  const navigate = useNavigate();

  const startDate = format(date?.from || new Date(), "yyyy-MM-dd");
  const endDate = format(date?.to || new Date(), "yyyy-MM-dd");
  
  // API Base URL
  const baseURL = import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

  // Helper Functions
  const calculateSummaryMetrics = (campaigns: DisplayCampaignMetric[]): SummaryMetrics => ({
    totalSpend: campaigns.reduce((sum, item) => sum + parseFloat(item.spend || "0"), 0),
    averageRoas: campaigns.reduce((sum, item) => sum + parseFloat(item.roas || "0"), 0) / (campaigns.length || 1),
  });

  const filterCampaigns = (campaigns: DisplayCampaignMetric[]): DisplayCampaignMetric[] => {
    if (!searchTerm) return campaigns;
    return campaigns.filter(campaign =>
      campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // API Functions
  const fetchGoogleMetrics = useCallback(async () => {
    if (!selectedBrandId) return;
    
    setIsGoogleLoading(true);
    try {
      const response = await axios.post(
        `${baseURL}/api/metrics/googleCampaign/${selectedBrandId}`,
        { startDate, endDate },
        { withCredentials: true }
      );
      setGoogleData(response.data.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching Google metrics:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, [selectedBrandId, startDate, endDate, navigate, baseURL]);

  const fetchFacebookMetrics = useCallback(async () => {
    if (!selectedBrandId) return;
    
    setIsFacebookLoading(true);
    try {
      const response = await axios.post(
        `${baseURL}/api/metrics/fbCampaign/${selectedBrandId}`,
        { startDate, endDate },
        { withCredentials: true }
      );
      
      setFacebookData(response.data.data);
      if (!selectedFacebookAccount && response.data.data.length > 0) {
        setSelectedFacebookAccount(response.data.data[0].account_name);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching Facebook metrics:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/');
      }
    } finally {
      setIsFacebookLoading(false);
    }
  }, [selectedBrandId, startDate, endDate, navigate, baseURL]);

  // Initial Data Load and Refresh
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchGoogleMetrics(), fetchFacebookMetrics()]);
    };

    loadData();
    const intervalId = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchGoogleMetrics, fetchFacebookMetrics]);

  // Section Rendering Functions
  const renderGoogleMetrics = () => {
    if (!googleData) return null;

    const campaigns: DisplayCampaignMetric[] = googleData.campaignData.map(campaign => ({
      campaignName: campaign.campaignName,
      spend: campaign.spend,
      roas: campaign.roas
    }));

    const filteredCampaigns = filterCampaigns(campaigns);
    const summaryMetrics = calculateSummaryMetrics(filteredCampaigns);

    return (
      <div className="mb-4">
        <MetricsCards
          summaryMetrics={summaryMetrics}
          startDate={startDate}
          endDate={endDate}
        />
        <MetricsTable
          campaigns={filteredCampaigns}
          isLoading={isGoogleLoading}
        />
      </div>
    );
  };

  const renderFacebookMetrics = () => {
    if (!facebookData || facebookData.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No Facebook campaign data available</p>
          </CardContent>
        </Card>
      );
    }

    const selectedAccount = facebookData.find(account => 
      account.account_name === selectedFacebookAccount
    );
    
    if (!selectedAccount || !selectedAccount.campaigns) {
      return renderEmptyMetrics();
    }

    const campaigns: DisplayCampaignMetric[] = selectedAccount.campaigns.map(campaign => ({
      campaignName: campaign.campaign_name,
      spend: campaign.spend || "0",
      roas: campaign.purchase_roas?.[0]?.value || "0"
    }));

    const filteredCampaigns = filterCampaigns(campaigns);
    const summaryMetrics = calculateSummaryMetrics(filteredCampaigns);

    return (
      <div>
        <MetricsCards
          summaryMetrics={summaryMetrics}
          startDate={startDate}
          endDate={endDate}
        />
        <MetricsTable
          campaigns={filteredCampaigns}
          isLoading={isFacebookLoading}
        />
      </div>
    );
  };

  const renderEmptyMetrics = () => {
    const emptyMetrics: SummaryMetrics = {
      totalSpend: 0,
      averageRoas: 0
    };

    return (
      <div>
        <MetricsCards
          summaryMetrics={emptyMetrics}
          startDate={startDate}
          endDate={endDate}
        />
        <MetricsTable
          campaigns={[]}
          isLoading={isFacebookLoading}
        />
      </div>
    );
  };

  // Handle Facebook Account Switch
  const handleFacebookAccountSwitch = (accountName: string) => {
    setIsFacebookLoading(true);
    setSelectedFacebookAccount(accountName);
    setTimeout(() => setIsFacebookLoading(false), 500);
  };

  // Main Render
  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-auto">
        <header className="bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <BriefcaseBusiness className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Campaign Metrics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  className="border px-4 py-2 rounded-lg w-64"
                  placeholder="Search Campaigns"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="absolute right-4 top-3 h-5 w-5 text-gray-500" />
              </div>
              <DatePickerWithRange 
                date={date}
                setDate={setDate}
                defaultDate={{
                  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  to: new Date(),
                }}
              />
              {lastUpdated && (
                <span className="text-sm text-gray-600">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button  
                size="icon"
                onClick={() => {
                  fetchGoogleMetrics();
                  fetchFacebookMetrics();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {/* Facebook Metrics Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FacebookLogo width="1.25rem" height="1.25rem"/>
                <h2 className="text-xl font-bold">Facebook Campaigns</h2>
              </div>
              {facebookData && facebookData.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      {selectedFacebookAccount || "Select Account"}
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {facebookData.map(account => (
                      <DropdownMenuItem
                        key={account.account_name}
                        onClick={() => handleFacebookAccountSwitch(account.account_name)}
                      >
                        {account.account_name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {renderFacebookMetrics()}
          </div>
          {/* Google Metrics Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
              <GoogleLogo width="1.25rem" height="1.25rem"/>
                <h2 className="text-xl font-bold">Google Campaigns</h2>
                <span className="text-black-500 font-bold md:uppercase">
                  - {googleData?.adAccountName}
                </span>
              </div>
            </div>
            {renderGoogleMetrics()}
          </div>

          
        </div>
      </div>
    </div>
  );
};

export default CampaignMetricsPage;