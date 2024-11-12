

import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import axios from "axios";
import { format } from "date-fns"
import { ArrowDown, ArrowUp, BriefcaseBusiness, ChevronLeft, ChevronRight, Columns, RefreshCw } from "lucide-react";
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import CollapsibleSidebar from "@/Dashboard/CollapsibleSidebar";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
// import ReportsDropdown from "@/components/dashboard_component/ReportDropDown";

interface EcommerceMetric {
  Date: string;
  Add_To_Carts: string;
  Checkouts: string;
  Sessions: string;
  Purchases: string;
  Purchase_Rate: string;
  Add_To_Cart_Rate: string;
  Checkouts_Rate: string;
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
  const [selectedColumns, setSelectedColumns] = useState<string[]>(["Date", "Sessions", "Add_To_Carts", "Add_To_Cart_Rate", "Checkouts","Checkouts_Rate", "Purchase_Rate"]);
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

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const paginatedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  console.log(paginatedData);

  const parsedData = data.map(item => ({
    ...item,
    Sessions: Number(item.Sessions),
  }));
  // console.log('parseddata', parsedData);
  const maxSessions = Math.max(...parsedData.map(item => item.Sessions));

  const getBackgroundColor = (sessions: number, maxSessions: number) => {
    const intensity = sessions / maxSessions; 
    return `rgba(0, 0, 255, ${Math.max(0.1, intensity)})`; 
  };
  const getTextColor = (sessions: number, maxSessions: number) => {
    const intensity = sessions / maxSessions;
    return intensity > 0.7 ? 'white' : 'black';
  };

  const parsePercentage = (value: string): number => {
    return parseFloat(value.replace('%', '').trim());
  };
  
  const averageValues = {
    Add_To_Cart_Rate: data.reduce((sum, item) => sum + parsePercentage(item.Add_To_Cart_Rate), 0) / data.length,
    Checkouts_Rate: data.reduce((sum, item) => sum + parsePercentage(item.Checkouts_Rate), 0) / data.length,
    Purchase_Rate: data.reduce((sum, item) => sum + parsePercentage(item.Purchase_Rate), 0) / data.length,
  };

  const getConditionalTextColor = (value: number, average: number) => {
    if (value < average) {
      return 'red';
    } else if (value > average) {
      return 'green';
    } else {
      return '#FFB200';
    }
  };
  
  // Function to get the icon based on value and average
  const getConditionalIcon = (value: number, average: number) => {
    if (value < average) {
      return <ArrowDown className="ml-1 text-red-500 w-3 h-3" />;
    } else if (value > average) {
      return <ArrowUp className="ml-1 text-green-500 w-3 h-3" />;
    } else {
      return null;
    }
  };

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
            {/* <ReportsDropdown brandId={brandId} /> */}
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
            <div className="flex flex-row items-center space-x-2">
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
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  
                </Button>
              </div> 
            <Button
              onClick={toggleList}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Columns className="h-4 w-4" />
              <span>Select Columns</span>
            </Button>
          </div>
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
                    {sortedSelectedColumns.map((column) => {
                       const cellValue = column.includes('Rate') ? parsePercentage(item[column as keyof EcommerceMetric] as string) : item[column as keyof EcommerceMetric];
                       const isComparisonColumn = ['Add_To_Cart_Rate', 'Checkouts_Rate', 'Purchase_Rate'].includes(column);
                       return (
                         <TableCell
                           key={column}
                           className="px-4 py-2 border-b w-[150px] font-medium"
                           style={{
                            width: '150px',
                            backgroundColor: column === "Sessions" ? getBackgroundColor(Number(item.Sessions), maxSessions) : '',
                            color: column === "Sessions"
                            ? getTextColor(Number(item.Sessions), maxSessions)
                            : isComparisonColumn
                            ? getConditionalTextColor(cellValue as number, averageValues[column as keyof typeof averageValues])
                            : 'inherit',}}
                         >
                          <div className="flex flex-row items-center justify-center gap-1">
                          {item[column as keyof EcommerceMetric]}
                          {isComparisonColumn && getConditionalIcon(cellValue as number, averageValues[column as keyof typeof averageValues])}
                          </div>
                          </TableCell>
                       );
                    })}
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