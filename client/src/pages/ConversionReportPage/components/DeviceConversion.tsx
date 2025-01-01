import { useEffect, useState } from "react";
import axios from "axios";
import ConversionTable from "./Table";
import { useUser } from "@/context/UserContext";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Ga4Logo } from "@/pages/GeneralisedDashboard/components/OtherPlatformModalContent";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";
type ApiResponse = {
    reportType: string;
    data: Array<{
      DeviceType: string;
      MonthlyData?: Array<{ Month: string; [key: string]: any }>;
      [key: string]: any;
    }>;
  };
  
type ErrorType = {
  message: string;
};
const DeviceTypeConversion = () => {
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<ErrorType | null>(null);
    const [isFullScreen, setIsFullScreen]= useState<boolean>(false);
    const {user} = useUser();
    const { brandId } = useParams();
    const baseURL = import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;
    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

  useEffect(() => {
    const fetchData = async () => {

      try {
        const response = await  axios.post(`${baseURL}/api/analytics/deviceTypeConversionReport/${brandId}`, {
            userId: user?.id
          }, { withCredentials: true })
        setApiResponse(response.data);
        setLoading(false);
      } catch (err:any) {
        setError(err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-6 bg-gray-100 min-h-screen">Loading...</div>;
  if (error) return <div className="p-6 bg-gray-100 min-h-screen">Error: {error.message}</div>;

  // Extract columns dynamically from the API response
  const primaryColumn = "Device";
  const secondaryColumns = ["Total Sessions", "Avg Conv. Rate"];
  const monthlyDataKey = "MonthlyData";
  const monthlyMetrics = ["Sessions", "Conv. Rate"];

  return (
    <Card className={`mx-4 ${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
    <CardContent className="mt-4">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">Device Type Conversion</h2>
            <Ga4Logo />
          </div>
          <div className="flex flex-wrap items-center gap-3">
           
            <Button onClick={toggleFullScreen} size="icon" variant="outline">
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
    
          </div>
        </div>

        <div className="rounded-md overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <ConversionTable
        data={apiResponse?.data || []}
        primaryColumn={primaryColumn}
        secondaryColumns={secondaryColumns}
        monthlyDataKey={monthlyDataKey}
        monthlyMetrics={monthlyMetrics}
        isFullScreen={isFullScreen}
      />
          )}
        </div>
      </div>
    </CardContent>
  </Card>
  );
};

export default DeviceTypeConversion;
