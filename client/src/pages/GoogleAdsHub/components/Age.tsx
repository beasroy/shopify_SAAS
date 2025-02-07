import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import ConversionTable from "@/pages/ConversionReportPage/components/Table";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, RefreshCw } from "lucide-react";
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";
import { DateRange } from "react-day-picker";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { GoogleLogo } from "@/pages/AnalyticsDashboard/AdAccountsMetricsCard";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import FilterConversions from "@/pages/ConversionReportPage/components/Filter";
import { setDate } from "@/store/slices/DateSlice";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";


type ApiResponse = {
  reportType: string;
  data: Array<{
    DeviceType: string;
    MonthlyData?: Array<{ Month: string;[key: string]: any }>;
    [key: string]: any;
  }>;
};

interface CityBasedReportsProps {
  dateRange: DateRange | undefined;
}

const Age: React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange }) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);

  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const dispatch = useDispatch();
  
  
  const user = useSelector((state: RootState)=>state.user.user , shallowEqual)
  const { brandId } = useParams();
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

  const axiosInstance = createAxiosInstance();

  const componentId = 'google-ads-age';

  const filters = useSelector((state: RootState) => 
    state.conversionFilters[componentId] || {} , shallowEqual
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

      const response = await axiosInstance.post(`/api/segment/age/${brandId}`, {
        userId: user?.id, startDate: startDate, endDate: endDate, ...transformedFilters
      }, { withCredentials: true })

      const fetchedData = response.data || [];

      setApiResponse(fetchedData);

    } catch (error) {
      console.error("Error fetching data:", error);

    } finally {
      setLoading(false);
    }
  }, [brandId, startDate, endDate,transformedFilters, user?.id]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 15 * 60 * 1000); 
    return () => clearInterval(intervalId);
  }, [fetchData]);

 useEffect(() => {
    if (propDateRange) {
      dispatch(setDate({
        from: propDateRange.from ? propDateRange.from.toISOString() : undefined, // Convert Date to string
        to: propDateRange.to ? propDateRange.to.toISOString() : undefined // Convert Date to string
      }));
    }
  }, [propDateRange]);

  useEffect(() => {
    if (!isFullScreen) {
      if (propDateRange) {
      dispatch(setDate({
        from: propDateRange.from ? propDateRange.from.toISOString() : undefined, // Convert Date to string
        to: propDateRange.to ? propDateRange.to.toISOString() : undefined // Convert Date to string
      }));
    }
    }
  }, [isFullScreen, propDateRange]);

  const handleManualRefresh = () => {
    fetchData();
  };

  // Extract columns dynamically from the API response
  const primaryColumn = "Age Range";
  const monthlyDataKey = "MonthlyData";
  const secondaryColumns = ["Total Cost", "Conv. Value / Cost"];
  const monthlyMetrics = ["Cost","Conv. Value/ Cost"];

  return (
    <Card className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
      <CardContent>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">Age Insights</h2>
            <GoogleLogo />
          </div>
          <div className="flex flex-wrap items-center gap-3">
          {isFullScreen && <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                  <DatePickerWithRange
                  />
                </div>}
            <Button onClick={handleManualRefresh} disabled={loading} size="icon" variant="outline">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <FilterConversions 
              componentId={componentId}
              availableColumns={["Total Cost", "Conv. Value / Cost"]}
            />
            <Button onClick={toggleFullScreen} size="icon" variant="outline">
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="rounded-md overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <div>
              <ConversionTable
                data={apiResponse?.data || []}
                primaryColumn={primaryColumn}
                secondaryColumns={secondaryColumns}
                monthlyDataKey={monthlyDataKey}
                monthlyMetrics={monthlyMetrics}
                isFullScreen={isFullScreen}
                isAdsTable={true}
              />
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

export default Age;
