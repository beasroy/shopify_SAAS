import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from 'react-router-dom';
import { format } from "date-fns";
import { RefreshCw, X, Maximize, Minimize } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";

import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { FilterComponent, FilterItem } from "@/components/dashboard_component/FilterReport"
import { Ga4Logo } from "../../GeneralisedDashboard/components/OtherPlatformModalContent"
import { Card, CardContent } from "@/components/ui/card";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setDate } from "@/store/slices/DateSlice";
import NewReportTable from "./NewReportTable";
import ColumnManagementSheet from "@/pages/AnalyticsDashboard/Components/ColumnManagementSheet";

interface EcommerceMetric {
  "Date": string
  "Add To Carts": string
  "Checkout": string
  "Sessions": string
  "Purchases": string
  "Purchase Rate": string
  "Add To Cart Rate": string
  "Checkout Rate": string
}

interface EcommerceMetricsProps {
  dateRange: DateRange | undefined;
}

const EcommerceMetricsPage: React.FC<EcommerceMetricsProps> = ({ dateRange: propDateRange }) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const compareFrom = useSelector((state: RootState) => state.date.compareFrom);
  const compareTo = useSelector((state: RootState) => state.date.compareTo);
  
  const [filteredData, setFilteredData] = useState<EcommerceMetric[]>([]);
  const [data, setData] = useState<EcommerceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { brandId } = useParams();

  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);

  const compareDate = useMemo(() => ({
    from: compareFrom,
    to: compareTo
  }), [compareFrom, compareTo]);

  const startDate = date?.from ? format(new Date(date.from), "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(new Date(date.to), "yyyy-MM-dd") : "";
  const compareStartDate = compareDate?.from ? format(new Date(compareDate.from), "yyyy-MM-dd") : "";
  const compareEndDate = compareDate?.to ? format(new Date(compareDate.to), "yyyy-MM-dd") : "";
  
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const user = useSelector((state: RootState) => state.user.user)
  const dispatch = useDispatch();
  const axiosInstance = createAxiosInstance();

  // Consolidate date range effects
  useEffect(() => {
    if (propDateRange) {
      dispatch(setDate({
        from: propDateRange.from ? propDateRange.from.toISOString() : undefined,
        to: propDateRange.to ? propDateRange.to.toISOString() : undefined
      }));
    }
  }, [propDateRange, dispatch]);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateRanges = [];

      // Always add primary date range
      if (startDate && endDate) {
        dateRanges.push({ 
          startDate: startDate, 
          endDate: endDate 
        });
      }

      // Add comparison date range if available and compare is enabled
      if (compareStartDate && compareEndDate) {
        dateRanges.push({
          startDate: compareStartDate,
          endDate: compareEndDate
        });
      }

      // Only fetch if we have at least one date range
      if (dateRanges.length > 0) {
        const DailyAnalyticsResponse = await axiosInstance.post(
          `/api/analytics/atcreport/${brandId}`,
          {
            dateRanges: dateRanges,
            userId: user?.id,
          },
          { withCredentials: true }
        );

        const fetchedRanges = DailyAnalyticsResponse.data.ranges || [];
    
        // More flexible data handling
        if (fetchedRanges.length > 0) {
          // Check if the first range contains daily data or consolidated data
          const isConsolidatedData = fetchedRanges[0].Date 
          
          if (isConsolidatedData) {
            // Consolidated data scenario
            setData(fetchedRanges);
            setFilteredData(fetchedRanges);
          } else {
            // Daily data scenario
            setData(fetchedRanges[0]?.data || []);
            setFilteredData(fetchedRanges[0]?.data || []);
          }

          // Update columns intelligently
          const firstRangeData = isConsolidatedData ? fetchedRanges : (fetchedRanges[0]?.data || []);
          if (firstRangeData.length > 0) {
            const firstItem = firstRangeData[0];
            const allColumns = Object.keys(firstItem);
            
            if (selectedColumns.length === 0) {
              setSelectedColumns(allColumns);
            } else {
              setSelectedColumns((prevSelected) =>
                prevSelected.filter((col) => allColumns.includes(col))
              );
            }
          }
        }
      }

    } catch (error) {
      console.error('Error fetching e-commerce metrics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, compareStartDate, compareEndDate, brandId, user?.id]);

  // Consolidate to single useEffect for fetching metrics
  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchMetrics]);

  const handleManualRefresh = () => {
    fetchMetrics();
  };

  const [visibleColumns, setVisibleColumns] = useState<string[]>(selectedColumns);
  const [columnOrder, setColumnOrder] = useState<string[]>(selectedColumns);

  const handleVisibilityChange = (columns: string[]) => {
    setVisibleColumns(columns);
  };
  
  const handleOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    setVisibleColumns(newOrder);
  };
  
  useEffect(() => {
    setVisibleColumns(selectedColumns);
    setColumnOrder(selectedColumns);
  }, [selectedColumns]);

  const applyFilters = useCallback((filters: FilterItem[]) => {
    let result = [...data];

    filters.forEach(filter => {
      result = result.filter(item => {
        const value = item[filter.column as keyof EcommerceMetric] as string;
        if (['>', '<', '='].includes(filter.operator)) {
          const numValue = parseFloat(value);
          const filterValue = parseFloat(filter.value);
          switch (filter.operator) {
            case '>': return numValue > filterValue;
            case '<': return numValue < filterValue;
            case '=': return numValue === filterValue;
            default: return true;
          }
        }
        return true; // Default case
      });
    });

    setFilteredData(result);
  }, [data]);

  const memoizedFilteredData = useMemo(() => filteredData, [filteredData]);

  const numericColumns = ['Add To Cart', 'Checkouts', 'Sessions', 'Purchases', 'Purchase Rate', 'Add To Cart Rate', 'Checkout Rate'];
  
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  return (
    <Card className={`mx-4 ${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium">Daily E-Commerce Analytics</h2>
              <Ga4Logo />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isFullScreen && <DatePickerWithRange />}
              <Button onClick={handleManualRefresh} disabled={isLoading} size="icon" variant="outline">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
                {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter, index) => (
                <div key={index} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <span>{`${filter.column} ${filter.operator} ${filter.value}`}</span>
                  <button onClick={() => removeFilter(index)} className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" aria-label="Remove filter">
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
              <NewReportTable columns={columnOrder} data={memoizedFilteredData} isFullScreen={isFullScreen} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EcommerceMetricsPage;