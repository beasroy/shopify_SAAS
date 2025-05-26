import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { RefreshCw, X, Maximize, Minimize } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import {
  FilterComponent,
  FilterItem,
} from "@/components/dashboard_component/FilterReport";
import { Ga4Logo } from "@/data/logo";
import { Card, CardContent } from "@/components/ui/card";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setDate } from "@/store/slices/DateSlice";
import NewReportTable from "./NewReportTable";
import ColumnManagementSheet from "@/pages/AnalyticsDashboard/Components/ColumnManagementSheet";
import Loader from "@/components/dashboard_component/loader";

interface DaywiseMetric {
  Day: string;
  "Add To Carts": string;
  Checkout: string;
  Sessions: string;
  Purchases: string;
  "Purchase Rate": string;
  "Add To Cart Rate": string;
  "Checkout Rate": string;
}

interface DaywiseMetricProps {
  dateRange: DateRange | undefined;
}

const DaywiseMetricsPage: React.FC<DaywiseMetricProps> = ({
  dateRange: propDateRange,
}) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
    }),
    [dateFrom, dateTo]
  );
  const [filteredData, setFilteredData] = useState<DaywiseMetric[]>([]);
  const [data, setData] = useState<DaywiseMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { brandId } = useParams();

  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const dispatch = useDispatch();
  const axiosInstance = createAxiosInstance();

  useEffect(() => {
    if (propDateRange) {
      dispatch(
        setDate({
          from: propDateRange.from
            ? propDateRange.from.toISOString()
            : undefined, // Convert Date to string
          to: propDateRange.to ? propDateRange.to.toISOString() : undefined, // Convert Date to string
        })
      );
    }
  }, [propDateRange]);

  useEffect(() => {
    if (!isFullScreen) {
      if (propDateRange) {
        dispatch(
          setDate({
            from: propDateRange.from
              ? propDateRange.from.toISOString()
              : undefined, // Convert Date to string
            to: propDateRange.to ? propDateRange.to.toISOString() : undefined, // Convert Date to string
          })
        );
      }
    }
  }, [isFullScreen, propDateRange]);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const [visibleColumns, setVisibleColumns] =
    useState<string[]>(selectedColumns);
  const [columnOrder, setColumnOrder] = useState<string[]>(selectedColumns);

  const handleVisibilityChange = (columns: string[]) => {
    setVisibleColumns(columns);
  };

  const handleOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    setVisibleColumns(newOrder); // Ensure visibleColumns is also updated
  };

  useEffect(() => {
    setVisibleColumns(selectedColumns);
    setColumnOrder(selectedColumns);
  }, [selectedColumns]);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const DailyAnalyticsResponse = await axiosInstance.post(
        `/api/analytics/dayAtcReport/${brandId}`,
        {
          startDate: startDate,
          endDate: endDate,
        },
        { withCredentials: true }
      );

      const fetchedData = DailyAnalyticsResponse.data.data || [];
      setData(fetchedData);
      setFilteredData(fetchedData);

      if (fetchedData.length > 0) {
        if (selectedColumns.length === 0) {
          const allColumns = Object.keys(fetchedData[0]);
          setSelectedColumns(allColumns);
        } else {
          const newColumns = Object.keys(fetchedData[0]);
          setSelectedColumns((prevSelected) =>
            prevSelected.filter((col) => newColumns.includes(col))
          );
        }
      }
    } catch (error) {
      console.error("Error fetching day wise metrics data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, brandId]);

  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 3 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchMetrics]);

  const handleManualRefresh = () => {
    fetchMetrics();
  };

  const applyFilters = useCallback(
    (filters: FilterItem[]) => {
      let result = [...data];

      filters.forEach((filter) => {
        result = result.filter((item) => {
          const value = item[filter.column as keyof DaywiseMetric] as string;
          if ([">", "<", "="].includes(filter.operator)) {
            const numValue = parseFloat(value);
            const filterValue = parseFloat(filter.value);
            switch (filter.operator) {
              case ">":
                return numValue > filterValue;
              case "<":
                return numValue < filterValue;
              case "=":
                return numValue === filterValue;
              default:
                return true;
            }
          }
          return true; // Default case
        });
      });

      setFilteredData(result); // Update filtered data
    },
    [data]
  );

  const memoizedFilteredData = useMemo(() => filteredData, [filteredData]);

  const numericColumns = [
    "Add To Cart",
    "Checkouts",
    "Sessions",
    "Purchases",
    "Purchase Rate",
    "Add To Cart Rate",
    "Checkout Rate",
  ];
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };
  if (isLoading) {
    return <Loader isLoading={isLoading} />;
  }
  return (
    <Card className={`mx-4 ${isFullScreen ? "fixed inset-0 z-50 m-0" : ""}`}>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium">
                Day-wise E-Commerce Analytics
              </h2>
              <Ga4Logo />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isFullScreen && (
                <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                  <DatePickerWithRange />
                </div>
              )}
              <Button
                onClick={handleManualRefresh}
                disabled={isLoading}
                size="icon"
                variant="outline"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
              <ColumnManagementSheet
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibilityChange={handleVisibilityChange}
                onOrderChange={handleOrderChange}
              />
              <FilterComponent
                columns={numericColumns}
                onFiltersChange={applyFilters}
                filters={filters}
                setFilters={setFilters}
              />
              <Button onClick={toggleFullScreen} size="icon" variant="outline">
                {isFullScreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter, index) => (
                <div
                  key={index}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span>{`${filter.column} ${filter.operator} ${filter.value}`}</span>
                  <button
                    onClick={() => removeFilter(index)}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="Remove filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md overflow-hidden">
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <NewReportTable
                columns={columnOrder}
                data={memoizedFilteredData}
                isFullScreen={isFullScreen}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DaywiseMetricsPage;
