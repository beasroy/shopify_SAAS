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
  "ATC To Checkout Rate": string
  "Checkout To Purchase Rate": string
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
  const [paymentOrdersData, setPaymentOrdersData] = useState<any[]>([]);
  const [productsLaunchedData, setProductsLaunchedData] = useState<any[]>([]);
  const [returningCustomerPercentage, setReturningCustomerPercentage] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState<{
    ecommerce: boolean;
    aov: boolean;
    paymentOrders: boolean;
    productsLaunched: boolean;
    returningCustomerPercentage: boolean;
  }>({
    ecommerce: false,
    aov: false,
    paymentOrders: false,
    productsLaunched: false,
    returningCustomerPercentage: false
  });
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

  // Transform data to match ReportTable's expected format and merge AOV and payment orders data
  const transformedData = useMemo(() => {
    // If ecommerce API failed, return empty array or show error state
    if (apiErrors.ecommerce && data.length === 0) {
      return [];
    }

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

    // Create maps of payment orders data by month for quick lookup
    const codOrderMap = new Map<string, number>();
    const prepaidOrderMap = new Map<string, number>();
    console.log('Payment Orders Data for mapping:', paymentOrdersData);
    paymentOrdersData.forEach((paymentItem) => {
      // Match by monthName (e.g., "Nov-2025") or month (e.g., "2025-11")
      let monthKey = '';
      if (paymentItem.monthName) {
        monthKey = paymentItem.monthName;
        codOrderMap.set(monthKey, paymentItem.codOrderCount || 0);
        prepaidOrderMap.set(monthKey, paymentItem.prepaidOrderCount || 0);
        console.log(`Mapped Payment Orders: ${paymentItem.monthName} = COD: ${paymentItem.codOrderCount}, Prepaid: ${paymentItem.prepaidOrderCount}`);
      }
      if (paymentItem.month) {
        // Convert "2025-11" to "Nov-2025" format for matching
        const date = new Date(paymentItem.month + '-01');
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        monthKey = monthName;
        codOrderMap.set(monthKey, paymentItem.codOrderCount || 0);
        prepaidOrderMap.set(monthKey, paymentItem.prepaidOrderCount || 0);
        console.log(`Mapped Payment Orders from month: ${paymentItem.month} -> ${monthName} = COD: ${paymentItem.codOrderCount}, Prepaid: ${paymentItem.prepaidOrderCount}`);
      }
    });

    // Create maps of products launched data by month for quick lookup
    const productsLaunchedMap = new Map<string, number>();
    console.log('Products Launched Data for mapping:', productsLaunchedData);
    productsLaunchedData.forEach((productsLaunchedItem) => {
      // Match by monthName (e.g., "Nov-2025") or month (e.g., "2025-11")
      let monthKey = '';
      if (productsLaunchedItem.monthName) {
        monthKey = productsLaunchedItem.monthName;
        productsLaunchedMap.set(monthKey, productsLaunchedItem.productsLaunched || 0);
        console.log(`Mapped Products Launched: ${productsLaunchedItem.monthName} = ${productsLaunchedItem.productsLaunched}`);
      }
      if (productsLaunchedItem.month) {
        // Convert "2025-11" to "Nov-2025" format for matching
        const date = new Date(productsLaunchedItem.month + '-01');
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        monthKey = monthName;
        productsLaunchedMap.set(monthKey, productsLaunchedItem.productsLaunched || 0);
        console.log(`Mapped Products Launched from month: ${productsLaunchedItem.month} -> ${monthName} = ${productsLaunchedItem.productsLaunched}`);
      }
    });

    // Create maps of returned customers data by month for quick lookup
    const returnedCustomersMap = new Map<string, number>();
    console.log('Returned Customers Data for mapping:', returningCustomerPercentage);
    returningCustomerPercentage.forEach((returnedCustomersItem) => {
      // Match by monthName (e.g., "Nov-2025") or month (e.g., "2025-11")
      let monthKey = '';
      if (returnedCustomersItem.monthName) {
        monthKey = returnedCustomersItem.monthName;
        returnedCustomersMap.set(monthKey, returnedCustomersItem.returningCustomerPercentage || 0);
        console.log(`Mapped Returned Customers: ${returnedCustomersItem.monthName} = ${returnedCustomersItem.returningCustomerPercentage}`);
      }
      if (returnedCustomersItem.month) {
        // Convert "2025-11" to "Nov-2025" format for matching
        const date = new Date(returnedCustomersItem.month + '-01');
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        monthKey = monthName;
        returnedCustomersMap.set(monthKey, returnedCustomersItem.returningCustomerPercentage || 0);
        console.log(`Mapped Returned Customers from month: ${returnedCustomersItem.month} -> ${monthName} = ${returnedCustomersItem.returningCustomerPercentage}`);
      }
    });

    console.log('Ecommerce Data months:', data.map(item => item.Month));
    console.log('AOV Map keys:', Array.from(aovMap.keys()));
    console.log('Payment Orders Map keys:', Array.from(codOrderMap.keys()));

    return data.map((item, index) => {
      // Try to match AOV and Avg Items by month name
      const monthName = item.Month;
      // Show undefined if API failed (will display as "-" in table), otherwise use mapped value or 0
      const aov = apiErrors.aov ? undefined : (aovMap.get(monthName) ?? 0);
      const averageItemsPerOrder = apiErrors.aov ? undefined : (avgItemsMap.get(monthName) ?? 0);
      const codOrderCount = apiErrors.paymentOrders ? undefined : (codOrderMap.get(monthName) ?? 0);
      const prepaidOrderCount = apiErrors.paymentOrders ? undefined : (prepaidOrderMap.get(monthName) ?? 0);
      const productsLaunched = apiErrors.productsLaunched ? undefined : (productsLaunchedMap.get(monthName) ?? 0);
      const returningCustomerPercentage = apiErrors.returningCustomerPercentage ? undefined : (returnedCustomersMap.get(monthName) ?? 0);
      if (typeof aov === 'number' && aov > 0) {
        console.log(`Matched AOV for ${monthName}: ${aov}, Avg Items: ${averageItemsPerOrder}`);
      }
      if ((typeof codOrderCount === 'number' && codOrderCount > 0) || (typeof prepaidOrderCount === 'number' && prepaidOrderCount > 0)) {
        console.log(`Matched Payment Orders for ${monthName}: COD: ${codOrderCount}, Prepaid: ${prepaidOrderCount}`);
      }
      if (typeof productsLaunched === 'number' && productsLaunched > 0) {
        console.log(`Matched Products Launched for ${monthName}: ${productsLaunched}`);
      }
      if (typeof returningCustomerPercentage === 'number' && returningCustomerPercentage > 0) {
        console.log(`Matched Returned Customers for ${monthName}: ${returningCustomerPercentage}`);
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
        averageItemsPerOrder: averageItemsPerOrder,
        codOrderCount: codOrderCount,
        prepaidOrderCount: prepaidOrderCount,
        productsLaunched: productsLaunched,
        returningCustomerPercentage: returningCustomerPercentage,
        atcToCheckoutRate: item['ATC To Checkout Rate'] || '0%',
        checkoutToPurchaseRate: item['Checkout To Purchase Rate'] || '0%'
      };
    });
  }, [data, aovData, paymentOrdersData, apiErrors]);



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

      // Fetch payment orders data (COD and Prepaid) for primary date range
      if (startDate && endDate) {
        promises.push(
          axiosInstance.post(
            `/api/shopify/payment-orders/${brandId}`,
            {
              startDate: startDate,
              endDate: endDate
            },
            { withCredentials: true }
          )
        );
      }
      // Fetch products launched data for primary date range
      if (startDate && endDate) {
        promises.push(
          axiosInstance.post(
            `/api/product/monthly-launched-products/${brandId}`,
            {
              startDate: startDate,
              endDate: endDate
            },
            { withCredentials: true }
          )
        );
      }
      // Fetch items sold data on monthly basis
      if (startDate && endDate) {
        promises.push(
          axiosInstance.post(
            `/api/shopify/monthly-returned-customers/${brandId}`,
            {
              startDate: startDate,
              endDate: endDate
            },
            { withCredentials: true }
          )
        );
      }

      // Use Promise.allSettled to handle each API independently
      const results = await Promise.allSettled(promises);
      console.log('Returning Customer ------->:', results[4]);
      // Reset error states
      setApiErrors({
        ecommerce: false,
        aov: false,
        paymentOrders: false,
        productsLaunched: false,
        returningCustomerPercentage: false
      });

      // Process ecommerce metrics response (index 0)
      if (results[0]) {
        if (results[0].status === 'fulfilled') {
          const DailyAnalyticsResponse = results[0].value;
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
          } else {
            setData([]);
          }
        } else {
          // Ecommerce API failed
          console.error('Ecommerce metrics API failed:', results[0].reason);
          setApiErrors(prev => ({ ...prev, ecommerce: true }));
          setData([]);
        }
      }

      // Process AOV response (index 1)
      if (results[1]) {
        if (results[1].status === 'fulfilled') {
          const aovResponse = results[1].value;
          console.log('AOV API Response:', aovResponse.data);
          if (aovResponse.data.success && aovResponse.data.data) {
            console.log('AOV Data:', aovResponse.data.data);
            setAovData(aovResponse.data.data);
          } else {
            console.warn('AOV data not in expected format:', aovResponse.data);
            setAovData([]);
          }
        } else {
          // AOV API failed
          console.error('AOV API failed:', results[1].reason);
          setApiErrors(prev => ({ ...prev, aov: true }));
          setAovData([]);
        }
      }

      // Process payment orders response (index 2)
      if (results[2]) {
        if (results[2].status === 'fulfilled') {
          const paymentOrdersResponse = results[2].value;
          console.log('Payment Orders API Response:', paymentOrdersResponse.data);
          if (paymentOrdersResponse.data.success && paymentOrdersResponse.data.data) {
            console.log('Payment Orders Data:', paymentOrdersResponse.data.data);
            setPaymentOrdersData(paymentOrdersResponse.data.data);
          } else {
            console.warn('Payment orders data not in expected format:', paymentOrdersResponse.data);
            setPaymentOrdersData([]);
          }
        } else {
          // Payment Orders API failed
          console.error('Payment Orders API failed:', results[2].reason);
          setApiErrors(prev => ({ ...prev, paymentOrders: true }));
          setPaymentOrdersData([]);
        }
      }

      // Process products launched response (index 3)
      if (results[3]) {
        if (results[3].status === 'fulfilled') {
          const productsLaunchedResponse = results[3].value;
          console.log('Products Launched API Response:', productsLaunchedResponse.data);
          if (productsLaunchedResponse.data.success && productsLaunchedResponse.data.data) {
            console.log('Products Launched Data:', productsLaunchedResponse.data.data);
            setProductsLaunchedData(productsLaunchedResponse.data.data);
          }
        } else {
          // Products Launched API failed
          console.error('Products Launched API failed:', results[3].reason);
          setApiErrors(prev => ({ ...prev, productsLaunched: true }));
          setProductsLaunchedData([]);
        }
      }

      // Process returned customers response (index 4)
      if (results[4]) {
        if (results[4].status === 'fulfilled') {
          const returnedCustomersResponse = results[4].value;
          console.log('Returned Customers API Response:', returnedCustomersResponse.data);
          if (returnedCustomersResponse.data.success && returnedCustomersResponse.data.data) {
            console.log('Returned Customers Data:', returnedCustomersResponse.data.data);
            setReturningCustomerPercentage(returnedCustomersResponse.data.data);
          }
        } else {
          // Returned Customers API failed
          console.error('Returned Customers API failed:', results[4].reason);
          setApiErrors(prev => ({ ...prev, returnedCustomers: true }));
          setReturningCustomerPercentage([]);
        }
      }


    } catch (error) {
      console.error('Error in fetchMetrics:', error);
      // Set all APIs as failed if there's a general error
      setApiErrors({
        ecommerce: true,
        aov: true,
        paymentOrders: true,
        productsLaunched: true,
        returningCustomerPercentage: true
      });
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, compareStartDate, compareEndDate, brandId]);

  // Fetch data when dates or brandId change
  useEffect(() => {
    if (startDate && endDate) {
      fetchMetrics();
    }

  }, [startDate, endDate, brandId]); 

  // Set up polling interval
  useEffect(() => {
    if (!startDate || !endDate) return;
    
    const intervalId = setInterval(() => {
      fetchMetrics();
    }, 15 * 60 * 1000);
    
    return () => clearInterval(intervalId);

  }, [startDate, endDate, brandId]); 

  // Listen for refresh trigger from parent
  useEffect(() => {
    if (refreshTrigger > 0 && startDate && endDate) {
      fetchMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, startDate, endDate, brandId]); // fetchMetrics is memoized with useCallback, so we don't need it here

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