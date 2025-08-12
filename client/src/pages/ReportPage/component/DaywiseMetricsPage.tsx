import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from 'react-router-dom';
import { format } from "date-fns";
import { DateRange } from "react-day-picker"
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setDate } from "@/store/slices/DateSlice";
import ReportTable from "./ReportTable";
import Loader from "@/components/dashboard_component/loader";

interface DaywiseMetric {
  "Day": string
  "Add To Cart": string
  "Checkouts": string
  "Sessions": string
  "Purchases": string
  "Purchase Rate": string
  "Add To Cart Rate": string
  "Checkout Rate": string
}

interface DaywiseMetricProps {
  dateRange: DateRange | undefined;
  isFullScreen?: boolean;
  visibleColumns: string[];
  columnOrder: string[];
  refreshTrigger: number;
}

const DaywiseMetricsPage: React.FC<DaywiseMetricProps> = ({ 
  dateRange: propDateRange, 
  isFullScreen: propIsFullScreen,
  visibleColumns,
  columnOrder,
  refreshTrigger
}) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);
  const [data, setData] = useState<DaywiseMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { brandId } = useParams();

  
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";
  const [isFullScreen, setIsFullScreen] = useState(propIsFullScreen || false);
  
  const dispatch = useDispatch();
  const axiosInstance = createAxiosInstance();

  // Transform data to match ReportTable's expected format
  const transformedData = useMemo(() => {
    console.log('Transforming data:', data);
    const transformed = data.map((item, index) => {
      const transformedItem = {
        id: `row-${index}`,
        date: item.Day,
        sessions: parseInt(item.Sessions) || 0,
        addToCart: parseInt(item['Add To Cart']) || 0,
        addToCartRate: item['Add To Cart Rate'] || '0%',
        checkouts: parseInt(item['Checkouts']) || 0,
        checkoutRate: item['Checkout Rate'] || '0%',
        purchases: parseInt(item['Purchases']) || 0,
        purchaseRate: item['Purchase Rate'] || '0%'
      };
      console.log('Transformed item:', transformedItem);
      return transformedItem;
    });
    console.log('Final transformed data:', transformed);
    return transformed;
  }, [data]);

  // Update isFullScreen when prop changes
  useEffect(() => {
    setIsFullScreen(propIsFullScreen || false);
  }, [propIsFullScreen]);

  useEffect(() => {
    if (propDateRange) {
      dispatch(setDate({
        from: propDateRange.from ? propDateRange.from.toISOString() : undefined, // Convert Date to string
        to: propDateRange.to ? propDateRange.to.toISOString() : undefined // Convert Date to string
      }));
    }
  }, [propDateRange]);

  useEffect(() => {
    if (!isFullScreen) {
      if (propDateRange) {
      dispatch(setDate({
        from: propDateRange.from ? propDateRange.from.toISOString() : undefined, // Convert Date to string
        to: propDateRange.to ? propDateRange.to.toISOString() : undefined // Convert Date to string
      }));
    }
    }
  }, [isFullScreen, propDateRange]);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post(
        `/api/analytics/dayAtcReport/${brandId}`,
        {
          startDate: startDate,
          endDate: endDate,
        },
        { withCredentials: true }
      );

      if (response.data && response.data.data) {
        const fetchedData = response.data.data || [];
        setData(fetchedData);

      }
    } catch (error) {
      console.error('Error fetching daywise metrics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, brandId]);

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

export default DaywiseMetricsPage;