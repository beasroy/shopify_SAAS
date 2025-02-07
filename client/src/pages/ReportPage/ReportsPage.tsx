import React, { useMemo} from 'react';
import DailyEcommerceMetrics from '@/pages/ReportPage/component/EcommerceMetricsPage';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { TableSkeleton } from '@/components/dashboard_component/TableSkeleton';
import { useParams } from 'react-router-dom';
import { ChartNoAxesCombined } from 'lucide-react';
import { useTokenError } from '@/context/TokenErrorContext';
import NoGA4AcessPage from './NoGA4AccessPage.';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import ConnectPlatform from './ConnectPlatformPage';
import Header from '@/components/dashboard_component/Header';



const ReportsPage: React.FC = () => {
  
  const isLoading = false;
  const { brandId } = useParams<{ brandId: string }>();
  const brands = useSelector((state: RootState) => state.brand.brands);
  const selectedBrand = brands.find((brand) => brand._id === brandId);
  const hasGA4Account = selectedBrand?.ga4Account ?? false;
  const { tokenError } = useTokenError();
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);

  const dateRange={ 
    from: date.from ? new Date(date.from) : undefined,
    to: date.to ? new Date(date.to) : undefined 
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        {tokenError ? (
          <NoGA4AcessPage />
        ) : !hasGA4Account ? (
          <>
             <ConnectPlatform
              platform="google analytics"
              brandId={brandId ?? ''}
              onSuccess={(platform, accountName, accountId) => {
                console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
              }} /> </>
        ) : (
          <>
            {/* Existing page content */}
           <Header title='E-Commerce Insighhts' Icon={ChartNoAxesCombined} showDatePicker={true} />
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <section className="my-6">
                <DailyEcommerceMetrics dateRange={dateRange} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;