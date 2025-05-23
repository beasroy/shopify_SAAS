import React, { useMemo, useState } from 'react';
import DailyEcommerceMetrics from '@/pages/ReportPage/component/EcommerceMetricsPage';
import CollapsibleSidebar from '../../components/dashboard_component/CollapsibleSidebar';
import { TableSkeleton } from '@/components/dashboard_component/TableSkeleton';
import { useParams } from 'react-router-dom';
import { ChartBar, ShoppingCart } from 'lucide-react';
import { selectGoogleAnalyticsTokenError } from '@/store/slices/TokenSllice';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import ConnectPlatform from './ConnectPlatformPage';
import Header from '@/components/dashboard_component/Header';
import DaywiseMetricsPage from './component/DaywiseMetricsPage';
import { CustomTabs } from '../ConversionReportPage/components/CustomTabs';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';
import MissingDateWarning from '@/components/dashboard_component/Missing-Date-Waning';
import NoAccessPage from '@/components/dashboard_component/NoAccessPage.';

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

  const tabs = [
    { label: 'Daily Metrics', value: 'daily' },
    { label: 'Day wise Metrics', value: 'day wise' },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

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
          <>
            <Header title='E-Commerce Insights' Icon={ShoppingCart} showDatePicker={true} />
            <div className="bg-white px-6 sticky top-0 z-10">
              <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <section className="my-3">
                {activeTab === 'daily' && (
                  <DailyEcommerceMetrics dateRange={dateRange} />
                )}
                {activeTab === 'day wise' && (
                  <DaywiseMetricsPage dateRange={dateRange} />
                )}
              </section>
            )}
          </>
        )}
      </div>
      <HelpDeskModal />
    </div>
  );
};

export default ReportsPage;