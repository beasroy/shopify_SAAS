import {useState, useCallback, useEffect} from "react";
import { useNavigate, useParams } from 'react-router-dom';
import CollapsibleSidebar from "@/Dashboard/CollapsibleSidebar";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { BriefcaseBusiness, RefreshCw } from "lucide-react";
import { DateRange } from "react-day-picker"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import axios from "axios";
import { format } from "date-fns"
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EcommerceMetric{
  Date: string;
  AddToCarts: string;
  Checkouts: string;
  Sessions: string;
  Purchases: string;
  PurchaseRate:string;
  AddToCartRate:string;
}
 const EcommerceMetricsPage : React.FC=()=>{
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const now = new Date();
    const [data, setData]= useState<EcommerceMetric[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const { brandId } = useParams();
    const navigate = useNavigate();
    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

    

    const fetchMetrics = useCallback(async () => {
      setIsLoading(true);
      try {
  
        const baseURL =
          import.meta.env.PROD
            ? import.meta.env.VITE_API_URL
            : import.meta.env.VITE_LOCAL_API_URL;
  
  
        const DailyAnalyticsResponse = await axios.post(`${baseURL}/api/analytics/atcreport/${brandId}`,{
          startDate: startDate,
          endDate: endDate
        },{withCredentials: true});
  
       
  
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
    }, [navigate, startDate, endDate]);


    useEffect(() => {
      fetchMetrics();
  
      const intervalId = setInterval(fetchMetrics, 5 * 60 * 1000);
  
  
      return () => clearInterval(intervalId);
    }, [fetchMetrics]);

    const handleManualRefresh = () => {
      fetchMetrics();
    };


    return (
        <div className="flex h-screen "> 
        <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-8">
        <div className=" flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <BriefcaseBusiness className="h-6 w-6 text-gray-500" />
            <h1 className="text-2xl font-bold"> E-commerce Metrics Overview</h1>
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
            <DatePickerWithRange date={date} setDate={setDate}
              defaultDate={{
                from: new Date(now.getFullYear(), now.getMonth(), 1), // First day of the current month
                to: now // Current date
              }} />
          </div>
          </div>
        </div>
      </header>
     
          <h1 className="text-lg font-semibold flex flex-col items-start space-x-3 m-5 lg:mx-10">
         
          Key performance indicators for your online store
          </h1>
          
   
      <Card className="m-5 max-h-[80vh] overflow-y-auto">

        <div className="overflow-x-auto p-6">
          <Table>
            <TableHeader className="bg-gray-200">
              <TableRow>
                {data.length > 0 && Object.keys(data[0]).map((key) => (
                  <TableCell key={key} className="font-bold px-4 text-black min-w-[100px]">{key}</TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  {Object.entries(item).map(([_, value], idx) => (
                    <TableCell 
                      key={idx} 
                      className="px-4 py-2 border-b"
                    >
                      {value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

   
        </Card>
      </div>
    </div>
    );
}
export default EcommerceMetricsPage;