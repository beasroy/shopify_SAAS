import { useState, useCallback, useEffect, useMemo } from "react"
import { useNavigate, useParams } from 'react-router-dom'
import axios from "axios"
import { format } from "date-fns"
import { BriefcaseBusiness, ChevronDown, Columns, RefreshCw } from "lucide-react"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange"
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton"
import ReportTable from "@/components/dashboard_component/ReportTable"
import { FilterComponent, FilterItem } from "@/components/dashboard_component/FilterReport"

interface CityMetric {
  "city": string;
  "country": string;
  "region": string;
  "Add To Carts": string;
  "Add To Cart Rate": string;
  "Checkouts": string;
  "Checkout Rate": string;
  "Purchases": string;
  "Purchase Rate": string;
  [key: string]: string;
}

export default function CitySessionPage() {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [filteredData, setFilteredData] = useState<CityMetric[]>([])
  const now = new Date();
  const [data, setData] = useState<CityMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { brandId } = useParams();
  const navigate = useNavigate();
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [rowsToShow, setRowsToShow] = useState(50)
  const [filters, setFilters] = useState<FilterItem[]>([])
  const [removedColumns, setRemovedColumns] = useState<string[]>([]);

const allColumns =['city','country','region','Visitors','Sessions','Add To Carts','Add To Cart Rate','Checkouts','Checkout Rate','Purchases','Purchase Rate']

const toggleColumnSelection = (column: string) => {
  setSelectedColumns(prev => {
    const newColumns = prev.includes(column)
      ? prev.filter(col => col !== column) // Remove column from selected
      : [...prev, column]; // Add column to selected

    setRemovedColumns(prevRemoved => {
      // Add or remove from removedColumns only if column is 'city', 'region', or 'country'
      if (['city', 'region', 'country'].includes(column)) {
        if (newColumns.includes(column)) {
          // If re-selected, remove from removedColumns
          return prevRemoved.filter(col => col !== column);
        } else {
          // If deselected, add to removedColumns
          return [...prevRemoved, column];
        }
      }
      // For other columns, keep removedColumns unchanged
      return prevRemoved;
    });

    return allColumns.filter(col => newColumns.includes(col));
  });
};


const fetchMetrics = useCallback(async () => {
  setIsLoading(true);
  try {
    const baseURL = import.meta.env.PROD
      ? import.meta.env.VITE_API_URL
      : import.meta.env.VITE_LOCAL_API_URL;

    // Prepare location filters based on removed columns
    const requestBody = {
      startDate: startDate,
      endDate: endDate,
      ...(removedColumns.length > 0 ? {
        filters: {
          location: removedColumns
        }
      } : {})
    };

    const analyticsResponse = await axios.post(
      `${baseURL}/api/analytics/report/${brandId}`,
      requestBody,
      { withCredentials: true }
    );

    const fetchedData = analyticsResponse.data[1]?.data || [];
    setData(fetchedData);
    setFilteredData(fetchedData);
    setLastUpdated(new Date());

    // Ensure selected columns match fetched data
    if (fetchedData.length > 0) {
      const newColumns = Object.keys(fetchedData[0]);
      setSelectedColumns((prevSelected) =>
        prevSelected.filter((col) => newColumns.includes(col))
      );
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
}, [navigate, brandId, removedColumns]);

useEffect(() => {
  // Set all columns as selected when the component loads
  setSelectedColumns(allColumns);
}, [])


  

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchMetrics]);

  const handleManualRefresh = () => {
    fetchMetrics();
  };

  const sortedSelectedColumns = useMemo(() => {
    return allColumns.filter((col) => selectedColumns.includes(col));
  }, [allColumns, selectedColumns]);
  

  const applyFilters = useCallback((filters: FilterItem[]) => {
    let result = [...data];
    
    filters.forEach(filter => {
      result = result.filter(item => {
        const value = item[filter.column as keyof CityMetric] as string;
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

  const numericColumns = ['Add To Carts', 'Checkouts', 'Sessions', 'Purchases', 'Purchase Rate', 'Add To Cart Rate', 'Checkout Rate']
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  return (
    <div className="flex h-screen">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <BriefcaseBusiness className="h-6 w-6 text-gray-500" />
              <h1 className="text-2xl font-bold">City Metrics Overview</h1>
            </div>
            <div className="flex flex-col lg:flex-row lg:space-x-3 items-center">
              <div className="flex items-center space-x-4">
                <DatePickerWithRange
                  date={date}
                  setDate={setDate}
                  defaultDate={{
                    from: new Date(now.getFullYear(), now.getMonth(), 1),
                    to: now,
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="m-6">
          <div className="flex flex-col md:flex-row gap-5 justify-start items-start md:justify-between md:items-center mb-6">
            <h1 className="text-lg font-semibold">Key performance indicators for your online store</h1>
            <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:space-x-2">
              <div className="lg:flex items-center hidden">
                {lastUpdated && (
                  <span className="text-sm text-gray-600 mr-4">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <Button onClick={handleManualRefresh} disabled={isLoading} className="flex items-center">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Columns className="h-4 w-4" />
                    <span>Select Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44">
                  {allColumns.map((column) => (
                    <div key={column} className="flex items-center space-x-2 p-2">
                      <Checkbox
                        id={`column-${column}`}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => toggleColumnSelection(column)}
                      />
                      <label
                        htmlFor={`column-${column}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {column}
                      </label>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-36">
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
              <FilterComponent
                columns={numericColumns}
                onFiltersChange={applyFilters}
                filters={filters}
                setFilters={setFilters}
              />
            </div>
          </div>

          {filters.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {filters.map((filter, index) => (
                <div key={index} className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center">
                  <span>{`${filter.column} ${filter.operator} ${filter.value}`}</span>
                  <button onClick={() => removeFilter(index)} className="ml-2 text-red-500">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="relative border rounded-md overflow-hidden" style={{ maxHeight: 'calc(100vh - 183px)' }}>
            <div className="overflow-auto h-full">
              {isLoading ? (
                <TableSkeleton />
              ) : (
                <ReportTable columns={sortedSelectedColumns} data={memoizedFilteredData} rowsToShow={rowsToShow} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}