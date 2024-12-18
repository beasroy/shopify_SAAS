import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import axios from "axios";
import { format } from "date-fns";
import { ChevronDown, Columns, RefreshCw, X, Maximize, Minimize } from "lucide-react";
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
import ReportTable from "@/pages/ReportPage/component/ReportTable"
import { FilterComponent, FilterItem } from "@/components/dashboard_component/FilterReport"
import { Ga4Logo } from "../../GeneralisedDashboard/components/OtherPlatformModalContent"
import { useUser } from "@/context/UserContext"
;
import { Card, CardContent } from "@/components/ui/card";

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
  const navigate = useNavigate();
  
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [rowsToShow, setRowsToShow] = useState(50);
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const {user}= useUser();

  // Update date state when prop changes
  useEffect(() => {
    setDate(propDateRange);
  }, [propDateRange]);

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
      const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;

      const DailyAnalyticsResponse = await axios.post(
        `${baseURL}/api/analytics/atcreport/${brandId}`,
        {
          startDate: startDate,
          endDate: endDate,
          userId: user?.id
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
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, startDate, endDate, brandId]);

  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 5 * 60 * 1000);
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
    <CardContent className="mt-4">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">Daily E-Commerce Analytics</h2>
            <Ga4Logo />
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Show {rowsToShow === 1000000 ? 'all' : rowsToShow} rows
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setRowsToShow(50)}>Show 50 rows</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRowsToShow(100)}>Show 100 rows</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRowsToShow(1000000)}>Show all rows</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

        <div className="rounded-md border overflow-hidden">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <ReportTable columns={sortedSelectedColumns} data={memoizedFilteredData} rowsToShow={rowsToShow} isFullScreen={isFullScreen} />
          )}
        </div>
      </div>
    </CardContent>
  </Card>
  );
};

export default EcommerceMetricsPage;