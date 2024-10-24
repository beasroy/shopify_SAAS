import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, PercentIcon, TrendingUp, FileChartColumn, RefreshCw, BriefcaseBusiness} from "lucide-react";
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
            const matchesOrderNumber = order.order_number.toString().includes(orderFilter);
            return matchesOrderNumber
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
        console.log("filtered orders",filteredOrders.length)
    }
}, [data, orderFilter, sortColumn, sortDirection]);





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
            <BriefcaseBusiness className="h-6 w-6 text-gray-500" />
            <h1 className="text-2xl font-bold">Business Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2">
            <DatePickerWithRange date={date} setDate={setDate} 
           defaultDate={{ 
            from: new Date(now.getFullYear(), now.getMonth(), 1), // First day of the current month
            to: now // Current date
          }} resetToFirstPage={()=>setCurrentPage(1)} />
          </div>
        </div>
      </header>
      <div className="p-4 md:p-8 bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold mb-2 flex items-center space-x-2">
              <BriefcaseBusiness className="h-6 w-6" />
              <span>Blended summary</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <svg viewBox="0 0 24 24" className="w-5 h-5" >
                <path d="M13.5437 4.24116L13.5441 4.24138C13.904 4.43971 14.2179 4.70303 14.4689 5.01529C14.7198 5.3275 14.903 5.68264 15.009 6.0601L15.4904 5.92486L15.009 6.0601C15.115 6.43752 15.1422 6.83078 15.0891 7.21776C15.0361 7.60457 14.9038 7.97861 14.6989 8.31855C14.6988 8.31873 14.6987 8.31891 14.6986 8.3191L8.41444 18.701C7.9918 19.3741 7.30557 19.868 6.49825 20.0687C5.68937 20.2699 4.83087 20.1586 4.10949 19.7614C3.38872 19.3646 2.86649 18.7168 2.64727 17.9633C2.42868 17.212 2.5264 16.4083 2.92214 15.7226L9.20689 5.33823C9.20695 5.33813 9.20702 5.33802 9.20708 5.33792C9.62451 4.65082 10.3142 4.14383 11.1301 3.93599C11.9464 3.72804 12.8151 3.83872 13.5437 4.24116Z" fill="#FFB70A" stroke="#FFB70A"></path><path d="M21.5404 15.4544L15.24 5.04127C14.7453 4.25097 13.9459 3.67817 13.0138 3.44633C12.0817 3.21448 11.0917 3.34215 10.2572 3.80182C9.4226 4.26149 8.8103 5.01636 8.55224 5.90372C8.29418 6.79108 8.41102 7.73988 8.87757 8.54562L15.178 18.9587C15.6726 19.749 16.4721 20.3218 17.4042 20.5537C18.3362 20.7855 19.3262 20.6579 20.1608 20.1982C20.9953 19.7385 21.6076 18.9836 21.8657 18.0963C22.1238 17.2089 22.0069 16.2601 21.5404 15.4544Z" fill="#3B8AD8"></path><path d="M9.23018 16.2447C9.07335 15.6884 8.77505 15.1775 8.36166 14.7572C7.94827 14.3369 7.43255 14.0202 6.86011 13.835C6.28768 13.6499 5.67618 13.6021 5.07973 13.6958C4.48328 13.7895 3.92026 14.0219 3.44049 14.3723C2.96071 14.7227 2.57898 15.1804 2.32906 15.7049C2.07914 16.2294 1.96873 16.8045 2.00762 17.3794C2.0465 17.9542 2.23347 18.5111 2.55199 19.0007C2.8705 19.4902 3.31074 19.8975 3.83376 20.1863C4.46363 20.5354 5.1882 20.6983 5.91542 20.6542C6.64264 20.6101 7.33969 20.361 7.91802 19.9386C8.49636 19.5162 8.92988 18.9395 9.16351 18.2817C9.39715 17.624 9.42035 16.915 9.23018 16.2447Z" fill="#2CAA14"></path>
              </svg>
            </h1>
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
