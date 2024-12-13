import React, { useState } from 'react';
import DailyEcommerceMetrics from '@/pages/EcommerceMetrics/EcommerceMetricsPage';
import CityBasedReports from '@/pages/CitySessionPage/CitySessionPage';
import LandingPageBasedReports from '@/pages/LandingPageSession/LandingPageSession';
import ReferringChannelBasedReports from '@/pages/RefferingChannelPage/RefferingChannelPage';
import AgeBasedReports from '@/pages/AgeReportPage/AgeReportPage';
import GenderBasedReports from '@/pages/GenderReportPage/GenderReportPage';
import CollapsibleSidebar from './Dashboard/CollapsibleSidebar';
import { TableSkeleton } from '@/components/dashboard_component/TableSkeleton';


const ReportsPage: React.FC = () => {
  // Extract brandId from the URL parameters
  const [isLoading] = useState(false);
  return (
    <div className="flex h-screen">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        <header className="sticky top-0 z-50 bg-white border-b px-4 py-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reports Overview</h1>
        </header>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <>
            <section className="mb-8">
              <DailyEcommerceMetrics />
            </section>
            <section className="mb-8">
              <CityBasedReports />
            </section>
            <section className="mb-8">
              <LandingPageBasedReports />
            </section>
            <section className="mb-8">
              <ReferringChannelBasedReports />
            </section>
            <section className="mb-8">
              <AgeBasedReports />
            </section>
            <section className="mb-8">
              <GenderBasedReports />
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;