import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import ConversionTable from "./Table";
import { useUser } from "@/context/UserContext";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Ga4Logo } from "@/pages/GeneralisedDashboard/components/OtherPlatformModalContent";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, RefreshCw } from "lucide-react";
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";
import { useTokenError } from "@/context/TokenErrorContext";
import { DateRange } from "react-day-picker";

type ApiResponse = {
  reportType: string;
  data: Array<{
    DeviceType: string;
    MonthlyData?: Array<{ Month: string;[key: string]: any }>;
    [key: string]: any;
  }>;
};

interface CityBasedReportsProps {
  dateRange: DateRange | undefined;
}


const CampaignConversion: React.FC<CityBasedReportsProps> = ({ dateRange: propDateRange }) => {
  const [date, setDate] = useState<DateRange | undefined>(propDateRange);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const { user } = useUser();
  const { brandId } = useParams();
  const navigate = useNavigate();
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };
  const { setTokenError } = useTokenError();
  // Use optional chaining to safely access date properties
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;

      const response = await axios.post(`${baseURL}/api/analytics/campaignConversionReport/${brandId}`, {
        userId: user?.id, startDate: startDate, endDate: endDate
      }, { withCredentials: true })

      const fetchedData = response.data || [];

      setApiResponse(fetchedData);

    } catch (error) {
      console.error("Error fetching data:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        navigate("/");
      }
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setTokenError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [brandId, startDate, endDate, navigate]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, [fetchData]);

  useEffect(() => {
    setDate(propDateRange);
  }, [propDateRange]);

  const handleManualRefresh = () => {
    fetchData();
  };

  // Extract columns dynamically from the API response
  const primaryColumn = "Campaign";
  const secondaryColumns = ["Total Sessions", "Avg Conv. Rate"];
  const monthlyDataKey = "MonthlyData";
  const monthlyMetrics = ["Sessions", "Conv. Rate"];

  return (
    <Card className={`m-4 ${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
      <CardContent className="mt-4">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium">Campaign based Conversion</h2>
              <Ga4Logo />
            </div>
            <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleManualRefresh} disabled={loading} size="icon" variant="outline">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
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

export default CampaignConversion;
