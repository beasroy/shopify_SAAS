import ProductTab from "./component/ProductTab";
import SearchTermTable from "./component/SearchTermTable";
import { useParams } from 'react-router-dom'
import AgeGenderMetrics from "./component/AgeGenderMetrics";
import CityBasedReports from '@/pages/ReportPage/component/CitySessionPage';
import LandingPageSession from "../ReportPage/component/LandingPageSession";
import AgeReportPage from "../ReportPage/component/AgeReportPage";
import GenderBasedReports from '@/pages/ReportPage/component/GenderReportPage';
import ChannelSessionPage from "../ReportPage/component/RefferingChannelPage";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

export default function Dashboard() {
  const { brandId } = useParams()
    if (!brandId) {
        console.error("Brand ID is not defined");
        return <div>Error: Brand ID is missing</div>;
    }

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
    <div className="bg-gray-100 min-h-screen overflow-hidden">
       <nav className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-2xl font-bold">Segment Dashboard</h1>
      
        <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                  <DatePickerWithRange
                  
                    
                  />
                </div>
                </div>
      </nav>
      <div className="flex flex-col p-6 gap-6 overflow-auto">
      <ProductTab />
      <SearchTermTable />
      <AgeGenderMetrics />
      <section className="mb-6">
                  <CityBasedReports dateRange={dateRange} />
                </section>
                <section className="mb-6">
                  <LandingPageSession dateRange={dateRange} />
                </section>
                <section className="mb-6">
                  <ChannelSessionPage dateRange={dateRange} />
                </section>
                <section className="mb-6">
                  <AgeReportPage dateRange={dateRange} />
                </section>
                <section className="mb-6">
                  <GenderBasedReports dateRange={dateRange} />
                </section>
      </div>
  
    </div>
  )
}