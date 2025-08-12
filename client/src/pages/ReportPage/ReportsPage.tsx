import React, { useEffect, useMemo, useState } from 'react';
import EcommerceMetricsPage from '@/pages/ReportPage/component/EcommerceMetricsPage';
import CollapsibleSidebar from '../../components/dashboard_component/CollapsibleSidebar';
import { TableSkeleton } from '@/components/dashboard_component/TableSkeleton';
import { useParams } from 'react-router-dom';
import { ChartBar, Maximize, Minimize, RefreshCw } from 'lucide-react';
import { selectGoogleAnalyticsTokenError } from '@/store/slices/TokenSllice';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import ConnectPlatform from './ConnectPlatformPage';
import DaywiseMetricsPage from './component/DaywiseMetricsPage';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';
import MissingDateWarning from '@/components/dashboard_component/Missing-Date-Waning';
import NoAccessPage from '@/components/dashboard_component/NoAccessPage.';
import { resetAllTokenErrors } from '@/store/slices/TokenSllice';
import { useDispatch } from 'react-redux';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';
import ColumnManagementSheet from '@/pages/AnalyticsDashboard/Components/ColumnManagementSheet';

const ReportsPage: React.FC = () => {
  const isLoading = false;
  const { brandId } = useParams<{ brandId: string }>();
  const brands = useSelector((state: RootState) => state.brand.brands);
  const selectedBrand = brands.find((brand) => brand._id === brandId);
  const hasGA4Account = selectedBrand?.ga4Account ?? false;
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  
  const googleAnalyticsTokenError = useSelector(selectGoogleAnalyticsTokenError);
  
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);

  const dateRange = {
    from: date.from ? new Date(date.from) : undefined,
    to: date.to ? new Date(date.to) : undefined
  }
  const [activeTab, setActiveTab] = useState('daily');
  const [isFullScreen, setIsFullScreen] = useState(false);
  

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'Date', 'Sessions', 'Add To Cart', 'Add To Cart Rate', 
    'Checkouts', 'Checkout Rate', 'Purchases', 'Purchase Rate'
  ]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'Date', 'Sessions', 'Add To Cart', 'Add To Cart Rate', 
    'Checkouts', 'Checkout Rate', 'Purchases', 'Purchase Rate'
  ]);
  
  // Available columns for the funnel report
  const availableColumns = [
    'Date', 'Sessions', 'Add To Cart', 'Add To Cart Rate', 
    'Checkouts', 'Checkout Rate', 'Purchases', 'Purchase Rate'
  ];
  
  // Refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tabs = [
    { label: 'Daily Metrics', value: 'daily' },
    { label: 'Day wise Metrics', value: 'day wise' },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleManualRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleVisibilityChange = (columns: string[]) => {
    setVisibleColumns(columns);
  };
  
  const handleOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    // Don't update visibleColumns here - let it maintain its own state
    console.log('Column order updated:', newOrder);
  };

  const dispatch = useDispatch();

  useEffect(() => {
    if (hasGA4Account) {
      googleAnalyticsTokenError && dispatch(resetAllTokenErrors());
    }
  }, [hasGA4Account]);

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        {googleAnalyticsTokenError ? (
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
        ) : !hasGA4Account ? (
          <>
            <ConnectPlatform
              platform="google analytics"
              brandId={brandId ?? ''}
              onSuccess={(platform, accountName, accountId) => {
                console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
              }} 
            /> 
          </>
        ) : (!dateRange.from || !dateRange.to) ? (
          <MissingDateWarning />
        ) : (
          <div className="p-6">
            <Card className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
              <CardContent>
                <div className="space-y-4">
                  {/* Header Section - Fixed within card */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      {/* Custom Oval Tabs */}
                      <div className="flex bg-gray-100 p-1 rounded-full">
                        {tabs.map((tab) => (
                          <button
                            key={tab.value}
                            onClick={() => handleTabChange(tab.value)}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                              activeTab === tab.value
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <DatePickerWithRange />
                      <Button onClick={handleManualRefresh} disabled={isLoading} size="icon" variant="outline">
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </Button>
                      <ColumnManagementSheet
                        visibleColumns={visibleColumns}
                        columnOrder={columnOrder}
                        availableColumns={availableColumns}
                        onVisibilityChange={handleVisibilityChange}
                        onOrderChange={handleOrderChange}
                      />
                      <Button onClick={toggleFullScreen} size="icon" variant="outline">
                        {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Content Section with Internal Scrolling */}
                  {isLoading ? (
                    <TableSkeleton />
                  ) : (
                    <section className="h-full overflow-auto">
                      {activeTab === 'daily' && (
                        <EcommerceMetricsPage 
                          dateRange={dateRange} 
                          isFullScreen={isFullScreen}
                          visibleColumns={visibleColumns}
                          columnOrder={columnOrder}
                          refreshTrigger={refreshTrigger}
                        />
                      )}
                      {activeTab === 'day wise' && (
                        <DaywiseMetricsPage 
                          dateRange={dateRange} 
                          isFullScreen={isFullScreen}
                          visibleColumns={visibleColumns}
                          columnOrder={columnOrder}
                          refreshTrigger={refreshTrigger}
                        />
                      )}
                    </section>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
      <HelpDeskModal />
    </div>
  );
};

export default ReportsPage;