import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import ConversionTable from "@/pages/ConversionReportPage/components/Table";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, RefreshCw, Target } from "lucide-react";
import { DateRange } from "react-day-picker";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { GoogleLogo } from "@/data/logo";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import FilterConversions from "@/pages/ConversionReportPage/components/Filter";
import Loader from "@/components/dashboard_component/loader";
import NoAccessPage from "@/components/dashboard_component/NoAccessPage.";
import { selectGoogleAdsTokenError } from "@/store/slices/TokenSllice";
import NewConversionTable from "@/pages/ConversionReportPage/components/ConversionTable";


type AdAccountData = {
  accountId: string;
  accountName: string;
  products: Array<{
    "Product": string;
    "Total Cost": number;
    "Conv. Value / Cost": number;
    "Total Conv. Value": number;
    MonthlyData?: Array<{ Month: string;[key: string]: any }>;
    [key: string]: any;
  }>;
  error?: string;
};

export type ApiResponse = {
  reportType: string;
  data: AdAccountData[];
};

interface CityBasedReportsProps {
  dateRange: DateRange | undefined;
  refreshTrigger: number,
  currentFilter: string[] | undefined;
  onDataUpdate: (data: any[], tabType: string) => void;
}

const Product: React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange, refreshTrigger, currentFilter, onDataUpdate }) => {
  const [date, setDate] = useState<DateRange | undefined>(propDateRange);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);


  const user = useSelector((state: RootState) => state.user.user);
  const { brandId } = useParams();
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

  const axiosInstance = createAxiosInstance();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {

      const response = await axiosInstance.post(`/api/google/product/${brandId}`, {
        userId: user?.id, startDate: startDate, endDate: endDate,
      }, { withCredentials: true })

      const fetchedData = response.data || [];

      setApiResponse(fetchedData);

    } catch (error) {
      console.error("Error fetching data:", error);

    } finally {
      setLoading(false);
    }
  }, [brandId, startDate, endDate,]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchData, refreshTrigger]);

  useEffect(() => {
    setDate(propDateRange);
  }, [propDateRange]);

  useEffect(() => {
    if (apiResponse?.data && onDataUpdate) {
      onDataUpdate(apiResponse.data[0]?.products, 'product');
    }
  }, [apiResponse?.data, onDataUpdate]);

  const handleManualRefresh = () => {
    fetchData();
  };

  // Extract columns dynamically from the API response
  const primaryColumn = "Product";
  const monthlyDataKey = "MonthlyData";
  const secondaryColumns = ["Total Cost", "Conv. Value / Cost"];
  const monthlyMetrics = ["Cost", "Conv. Value/ Cost"];

  const componentId = "google-ads-product";
  const locale = useSelector((state: RootState) => state.locale.locale)
  const googleAdsTokenError = useSelector(selectGoogleAdsTokenError);
  console.log(googleAdsTokenError);

  if (loading) {
    return <Loader isLoading={loading} />;
  }

  console.log("apiResponse", apiResponse?.data[0]?.products);

  return (
    <>
      <div className="rounded-md overflow-hidden">
        <NewConversionTable
          // data={mapSearchTermsForTable(apiResponse?.data || [])}
          data={apiResponse?.data[0]?.products || []}
          primaryColumn={primaryColumn}
          secondaryColumns={secondaryColumns}
          monthlyDataKey={monthlyDataKey}
          // monthlyMetrics={monthlyMetrics}
          isFullScreen={isFullScreen}
          locale={locale}
          filter={currentFilter}
        />
      </div>
    </>
  )

  // return (
  //   <>
  //     {googleAdsTokenError ? (
  //       <NoAccessPage
  //         platform="Google Ads"
  //         message="Looks like we need to refresh your Google Ads connection to optimize your campaigns."
  //         icon={<Target className="w-8 h-8 text-red-500" />}
  //         loginOptions={[
  //           {
  //             label: "Connect Google Ads",
  //             context: "googleAdSetup",
  //             provider: "google"
  //           }
  //         ]}
  //       />
  //     ) : loading ? (
  //       <Loader isLoading={loading} />
  //     ) : (
  //       apiResponse?.data && apiResponse.data.map((account, _) => (
  //         <div className={`${isFullScreen ? 'fixed inset-0 z-50 m-0 overflow-auto bg-white' : ''}`}>
  //           <Card key={account.accountId} className="mb-4">

  //             <CardContent>

  //               {/* <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
  //                 <h3 className="text-lg font-semibold mb-4 mt-2 flex items-center">
  //                   <span className="mr-2"><GoogleLogo /></span>
  //                   <span className="">{account.accountName}</span>
  //                 </h3>
  //                 <div className="flex flex-wrap items-center gap-3">
  //                   {isFullScreen &&
  //                     <div className="transition-transform duration-300 ease-in-out hover:scale-105">
  //                       <DatePickerWithRange />
  //                     </div>
  //                   }
  //                   <Button onClick={handleManualRefresh} disabled={loading} size="icon" variant="outline">
  //                     <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
  //                   </Button>
  //                   <FilterConversions
  //                     componentId={componentId}
  //                     availableColumns={["Total Cost", "Conv. Value / Cost"]}
  //                   />
  //                   <Button onClick={toggleFullScreen} size="icon" variant="outline">
  //                     {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
  //                   </Button>
  //                 </div>
  //               </div> */}

  //               {account.error ? (
  //                 <p className="text-red-500">Error: {account.error}</p>
  //               ) : account.products.length === 0 ? (
  //                 <p className="text-gray-500">No product data available for this account</p>
  //               ) : (
  //                 <div className="rounded-md overflow-hidden">
  //                   <NewConversionTable
  //                     data={account.products}
  //                     primaryColumn={primaryColumn}
  //                     secondaryColumns={secondaryColumns}
  //                     monthlyDataKey={monthlyDataKey}
  //                     // monthlyMetrics={monthlyMetrics}
  //                     isFullScreen={isFullScreen}
  //                     locale={locale}
  //                   />
  //                 </div>
  //               )}
  //             </CardContent>
  //           </Card>
  //         </div>
  //       ))
  //     )}

  //     {apiResponse?.data && apiResponse.data.length === 0 && !loading && (
  //       <Card>
  //         <CardContent>
  //           <p className="text-gray-500 text-center py-4">No product data available</p>
  //         </CardContent>
  //       </Card>
  //     )}
  //   </>
  // );
};

export default Product;
