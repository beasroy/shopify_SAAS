import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useParams } from "react-router-dom";
import { DateRange } from "react-day-picker";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setDate } from "@/store/slices/DateSlice";
import Loader from "@/components/dashboard_component/loader";
import { selectGoogleAdsTokenError } from '@/store/slices/TokenSllice';
import NewConversionTable from "@/pages/ConversionReportPage/components/ConversionTable";

type AdAccountData = {
  accountId: string;
  accountName: string;
  ageRanges: Array<{
    "Age Range": string,
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

const Age: React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange, refreshTrigger, currentFilter, onDataUpdate, isFullScreen }) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);

  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const locale = useSelector((state: RootState) => state.locale.locale)
  const dispatch = useDispatch();
  const googleAdsTokenError = useSelector(selectGoogleAdsTokenError);
  console.log(googleAdsTokenError);


  const user = useSelector((state: RootState) => state.user.user, shallowEqual)
  const { brandId } = useParams();

  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

  const axiosInstance = createAxiosInstance();

  const componentId = 'google-ads-age';

  const filters = useSelector((state: RootState) =>
    state.conversionFilters[componentId] || {}, shallowEqual
  );

  const transformedFilters = useMemo(() => {
    return Object.entries(filters).reduce<Record<string, any>>((acc, [column, filter]) => {
      if (filter) {
        const apiColumnName = {
          "Total Cost": "costFilter",
          "Conv. Value / Cost": "convValuePerCostFilter",
        }[column] || column;

        acc[apiColumnName] = filter;
      }
      return acc;
    }, {});
  }, [filters]); // Only re-compute when filters change

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {

      const response = await axiosInstance.post(`/api/google/age/${brandId}`, {
        userId: user?.id, startDate: startDate, endDate: endDate, ...transformedFilters
      }, { withCredentials: true })


      setApiResponse({
        reportType: "Age",
        data: response.data?.data || [],
      });

    } catch (error) {
      console.error("Error fetching data:", error);

    } finally {
      setLoading(false);
    }
  }, [brandId, startDate, endDate, transformedFilters, user?.id]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchData, refreshTrigger]);

  useEffect(() => {
    if (propDateRange) {
      dispatch(setDate({
        from: propDateRange.from ? propDateRange.from.toISOString() : undefined, // Convert Date to string
        to: propDateRange.to ? propDateRange.to.toISOString() : undefined // Convert Date to string
      }));
    }
  }, [propDateRange]);


  // Update parent with data
  useEffect(() => {
    if (apiResponse?.data && onDataUpdate) {
      onDataUpdate(apiResponse.data[0]?.ageRanges, 'age');
    }
  }, [apiResponse?.data, onDataUpdate]);


  // Extract columns dynamically from the API response
  const primaryColumn = "Age Range";
  const monthlyDataKey = "MonthlyData";
  const secondaryColumns = ["Total Cost", "Conv. Value / Cost"];

  console.log("apiResponse", apiResponse?.data[0]?.ageRanges);

  if (loading) {
    return <Loader isLoading={loading} />;
  }

  return (
    <>
      <div className="rounded-md overflow-hidden">
        <NewConversionTable
          data={apiResponse?.data[0]?.ageRanges || []}
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

export default Age;
