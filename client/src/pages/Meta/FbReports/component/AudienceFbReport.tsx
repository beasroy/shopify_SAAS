import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useParams } from "react-router-dom";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, RefreshCw, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setDate } from "@/store/slices/DateSlice";
import PerformanceSummary from "@/pages/ConversionReportPage/components/PerformanceSummary";
import { metricConfigs } from "@/data/constant";
import NumberFormatSelector from "@/components/dashboard_component/NumberFormatSelector";
import Loader from "@/components/dashboard_component/loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MetaReportTable from "./MetaReportTable";


type ApiResponse = {
    data: Array<{
        account_name: string;
        audienceData: Array<{
            "Audience Segments": string;
            "Total Spend": number;
            "Total Purchase ROAS": number;
            "Total PCV": number;
            MonthlyData?: Array<{
                Month: string;
                spend: number;
                purchase_roas: number;
                purchase_conversion_value: number;
            }>;
        }>;
    }>,
    blendedAudienceData: Array<{
        "Audience Segments": string;
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

const AudienceFbReport: React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange }) => {
    const dateFrom = useSelector((state: RootState) => state.date.from);
    const dateTo = useSelector((state: RootState) => state.date.to);
    const date = useMemo(() => ({
        from: dateFrom,
        to: dateTo
    }), [dateFrom, dateTo]);
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [fullScreenAccount, setFullScreenAccount] = useState('');

    const [blendedFilter, setBlendedFilter] = useState<string[]>([]);
    const [accountFilters, setAccountFilters] = useState<Record<string, string[]>>({});
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const dispatch = useDispatch();
    const locale = useSelector((state: RootState) => state.locale.locale);

    const { brandId } = useParams();
    const toggleFullScreen = (accountId: string) => {
        setFullScreenAccount(fullScreenAccount === accountId ? '' : accountId);
    };
    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

    const axiosInstance = createAxiosInstance();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {

            const response = await axiosInstance.post(`/api/meta/report/audience/${brandId}`, {
                startDate: startDate, endDate: endDate,
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
        const intervalId = setInterval(fetchData, 3 * 60 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [fetchData]);

    useEffect(() => {
        if (propDateRange?.from && propDateRange?.to) {
            dispatch(setDate({ 
                from: propDateRange.from.toISOString(), 
                to: propDateRange.to.toISOString() 
            }));
        }
    }, [propDateRange, dispatch]);

    const primaryColumn = "Audience Segments";
    const secondaryColumns = ["Total Spend", "Total Purchase ROAS"];
    const monthlyDataKey = "MonthlyData";


    const handleManualRefresh = () => {
        fetchData();
    };

    // Separate handler for blended summary filter
    const handleBlendedCategoryFilter = (items: (string | number)[] | undefined) => {
        if (items === undefined) {
            setBlendedFilter([]);
        } else {
            // If items is an empty array, it means filter applied but no results
            // We need to distinguish between "no filter" and "filter with no results"
            setBlendedFilter(items.length === 0 ? ['__NO_RESULTS__'] : items.map(item => String(item)));
        }
    };

    // Separate handler for individual account filters
    const handleAccountCategoryFilter = (accountName: string) => (items: (string | number)[] | undefined) => {
        if (items === undefined) {
            setAccountFilters(prev => ({
                ...prev,
                [accountName]: []
            }));
        } else {
            // If items is an empty array, it means filter applied but no results
            setAccountFilters(prev => ({
                ...prev,
                [accountName]: items.length === 0 ? ['__NO_RESULTS__'] : items.map(item => String(item))
            }));
        }
    };

    const blendedAudienceData = apiResponse?.blendedAudienceData;

    // Set default selected account
    useEffect(() => {
        if (apiResponse?.data && !selectedAccount) {
            if (blendedAudienceData && blendedAudienceData.length > 0) {
                setSelectedAccount('blended-summary');
            } else if (apiResponse.data.length === 1) {
                setSelectedAccount(apiResponse.data[0].account_name);
            } else if (apiResponse.data.length > 1) {
                setSelectedAccount(apiResponse.data[0].account_name);
            }
        }
    }, [apiResponse, selectedAccount, blendedAudienceData]);

    // Get current data based on selected account
    const currentData = useMemo(() => {
        if (selectedAccount === 'blended-summary') {
            return blendedAudienceData || [];
        }
        const account = apiResponse?.data.find(acc => acc.account_name === selectedAccount);
        return account?.audienceData || [];
    }, [selectedAccount, apiResponse, blendedAudienceData]);

    const singleAccountFilter = useMemo(() => {
        if (apiResponse?.data && apiResponse.data.length === 1) {
            const account = apiResponse.data[0];
            const accountFilter = accountFilters[account.account_name];
            if (!accountFilter || accountFilter.length === 0) return undefined;
            if (accountFilter.includes('__NO_RESULTS__')) return [];
            return accountFilter;
        }
        return undefined;
    }, [apiResponse?.data, accountFilters]);

    // Get current filter based on selected account - handle the special case
    const currentFilter = useMemo(() => {
        if (selectedAccount === 'blended-summary') {
            if (blendedFilter.length === 0) return undefined;
            if (blendedFilter.includes('__NO_RESULTS__')) return [];
            return blendedFilter;
        }
        const accountFilter = accountFilters[selectedAccount];
        if (!accountFilter || accountFilter.length === 0) return undefined;
        if (accountFilter.includes('__NO_RESULTS__')) return [];
        return accountFilter;
    }, [selectedAccount, blendedFilter, accountFilters]);

    // Get current filter handler based on selected account
    const currentFilterHandler = useMemo(() => {
        if (selectedAccount === 'blended-summary') {
            return handleBlendedCategoryFilter;
        }
        return handleAccountCategoryFilter(selectedAccount);
    }, [selectedAccount]);

    if (loading) {
        return <Loader isLoading={loading} />
    }

    // Don't render if no data
    if (!apiResponse?.data || apiResponse.data.length === 0) {
        return <div>No data available</div>;
    }

    // If only one account and no blended summary, show directly without filter
    if (apiResponse.data.length === 1 && (!blendedAudienceData || blendedAudienceData.length === 0)) {
        const account = apiResponse.data[0];
        return (
            <div>
                <Card className={`${fullScreenAccount === account.account_name ? 'fixed inset-0 z-50 m-0 bg-background p-2 overflow-auto' : 'rounded-md'}`}>
                    <div className="bg-white rounded-md pt-2 px-3">
                        <div className="flex items-center space-x-2">
                            <PerformanceSummary
                                key={account.account_name} // Add key to force remount
                                data={account.audienceData || []}
                                primaryColumn={primaryColumn}
                                metricConfig={metricConfigs.spendAndRoas || {}}
                                onCategoryFilter={handleAccountCategoryFilter(account.account_name)}
                            />
                            <DatePickerWithRange />
                            <NumberFormatSelector />
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
                    <CardContent className="p-0">
                        <div className="rounded-b-lg overflow-hidden px-2.5 pb-2.5">
                        <MetaReportTable
                                data={Array.isArray(account.audienceData) ? account.audienceData : [account.audienceData]}
                                primaryColumn={primaryColumn}
                                secondaryColumns={secondaryColumns}
                                monthlyDataKey={monthlyDataKey}
                                isFullScreen={fullScreenAccount === account.account_name}
                                locale={locale}
                                filter={singleAccountFilter} // Use the proper filter logic
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Multiple accounts or blended summary available - show with filter
    return (
        <div>
            <Card className={`${fullScreenAccount === selectedAccount ? 'fixed inset-0 z-50 m-0 bg-background p-2 overflow-auto' : 'rounded-md'}`}>
                <div className="bg-white rounded-md pt-2 px-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Account Selector */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <span className="text-sm">
                                            {selectedAccount === 'blended-summary' ? 'All Accounts' : selectedAccount}
                                        </span>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                        {blendedAudienceData && blendedAudienceData.length > 0 && (
                                        <DropdownMenuItem
                                            onClick={() => setSelectedAccount('blended-summary')}
                                            className={selectedAccount === 'blended-summary' ? 'bg-blue-50' : ''}
                                        >
                                            All Accounts
                                        </DropdownMenuItem>
                                    )}
                                    {apiResponse?.data.map((account) => (
                                        <DropdownMenuItem
                                            key={account.account_name}
                                            onClick={() => setSelectedAccount(account.account_name)}
                                            className={selectedAccount === account.account_name ? 'bg-blue-50' : ''}
                                        >
                                            {account.account_name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="flex items-center space-x-2">
                            <DatePickerWithRange />
                            <NumberFormatSelector />
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
                                onClick={() => toggleFullScreen(selectedAccount)}
                                size="sm"
                                variant="outline"
                                className="hover:bg-muted"
                            >
                                {fullScreenAccount === selectedAccount ? (
                                    <Minimize className="h-4 w-4" />
                                ) : (
                                    <Maximize className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
                <CardContent className="p-0 mt-3">
                    <div className="rounded-b-lg overflow-hidden px-2.5 pb-2.5">
                        <PerformanceSummary
                            key={selectedAccount} // Add key to force remount when account changes
                            data={currentData}
                            primaryColumn={primaryColumn}
                            metricConfig={metricConfigs.spendAndRoas || {}}
                            onCategoryFilter={currentFilterHandler}
                        />
                        <MetaReportTable
                            data={Array.isArray(currentData) ? currentData : [currentData]}
                            primaryColumn={primaryColumn}
                            secondaryColumns={secondaryColumns}
                            monthlyDataKey={monthlyDataKey}
                            isFullScreen={fullScreenAccount === selectedAccount}
                            locale={locale}
                            filter={currentFilter} // Let MetaReportTable handle the filtering logic
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default AudienceFbReport;
