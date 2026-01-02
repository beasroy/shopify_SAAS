import React, { useState, useMemo, useCallback } from 'react';
import CollapsibleSidebar from '../../components/dashboard_component/CollapsibleSidebar';
import { useParams } from 'react-router-dom';
import { ChartBar,  Maximize, Minimize, RefreshCw, Users, User, Target, Monitor, Smartphone, Globe, MousePointer, MapPin, Building, FileText, TrendingUp, BarChart3 } from 'lucide-react';
import { useTokenError } from '@/context/TokenErrorContext';
import DeviceTypeConversion from './components/DeviceConversion';
import GenderConversion from './components/GenderConversion';
import AgeConversion from './components/AgeConversion';
import { SideTab } from '@/components/ui/side-tab';
import InterestConversion from './components/InterestConversion';
import OperatingSystemConversion from './components/OperatingSystemConversion';
import BrowserConversion from './components/BrowserConversion';
import SourceConversion from './components/SourceConversion';
import { useSelector } from 'react-redux';
import { RootState } from "@/store/index.ts";
import ConnectPlatform from '../ReportPage/ConnectPlatformPage';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';
import RegionConversion from './components/RegionConversion';
import CityTypeConversion from './components/CityConversion';
import CountryConversion from './components/CountryConversion';
import CampaignConversion from './components/CampaignConversion';
import ChannelConversion from './components/ChannelConversion';
import MissingDateWarning from '@/components/dashboard_component/Missing-Date-Waning';
import NoAccessPage from '@/components/dashboard_component/NoAccessPage.';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import NumberFormatSelector from "@/components/dashboard_component/NumberFormatSelector";;
import ExcelDownload from './components/ExcelDownload';
import PerformanceSummary from './components/PerformanceSummary';
import { metricConfigs } from "@/data/constant";


const ConversionLens: React.FC = () => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);
  const { brandId } = useParams();
  const brands = useSelector((state: RootState) => state.brand.brands);
  const selectedBrand = brands.find((brand) => brand._id === brandId);
  const hasGA4Account = selectedBrand?.ga4Account ?? false;
  const { tokenError } = useTokenError();


  const [activeTab, setActiveTab] = useState('age');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<string[] | undefined>(undefined);
  const [tabData, setTabData] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleManualRefresh = useCallback(() => {
    // Increment refresh trigger to signal all child components to refresh
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleCategoryFilter = (items: (string | number)[] | undefined) => {
    if (items === undefined) {
      setCurrentFilter(undefined);
    } else {
      setCurrentFilter(items.map(item => String(item)));
    }
  };

  const handleTabDataUpdate = (data: any[], tabType?: string) => {
    if (tabType === activeTab) {
      setTabData(data);
    }
  };

  const getPrimaryColumnForTab = (tab: string): string => {
    const columnMap: Record<string, string> = {
      'age': 'Age',
      'gender': 'Gender',
      'interest': 'Interest',
      'device': 'Device Type',
      'operatingSystem': 'Operating System',
      'browser': 'Browser',
      'source': 'Source',
      'channel': 'Channel',
      'campaign': 'Campaign',
      'country': 'Country',
      'city': 'City',
      'region': 'Region',
    };
    return columnMap[tab] || 'Unknown';
  };

  const getSecondaryColumnsForTab = (tab: string): string[] => {
    const columnMap: Record<string, string[]> = {
      'age': ['Total Sessions', 'Avg Conv. Rate'],
      'gender': ['Total Sessions', 'Avg Conv. Rate'],
      'interest': ['Total Sessions', 'Avg Conv. Rate'],
      'device': ['Total Sessions', 'Avg Conv. Rate'],
      'operatingSystem': ['Total Sessions', 'Avg Conv. Rate'],
      'browser': ['Total Sessions', 'Avg Conv. Rate'],
      'source': ['Total Sessions', 'Avg Conv. Rate'],
      'channel': ['Total Sessions', 'Avg Conv. Rate'],
      'campaign': ['Total Sessions', 'Avg Conv. Rate'],
      'country': ['Total Sessions', 'Avg Conv. Rate'],
      'city': ['Total Sessions', 'Avg Conv. Rate'],
      'region': ['Total Sessions', 'Avg Conv. Rate'],
    };
    return columnMap[tab] || [];
  };

  const getFileNameForTab = (tab: string): string => {
    const fileMap: Record<string, string> = {
      'age': 'Age_Conversion_Report',
      'gender': 'Gender_Conversion_Report',
      'interest': 'Interest_Conversion_Report',
      'device': 'Device_Conversion_Report',
      'operatingSystem': 'OperatingSystem_Conversion_Report',
      'browser': 'Browser_Conversion_Report',
      'source': 'Source_Conversion_Report',
      'channel': 'Channel_Conversion_Report',
      'campaign': 'Campaign_Conversion_Report',
      'country': 'Country_Conversion_Report',
      'city': 'City_Conversion_Report',
      'region': 'Region_Conversion_Report',

    };
    return fileMap[tab] || 'Conversion_Report';
  };

  const tabs = [
    { label: 'Age', value: 'age', icon: <Users className="w-4 h-4" /> },
    { label: 'Gender', value: 'gender', icon: <User className="w-4 h-4" /> },
    { label: 'Interest', value: 'interest', icon: <Target className="w-4 h-4" /> },
    { label: 'Device', value: 'device', icon: <Monitor className="w-4 h-4" /> },
    { label: 'Operating System', value: 'operatingSystem', icon: <Smartphone className="w-4 h-4" /> },
    { label: 'Browser', value: 'browser', icon: <Globe className="w-4 h-4" /> },
    { label: 'Source', value: 'source', icon: <MousePointer className="w-4 h-4" /> },
    { label: 'Channel', value: 'channel', icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Campaign', value: 'campaign', icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'Country', value: 'country', icon: <MapPin className="w-4 h-4" /> },
    { label: 'City', value: 'city', icon: <Building className="w-4 h-4" /> },
    { label: 'Region', value: 'region', icon: <MapPin className="w-4 h-4" /> },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setTabData([]);
    setCurrentFilter(undefined);
  };

  if (tokenError) {
    return  <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar /> 
      <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-0">
      <NoAccessPage
      platform="Google Analytics"
      message="We need access to your Google Analytics account to show you amazing insights about your website performance."
      icon={<ChartBar className="w-8 h-8 text-blue-600" />}
      loginOptions={[
        {
          label: "Connect Google Analytics",
          context: "googleAnalyticsSetup",
          provider: "google"
        }
      ]}
    />
    </div>
    </div>;
  }

  if (!hasGA4Account) {
    return    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
       <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-0">
       <ConnectPlatform
      platform="google analytics"
      brandId={brandId ?? ''}
      onSuccess={(platform, accountName, accountId) => {
        console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
      }} />
      </div>
      </div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      
      {/* Side Tab Navigation */}
      <SideTab 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-0">
        {(!date.from || !date.to) ? (
          <MissingDateWarning />
        ) : (
          <>
            {/* Header */}
            <div className="flex-none">
            </div>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto">
              <div className="p-2 space-y-6">
                <Card id={`${activeTab}-report`} className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                      <div className="flex-grow items-center gap-3">
                        {/* Performance Summary shows for all tabs with dynamic content based on activeTab */}
                        <PerformanceSummary
                          data={tabData}
                          primaryColumn={getPrimaryColumnForTab(activeTab)}
                          metricConfig={metricConfigs.sessionsAndConversion || {}}
                          onCategoryFilter={handleCategoryFilter}
                        />
                      </div>
                      <div className="flex flex-row items-center gap-1.5 ">
                        {/* Date Picker - Always visible */}
                        <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                          <DatePickerWithRange
                            defaultDate={{
                              from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                              to: new Date()
                            }}
                          />
                        </div>
                        <NumberFormatSelector />
                        <Button id="refresh" onClick={handleManualRefresh} size="icon" variant="outline">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <ExcelDownload
                          data={tabData}
                          fileName={getFileNameForTab(activeTab)}
                          primaryColumn={getPrimaryColumnForTab(activeTab)}
                          secondaryColumns={getSecondaryColumnsForTab(activeTab)}
                          monthlyDataKey="MonthlyData"
                          monthlyMetrics={["Sessions", "Conv. Rate"]}
                          disabled={tabData.length === 0}
                        />
                        <Button id="expand-button" onClick={toggleFullScreen} size="icon" variant="outline">
                          {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="rounded-md overflow-hidden">
                      <div id={activeTab}>
                        {/* Render the appropriate component based on activeTab */}
                        {activeTab === 'age' && (
                          <AgeConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'gender' && (
                          <GenderConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'interest' && (
                          <InterestConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'device' && (
                          <DeviceTypeConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'operatingSystem' && (
                          <OperatingSystemConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'browser' && (
                          <BrowserConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'source' && (
                          <SourceConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'channel' && (
                          <ChannelConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'campaign' && (
                          <CampaignConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'country' && (
                          <CountryConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'city' && (
                          <CityTypeConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'region' && (
                          <RegionConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {/* {activeTab === 'landingPage' && (
                          <LandingPageConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'pagePath' && (
                          <PagePathConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )}
                        {activeTab === 'pageTitle' && (
                          <PageTitleConversion 
                            isFullScreen={isFullScreen}
                            currentFilter={currentFilter}
                            onDataUpdate={handleTabDataUpdate}
                            refreshTrigger={refreshTrigger}
                          />
                        )} */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <HelpDeskModal />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConversionLens;