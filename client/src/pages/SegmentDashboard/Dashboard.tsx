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
import { useState } from "react";
import { DateRange } from "react-day-picker";

export default function Dashboard() {
  const { brandId } = useParams()
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

    if (!brandId) {
        console.error("Brand ID is not defined");
        return <div>Error: Brand ID is missing</div>;
    }
  return (
    <div className="bg-gray-100 min-h-screen overflow-hidden">
       <nav className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-2xl font-bold">Segment Dashboard</h1>
      
        <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                  <DatePickerWithRange
                    date={date}
                    setDate={setDate}
                    defaultDate={{
                      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                      to: new Date()
                    }}
                  />
                </div>
                </div>
      </nav>
      <div className="flex flex-col p-6 gap-6 overflow-auto">
      <ProductTab />
      <SearchTermTable />
      <AgeGenderMetrics />
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
      </div>
  
    </div>
  )
}