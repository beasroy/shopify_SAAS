import React from 'react';
import { DateRange } from 'react-day-picker';
import DailyEcommerceMetrics from '@/pages/EcommerceMetrics/EcommerceMetricsPage';
import CityBasedReports from '@/pages/CitySessionPage/CitySessionPage';
import LandingPageBasedReports from '@/pages/LandingPageSession/LandingPageSession';
import ReferringChannelBasedReports from '@/pages/RefferingChannelPage/RefferingChannelPage';
import AgeBasedReports from '@/pages/AgeReportPage/AgeReportPage';
import GenderBasedReports from '@/pages/GenderReportPage/GenderReportPage';
import CollapsibleSidebar from './Dashboard/CollapsibleSidebar';
import { TableSkeleton } from '@/components/dashboard_component/TableSkeleton';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';

const ReportsPage: React.FC = () => {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const isLoading = false;

  const resetToFirstPage = () => {
    console.log('Reset to first page');
  };

  return (
    <div className="flex h-screen">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        <header className="sticky top-0 z-40 bg-white border-b px-4 py-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reports Overview</h1>
          <DatePickerWithRange
            date={date}
            setDate={setDate}
            defaultDate={{ from: new Date(), to: new Date() }}
            resetToFirstPage={resetToFirstPage}
          />
        </header>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <>
            <section className="mb-8">
              <DailyEcommerceMetrics dateRange={date} />
            </section>
            <section className="mb-8">
              <CityBasedReports dateRange={date} />
            </section>
            <section className="mb-8">
              <LandingPageBasedReports dateRange={date} />
            </section>
            <section className="mb-8">
              <ReferringChannelBasedReports dateRange={date} />
            </section>
            <section className="mb-8">
              <AgeBasedReports dateRange={date} />
            </section>
            <section className="mb-8">
              <GenderBasedReports dateRange={date} />
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;