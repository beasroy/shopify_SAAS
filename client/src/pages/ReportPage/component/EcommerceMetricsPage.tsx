import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from 'react-router-dom';
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setDate } from "@/store/slices/DateSlice";
import ReportTable from "./ReportTable";
import Loader from "@/components/dashboard_component/loader";


interface EcommerceMetric {
  "Date": string
  "Add To Cart": string
  "Checkouts": string
  "Sessions": string
  "Purchases": string
  "Purchase Rate": string
  "Add To Cart Rate": string
  "Checkout Rate": string
}

interface EcommerceMetricsProps {
  dateRange: DateRange | undefined;
  isFullScreen?: boolean;
  visibleColumns: string[];
  columnOrder: string[];
  refreshTrigger: number;
}

const EcommerceMetricsPage: React.FC<EcommerceMetricsProps> = ({ 
  dateRange: propDateRange, 
  isFullScreen: propIsFullScreen,
  visibleColumns,
  columnOrder,
  refreshTrigger
}) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const compareFrom = useSelector((state: RootState) => state.date.compareFrom);
  const compareTo = useSelector((state: RootState) => state.date.compareTo);
  

  const [data, setData] = useState<EcommerceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { brandId } = useParams();

  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);

  const compareDate = useMemo(() => ({
    from: compareFrom,
    to: compareTo
  }), [compareFrom, compareTo]);

  const startDate = date?.from ? format(new Date(date.from), "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(new Date(date.to), "yyyy-MM-dd") : "";
  const compareStartDate = compareDate?.from ? format(new Date(compareDate.from), "yyyy-MM-dd") : "";
  const compareEndDate = compareDate?.to ? format(new Date(compareDate.to), "yyyy-MM-dd") : "";
  
  const [isFullScreen, setIsFullScreen] = useState(propIsFullScreen || false);
  const dispatch = useDispatch();
  const axiosInstance = createAxiosInstance();

  // Transform data to match ReportTable's expected format
  const transformedData = useMemo(() => {
    return data.map((item, index) => ({
      id: `row-${index}`,
      date: item.Date,
      sessions: parseInt(item.Sessions) || 0,
      addToCart: parseInt(item['Add To Cart']) || 0,
      addToCartRate: item['Add To Cart Rate'] || '0%',
      checkouts: parseInt(item['Checkouts']) || 0,
      checkoutRate: item['Checkout Rate'] || '0%',
      purchases: parseInt(item['Purchases']) || 0,
      purchaseRate: item['Purchase Rate'] || '0%'
    }));
  }, [data]);

  // Update isFullScreen when prop changes
  useEffect(() => {
    setIsFullScreen(propIsFullScreen || false);
  }, [propIsFullScreen]);

  // Consolidate date range effects
  useEffect(() => {
    if (propDateRange) {
      dispatch(setDate({
        from: propDateRange.from ? propDateRange.from.toISOString() : undefined,
        to: propDateRange.to ? propDateRange.to.toISOString() : undefined
      }));
    }
  }, [propDateRange, dispatch]);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateRanges = [];

      // Always add primary date range
      if (startDate && endDate) {
        dateRanges.push({ 
          startDate: startDate, 
          endDate: endDate 
        });
      }

      // Add comparison date range if available and compare is enabled
      if (compareStartDate && compareEndDate) {
        dateRanges.push({
          startDate: compareStartDate,
          endDate: compareEndDate
        });
      }

      // Only fetch if we have at least one date range
      if (dateRanges.length > 0) {
        const DailyAnalyticsResponse = await axiosInstance.post(
          `/api/analytics/atcreport/${brandId}`,
          {
            dateRanges: dateRanges,
          },
          { withCredentials: true }
        );

        const fetchedRanges = DailyAnalyticsResponse.data.ranges || [];
    
        // More flexible data handling
        if (fetchedRanges.length > 0) {
          // Check if the first range contains daily data or consolidated data
          const isConsolidatedData = fetchedRanges[0].Date 
          
          if (isConsolidatedData) {
            // Consolidated data scenario
            setData(fetchedRanges);
          } else {
            // Daily data scenario
            setData(fetchedRanges[0]?.data || []);
        
          }

       
        }
      }

    } catch (error) {
      console.error('Error fetching e-commerce metrics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, compareStartDate, compareEndDate, brandId]);

  // Consolidate to single useEffect for fetching metrics
  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchMetrics]);

  // Listen for refresh trigger from parent
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchMetrics();
    }
  }, [refreshTrigger, fetchMetrics]);

  if(isLoading){
    return <Loader isLoading={isLoading} />
  }

  return (
    <ReportTable 
      rows={transformedData} 
      initialPageSize="50"
      visibleColumns={visibleColumns}
      columnOrder={columnOrder}
    />
  );
};

export default EcommerceMetricsPage;