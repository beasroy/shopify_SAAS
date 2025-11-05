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
  "Month": string
  "Add To Cart": string
  "Checkouts": string
  "Sessions": string
  "Purchases": string
  "Purchase Rate": string
  "Add To Cart Rate": string
  "Checkout Rate": string
}

interface EcommerceMetricsProps {
  dateRange: DateRange | undefined
  visibleColumns: string[];
  columnOrder: string[];
  refreshTrigger: number;
}

const MonthlyMetricsPage: React.FC<EcommerceMetricsProps> = ({ 
  dateRange: propDateRange, 
  visibleColumns,
  columnOrder,
  refreshTrigger
}) => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const compareFrom = useSelector((state: RootState) => state.date.compareFrom);
  const compareTo = useSelector((state: RootState) => state.date.compareTo);
  

  const [data, setData] = useState<EcommerceMetric[]>([]);
  const [aovData, setAovData] = useState<any[]>([]);
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
  
  const dispatch = useDispatch();
  const axiosInstance = createAxiosInstance();

  // Transform data to match ReportTable's expected format and merge AOV data
  const transformedData = useMemo(() => {
    // Create maps of AOV data by month for quick lookup
    const aovMap = new Map<string, number>();
    const avgItemsMap = new Map<string, number>();
    console.log('AOV Data for mapping:', aovData);
    aovData.forEach((aovItem) => {
      // Match by monthName (e.g., "Nov-2025") or month (e.g., "2025-11")
      let monthKey = '';
      if (aovItem.monthName) {
        monthKey = aovItem.monthName;
        aovMap.set(monthKey, aovItem.aov || 0);
        avgItemsMap.set(monthKey, aovItem.averageItemsPerOrder || 0);
        console.log(`Mapped AOV: ${aovItem.monthName} = ${aovItem.aov}, Avg Items = ${aovItem.averageItemsPerOrder}`);
      }
      if (aovItem.month) {
        // Convert "2025-11" to "Nov-2025" format for matching
        const date = new Date(aovItem.month + '-01');
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        monthKey = monthName;
        aovMap.set(monthKey, aovItem.aov || 0);
        avgItemsMap.set(monthKey, aovItem.averageItemsPerOrder || 0);
        console.log(`Mapped AOV from month: ${aovItem.month} -> ${monthName} = ${aovItem.aov}, Avg Items = ${aovItem.averageItemsPerOrder}`);
      }
    });

    console.log('Ecommerce Data months:', data.map(item => item.Month));
    console.log('AOV Map keys:', Array.from(aovMap.keys()));

    return data.map((item, index) => {
      // Try to match AOV and Avg Items by month name
      const monthName = item.Month;
      const aov = aovMap.get(monthName) || 0;
      const averageItemsPerOrder = avgItemsMap.get(monthName) || 0;
      if (aov > 0) {
        console.log(`Matched AOV for ${monthName}: ${aov}, Avg Items: ${averageItemsPerOrder}`);
      }

      return {
        id: `row-${index}`,
        month: item.Month,
        sessions: parseInt(item.Sessions) || 0,
        addToCart: parseInt(item['Add To Cart']) || 0,
        addToCartRate: item['Add To Cart Rate'] || '0%',
        checkouts: parseInt(item['Checkouts']) || 0,
        checkoutRate: item['Checkout Rate'] || '0%',
        purchases: parseInt(item['Purchases']) || 0,
        purchaseRate: item['Purchase Rate'] || '0%',
        aov: aov,
        averageItemsPerOrder: averageItemsPerOrder
      };
    });
  }, [data, aovData]);



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

      // Fetch both ecommerce metrics and AOV data in parallel
      const promises = [];

      // Fetch ecommerce metrics if we have at least one date range
      if (dateRanges.length > 0) {
        promises.push(
          axiosInstance.post(
            `/api/analytics/monthAtcReport/${brandId}`,
            {
              dateRanges: dateRanges,
            },
            { withCredentials: true }
          )
        );
      }

      // Fetch AOV data for primary date range
      if (startDate && endDate) {
        promises.push(
          axiosInstance.post(
            `/api/shopify/aov/${brandId}`,
            {
              startDate: startDate,
              endDate: endDate
            },
            { withCredentials: true }
          )
        );
      }

      const results = await Promise.all(promises);

      // Process ecommerce metrics response
      if (results[0]) {
        const DailyAnalyticsResponse = results[0];
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

      // Process AOV response
      if (results[1]) {
        const aovResponse = results[1];
        console.log('AOV API Response:', aovResponse.data);
        if (aovResponse.data.success && aovResponse.data.data) {
          console.log('AOV Data:', aovResponse.data.data);
          setAovData(aovResponse.data.data);
        } else {
          console.warn('AOV data not in expected format:', aovResponse.data);
        }
      } else {
        console.warn('No AOV response received');
      }

    } catch (error) {
      console.error('Error fetching e-commerce metrics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, compareStartDate, compareEndDate, brandId, axiosInstance]);

  // Fetch data when dates or brandId change
  useEffect(() => {
    if (startDate && endDate) {
      fetchMetrics();
    }
  }, [startDate, endDate, brandId]); // Only depend on what actually triggers a new fetch

  // Set up polling interval
  useEffect(() => {
    if (!startDate || !endDate) return;
    
    const intervalId = setInterval(() => {
      fetchMetrics();
    }, 15 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [startDate, endDate, brandId]); // Only depend on what affects the interval

  // Listen for refresh trigger from parent
  useEffect(() => {
    if (refreshTrigger > 0 && startDate && endDate) {
      fetchMetrics();
    }
  }, [refreshTrigger, startDate, endDate, brandId]); // Only depend on what affects the refresh

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

export default MonthlyMetricsPage;