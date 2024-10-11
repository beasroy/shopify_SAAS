import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Navbar } from './navbar.tsx';
import { RefreshCw } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, PercentIcon, TrendingUp } from "lucide-react";
import React from 'react';
import MonthlyReturningCustomerRatesChart from './MonthlyReturningCustomerRatesChart';
import { ReferringChannelChart } from './ReferringChannelChart';
import SalesByTimeOfDayChart from './SalesByTimeOfDayChart';
import TopCitiesLineChart from './CityChart.tsx';

interface ReportData {
  yearMonth: string;
  [key: string]: string; // Allows for additional properties like landingPage, city, channel, etc.
}

interface AnalyticsReport {
  reportType: string;
  data: ReportData[];
}

interface DashboardData {
  orders: any[];
  totalOrders: number;
  totalSales: number;
  conversionRate: number;
  averageOrderValue: number;
  topSellingProducts: { name: string; count: number }[];
  salesByTimeOfDay: number[];
  MonthlyCustomerReturnRate: { [month: string]: number };
  referringChannelsData: { [channel: string]: number }
}

interface CombinedData {
  orders: any[];
  totalOrders: number;
  totalSales: number;
  conversionRate: number;
  averageOrderValue: number;
  topSellingProducts: { name: string; count: number }[];
  salesByTimeOfDay: number[];
  MonthlyCustomerReturnRate: { [month: string]: number };
  referringChannelsData: { [channel: string]: number }
  analyticsReports: AnalyticsReport[];
}

interface Order {
  id: number;
  order_number: number;
  total_price: string;
  created_at: string;
  financial_status: string;
}


export default function Dashboard() {




  const [data, setData] = useState<CombinedData | null>(null);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof Order>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [orderFilter, setOrderFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');


  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6;

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = 'http://localhost:8000/shopify/data';
      const params = new URLSearchParams();

      if (orderFilter) {
        params.append('orderNumber', orderFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const shopifyResponse = await axios.get<DashboardData>(url, {
        withCredentials: true
      });

      const analyticsResponse = await axios.post('http://localhost:8000/analytics/report', {
        startDate,
        endDate
      }, {
        withCredentials: true
      });

      console.log("Shopify response", shopifyResponse.data);
      console.log("Analytics response", analyticsResponse.data);


      const combinedData = {
        ...shopifyResponse.data,
        analyticsReports: analyticsResponse.data // Add analytics data to the combined data
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
  }, [navigate, orderFilter, startDate, endDate]);

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [fetchData]);



  useEffect(() => {
    if (data) {
      let filtered = data.orders.filter(order => {
        const orderDate = new Date(order.created_at);
        const matchesOrderNumber = order.order_number.toString().includes(orderFilter);
        const matchesStartDate = startDate ? orderDate >= new Date(startDate) : true;
        const matchesEndDate = endDate ? orderDate <= new Date(endDate) : true;

        // Debugging line to check each order's match status
        console.log(`Order ID: ${order.id}, Matches: ${matchesOrderNumber && matchesStartDate && matchesEndDate}`);

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

      setFilteredOrders(filtered);
    }
  }, [data, orderFilter, startDate, endDate, sortColumn, sortDirection]);

  console.log('Data:', data);

  console.log("reffering channel", data?.referringChannelsData)

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

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
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
  console.log(filteredOrders)
  // Calculate the orders for the current page
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const prepareMonthlyReturnRatesData = () => {
    if (!data || !data.analyticsReports) return [];

    // Find the report for "Returning Customer Rate"
    const returningCustomerRateReport = data.analyticsReports.find(report => report.reportType === 'Returning Customer Rate');

    if (!returningCustomerRateReport || !returningCustomerRateReport.data) return [];

    // Map the data to the expected format
    return returningCustomerRateReport.data.map(({ yearMonth, returnRate }) => ({
      month: yearMonth, // e.g., '202410'
      returningCustomerRate: parseFloat(returnRate) || 0, // Convert to number, default to 0 if NaN
    }));
  };
  const preparedReferringData = () => {
    if (!data || !data.analyticsReports) return [];

    const referringChannelData = data.analyticsReports.find(report => report.reportType === 'Sessions by Referring Channel')?.data || [];
    if (!referringChannelData) return [];
    // Prepare the referring data
    return referringChannelData.map(entry => ({
      channel: entry.channel,
      visitors: entry.visitors, // Keep visitors as a string
    }));
  };

  const preparedCityData = () => {
    if (!data || !data.analyticsReports) return [];

    const cityData = data.analyticsReports.find(report => report.reportType === 'Sessions by Location')?.data || [];
    if (!cityData) return [];
    // Prepare the referring data
    return cityData.map(entry => ({
      city: entry.city,
      visitors: entry.visitors, // Keep visitors as a string
    }));
  };






  if (!data) return <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
  </div>;

  return (
    <>
      <Navbar />
      <div className="p-8 bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Shopify Dashboard</h1>
          <div className="flex items-center">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
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
              <div className="flex items-center gap-2">
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      {['Order Number', 'Total Price', 'Date', 'Status'].map((header) => (
                        <TableHead key={header} className="font-semibold text-gray-600">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort(header.toLowerCase().replace(' ', '_') as keyof Order)}
                          >
                            {header}
                            {sortColumn === header.toLowerCase().replace(' ', '_') && (
                              sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentOrders.length > 0 ? currentOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium px-5">{order.order_number}</TableCell>
                        <TableCell className=" px-5">₹{parseFloat(order.total_price).toFixed(2)}</TableCell>
                        <TableCell className=" px-5">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(order.financial_status)} font-semibold`}>
                            {order.financial_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">No orders found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <span>Page {currentPage} of {Math.ceil(filteredOrders.length / ordersPerPage)}</span>
                <Button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={indexOfLastOrder >= filteredOrders.length}
                  variant="outline"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
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
            <CardHeader>
              <CardTitle className="text-lg text-gray-600">Top 5 Referring Channels</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ReferringChannelChart rawData={preparedReferringData()} />
            </CardContent>
          </Card>
          {/* City Chart */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 mb-5">
            <CardHeader>
              <CardTitle className="text-lg text-gray-600">Top 5 Cities</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <TopCitiesLineChart cityData={preparedCityData()} />
            </CardContent>
          </Card>
        </div>

        {/* Sales by Time of Day chart */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 mb-5">
          <CardHeader>
            <CardTitle className="text-lg text-gray-600">Sales by Time of Day</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <SalesByTimeOfDayChart data={data.salesByTimeOfDay.map((sales, hour) => ({ hour, sales }))} />
          </CardContent>
        </Card>

      </div>
    </>
  );
}