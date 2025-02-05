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
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import FilterConversions from "@/pages/ConversionReportPage/components/Filter";


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

const SearchTerm: React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange }) => {
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

  const componentId = 'search-term'; // Add a unique component identifier

  // Get filters from Redux
  const filters = useSelector((state: RootState) => 
    state.conversionFilters[componentId] || {}
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
      const response = await axiosInstance.post(`/api/segment/searchTerm/${brandId}`, {
        userId: user?.id,
        startDate,
        endDate,
        ...transformedFilters, // Use the memoized filters
      });
  
      const fetchedData = response.data?.data || [];
      setApiResponse({
        reportType: "Search Term",
        data: fetchedData,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [brandId, startDate, endDate, user?.id, transformedFilters]); // Now filters are tracked properly
  
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 15 * 60 * 1000); // Refresh every 10 minutes
    return () => clearInterval(intervalId);
}, [fetchData]);

useEffect(() => {
    setDate(propDateRange);
}, [propDateRange]);

  const handleManualRefresh = () => {
    fetchData();
  };

  // Extract columns dynamically from the API response
  const primaryColumn = "Search Term";
  const secondaryColumns = ["Total Cost", "Conv. Value / Cost"];
  const monthlyDataKey = "MonthlyData";
  const monthlyMetrics = ["Cost", "Conv. Value/ Cost"];

  return (
    <Card className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
      <CardContent>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">Search Term Insights</h2>
            <GoogleLogo />
          </div>
          <div className="flex flex-wrap items-center gap-3">
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

export default SearchTerm;
