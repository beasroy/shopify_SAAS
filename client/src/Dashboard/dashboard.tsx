import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, DollarSign, PercentIcon, TrendingUp, FileChartColumn, RefreshCw, BriefcaseBusiness, Sheet } from "lucide-react";
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { ReferringChannelChart } from '../components/dashboard_component/ReferringChannelChart.tsx';
import TopCitiesLineChart from '../components/dashboard_component/CityChart.tsx';
import TopPagesPieChart from '../components/dashboard_component/LandingPageChart.tsx';
import { DashboardData, CombinedData, DailyCartCheckoutReport } from './interfaces';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange.tsx';
import EcommerceMetrics from '@/components/dashboard_component/EcommerceChart.tsx';




export default function Dashboard() {

  const { brandId } = useParams();
  const [data, setData] = useState<CombinedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [date, setDate] = useState<DateRange | undefined>(undefined); // Initialize state

  // const websocketUrl = import.meta.env.PROD ? 'wss://your-production-url' : 'ws://localhost:PORT';

  const navigate = useNavigate();

  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";



  const now = new Date(); 

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {

      const baseURL =
        import.meta.env.PROD
          ? import.meta.env.VITE_API_URL
          : import.meta.env.VITE_LOCAL_API_URL;

      let url = `${baseURL}/api/shopify/data/${brandId}`;
      const params = new URLSearchParams();

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

      const analyticsResponse = await axios.post(`${baseURL}/api/analytics/report/${brandId}`, {
        startDate: startDate,
        endDate: endDate
      }, {
        withCredentials: true
      });

      console.log("Analytics Data:", analyticsResponse.data);

      const DailyAnalyticsResponse = await axios.post<DailyCartCheckoutReport>(`${baseURL}/api/analytics/atcreport/${brandId}`, {
        startDate: startDate,
        endDate: endDate
      }, { withCredentials: true });

      console.log("Daily Analytics Data:", DailyAnalyticsResponse.data);

      const combinedData = {
        ...shopifyResponse.data,
        analyticsReports: analyticsResponse.data || null,
        dailyCartCheckoutReports: DailyAnalyticsResponse.data ? [DailyAnalyticsResponse.data] : [] 
      };

      setData(combinedData);
      console.log(data)
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
  }, [navigate, startDate, endDate]);


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




  const handleManualRefresh = () => {
    fetchData();
  };

  // Conversion Rate calculation
  const session = data?.analyticsReports.find(report => report.reportType === 'Purchase Data');
  let totalConversionRate = 0; 
  if (session && Array.isArray(session.data)) {
    totalConversionRate = session.data.reduce((acc, item) => acc + Number(item.ConversionRate), 0);
  }


  const prepareMonthlyReturnRatesData = () => {
    if (!data || !data.analyticsReports) return 0;

    const returningCustomerRateReport = data.analyticsReports.find(report => report.reportType === 'Returning Customer Rate');

    if (!returningCustomerRateReport || !returningCustomerRateReport.data) return 0;

    const totalReturnRate = returningCustomerRateReport.data.reduce((acc, { returnRate }) => {
      const rate = parseFloat(returnRate) || 0; 
      return acc + rate; 
    }, 0);

    return totalReturnRate;
  };

  const monthlyReturnRate = parseFloat(prepareMonthlyReturnRatesData().toFixed(2));

  const preparedReferringData = () => {
    if (!data || !data.analyticsReports) return [];

    const referringChannelData = data.analyticsReports.find(report => report.reportType === 'Sessions by Referring Channel')?.data || [];
    if (!referringChannelData) return [];

    return referringChannelData.map(entry => ({
      Channel: entry.Channel,
      Visitors: entry.Visitors,
      Sessions: entry.Sessions
    }));
  };


  const preparedCityData = () => {
    if (!data || !data.analyticsReports) return [];

    const cityData = data.analyticsReports.find(report => report.reportType === 'Sessions by Location')?.data || [];
    if (!cityData) return [];

    return cityData.map(entry => ({
      City: entry.City,
      Region: entry.Region,
      Country: entry.Country,
      Visitors: entry.Visitors,
      Sessions: entry.Sessions
    }));
  };


  const preparedPageData = () => {
    if (!data || !data.analyticsReports) return [];

    const pageData = data.analyticsReports.find(report => report.reportType === 'Landing Page Report')?.data || [];
    if (!pageData) return [];

    return pageData.map(entry => ({
      LandingPage: entry.LandingPage,
      Visitors: entry.Visitors,

    }));
  };


  if (!data) return <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
  </div>;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-6">
        <div className=" flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <BriefcaseBusiness className="h-6 w-6 text-gray-500" />
            <h1 className="text-2xl font-bold">Business Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link to={`/ad-metrics/${brandId}`}>
              <Button className='flex items-center justify-between bg-cyan-600'>
                <p>View Report</p>
                <Sheet />
              </Button>
            </Link>
            <DatePickerWithRange date={date} setDate={setDate}
              defaultDate={{
                from: new Date(now.getFullYear(), now.getMonth(), 1), // First day of the current month
                to: now // Current date
              }} />
          </div>
        </div>
      </header>
      <div className="p-4 md:p-6 bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold mb-2 flex items-center space-x-3">
            <BriefcaseBusiness className="h-6 w-6" />
            <span>Blended summary</span>
            <svg viewBox="0 0 64 64" className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg" ><g>
                <g><path d="M51.759,12.659c-0.221-0.021-4.94-0.371-4.94-0.371s-3.28-3.271-3.639-3.631    c-0.36-0.362-1.063-0.254-1.337-0.171c-0.039,0.011-0.715,0.222-1.834,0.567c-1.096-3.167-3.027-6.077-6.426-6.077    c-0.094,0-0.191,0.004-0.289,0.01c-0.966-1.283-2.164-1.844-3.199-1.844c-7.919,0-11.703,9.951-12.889,15.008    c-3.078,0.956-5.266,1.638-5.542,1.728C9.943,18.42,9.89,18.474,9.667,20.1C9.495,21.331,5,56.264,5,56.264l35.022,6.594    L59,58.731c0,0-6.661-45.261-6.703-45.572C52.255,12.849,51.983,12.677,51.759,12.659z M33.034,10.88    c0,0.119-0.002,0.231-0.002,0.344c-1.928,0.601-4.02,1.251-6.121,1.906c1.179-4.57,3.387-6.78,5.32-7.613    C32.716,6.743,33.034,8.505,33.034,10.88z M29.876,3.278c0.346,0,0.688,0.116,1.018,0.345c-2.539,1.199-5.258,4.224-6.408,10.261    c-1.679,0.522-3.319,1.034-4.838,1.506C20.994,10.783,24.188,3.278,29.876,3.278z M31.241,30.19c0,0-2.05-1.099-4.561-1.099    c-3.686,0-3.872,2.324-3.872,2.908c0,3.195,8.287,4.42,8.287,11.903c0,5.888-3.714,9.678-8.726,9.678    c-6.012,0-9.088-3.761-9.088-3.761l1.609-5.345c0,0,3.16,2.729,5.83,2.729c1.74,0,2.449-1.38,2.449-2.387    c0-4.168-6.799-4.354-6.799-11.203c0-5.761,4.116-11.341,12.428-11.341c3.199,0,4.783,0.923,4.783,0.923L31.241,30.19z     M35.11,10.578c0-0.211,0.002-0.417,0.002-0.644c0-1.966-0.273-3.551-0.709-4.807c1.752,0.219,2.919,2.223,3.67,4.528    C37.194,9.931,36.194,10.241,35.11,10.578z" fill="#95C675" /></g><g><path d="M51.759,12.659c-0.221-0.021-4.94-0.371-4.94-0.371s-3.28-3.271-3.639-3.631    c-0.36-0.362-1.063-0.254-1.337-0.171c-0.039,0.011-0.715,0.222-1.834,0.567c-1.096-3.167-3.027-6.077-6.426-6.077    c-0.094,0-0.191,0.004-0.289,0.01c-0.966-1.283-2.164-1.844-3.199-1.844c-7.919,0-9.873,9.951-11.059,15.008    c-3.078,0.956-5.44,6.219-5.719,6.307c-1.719,0.542-1.772,0.596-1.996,2.223C11.148,25.91,5,56.264,5,56.264l35.022,6.594    L59,58.731c0,0-6.661-45.261-6.703-45.572C52.255,12.849,51.983,12.677,51.759,12.659z M33.034,10.88    c0,0.119-0.002,0.231-0.002,0.344c-1.928,0.601-4.02,1.251-6.121,1.906c1.179-4.57,3.387-6.78,5.32-7.613    C32.716,6.743,33.034,8.505,33.034,10.88z M29.876,3.278c0.346,0,0.688,0.116,1.018,0.345c-2.539,1.199-5.258,4.224-6.408,10.261    c-1.679,0.522-3.319,1.034-4.838,1.506C20.994,10.783,24.188,3.278,29.876,3.278z M31.241,30.19c0,0-2.05-1.099-4.561-1.099    c-3.686,0-3.872,2.324-3.872,2.908c0,3.195,8.287,4.42,8.287,11.903c0,5.888-3.714,9.678-8.726,9.678    c-6.012,0-9.088-3.761-9.088-3.761l1.609-5.345c0,0,3.16,2.729,5.83,2.729c1.74,0,2.449-1.38,2.449-2.387    c0-4.168-6.799-4.354-6.799-11.203c0-5.761,4.116-11.341,12.428-11.341c3.199,0,4.783,0.923,4.783,0.923L31.241,30.19z     M35.11,10.578c0-0.211,0.002-0.417,0.002-0.644c0-1.966-0.273-3.551-0.709-4.807c1.752,0.219,2.919,2.223,3.67,4.528    C37.194,9.931,36.194,10.241,35.11,10.578z" fill="#79B259" /></g><path d="M40.022,62.857L59,58.731c0,0-6.661-45.261-6.703-45.572c-0.042-0.311-0.313-0.482-0.538-0.5   c-0.221-0.021-4.94-0.371-4.94-0.371s-3.28-3.271-3.639-3.631c-0.192-0.194-0.479-0.249-0.75-0.251   c-0.72,1.22-0.571,3.537-0.571,3.537l-2.232,50.839L40.022,62.857z" fill="#55932C" /><path d="M33.583,2.977c-0.094,0-0.191,0.004-0.289,0.01c-0.966-1.283-2.164-1.844-3.199-1.844   c-7.887,0-11.674,9.873-12.875,14.947l2.447-0.759c1.354-4.609,4.545-12.053,10.209-12.053c0.346,0,0.688,0.116,1.018,0.345   c-2.532,1.195-5.244,4.209-6.398,10.213l2.43-0.75c1.182-4.541,3.381-6.739,5.307-7.569c0.484,1.227,0.803,2.988,0.803,5.363   c0,0.108,0,0.211-0.002,0.314l2.078-0.643c0-0.2,0.002-0.4,0.002-0.617c0-1.966-0.273-3.551-0.709-4.807   c1.746,0.218,2.912,2.213,3.662,4.508l1.938-0.601C38.906,5.876,36.976,2.977,33.583,2.977z" fill="#4A7A2B" /><path d="M47.611,12.348c-0.474-0.037-0.793-0.06-0.793-0.06s-3.28-3.271-3.639-3.631   c-0.192-0.194-0.479-0.249-0.75-0.251c-0.72,1.22-0.571,3.537-0.571,3.537l-2.232,50.839l0.396,0.075l10.098-2.196L47.611,12.348z" fill="#4C822A" />
              </g></svg>
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <rect x="17" y="2" width="5" height="20" rx="2.5" fill="#F9AB00"></rect>
              <path d="M9.5 13.5C9.5 12.1193 10.6193 11 12 11C13.3807 11 14.5 12.1193 14.5 13.5V19.5C14.5 20.8807 13.3807 22 12 22C10.6193 22 9.5 20.8807 9.5 19.5V13.5Z" fill="#E37400"></path><path d="M2 19.5C2 18.1193 3.11929 17 4.5 17C5.88071 17 7 18.1193 7 19.5C7 20.8807 5.88071 22 4.5 22C3.11929 22 2 20.8807 2 19.5Z" fill="#E37400"></path><path d="M6.92162 10C6.36184 10 5.95724 9.68838 5.95724 9.05977V8.55474H3.2304C2.49881 8.55474 2 8.1088 2 7.45332C2 7.07723 2.12193 6.70651 2.40459 6.22297C2.93666 5.29349 3.57403 4.31565 4.31116 3.23573C4.92637 2.31162 5.39747 2 6.20111 2C7.2209 2 7.88044 2.54265 7.88044 3.38617V7.02351H8.19082C8.72842 7.02351 9 7.34587 9 7.79181C9 8.23774 8.72288 8.55474 8.19082 8.55474H7.88044V9.05977C7.88044 9.68838 7.47585 10 6.92162 10ZM6.01267 7.09335V3.48287H5.97387C5.0095 4.8368 4.34996 5.83076 3.7015 7.03962V7.09335H6.01267Z" fill="#E37400"></path>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 mb-4 md:mb-5">
          {[
            { title: "Total Orders", value: data.totalOrders, colorClass: "text-cyan-700", icon: ShoppingCart },
            { title: "Total Sales", value: `₹${data.totalSales.toFixed(2)}`, colorClass: "text-cyan-700", icon: DollarSign },
            { title: "Monthly Conversion Rate", value: `${totalConversionRate.toFixed(2)}%`, colorClass: "text-cyan-700", icon: PercentIcon },
            { title: "Average Order Value", value: `₹${data.averageOrderValue.toFixed(2)}`, colorClass: "text-cyan-700", icon: TrendingUp },
            { title: "Monthly Return Rate", value: `${monthlyReturnRate}`, colorClass: "text-cyan-700", icon: PercentIcon }
          ].map((item, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg text-gray-600">{item.title}</CardTitle>
                <item.icon className={`h-6 w-6 ${item.colorClass}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${item.colorClass}`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>


        <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 mb-5">
            <CardHeader className='flex flex-row justify-between items-center'>
              <div className='flex flex-col gap-1'>
                <CardTitle className='text-base'>Aggregated E-commerce Metrics</CardTitle>
                <CardDescription>Total Add to Carts, Checkouts, Sessions, and Purchases</CardDescription>
              </div>
              <Link to={`/ecommerce-metrics/${brandId}`}>
                <Button className=" bg-blue-50 text-blue-900 hover:text-white ">
                  <FileChartColumn />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <EcommerceMetrics rawData={data?.dailyCartCheckoutReports[0].data || []} />
            </CardContent>
          </Card>
          {/* City Chart */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 mb-5">
            <CardHeader className='flex flex-row justify-between items-center'>
              <div className='flex flex-col gap-1'>
                <CardTitle className='text-base'>Top Cities</CardTitle>
                <CardDescription>Visitor Count For Top cities</CardDescription>
              </div>
              <Link to={`/city-metrics/${brandId}`}>
                <Button className=" bg-blue-50 text-blue-900 hover:text-white ">
                  <FileChartColumn />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <TopCitiesLineChart cityData={preparedCityData()} />
            </CardContent>
          </Card>
          {/* Referring Channels Chart */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 mb-5">
            <CardHeader className='flex flex-row items-center justify-between'>
              <div className='flex flex-col gap-1'>
                <CardTitle className='text-base'>Top Referring Channels</CardTitle>
                <CardDescription>Visitor count for reffering channels</CardDescription>
              </div>
              <Link to={`/channel-metrics/${brandId}`}>
                <Button className=" bg-blue-50 text-blue-900 hover:text-white ">
                  <FileChartColumn />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="h-80">
              <ReferringChannelChart rawData={preparedReferringData()} />
            </CardContent>
          </Card>

        </div>
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
          {/* Landing Page Report*/}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ">
            <CardHeader className='flex flex-row justify-between items-center px-6 py-3'>
              <div className='flex flex-col gap-1'>
                <CardTitle className='text-base'>Top Landing Pages</CardTitle>
                <CardDescription>Visitors count based on Landing Pages</CardDescription>
              </div>
              <Link to={`/page-metrics/${brandId}`}>
                <Button className=" bg-blue-50 text-blue-900 hover:text-white ">
                  <FileChartColumn />
                </Button>
              </Link>
            </CardHeader>
            <TopPagesPieChart PageData={preparedPageData()} />
          </Card>
        </div>
      </div>
    </>
  );
}
