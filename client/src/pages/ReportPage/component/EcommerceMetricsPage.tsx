import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from 'react-router-dom';
import { format, eachDayOfInterval } from "date-fns";
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
  "ATC To Checkout Rate": string
  "Checkout To Purchase Rate": string
}

interface EcommerceMetricsProps {
  dateRange: DateRange | undefined
  visibleColumns: string[];
  columnOrder: string[];
  refreshTrigger: number;
}

const EcommerceMetricsPage: React.FC<EcommerceMetricsProps> = ({ 
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
  const transformedData = useMemo(() => {
    if (!startDate || !endDate) return [];
    try {
      const allDates = eachDayOfInterval({ 
        start: new Date(startDate), 
        end: new Date(endDate) 
      });

      const dataMap = new Map(data.map(item => [item.Date, item]));

      return allDates.map((dateObj, index) => {
        const formattedDate = format(dateObj, 'dd-MM-yyyy');
        const item = dataMap.get(formattedDate);

        if (!item) {
          return {
            id: `row-${index}`,
            date: formattedDate,
            sessions: undefined as any,
            addToCart: undefined as any,
            addToCartRate: '-',
            checkouts: undefined as any,
            checkoutRate: '-',
            purchases: undefined as any,
            purchaseRate: '-',
            atcToCheckoutRate: '-',
            checkoutToPurchaseRate: '-'
          };
        }

        return {
          id: `row-${index}`,
          date: item.Date,
          sessions: item.Sessions !== undefined ? parseInt(item.Sessions as string) : undefined as any,
          addToCart: item['Add To Cart'] !== undefined ? parseInt(item['Add To Cart'] as string) : undefined as any,
          addToCartRate: item['Add To Cart Rate'] || '-',
          checkouts: item['Checkouts'] !== undefined ? parseInt(item['Checkouts'] as string) : undefined as any,
          checkoutRate: item['Checkout Rate'] || '-',
          purchases: item['Purchases'] !== undefined ? parseInt(item['Purchases'] as string) : undefined as any,
          purchaseRate: item['Purchase Rate'] || '-',
          atcToCheckoutRate: item['ATC To Checkout Rate'] || '-',
          checkoutToPurchaseRate: item['Checkout To Purchase Rate'] || '-'
        };
      });
    } catch(e) {
      return [];
    }
  }, [data, startDate, endDate]);



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

export default EcommerceMetricsPage;