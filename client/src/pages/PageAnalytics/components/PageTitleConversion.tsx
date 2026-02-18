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
  pageTitleFilter?: 'all' | 'collection' | 'product';
  onDataUpdate: (data: any[], tabType: string) => void;
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

const PageTitleConversion: React.FC<ConversionComponentProps> = ({
  isFullScreen,
  pageTitleFilter = 'all',
  onDataUpdate,
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
      const response = await axiosInstance.post(`/api/analytics/pageTitleMetricsReport/${brandId}`, {
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

  // Filter data based on pageTitleFilter
  const filteredData = useMemo(() => {
    if (!apiResponse?.data) return [];
    
    if (pageTitleFilter === 'all') {
      return apiResponse.data;
    }
    
    const filterTerm = pageTitleFilter.toLowerCase();
    return apiResponse.data.filter((row) => {
      const pageTitle = String(row["Page Title"] || '').toLowerCase();
      return pageTitle.includes(filterTerm);
    });
  }, [apiResponse?.data, pageTitleFilter]);

  // Update parent with filtered data
  useEffect(() => {
    if (filteredData && onDataUpdate) {
      onDataUpdate(filteredData, 'pageTitle');
    }
  }, [filteredData, onDataUpdate]);

  if (loading) {
    return <Loader isLoading={loading} />;
  }

  return (
    <div className="rounded-md overflow-hidden">
      <MetricsTable
        rows={filteredData}
        primaryColumn="Page Title"
        initialPageSize={isFullScreen ? "all" : "50"}
      />
    </div>
  );
};

export default PageTitleConversion;
