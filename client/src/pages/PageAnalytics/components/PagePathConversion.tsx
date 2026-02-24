import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import createAxiosInstance from "../../ConversionReportPage/components/axiosInstance";
import Loader from "@/components/dashboard_component/loader";
import MetricsTable, { MetricsRow } from "./MetricsTable";

interface ConversionComponentProps {
  isFullScreen: boolean;
  pagePathFilter?: 'all' | 'collection' | 'product';
  // onDataUpdate: (data: any[], tabType: string) => void;
  refreshTrigger: number;
}

type ApiResponse = {
  reportType: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  data: MetricsRow[];
};

const PagePathConversion: React.FC<ConversionComponentProps> = ({
  isFullScreen,
  pagePathFilter = 'all',
  // onDataUpdate,
  refreshTrigger
}) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);
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
      const response = await axiosInstance.post(`/api/analytics/pagePathMetricsReport/${brandId}`, {
        startDate: startDate, 
        endDate: endDate
      }, { withCredentials: true });

      const fetchedData = response.data || null;
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
  }, [fetchData, refreshTrigger]);

  // Filter data based on pagePathFilter
  const filteredData = useMemo(() => {
    if (!apiResponse?.data) return [];
    
    if (pagePathFilter === 'all') {
      return apiResponse.data;
    }
    
    const filterTerm = pagePathFilter.toLowerCase();
    return apiResponse.data.filter((row) => {
      const pagePath = String(row["Page Path"] || '').toLowerCase();
      return pagePath.includes(filterTerm);
    });
  }, [apiResponse?.data, pagePathFilter]);

  // // Update parent with filtered data
  // useEffect(() => {
  //   if (filteredData && onDataUpdate) {
  //     onDataUpdate(filteredData, 'pagePath');
  //   }
  // }, [filteredData, onDataUpdate]);

  if (loading) {
    return <Loader isLoading={loading} />;
  }

  return (
    <div className="rounded-md overflow-hidden">
      <MetricsTable
        rows={filteredData}
        primaryColumn="Page Path"
        initialPageSize={isFullScreen ? "all" : "50"}
      />
    </div>
  );
};

export default PagePathConversion;
