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
import MonthlyMetricsPage from './component/MonthlyMetricsPage';

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

  const dateRange = useMemo(() => ({
    from: date.from ? new Date(date.from) : undefined,
    to: date.to ? new Date(date.to) : undefined
  }), [date.from, date.to]);

  const [activeTab, setActiveTab] = useState('daily');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Memoize the dateRange to prevent unnecessary re-renders
  const memoizedDateRange = useMemo(() => dateRange, [dateRange.from, dateRange.to]);
  

  const baseColumns = [
    'Sessions', 'Add To Cart', 'Add To Cart Rate', 
    'Checkouts', 'Checkout Rate', 'Purchases', 'Purchase Rate'
  ];

  const availableColumns = ['Date', 'Month','Day', ...baseColumns];

  // Single column state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'Date', ...baseColumns
  ]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'Date', ...baseColumns
  ]);


  const [activeViewPreset, setActiveViewPreset] = useState<string | null>(null);

  // Define view presets for Reports page - make them dynamic based on active tab
  const getViewPresets = (activeTab: string) => {
    const timeColumn = activeTab === 'month wise' ? 'Month' : activeTab === 'day wise' ? 'Day' : 'Date';
    
    return [
      {
        label: "Counts View",
        columns: [timeColumn, 'Sessions', 'Add To Cart', 'Checkouts', 'Purchases']
      },
      {
        label: "Rates View", 
        columns: [timeColumn, 'Sessions', 'Add To Cart Rate', 'Checkout Rate', 'Purchase Rate']
      }
    ];
  };

  // Update the useEffect to handle view presets
  useEffect(() => {
    const timeColumn = activeTab === 'month wise' ? 'Month' : activeTab === 'day wise' ? 'Day' : 'Date';
    
    if (visibleColumns[0] !== timeColumn) {
      // Keep all current columns but replace the first one (time column)
      const newColumns = [timeColumn, ...visibleColumns.slice(1)];
      const newOrder = [timeColumn, ...columnOrder.slice(1)];
      
      setVisibleColumns(newColumns);
      setColumnOrder(newOrder);
    }
  }, [activeTab]);
  
  // Refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tabs = [
    { label: 'Daily Metrics', value: 'daily' },
    { label: 'Day wise Metrics', value: 'day wise' },
    { label: 'Monthly Metrics', value: 'month wise' },
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

  // Update the handleVisibilityChange to track which preset is active
  const handleVisibilityChange = (columns: string[]) => {
    setVisibleColumns(columns);
    
    // Check if the new columns match any preset
    const viewPresets = getViewPresets(activeTab);
    const matchingPreset = viewPresets.find(preset => 
      JSON.stringify(preset.columns) === JSON.stringify(columns)
    );
    
    setActiveViewPreset(matchingPreset ? matchingPreset.label : null);
  };
  
  const handleOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder);
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
          <div className="p-3">
            <Card className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
              <CardContent>
                <div className="space-y-4">
                  {/* Header Section - Fixed within card */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-6">
                                            {/* Custom Vertical Tabs */}
                      <div className="flex flex-row bg-gray-100 p-1.5 rounded-2xl">
                        {tabs.map((tab) => (
                          <button
                            key={tab.value}
                            onClick={() => handleTabChange(tab.value)}
                            className={`px-6 py-1 rounded-2xl text-sm font-medium transition-all duration-200 last:mb-0 ${
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
                        viewPresets={getViewPresets(activeTab)}
                        showViewPresets={true}
                        activeViewPreset={activeViewPreset}
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
                          key="daily-metrics"
                          dateRange={memoizedDateRange} 
                          visibleColumns={visibleColumns}
                          columnOrder={columnOrder}
                          refreshTrigger={refreshTrigger}
                        />
                      )}
                      {activeTab === 'day wise' && (
                        <DaywiseMetricsPage 
                          key="daywise-metrics"
                          dateRange={memoizedDateRange} 
                          visibleColumns={visibleColumns}
                          columnOrder={columnOrder}
                          refreshTrigger={refreshTrigger}
                        />
                      )}
                      {activeTab === 'month wise' && (
                        <MonthlyMetricsPage 
                          key="monthly-metrics"
                          dateRange={memoizedDateRange} 
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