import React from 'react';
import { DateRange } from 'react-day-picker';
import DailyEcommerceMetrics from '@/pages/ReportPage/component/EcommerceMetricsPage';
import CityBasedReports from '@/pages/ReportPage/component/CitySessionPage';
import LandingPageSession from './component/LandingPageSession';
import AgeReportPage from './component/AgeReportPage';
import GenderBasedReports from '@/pages/ReportPage/component/GenderReportPage';
import ChannelSessionPage from './component/RefferingChannelPage';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { TableSkeleton } from '@/components/dashboard_component/TableSkeleton';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';
import { useBrand } from '@/context/BrandContext';
import { useParams } from 'react-router-dom';
import ConnectGA4 from './ConnectGA4Page';


const ReportsPage: React.FC = () => {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const isLoading = false;
  const { brandId } = useParams<{ brandId: string }>();
  const { brands } = useBrand();
  const selectedBrand = brands.find((brand) => brand._id === brandId);
  const hasGA4Account = selectedBrand?.ga4Account ?? false; 


  const resetToFirstPage = () => {
    console.log('Reset to first page');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        {!hasGA4Account ? <ConnectGA4 /> :<>
        <header className="sticky top-0 z-40 bg-white border-b px-4 py-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reports Overview</h1>
          <DatePickerWithRange
            date={date}
            setDate={setDate}
            defaultDate={{from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              to: new Date()}}
            resetToFirstPage={resetToFirstPage}
          />
        </header>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <>
            <section className="my-6">
              <DailyEcommerceMetrics dateRange={date} />
            </section>
            <section className="mb-6">
              <CityBasedReports dateRange={date} />
            </section>
            <section className="mb-6">
              <LandingPageSession dateRange={date} />
            </section>
            <section className="mb-6">
              <ChannelSessionPage dateRange={date} />
            </section>
            <section className="mb-6">
              <AgeReportPage dateRange={date} />
            </section>
            <section className="mb-6">
              <GenderBasedReports dateRange={date} />
            </section>
          </>
        )}
        </>}
      </div>
    </div>
  );
};

export default ReportsPage;