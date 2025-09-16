import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import createAxiosInstance from "./axiosInstance";
import Loader from "@/components/dashboard_component/loader";
import NewConversionTable from "./ConversionTable";

interface ConversionComponentProps {
  isFullScreen: boolean;
  currentFilter: string[] | undefined;
  onDataUpdate: (data: any[], tabType: string) => void;
  refreshTrigger: number;
}

type ApiResponse = {
  reportType: string;
  data: Array<{
    [key: string]: any;
    MonthlyData?: Array<{ Month: string;[key: string]: any }>;
  }>;
};

const ChannelConversion: React.FC<ConversionComponentProps> = ({
  isFullScreen,
  currentFilter,
  onDataUpdate,
  refreshTrigger
}) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);
  const locale = useSelector((state: RootState) => state.locale.locale);
  const { brandId } = useParams();

  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const axiosInstance = createAxiosInstance();

  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

  useEffect(() => {
    setApiResponse(null); // Clear old data when brand changes
  }, [brandId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post(`/api/analytics/channelConversionReport/${brandId}`, {
        startDate: startDate, 
        endDate: endDate
      }, { withCredentials: true });

      const fetchedData = response.data || [];
      setApiResponse(fetchedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [brandId, startDate, endDate]);

  // Fetch data when component mounts, date changes, or refresh trigger changes
  useEffect(() => {
    if (date.from && date.to) {
      fetchData();
    }
  }, [fetchData, refreshTrigger]); // Add brandId to dependencies

  // Update parent with data
  useEffect(() => {
    if (apiResponse?.data && onDataUpdate) {
      onDataUpdate(apiResponse.data, 'channel');
    }
  }, [apiResponse?.data, onDataUpdate]);

  // Extract columns dynamically from the API response
  const primaryColumn = "Channel";
  const secondaryColumns = ["Total Sessions", "Avg Conv. Rate"];
  const monthlyDataKey = "MonthlyData";

  if (loading) {
    return <Loader isLoading={loading} />;
  }

  return (
    <div className="rounded-md overflow-hidden">
      <NewConversionTable
        data={apiResponse?.data || []}
        primaryColumn={primaryColumn}
        secondaryColumns={secondaryColumns}
        monthlyDataKey={monthlyDataKey}
        isFullScreen={isFullScreen}
        locale={locale}
        filter={currentFilter}
      />
    </div>
  );
};

export default ChannelConversion;
