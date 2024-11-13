import { useState, useCallback, useEffect } from "react"
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
import CollapsibleSidebar from "@/Dashboard/CollapsibleSidebar"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange"
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton"
import ReportTable from "@/components/dashboard_component/ReportTable"

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

  const toggleColumnSelection = (column: string) => {
    setSelectedColumns(prev => {
      const newColumns = prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column];
      
      return allColumns.filter(col => newColumns.includes(col));
    });
  };

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;

      const analyticsResponse = await axios.post(`${baseURL}/api/analytics/report/${brandId}`, {
        startDate: startDate,
        endDate: endDate
      }, {
        withCredentials: true
      });

      const fetchedData = analyticsResponse.data[1].data || [];

      setData(fetchedData);
      setLastUpdated(new Date());
      if (fetchedData.length > 0) {
        setSelectedColumns(Object.keys(fetchedData[0]));
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
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchMetrics]);

  const handleManualRefresh = () => {
    fetchMetrics();
  };

  const allColumns = data.length > 0 ? Object.keys(data[0]) : [];
  const sortedSelectedColumns = allColumns.filter(col => selectedColumns.includes(col));


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
                  <Button variant="outline" className="w-[180px]">
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

          <div className="relative border rounded-md overflow-hidden" style={{ maxHeight: 'calc(100vh - 183px)' }}>
            <div className="overflow-auto h-full">
            {isLoading ? (
                <TableSkeleton />
              ) : (
                <ReportTable columns={sortedSelectedColumns} data={data} rowsToShow={rowsToShow} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}