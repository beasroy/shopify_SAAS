import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from 'react-router-dom';
import { format } from "date-fns";
import {  Columns, RefreshCw, X, Maximize, Minimize } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import ReportTable from "@/pages/ReportPage/component/ReportTable"
import { FilterComponent, FilterItem } from "@/components/dashboard_component/FilterReport"
import { Ga4Logo } from "../../GeneralisedDashboard/components/OtherPlatformModalContent"
import { useUser } from "@/context/UserContext"
;
import { Card, CardContent } from "@/components/ui/card";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";

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
  const [date, setDate] = useState<DateRange | undefined>(propDateRange);
  const [filteredData, setFilteredData] = useState<EcommerceMetric[]>([]);
  const [data, setData] = useState<EcommerceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { brandId } = useParams();

  
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const {user}= useUser();
  const axiosInstance = createAxiosInstance();
 

  // Update date state when prop changes
  useEffect(() => {
    setDate(propDateRange);
  }, [propDateRange]);

  useEffect(() => {
    if (!isFullScreen) {
      setDate(propDateRange);
    }
  }, [isFullScreen, propDateRange]);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const toggleColumnSelection = (column: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(column)) {
        return prev.filter((col) => col !== column);
      } else {
        return [...prev, column];
      }
    });
  };

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {

      const DailyAnalyticsResponse = await axiosInstance.post(
        `/api/analytics/atcreport/${brandId}`,
        {
          startDate: startDate,
          endDate: endDate,
          userId: user?.id,
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
      console.error('Error fetching dashboard data:', error);
     
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, brandId]);

  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchMetrics]);

  const handleManualRefresh = () => {
    fetchMetrics();
  };

  const allColumns = data.length > 0 ? Object.keys(data[0]) : [];
  const sortedSelectedColumns = allColumns.filter((col) => selectedColumns.includes(col));

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

    setFilteredData(result); // Update filtered data
  }, [data]);

  const memoizedFilteredData = useMemo(() => filteredData, [filteredData]);

  const numericColumns = ['Add To Cart', 'Checkouts', 'Sessions', 'Purchases', 'Purchase Rate', 'Add To Cart Rate', 'Checkout Rate'];
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  return (
    <Card className={`mx-4 ${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
    <CardContent >
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">Daily E-Commerce Analytics</h2>
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
            <Button onClick={handleManualRefresh} disabled={isLoading} size="icon" variant="outline">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={"icon"}>
                  <Columns className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {allColumns.map((column) => (
                  <DropdownMenuItem key={column} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${column}`}
                      checked={selectedColumns.includes(column)}
                      onCheckedChange={() => toggleColumnSelection(column)}
                    />
                    <label htmlFor={`column-${column}`} className="flex-1 cursor-pointer">
                      {column}
                    </label>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
            <ReportTable columns={sortedSelectedColumns} data={memoizedFilteredData} isFullScreen={isFullScreen} />
          )}
        </div>
      </div>
    </CardContent>
  </Card>
  );
};

export default EcommerceMetricsPage;