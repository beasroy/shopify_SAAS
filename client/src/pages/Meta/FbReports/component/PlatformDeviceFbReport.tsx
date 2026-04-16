import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
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
    platformDeviceData: Array<{
      platform_device: string;
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
  }>;
  blendedPlatformDeviceData: Array<{
    platform_device: string;
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
};

interface CityBasedReportsProps {
  dateRange: DateRange | undefined;
}

const PlatformDeviceFbReport: React.FC<CityBasedReportsProps> = ({
  dateRange: propDateRange,
}) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
    }),
    [dateFrom, dateTo],
  );
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fullScreenAccount, setFullScreenAccount] = useState("");

  const [blendedFilter, setBlendedFilter] = useState<string[]>([]);
  const [accountFilters, setAccountFilters] = useState<
    Record<string, string[]>
  >({});
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const dispatch = useDispatch();
  const locale = useSelector((state: RootState) => state.locale.locale);

  const { brandId } = useParams();
  const toggleFullScreen = (accountId: string) => {
    setFullScreenAccount(fullScreenAccount === accountId ? "" : accountId);
  };
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

  const axiosInstance = createAxiosInstance();

  useEffect(() => {
    setApiResponse(null);
  }, [brandId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post(
        `/api/meta/report/platform-device/${brandId}`,
        {
          startDate: startDate,
          endDate: endDate,
        },
        { withCredentials: true },
      );

      const fetchedData = response.data || [];

      setApiResponse(fetchedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [brandId, startDate, endDate]);

  useEffect(() => {
    if (date.from && date.to) {
      fetchData();
    }
  }, [fetchData]);

  useEffect(() => {
    const intervalId = setInterval(
      () => {
        if (date.from && date.to) {
          fetchData();
        }
      },
      3 * 60 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [fetchData, date.from, date.to]);

  useEffect(() => {
    if (propDateRange?.from && propDateRange?.to) {
      dispatch(
        setDate({
          from: propDateRange.from.toISOString(),
          to: propDateRange.to.toISOString(),
        }),
      );
    }
  }, [propDateRange, dispatch]);

  const primaryColumn = "platform_device";
  const secondaryColumns = ["Total Spend", "Total Purchase ROAS"];
  const monthlyDataKey = "MonthlyData";

  const handleManualRefresh = () => {
    fetchData();
  };

  const handleBlendedCategoryFilter = useCallback(
    (items: (string | number)[] | undefined) => {
      if (items === undefined) {
        setBlendedFilter([]);
      } else {
        setBlendedFilter(
          items.length === 0
            ? ["__NO_RESULTS__"]
            : items.map((item) => String(item)),
        );
      }
    },
    [],
  );

  const handleAccountCategoryFilter = useCallback(
    (accountName: string) => (items: (string | number)[] | undefined) => {
      if (items === undefined) {
        setAccountFilters((prev) => ({
          ...prev,
          [accountName]: [],
        }));
      } else {
        setAccountFilters((prev) => ({
          ...prev,
          [accountName]:
            items.length === 0
              ? ["__NO_RESULTS__"]
              : items.map((item) => String(item)),
        }));
      }
    },
    [],
  );

  const blendedPlatformDeviceData = apiResponse?.blendedPlatformDeviceData;

  useEffect(() => {
    if (apiResponse?.data && !selectedAccount) {
      if (blendedPlatformDeviceData && blendedPlatformDeviceData.length > 0) {
        setSelectedAccount("blended-summary");
      } else if (apiResponse.data.length === 1) {
        setSelectedAccount(apiResponse.data[0].account_name);
      } else if (apiResponse.data.length > 1) {
        setSelectedAccount(apiResponse.data[0].account_name);
      }
    }
  }, [apiResponse, selectedAccount, blendedPlatformDeviceData]);

  const currentData = useMemo(() => {
    if (selectedAccount === "blended-summary") {
      return blendedPlatformDeviceData || [];
    }
    const account = apiResponse?.data.find(
      (acc) => acc.account_name === selectedAccount,
    );
    return account?.platformDeviceData || [];
  }, [selectedAccount, apiResponse, blendedPlatformDeviceData]);

  const currentFilter = useMemo(() => {
    if (selectedAccount === "blended-summary") {
      if (blendedFilter.length === 0) return undefined;
      if (blendedFilter.includes("__NO_RESULTS__")) return [];
      return blendedFilter;
    }
    const accountFilter = accountFilters[selectedAccount];
    if (!accountFilter || accountFilter.length === 0) return undefined;
    if (accountFilter.includes("__NO_RESULTS__")) return [];
    return accountFilter;
  }, [selectedAccount, blendedFilter, accountFilters]);

  const singleAccountFilter = useMemo(() => {
    if (apiResponse?.data && apiResponse.data.length === 1) {
      const account = apiResponse.data[0];
      const accountFilter = accountFilters[account.account_name];
      if (!accountFilter || accountFilter.length === 0) return undefined;
      if (accountFilter.includes("__NO_RESULTS__")) return [];
      return accountFilter;
    }
    return undefined;
  }, [apiResponse?.data, accountFilters]);

  const currentFilterHandler = useMemo(() => {
    if (selectedAccount === "blended-summary") {
      return handleBlendedCategoryFilter;
    }
    return handleAccountCategoryFilter(selectedAccount);
  }, [
    selectedAccount,
    handleBlendedCategoryFilter,
    handleAccountCategoryFilter,
  ]);

  if (loading) {
    return <Loader isLoading={loading} />;
  }

  if (!apiResponse?.data || apiResponse.data.length === 0) {
    return <div>No data available</div>;
  }
  if (
    apiResponse.data.length === 1 &&
    (!blendedPlatformDeviceData || blendedPlatformDeviceData.length === 0)
  ) {
    const account = apiResponse.data[0];

    return (
      <div>
        <Card
          className={`${fullScreenAccount === account.account_name ? "fixed inset-0 z-50 m-0 bg-background p-2 overflow-auto" : "rounded-md"}`}
        >
          <div className="bg-white rounded-md pt-2 px-3">
            <div className="flex items-center space-x-2">
              <PerformanceSummary
                key={account.account_name}
                data={account.platformDeviceData || []}
                primaryColumn={primaryColumn}
                metricConfig={metricConfigs.spendAndRoas || {}}
                onCategoryFilter={handleAccountCategoryFilter(
                  account.account_name,
                )}
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
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
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
                data={
                  Array.isArray(account.platformDeviceData)
                    ? account.platformDeviceData
                    : [account.platformDeviceData]
                }
                primaryColumn={primaryColumn}
                secondaryColumns={secondaryColumns}
                monthlyDataKey={monthlyDataKey}
                isFullScreen={fullScreenAccount === account.account_name}
                locale={locale}
                filter={singleAccountFilter}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card
        className={`${fullScreenAccount === selectedAccount ? "fixed inset-0 z-50 m-0 bg-background p-2 overflow-auto" : "rounded-md"}`}
      >
        <div className="bg-white rounded-md pt-2 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Account Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <span className="text-sm">
                      {selectedAccount === "blended-summary"
                        ? "All Accounts"
                        : selectedAccount}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {blendedPlatformDeviceData &&
                    blendedPlatformDeviceData.length > 0 && (
                      <DropdownMenuItem
                        onClick={() => setSelectedAccount("blended-summary")}
                        className={
                          selectedAccount === "blended-summary"
                            ? "bg-blue-50"
                            : ""
                        }
                      >
                        All Accounts
                      </DropdownMenuItem>
                    )}
                  {apiResponse?.data.map((account) => (
                    <DropdownMenuItem
                      key={account.account_name}
                      onClick={() => setSelectedAccount(account.account_name)}
                      className={
                        selectedAccount === account.account_name
                          ? "bg-blue-50"
                          : ""
                      }
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
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
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
              key={selectedAccount}
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
              filter={currentFilter}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformDeviceFbReport;
