import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, PercentIcon, TrendingUp, FileChartColumn, RefreshCw, Settings2Icon } from "lucide-react";
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
// import { Navbar } from './navbar.tsx';
import MonthlyReturningCustomerRatesChart from '../components/dashboard_component/MonthlyReturningCustomerRatesChart.tsx';
import { ReferringChannelChart } from '../components/dashboard_component/ReferringChannelChart.tsx';
import SalesByTimeOfDayChart from '../components/dashboard_component/SalesByTimeOfDayChart.tsx';
import TopCitiesLineChart from '../components/dashboard_component/CityChart.tsx';
import TopPagesPieChart from '../components/dashboard_component/LandingPageChart.tsx';
import ReportModal from '../components/dashboard_component/ReportModal.tsx';
import OrdersTable from '../components/dashboard_component/OrdersTable.tsx';
import { DashboardData, CombinedData, Order } from './interfaces';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange.tsx';

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Dashboard() {


  const [data, setData] = useState<CombinedData | null>(null);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof Order>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [orderFilter, setOrderFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [date, setDate] = useState<DateRange | undefined>(undefined); // Initialize state

  // const websocketUrl = import.meta.env.PROD ? 'wss://your-production-url' : 'ws://localhost:PORT';



  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6;

  const navigate = useNavigate();

  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

  const debouncedStartDate = useDebouncedValue(startDate, 500);
  const debouncedEndDate = useDebouncedValue(endDate, 500);


  const now = new Date(); // Define 'now' variable

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {

      const baseURL =
        import.meta.env.PROD
          ? import.meta.env.VITE_API_URL
          : import.meta.env.VITE_LOCAL_API_URL;

      let url = `${baseURL}/api/shopify/data`;
      const params = new URLSearchParams();

      if (orderFilter) {
        params.append('orderNumber', orderFilter);
      }
      if (debouncedStartDate) {
        params.append('startDate', debouncedStartDate);
      }
      if (debouncedEndDate) {
        params.append('endDate', debouncedEndDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const shopifyResponse = await axios.get<DashboardData>(url, {
        withCredentials: true
      });

      const analyticsResponse = await axios.post(`${baseURL}/api/analytics/report`, {
        startDate: debouncedStartDate,
        endDate: debouncedEndDate
      }, {
        withCredentials: true
      });

      console.log("Analytics Data:", analyticsResponse.data);

      const combinedData = {
        ...shopifyResponse.data,
        analyticsReports: analyticsResponse.data
      };

      setData(combinedData);
      setFilteredOrders(combinedData.orders);
      setLastUpdated(new Date());
  
     
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, orderFilter, debouncedStartDate, debouncedEndDate]);


  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, 5 * 60 * 1000);


    return () => clearInterval(intervalId);
  }, [fetchData]);


  //websocket connection

  // useEffect(() => {
  //   const ws = new WebSocket(websocketUrl);

  //   ws.onopen = () => {
  //     console.log('WebSocket connected');
  //   };

  //   ws.onmessage = (event) => {
  //     const newData = JSON.parse(event.data);
  //     console.log('New webhook data received:', newData);

  //     // Fetch the latest data again after receiving the update
  //     fetchData(); // Re-fetch data to ensure the dashboard reflects the latest state
  //   };

  //   ws.onclose = () => {
  //     console.log('WebSocket disconnected');
  //   };

  //   return () => {
  //     ws.close(); // Clean up WebSocket connection on component unmount
  //   };
  // }, [fetchData, websocketUrl]);



  useEffect(() => {
    if (data) {
        let filtered = data.orders.filter(order => {
            const orderDate = new Date(order.created_at);
            const matchesOrderNumber = order.order_number.toString().includes(orderFilter);
            
            const startDate = debouncedStartDate ? new Date(debouncedStartDate) : null;
            const endDate = debouncedEndDate ? new Date(debouncedEndDate) : null;

            const matchesStartDate = startDate ? orderDate >= startDate : true;
            const matchesEndDate = endDate ? orderDate <= endDate : true;

            // Special case when start and end dates are equal
            if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
                return matchesOrderNumber && orderDate.toDateString() === startDate.toDateString();
            }

            return matchesOrderNumber && matchesStartDate && matchesEndDate;
        });

        // Apply sorting
        filtered.sort((a, b) => {
            if (sortColumn === 'order_number') {
                return sortDirection === 'asc'
                    ? a.order_number - b.order_number
                    : b.order_number - a.order_number;
            } else if (sortColumn === 'total_price') {
                return sortDirection === 'asc'
                    ? parseFloat(a.total_price) - parseFloat(b.total_price)
                    : parseFloat(b.total_price) - parseFloat(a.total_price);
            }
            return 0;
        });
        console.log("DATA",data)
        setFilteredOrders(filtered);
    }
}, [data, orderFilter, debouncedStartDate, debouncedEndDate, sortColumn, sortDirection]);





  // console.log('Data:', data);


  const handleSort = (column: keyof Order) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleOrderFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrderFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setStartDate(e.target.value);
  //   setCurrentPage(1); // Reset to first page when filter changes
  // };

  // const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setEndDate(e.target.value);
  //   setCurrentPage(1); // Reset to first page when filter changes
  // };





  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: string } = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      refunded: "bg-red-100 text-red-800",
    };
    return statusMap[status.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const handleManualRefresh = () => {
    fetchData();
  };


  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const prepareMonthlyReturnRatesData = () => {
    if (!data || !data.analyticsReports) return [];

    const returningCustomerRateReport = data.analyticsReports.find(report => report.reportType === 'Returning Customer Rate');

    if (!returningCustomerRateReport || !returningCustomerRateReport.data) return [];

    return returningCustomerRateReport.data.map(({ yearMonth, returnRate }) => ({
      month: yearMonth,
      returningCustomerRate: parseFloat(returnRate) || 0,
    }));
  };
  const preparedReferringData = () => {
    if (!data || !data.analyticsReports) return [];

    const referringChannelData = data.analyticsReports.find(report => report.reportType === 'Sessions by Referring Channel')?.data || [];
    if (!referringChannelData) return [];

    return referringChannelData.map(entry => ({
      Channel: entry.channel,
      Source: entry.source,
      Medium: entry.medium,
      Visitors: entry.visitors,
      Sessions: entry.sessions
    }));
  };


  const preparedCityData = () => {
    if (!data || !data.analyticsReports) return [];

    const cityData = data.analyticsReports.find(report => report.reportType === 'Sessions by Location')?.data || [];
    if (!cityData) return [];

    return cityData.map(entry => ({
      City: entry.city,
      Region: entry.region,
      Country: entry.country,
      Visitors: entry.visitors,
      Sessions: entry.sessions
    }));
  };

  const preparedPageData = () => {
    if (!data || !data.analyticsReports) return [];

    const pageData = data.analyticsReports.find(report => report.reportType === 'Landing Page Report')?.data || [];
    if (!pageData) return [];

    return pageData.map(entry => ({
      LandingPage: getShortLabel(entry.landingPage),
      AddToCarts: entry.addToCarts,
      Checkouts: entry.checkouts,
      Conversions: entry.conversions,
      Visitors: entry.visitors,
      Sessions: entry.sessions
    }));
  };


  const getShortLabel = (label: string) => {
    const url = new URL(label, 'http://dummy-base-url');
    return url.pathname;
  };



  const handleOpenModal = (data: any[]) => {
    setReportData(data);
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
  };


  if (!data) return <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
  </div>;

  return (
    <>
      
      <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-8">
        <div className=" flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <Settings2Icon className="h-6 w-6 text-gray-500" />
            <h1 className="text-2xl font-bold">Business Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2">
            <DatePickerWithRange date={date} setDate={setDate} 
           defaultDate={{ 
            from: new Date(now.getFullYear(), now.getMonth(), 1), // First day of the current month
            to: now // Current date
          }}  />
          </div>
        </div>
      </header>
      <div className="p-4 md:p-8 bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Shopify Dashboard</h1>
          <div className="md:flex items-center hidden">
            {lastUpdated && (
              <span className="text-sm text-gray-600 mr-4">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="flex items-center"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:gap-8 md:mb-8">
          {/* Existing data cards */}
          {[
            { title: "Total Orders", value: data.totalOrders, colorClass: "text-blue-600", icon: ShoppingCart },
            { title: "Total Sales", value: `₹${data.totalSales.toFixed(2)}`, colorClass: "text-emerald-600", icon: DollarSign },
            { title: "Conversion Rate", value: `${data.conversionRate.toFixed(2)}%`, colorClass: "text-violet-600", icon: PercentIcon },
            { title: "Average Order Value", value: `₹${data.averageOrderValue.toFixed(2)}`, colorClass: "text-amber-600", icon: TrendingUp }
          ].map((item, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg text-gray-600">{item.title}</CardTitle>
                <item.icon className={`h-6 w-6 ${item.colorClass}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${item.colorClass}`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>


        {/* Second row: Orders table and charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Orders table */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-2xl text-gray-800">Recent Orders</CardTitle>
              <Input
                placeholder="Filter by order number..."
                value={orderFilter}
                onChange={handleOrderFilterChange}
                className="max-w-xs"
              />
              {/* <div className="flex md:flex-row flex-col items-center gap-2 justify-center">
                <Input
                  placeholder="Start Date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="max-w-xs"
                  type="date"
                />
                <span>to</span>
                <Input
                  placeholder="End Date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="max-w-xs"
                  type="date"
                />
              </div> */}
            </CardHeader>
            <CardContent>
              <OrdersTable
                orders={filteredOrders}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                handleSort={handleSort}
                getStatusColor={getStatusColor}
                currentPage={currentPage}
                ordersPerPage={ordersPerPage}
                paginate={paginate}
                totalOrders={filteredOrders.length} // Pass the total number of orders
              />
            </CardContent>
          </Card>

          {/* Top Selling Products */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-600">Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.topSellingProducts.map((product, index) => (
                  <li key={index} className="flex justify-between items-center p-2 bg-white rounded-lg shadow">
                    <span className="text-gray-800 font-medium">{product.name}</span>
                    <span className="font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">{product.count}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-5'>
          {/* Monthly Returning Customer Rates Chart */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 mb-5">
            <CardHeader>
              <CardTitle className="text-lg text-gray-600">Monthly Returning Customer Rates</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <MonthlyReturningCustomerRatesChart data={prepareMonthlyReturnRatesData()} />
            </CardContent>
          </Card>

          {/* Referring Channels Chart */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 mb-5">
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle className="text-lg text-gray-600">Top 5 Referring Channels</CardTitle>
              <Button onClick={() => handleOpenModal(preparedReferringData())} className=" bg-blue-50 text-blue-900 hover:text-white ">
                <FileChartColumn />
              </Button>
            </CardHeader>
            <CardContent className="h-80">
              <ReferringChannelChart rawData={preparedReferringData()} />
            </CardContent>
          </Card>
          {/* City Chart */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 mb-5">
            <CardHeader className='flex flex-row justify-between items-center'>
              <CardTitle className="text-lg text-gray-600">Top 5 Cities</CardTitle>
              <Button onClick={() => handleOpenModal(preparedCityData())} className=" bg-blue-50 text-blue-900 hover:text-white ">
                <FileChartColumn />
              </Button>
            </CardHeader>
            <CardContent className="h-80">
              <TopCitiesLineChart cityData={preparedCityData()} />
            </CardContent>
          </Card>
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Sales by Time of Day chart */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ">
            <CardHeader>
              <CardTitle className="text-lg text-gray-600">Sales by Time of Day</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <SalesByTimeOfDayChart data={data.salesByTimeOfDay.map((sales, hour) => ({ hour, sales }))} />
            </CardContent>
          </Card>

          {/* Landing Page Report*/}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ">
            <CardHeader className='flex flex-row justify-between items-center'>
              <CardTitle className="text-lg text-gray-600">Top 5 Landing Pages based on visitors</CardTitle>
              <Button onClick={() => handleOpenModal(preparedPageData())} className=" bg-blue-50 text-blue-900 hover:text-white ">
                <FileChartColumn />
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              <TopPagesPieChart PageData={preparedPageData()} />
            </CardContent>
          </Card>

          {/* Report Modal */}
          <ReportModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title="Report Data"
            data={reportData}
          />
        </div>
      </div>
    </>
  );
}
