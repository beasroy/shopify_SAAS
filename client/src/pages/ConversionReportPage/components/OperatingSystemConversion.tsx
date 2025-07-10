import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import ConversionTable from "./Table";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Ga4Logo } from "@/data/logo";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, RefreshCw } from "lucide-react";
import { DateRange } from "react-day-picker";
import createAxiosInstance from "./axiosInstance";
import PerformanceSummary from "./PerformanceSummary";
import ExcelDownload from "./ExcelDownload";
import FilterConversions from "./Filter";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { setDate } from "@/store/slices/DateSlice";
import { metricConfigs } from "@/data/constant";
import NumberFormatSelector from "@/components/dashboard_component/NumberFormatSelector";
import Loader from "@/components/dashboard_component/loader";

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

const OperatingSystemConversion: React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange }) => {
    const dateFrom = useSelector((state: RootState) => state.date.from);
    const dateTo = useSelector((state: RootState) => state.date.to);
    const date = useMemo(() => ({
      from: dateFrom,
      to: dateTo
    }), [dateFrom, dateTo]);
    const dispatch = useDispatch();
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
    const [currentFilter, setCurrentFilter] = useState<string[]>([]);
    const componentId = 'operatingSystem-conversion'


    const locale = useSelector((state: RootState)=>state.locale.locale);
    const { brandId } = useParams();
    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

    const axiosInstance = createAxiosInstance();

    const filters = useSelector((state: RootState) => 
        state.conversionFilters[componentId] || {} , shallowEqual
      );

      const transformedFilters = useMemo(() => {
        return Object.entries(filters).reduce<Record<string, any>>((acc, [column, filter]) => {
          if (filter) {
            const apiColumnName = {
              "Total Sessions": "sessionsFilter",
              "Avg Conv Rate": "convRateFilter",
            }[column] || column;
    
            acc[apiColumnName] = filter;
          }
          return acc;
        }, {});
      }, [filters]);

      
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.post(`/api/analytics/operatingSystemConversionReport/${brandId}`, {
               
                startDate,
                endDate,  ...transformedFilters  // Spread the transformed filters
            });
            const fetchedData = response.data || [];

            setApiResponse(fetchedData);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [brandId, startDate, endDate, transformedFilters]);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 3 * 60 * 60 * 1000); 
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

    const handleCategoryFilter = (items: (string | number)[]) => {
        setCurrentFilter(items.map(item => String(item)));
    };

    // Extract columns dynamically from the API response
    const primaryColumn = "Operating System";
    const secondaryColumns = ["Total Sessions", "Avg Conv. Rate"];
    const monthlyDataKey = "MonthlyData";
    const monthlyMetrics = ["Sessions", "Conv. Rate"];

    if (loading) {
        return <Loader isLoading={loading} />
    }

    return (
        <Card className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''} overflow-auto`}>
            <CardContent>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-medium">Operating System based Conversion</h2>
                        <Ga4Logo />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {isFullScreen && <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                            <DatePickerWithRange
                               
                            />
                        </div>}
                        <NumberFormatSelector />
                        <Button onClick={handleManualRefresh} disabled={loading} size="icon" variant="outline">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <FilterConversions componentId={componentId} />
                        <ExcelDownload
                            data={apiResponse?.data || []}
                            fileName={`${primaryColumn}_Conversion_Report`}
                            primaryColumn={primaryColumn}
                            secondaryColumns={secondaryColumns}
                            monthlyDataKey={monthlyDataKey}
                            monthlyMetrics={monthlyMetrics}
                            disabled={loading}
                        />
                        <Button onClick={toggleFullScreen} size="icon" variant="outline">
                            {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="rounded-md overflow-hidden">
                        <div>
                            <PerformanceSummary
                                data={apiResponse?.data || []}
                                primaryColumn={primaryColumn}
                                metricConfig={metricConfigs.sessionsAndConversion || {}}
                                onCategoryFilter={handleCategoryFilter}
                            />
                            <ConversionTable
                                data={apiResponse?.data || []}
                                primaryColumn={primaryColumn}
                                secondaryColumns={secondaryColumns}
                                monthlyDataKey={monthlyDataKey}
                                monthlyMetrics={monthlyMetrics}
                                isFullScreen={isFullScreen}
                                locale={locale}
                                filter={currentFilter}
                            />
                        </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default OperatingSystemConversion;
