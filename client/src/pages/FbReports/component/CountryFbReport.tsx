import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import ConversionTable from "@/pages/ConversionReportPage/components/Table";
import { useParams } from "react-router-dom";
import { Card, CardContent} from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, RefreshCw } from "lucide-react";
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";
import { DateRange } from "react-day-picker";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { FacebookLogo } from "@/data/logo";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setDate } from "@/store/slices/DateSlice";
import PerformanceSummary from "@/pages/ConversionReportPage/components/PerformanceSummary";
import { metricConfigs } from "@/data";


type ApiResponse = {
    data: Array<{
        account_name: string;
        countryData: Array<{
            "Country": string;
            "Total Spend": number;
            "Total Purchase ROAS": number;
            "Total PCV":number;
            MonthlyData?: Array<{
                Month: string;
                spend: number;
                purchase_roas: number;
                purchase_conversion_value: number;
            }>;
        }>;
    }>,
    blendedCountryData: Array<{
        "Country": string;
        "Total Spend": number;
        "Total Purchase ROAS": number;
        "Total PCV": number;
        MonthlyData?: Array<{
            Month: string;
            spend: number;
            purchase_roas: number;
            purchase_conversion_value: number;
        }>;
    }>
};

interface CityBasedReportsProps {
    dateRange: DateRange | undefined;
}

const CountryFbReport : React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange }) => {
    const dateFrom = useSelector((state: RootState) => state.date.from);
    const dateTo = useSelector((state: RootState) => state.date.to);
    const date = useMemo(() => ({
      from: dateFrom,
      to: dateTo
    }), [dateFrom, dateTo]);
    const dispatch = useDispatch();
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [fullScreenAccount, setFullScreenAccount] = useState('');


    const user = useSelector((state : RootState) => state.user.user);
    const { brandId } = useParams();
    const toggleFullScreen = (accountId:string) => {
        setFullScreenAccount(fullScreenAccount === accountId ? '' : accountId);
    };
    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

    const axiosInstance = createAxiosInstance();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {

            const response = await axiosInstance.post(`/api/fbReport/country/${brandId}`, {
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
        if (!fullScreenAccount) {
          if (propDateRange) {
          dispatch(setDate({
            from: propDateRange.from ? propDateRange.from.toISOString() : undefined, // Convert Date to string
            to: propDateRange.to ? propDateRange.to.toISOString() : undefined // Convert Date to string
          }));
        }
        }
      }, [fullScreenAccount, propDateRange]);

    const blendedCountryData = apiResponse?.blendedCountryData;

    const handleManualRefresh = () => {
        fetchData();
    };

    // Extract columns dynamically from the API response
    const primaryColumn = "Country";
    const monthlyDataKey = "MonthlyData";
    const secondaryColumns = ["Total Spend", "Total Purchase ROAS"];
    const monthlyMetrics = ["Spend", "Purchase ROAS"];

    return (
        <div>
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <FacebookLogo />
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">Country Insights</h2>
                    </div>
                </div>

            </div>

            {/* Account Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 gap-6">
                    <TableSkeleton />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {(blendedCountryData && blendedCountryData.length > 0)&&(
                         <Card
   
                         className={`${fullScreenAccount === 'blended-summary' ? 'fixed inset-0 z-50 m-0 bg-background p-2 overflow-auto' : 'rounded-md'}`}
                     >
                         <div className="bg-white rounded-md pt-2 px-3">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                     <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                     <div className="text-lg font-medium">
                                         Blended Summary
                                     </div>
                                 </div>
                                 <div className="flex items-center space-x-2">
                                     {fullScreenAccount && <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                                         <DatePickerWithRange
                                             
                                         />
                                     </div>}
                                     <Button
                                         onClick={handleManualRefresh}
                                         disabled={loading}
                                         size="sm"
                                         variant="outline"
                                         className="hover:bg-muted"
                                     >
                                         <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                     </Button>
                                     <Button
                                         onClick={() => toggleFullScreen('blended-summary')}
                                         size="sm"
                                         variant="outline"
                                         className="hover:bg-muted"
                                     >
                                         {fullScreenAccount === 'blended-summary' ? (
                                             <Minimize className="h-4 w-4" />
                                         ) : (
                                             <Maximize className="h-4 w-4" />
                                         )}
                                     </Button>
                                 </div>
                             </div>
                         </div>
                         <CardContent className="p-0">
                             <div className="rounded-b-lg overflow-hidden px-2.5 pb-2.5">
                             <PerformanceSummary
                                        data={blendedCountryData|| []}
                                        primaryColumn={primaryColumn}
                                        metricConfig={metricConfigs.spendAndRoas || {}}
                                    />
                                 <ConversionTable
                                     data={Array.isArray(blendedCountryData) ? blendedCountryData : [blendedCountryData]}
                                     primaryColumn={primaryColumn}
                                     secondaryColumns={secondaryColumns}
                                     monthlyDataKey={monthlyDataKey}
                                     monthlyMetrics={monthlyMetrics}
                                     isFullScreen={fullScreenAccount === 'blended-summary'}
                                 />
                             </div>
                         </CardContent>
                     </Card>
                    )}
                    {apiResponse?.data.map((account, index) => (
                        <Card
                            key={index}
                            className={`${fullScreenAccount === account.account_name ? 'fixed inset-0 z-50 m-0 bg-background p-2 overflow-auto' : 'rounded-md'}`}
                        >
                            <div className="bg-white rounded-md pt-2 px-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                        <div className="text-lg font-medium">
                                            {account.account_name}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                    {fullScreenAccount && <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                                            <DatePickerWithRange
                                               
                                            />
                                        </div>}
                                        <Button
                                            onClick={handleManualRefresh}
                                            disabled={loading}
                                            size="sm"
                                            variant="outline"
                                            className="hover:bg-muted"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        </Button>
                                        <Button
                                            onClick={() => toggleFullScreen(account.account_name)}
                                            size="sm"
                                            variant="outline"
                                            className="hover:bg-muted"
                                        >
                                            {fullScreenAccount === account.account_name ? (
                                                <Minimize className="h-4 w-4" />
                                            ) : (
                                                <Maximize className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <CardContent className="p-0">
                                <div className="rounded-b-lg overflow-hidden px-2.5 pb-2.5">
                                     <PerformanceSummary
                                        data={account.countryData|| []}
                                        primaryColumn={primaryColumn}
                                        metricConfig={metricConfigs.spendAndRoas || {}}
                                    />
                                    <ConversionTable
                                        data={account.countryData}
                                        primaryColumn={primaryColumn}
                                        secondaryColumns={secondaryColumns}
                                        monthlyDataKey={monthlyDataKey}
                                        monthlyMetrics={monthlyMetrics}
                                        isFullScreen={fullScreenAccount === account.account_name}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
export default CountryFbReport;
