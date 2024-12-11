import { useState, useCallback, useEffect, useMemo } from "react"
import { useNavigate, useParams } from 'react-router-dom'
import axios from "axios"
import { format } from "date-fns"
import { ChevronDown, CircleDot, Columns, RefreshCw, X} from "lucide-react"
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
import { Ga4Logo } from "../GeneralisedDashboard/components/OtherPlatformModalContent"


interface GenderMetric {
  "Add To Carts": string;
  "Add To Cart Rate": string;
  "Checkouts": string;
  "Checkout Rate": string;
  "Purchases": string;
  "Purchase Rate": string;
  [key: string]: string;
}

const GenderReportPage: React.FC = () => {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [filteredData, setFilteredData] = useState<GenderMetric[]>([])
  const [allTimeData, setAllTimeData] = useState<GenderMetric[]>([])
  const [filters, setFilters] = useState<FilterItem[]>([])
  const now = new Date();
  const [data, setData] = useState<GenderMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { brandId } = useParams();
  const navigate = useNavigate();
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [rowsToShow, setRowsToShow] = useState(50)


  const toggleColumnSelection = (column: string) => {
    setSelectedColumns(prev => {
      const newColumns = prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column];

      return allColumns.filter(col => newColumns.includes(col));
    });
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;
  
      // Fetch all-time and date-specific metrics
      const [analyticsResponse, allTimeResponse] = await Promise.all([
        axios.post(`${baseURL}/api/analytics/genderReport/${brandId}`, {
          startDate: startDate || "",
          endDate: endDate || ""
        }, { withCredentials: true }),
        axios.post(`${baseURL}/api/analytics/genderReport/${brandId}`, {
          startDate: "",
          endDate: ""
        }, { withCredentials: true })
      ]);
  
      const fetchedData = analyticsResponse.data.data || [];
      const fetchedAllTimeData = allTimeResponse.data.data || [];
  
      setData(fetchedData);
      setFilteredData(fetchedData);
      setAllTimeData(fetchedAllTimeData);
      setLastUpdated(new Date());
  
      if (fetchedData.length > 0) {
        const allColumns = Object.keys(fetchedData[0]);
        setSelectedColumns((prevSelected) =>
          prevSelected.length === 0
            ? allColumns
            : prevSelected.filter((col) => allColumns.includes(col))
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  }, [brandId, startDate, endDate, navigate]);
  
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, [fetchData]);
  

  const handleManualRefresh = () => {
    fetchData();
  };

  const allColumns = data.length > 0 ? Object.keys(data[0]) : [];
  const sortedSelectedColumns = allColumns.filter(col => selectedColumns.includes(col));

  const applyFilters = useCallback((filters: FilterItem[]) => {
    let result = [...data];

    filters.forEach(filter => {
      result = result.filter(item => {
        const value = item[filter.column as keyof GenderMetric] as string;
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

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const memoizedFilteredData = useMemo(() => filteredData, [filteredData]);

  const numericColumns = ['Add To Cart', 'Checkouts', 'Sessions', 'Purchases', 'Purchase Rate', 'Add To Cart Rate', 'Checkout Rate']
  
  return (
    <div className="flex h-screen">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-hidden flex flex-col">
        <header className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <CircleDot className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold text-primary">Gender Metrics Overview</h1>
            </div>
            <div className="flex flex-row gap-3 items-center">
              {lastUpdated && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button onClick={handleManualRefresh} disabled={isLoading} size="icon" variant="outline">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
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
        </header>

        <main className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium">Analyze Gender wise performance</h2>
                <Ga4Logo />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Columns className="h-4 w-4" />
                      <span>Select Columns</span>
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
                <FilterComponent
                  columns={numericColumns}
                  onFiltersChange={applyFilters}
                  filters={filters}
                  setFilters={setFilters}
                />
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
                <ReportTable columns={sortedSelectedColumns} data={memoizedFilteredData} rowsToShow={rowsToShow} allTimeData={allTimeData} />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default GenderReportPage;