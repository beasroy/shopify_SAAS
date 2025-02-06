import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import ConversionTable from "./Table";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Ga4Logo } from "@/pages/GeneralisedDashboard/components/OtherPlatformModalContent";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, RefreshCw } from "lucide-react";
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";
import { DateRange } from "react-day-picker";
import createAxiosInstance from "./axiosInstance";
import PerformanceSummary from "./PerformanceSummary";
import ExcelDownload from "./ExcelDownload";
import FilterConversions from "./Filter";
import { shallowEqual, useSelector } from 'react-redux';
import { RootState } from '@/store';
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


const BrowserConversion: React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange }) => {
    const [date, setDate] = useState<DateRange | undefined>(propDateRange);
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
    const componentId = 'browser-conversion';
    const user = useSelector((state: RootState)=>state.user.user);
    const { brandId } = useParams();

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };


    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";
    const axiosInstance = createAxiosInstance();

    const filters = useSelector((state: RootState) => 
        state.conversionFilters[componentId] || {} ,shallowEqual
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
            const response = await axiosInstance.post(`/api/analytics/browserConversionReport/${brandId}`, {
                userId: user?.id,
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
    }, [brandId, startDate, endDate, transformedFilters, user?.id]);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 15 * 60 * 1000); // Refresh every 5 minutes
        return () => clearInterval(intervalId);
    }, [fetchData]);

    useEffect(() => {
        setDate(propDateRange);
    }, [propDateRange]);

    useEffect(() => {
        if (!isFullScreen) {
          setDate(propDateRange);
        }
      }, [isFullScreen, propDateRange]);

    const handleManualRefresh = () => {
        fetchData();
    };

    // Extract columns dynamically from the API response
    const primaryColumn = "Browser";
    const secondaryColumns = ["Total Sessions", "Avg Conv. Rate"];
    const monthlyDataKey = "MonthlyData";
    const monthlyMetrics = ["Sessions", "Conv. Rate"];

    return (
        <Card className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
            <CardContent>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-medium">Browser based Conversion</h2>
                        <Ga4Logo />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {isFullScreen && <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                            <DatePickerWithRange
                                date={date}
                                setDate={setDate}
                                defaultDate={{
                                    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                                    to: new Date()
                                }}
                            />
                        </div>}
                        <Button onClick={handleManualRefresh} disabled={loading} size="icon" variant="outline">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <FilterConversions componentId={componentId} availableColumns={["Total Sessions", "Avg Conv Rate"]} />
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
                    {loading ? (
                        <TableSkeleton />
                    ) : (
                        <div>
                            <PerformanceSummary data={apiResponse?.data || []} primaryColumn={primaryColumn} />
                            <ConversionTable
                                data={apiResponse?.data || []}
                                primaryColumn={primaryColumn}
                                secondaryColumns={secondaryColumns}
                                monthlyDataKey={monthlyDataKey}
                                monthlyMetrics={monthlyMetrics}
                                isFullScreen={isFullScreen}
                            />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default BrowserConversion;
