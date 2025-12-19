import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { useParams } from "react-router-dom";
import { DateRange } from "react-day-picker";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Loader from "@/components/dashboard_component/loader";
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
  isFullScreen: boolean;
}

const Product: React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange, refreshTrigger, currentFilter, onDataUpdate, isFullScreen }) => {
  const [date, setDate] = useState<DateRange | undefined>(propDateRange);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);


  const user = useSelector((state: RootState) => state.user.user);
  const { brandId } = useParams();

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


  // Extract columns dynamically from the API response
  const primaryColumn = "Product";
  const monthlyDataKey = "MonthlyData";
  const secondaryColumns = ["Total Cost", "Conv. Value / Cost"];

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
          data={apiResponse?.data[0]?.products || []}
          primaryColumn={primaryColumn}
          secondaryColumns={secondaryColumns}
          monthlyDataKey={monthlyDataKey}
          isFullScreen={isFullScreen}
          locale={locale}
          filter={currentFilter}
        />
      </div>
    </>
  )
};

export default Product;
