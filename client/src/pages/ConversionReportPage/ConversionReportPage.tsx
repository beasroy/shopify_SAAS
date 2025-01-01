import React from 'react';
import { DateRange } from 'react-day-picker';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';
import { useBrand } from '@/context/BrandContext';
import { useParams } from 'react-router-dom';
import ConnectGA4 from '../ReportPage/ConnectGA4Page';
import { Radar } from 'lucide-react';
import { useTokenError } from '@/context/TokenErrorContext';
import NoGA4AcessPage from '../ReportPage/NoGA4AccessPage.';
import DeviceTypeConversion from './components/DeviceConversion';
import CityTypeConversion from './components/CityConversion';
import ChannelConversion from './components/ChannelConversion';



const ConversionReportPage: React.FC = () => {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth()-5, 1),
    to: new Date(),
  });
  const { brandId } = useParams<{ brandId: string }>();
  const { brands } = useBrand();
  const selectedBrand = brands.find((brand) => brand._id === brandId);
  const hasGA4Account = selectedBrand?.ga4Account ?? false;
  const { tokenError } = useTokenError();


  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        {tokenError ? (
          <NoGA4AcessPage />
        ) : !hasGA4Account ? (
          <ConnectGA4 />
        ) : (
          <>
            <header className="sticky top-0 z-40 bg-white border-b px-6 py-3 transition-all duration-300 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-secondary p-2 transition-transform duration-300 ease-in-out hover:scale-110">
                    <Radar className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-secondary-foreground to-primary">
                    Conversion Radar
                    </h1>
                  </div>
                </div>

                <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                  <DatePickerWithRange
                    date={date}
                    setDate={setDate}
                  />
                </div>
              </div>
            </header>
            <ChannelConversion />
            <DeviceTypeConversion />
            <CityTypeConversion />
          </>
        )}
      </div>
    </div>
  );
};

export default ConversionReportPage;