'use client'

import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import axios from "axios";
import { format } from "date-fns"
import { BriefcaseBusiness, ChevronLeft, ChevronRight, Columns, RefreshCw } from "lucide-react";
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import CollapsibleSidebar from "@/Dashboard/CollapsibleSidebar";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";

interface EcommerceMetric {
  Date: string;
  AddToCarts: string;
  Checkouts: string;
  Sessions: string;
  Purchases: string;
  PurchaseRate: string;
  AddToCartRate: string;
}

const EcommerceMetricsPage: React.FC = () => {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const now = new Date();
  const [data, setData] = useState<EcommerceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { brandId } = useParams();
  const navigate = useNavigate();
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";
  const [isListVisible, setIsListVisible] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(["Date", "Sessions", "AddToCarts", "AddToCartRate", "Checkouts", "PurchaseRate"]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const resetToFirstPage = ()=>{
    setCurrentPage(1);
  }

  const toggleList = () => {
    setIsListVisible(!isListVisible);
  };

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

      const DailyAnalyticsResponse = await axios.post(`${baseURL}/api/analytics/atcreport/${brandId}`, {
        startDate: startDate,
        endDate: endDate
      }, { withCredentials: true });

      setData(DailyAnalyticsResponse.data.data || []);
      setLastUpdated(new Date());
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
  const sortedSelectedColumns = allColumns.filter(col => selectedColumns.includes(col));

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const paginatedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="flex h-screen">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <BriefcaseBusiness className="h-6 w-6 text-gray-500" />
              <h1 className="text-2xl font-bold">E-commerce Metrics Overview</h1>
            </div>
            <div className="flex flex-row space-x-3 items-center">
              <div className="md:flex items-center hidden">
                {lastUpdated && (
                  <span className="text-sm text-gray-600 mr-4">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <Button
                  onClick={handleManualRefresh}
                  disabled={isLoading}
                  className="flex items-center"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="flex items-center space-x-4">
                <DatePickerWithRange 
                  date={date} 
                  setDate={setDate}
                  defaultDate={{
                    from: new Date(now.getFullYear(), now.getMonth(), 1),
                    to: now
                  }} 
                  resetToFirstPage={resetToFirstPage} 
                />
              </div>
            </div>
          </div>
        </header>

        <div className="m-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-semibold">
              Key performance indicators for your online store
            </h1>
            <Button
              onClick={toggleList}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Columns className="h-4 w-4" />
              <span>Select Columns</span>
            </Button>
          </div>

          {isListVisible && (
            <div className="mb-4 p-4 border rounded-md bg-background">
              <h2 className="text-sm font-semibold mb-2">Select columns to display:</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {allColumns.map((column) => (
                  <div key={column} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${column}`}
                      checked={selectedColumns.includes(column)}
                      onCheckedChange={() => toggleColumnSelection(column)}
                    />
                    <label
                      htmlFor={`column-${column}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {column}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border rounded-md overflow-auto">
            <Table className="text-center">
              <TableHeader className="bg-gray-200">
                <TableRow>
                  {sortedSelectedColumns.map((column) => (
                    <TableCell key={column} className="font-bold px-4 text-black min-w-[100px]">
                      {column}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item, index) => (
                  <TableRow key={index}>
                    {sortedSelectedColumns.map((column) => (
                      <TableCell
                        key={column}
                        className="px-4 py-2 border-b min-w-[100px]"
                      >
                        {item[column as keyof EcommerceMetric]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-center gap-10 mt-4">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center"
            >
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EcommerceMetricsPage;