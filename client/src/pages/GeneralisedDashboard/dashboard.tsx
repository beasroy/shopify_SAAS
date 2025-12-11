import React, { useCallback, useEffect, useState } from "react";
import {

  PlusCircle,
  
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import createAxiosInstance from "../ConversionReportPage/components/axiosInstance";
import Loader from "@/components/dashboard_component/loader";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { FacebookLogo, GoogleLogo, Ga4Logo } from "@/data/logo";
import { useNavigate } from "react-router-dom";
import PlatformModal from "@/components/dashboard_component/PlatformModal";
import ConversionFunnelCard from "./components/ConversionFunnelCard";
import MarketingInsightsCard from "./components/MarketingInsightsCard";
import PerformanceTable from "./components/PerformanceTable";
import { Platform, PerformanceSummary } from "./components/PerformanceTable";
import PaymentOrdersCard from "./components/PaymentOrdersCard";



// Component to display a card for connecting platforms
export function ConnectPlatformCard({ 
  platform, 
  onClick 
}: { 
  platform: Platform; 
  onClick: () => void;
}) {
  const getPlatformLogo = () => {
    switch (platform) {
      case "Facebook":
        return <FacebookLogo width={"2rem"} height={"2rem"} />;
      case "Google Ads":
        return <GoogleLogo width={"2rem"} height={"2rem"} />;
      case "Google Analytics":
        return <Ga4Logo width={"2rem"} height={"2rem"} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={onClick}>
      <div className="mb-3">
        {getPlatformLogo()}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Connect {platform}</h3>
      <p className="text-sm text-slate-500 text-center mb-4">
        Get better insights by connecting your {platform} account
      </p>
      <Button variant="outline" className="gap-2">
        <PlusCircle className="h-4 w-4" />
        Connect
      </Button>
    </div>
  );
}



// Generic Dashboard Card Component
interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onNavigate: () => void;
  className?: string;
}

export function DashboardCard({ title, icon, children, onNavigate, className }: DashboardCardProps) {
  return (
    <div 
      className={cn(
        "bg-white border rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col h-[380px]",
        className
      )}
      onClick={onNavigate}
    >
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              {icon}
            </div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}








// Main dashboard component
const SummaryDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.user);
  const brandId = useSelector((state: RootState) => state.brand.selectedBrandId);

  const userName = user?.username;
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<{
    meta?: PerformanceSummary['periodData'];
    google?: PerformanceSummary['periodData'];
    analytics?: PerformanceSummary['periodData'];
  }>({});

  const navigate = useNavigate();
  
  // Track API call success/failure status
  const [apiStatus, setApiStatus] = useState({
    meta: true,
    google: true,
    analytics: true
  });

  // State for platform modal
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

  // Check URL parameters for modal opening
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modalToOpen = params.get('openModal');
    
    if (modalToOpen && brandId) {
      let platformToOpen: Platform | null = null;
      
      switch (modalToOpen.toLowerCase()) {
        case 'googleads':
          platformToOpen = 'Google Ads';
          break;
        case 'googleanalytics':
          platformToOpen = 'Google Analytics';
          break;
        case 'facebook':
          platformToOpen = 'Facebook';
          break;
      }
      
      if (platformToOpen) {
        setSelectedPlatform(platformToOpen);
        setPlatformModalOpen(true);
        
        // Remove the modal parameter from URL
        params.delete('openModal');
        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [brandId]);

  const axiosInstance = createAxiosInstance();

  const fetchPerformanceData = useCallback(async () => {
    if (!brandId) {
      console.log('No brand ID available, skipping API calls');
      return;
    }
    
    setLoading(true);
    setPerformanceData({});
    setApiStatus({
      meta: true,
      google: true,
      analytics: true
    });

    try {
      const metaPromise = axiosInstance.get(
        `api/summary/facebook-ads/${brandId}`,
        { withCredentials: true }
      ).catch(error => {
        console.error('Error fetching Meta data:', error);
        setApiStatus(prev => ({ ...prev, meta: false }));
        return { data: { success: false } };
      });

      const googlePromise = axiosInstance.get(
        `api/summary/google-ads/${brandId}`,
        { withCredentials: true }
      ).catch(error => {
        console.error('Error fetching Google data:', error);
        setApiStatus(prev => ({ ...prev, google: false }));
        return { data: { success: false } };
      });

      const analyticsPromise = axiosInstance.get(
        `api/summary/analytics/${brandId}`,
        { withCredentials: true }
      ).catch(error => {
        console.error('Error fetching Analytics data:', error);
        setApiStatus(prev => ({ ...prev, analytics: false }));
        return { data: { success: false } };
      });
      
      const [metaResponse, googleResponse, analyticsResponse] = await Promise.all([
        metaPromise,
        googlePromise,
        analyticsPromise
      ]);

      setPerformanceData({
        meta: metaResponse.data.success ? metaResponse.data.periodData : undefined,
        google: googleResponse.data.success ? googleResponse.data.periodData : undefined,
        analytics: analyticsResponse.data.success ? analyticsResponse.data.periodData : undefined
      });
      
      // Update API status based on response success property
      setApiStatus({
        meta: metaResponse.data.success,
        google: googleResponse.data.success,
        analytics: analyticsResponse.data.success
      });
    } catch (error) {
      console.error('Error in fetchPerformanceData:', error);
      // If we had an overall error, mark all APIs as failed
      setApiStatus({
        meta: false,
        google: false,
        analytics: false
      });
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  const handleConnectPlatform = (platform: Platform) => {
    setSelectedPlatform(platform);
    setPlatformModalOpen(true);
  };

  const handlePlatformModalSuccess = (platform: string, accountName: string, accountId: string) => {
    console.log(`Successfully connected ${platform} - ${accountName} (${accountId})`);
    // Refresh data to show the newly connected platform
    fetchPerformanceData();
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  if (loading) {
    return <Loader isLoading={loading} />;
  }

  // Check if any platform is not connected
  const allConnected = apiStatus.meta && apiStatus.google && apiStatus.analytics;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto p-6 max-w-7xl">
        <div className="mb-6 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-1 bg-blue-500 rounded-full" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Welcome Back, {userName}</h1>
                <p className="text-slate-500 mt-1">Here's your performance overview</p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-3">
              {/* <HeaderTutorialButton /> */}
           
            </div>
          </div>
        </div>

        {/* Missing Platforms Section */}
        {!allConnected && (
          <div className="mb-8 animate-fade-up">
            <div className="bg-white border rounded-lg shadow-md p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">
                  Connect Your Platforms
                </h2>
              </div>
              <p className="text-slate-600">
                Connect your advertising and analytics platforms to see all your performance data in one place.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {!apiStatus.meta && (
                  <ConnectPlatformCard 
                    platform="Facebook" 
                    onClick={() => handleConnectPlatform("Facebook")} 
                  />
                )}
                {!apiStatus.google && (
                  <ConnectPlatformCard 
                    platform="Google Ads" 
                    onClick={() => handleConnectPlatform("Google Ads")} 
                  />
                )}
                {!apiStatus.analytics && (
                  <ConnectPlatformCard 
                    platform="Google Analytics" 
                    onClick={() => handleConnectPlatform("Google Analytics")} 
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Performance Table */}
        <PerformanceTable 
          performanceData={performanceData}
          apiStatus={apiStatus}
          onRefresh={fetchPerformanceData}
          loading={loading}
        />

        {/* Dashboard Quick Links Section */}
        <div className="mt-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Quick Insights</h2>
            <p className="text-sm text-slate-500 mt-1">Click any card to explore detailed reports</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
            {/* Conversion Funnel Card */}
            {brandId && (
              <ConversionFunnelCard 
                onNavigate={() => navigate(`/ecommerce-reports/${brandId}`)}
                brandId={brandId}
              />
            )}

            {/* Marketing Insights Card - Monthly Metrics */}
            {brandId && (
              <MarketingInsightsCard 
                onNavigate={() => navigate(`/marketing-insights/${brandId}`)}
                brandId={brandId}
              />
            )}

            {/* Payment Orders Card - COD vs Prepaid */}
            {brandId && (
              <PaymentOrdersCard 
                onNavigate={() => navigate(`/reports/${brandId}`)}
                brandId={brandId}
              />
            )}
          </div>
        </div>
      </div>

      {/* Platform Connection Modal */}
      {selectedPlatform && brandId && (
        <PlatformModal
          platform={selectedPlatform}
          open={platformModalOpen}
          onOpenChange={setPlatformModalOpen}
          brandId={brandId}
          onSuccess={handlePlatformModalSuccess}
        />
      )}
    </div>
  );
};

export default SummaryDashboard;