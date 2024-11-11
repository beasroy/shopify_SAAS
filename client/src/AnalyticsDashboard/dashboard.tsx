import { useState, useEffect, useCallback } from 'react'
import { format } from "date-fns"
import { Blend, Filter, RefreshCw, Settings2Icon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { useNavigate, useParams } from 'react-router-dom';
import axios from "axios"
import AdAccountMetricsCard from "./AdAccountsMetricsCard.tsx"
import { AdAccountData, AggregatedMetrics, GoogleAdAccountData } from '@/Dashboard/interfaces.ts'
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange.tsx'
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ReportsDropdown from '@/components/dashboard_component/ReportDropDown.tsx';
type DataSource = 'all' | 'facebook' | 'google'



export default function Dashboard() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  })
  const [isLoading, setIsLoading] = useState(false);
  const [fbAdAccountsMetrics, setFbAdAccountsMetrics] = useState<AdAccountData[]>([]);
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetrics | null>(null)
  const [googleAdMetrics, setGoogleAdMetrics] = useState<GoogleAdAccountData>();
  const [dataSource, setDataSource] = useState<DataSource>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { brandId } = useParams();
  const navigate = useNavigate();

  const handleDataSourceChange = (newSource: DataSource) => {
    setDataSource(newSource)
  }

  const fetchAdData = useCallback(async () => {
    setIsLoading(true);
    try {
      const baseURL =
        import.meta.env.PROD
          ? import.meta.env.VITE_API_URL
          : import.meta.env.VITE_LOCAL_API_URL;

      const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
      const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

      let fbData = [];
      let googleData = [];

      if (dataSource === 'all' || dataSource === 'facebook') {
        const fbAdResponse = await axios.post(
          `${baseURL}/api/metrics/fbad/${brandId}`,
          { startDate, endDate },
          { withCredentials: true }
        );
        fbData = fbAdResponse.data.data;
        console.log(fbData);
        setFbAdAccountsMetrics(fbData);
      }
      if (dataSource === 'all' || dataSource === 'google') {
        const googleAdResponse = await axios.post(
          `${baseURL}/api/metrics/googlead/${brandId}`,
          { startDate, endDate },
          { withCredentials: true }
        );
        googleData = googleAdResponse.data.data;
        console.log(googleData);
        setGoogleAdMetrics(googleData);
      }

      calculateAggregatedMetrics(
        dataSource === 'google' ? [] : fbData,
        dataSource === 'facebook' ? undefined : googleData
      )
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching fb ad data:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, date, dataSource, brandId]);


  useEffect(() => {
    fetchAdData();
  }, [fetchAdData]);



  useEffect(() => {
    fetchAdData();

    const intervalId = setInterval(fetchAdData, 5 * 60 * 1000);


    return () => clearInterval(intervalId);
  }, [fetchAdData]);


  const calculateAggregatedMetrics = (fbData: AdAccountData[], googleData: GoogleAdAccountData | undefined) => {
    let totalSpent = 0;
    let totalRevenue = 0;
    let totalPurchases = 0;
    let totalClicks = 0;
    let totalImpressions = 0;

    if (fbData && fbData.length > 0) {
      fbData.forEach(account => {
        totalSpent += parseFloat(account.spend || '0');
        totalRevenue += parseFloat(account.Revenue?.value || '0');
        totalPurchases += parseFloat(account.purchases?.value || '0');
        totalClicks += parseFloat(account.clicks || '0');
        totalImpressions += parseFloat(account.impressions || '0');
      });
    }

    if (googleData) {
      totalSpent += parseFloat(googleData.totalSpend || '0');
      totalRevenue += parseFloat(googleData.totalConversionsValue || '0');
      totalPurchases += parseFloat(googleData.totalConversions || '0');
      totalClicks += parseFloat(googleData.totalClicks || '0');
      totalImpressions += parseFloat(googleData.totalImpressions || '0');
    }

    setAggregatedMetrics({
      totalSpent: `₹ ${totalSpent.toLocaleString()}`,
      totalRevenue: `₹ ${totalRevenue.toLocaleString()}`,
      totalROAS: (totalRevenue / totalSpent).toFixed(2).toString(),
      totalPurchases: totalPurchases.toLocaleString(),
      totalCTR: `${((totalClicks / totalImpressions) * 100).toFixed(2)} %`,
      totalCPC: (totalSpent / totalClicks).toFixed(2).toString(),
    });
  };


  const metrics = [
    {
      label: 'Amount Spent',
      value: aggregatedMetrics ? aggregatedMetrics.totalSpent : '₹ 0',
      tooltipContent: 'The sum of ad spends for all advertising platform'
    },
    {
      label: 'Revenue',
      value: aggregatedMetrics ? aggregatedMetrics.totalRevenue : '₹ 0',
      tooltipContent: 'Revenue from Ads Purchases'
    },
    {
      label: 'ROAS (Ads only)',
      value: aggregatedMetrics ? aggregatedMetrics.totalROAS : '0.00',
      tooltipContent: 'Blended ROAS = Ads Purchases vaue / Blended Ad Spend'
    },
    {
      label: 'Ads Purchases',
      value: aggregatedMetrics ? aggregatedMetrics.totalPurchases : '0.00',
      tooltipContent: 'Ads Purchases = Fb Ads Purchase + Google Conversions'
    },
    {
      label: 'CTR',
      value: aggregatedMetrics ? aggregatedMetrics.totalCTR : '0.00',
      tooltipContent: 'Average CTR from all advertising platforms = (Blended Clicks / Blended Impressions)*100'
    },
    {
      label: 'CPC',
      value: aggregatedMetrics ? aggregatedMetrics.totalCPC : '0.00',
      tooltipContent: 'Average CPC from all advertising platforms = (Blended Ad Spend / Blended Clicks )'
    }
  ];

  const googleMetrics = [
    {
      label: 'Total Cost',
      value: googleAdMetrics ? `₹ ${googleAdMetrics?.totalSpend}` : ' 0',
    },
    {
      label: 'Conversion Value',
      value: googleAdMetrics ? `₹ ${googleAdMetrics?.totalConversionsValue}` : ' 0',
    },
    {
      label: 'ROAS',
      value: googleAdMetrics ? googleAdMetrics?.roas : '0.00',
    },
    {
      label: 'Conversions',
      value: googleAdMetrics ? googleAdMetrics?.totalConversions : '0',
    },
    {
      label: 'CPC',
      value: googleAdMetrics ? `₹ ${googleAdMetrics?.totalCPC}` : ' 0',
    },
    {
      label: 'CPM',
      value: googleAdMetrics ? `₹ ${googleAdMetrics?.totalCPM}` : ' 0',
    },
    {
      label: 'CTR',
      value: googleAdMetrics ? `${googleAdMetrics?.totalCTR} %` : ' 0',
    },
    {
      label: 'Cost Per Conversion',
      value: googleAdMetrics ? `₹ ${googleAdMetrics?.totalCostPerConversion}` : ' 0',
    },
  ]

  const handleManualRefresh = () => {
    fetchAdData();
  };


  return (
    <div className="min-h-screen bg-gray-100">

      <nav className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-8">
        <div className=" flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <Settings2Icon className="h-6 w-6 text-gray-500" />
            <h1 className="text-2xl font-bold">Metrics Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2">
            <ReportsDropdown brandId={brandId} />
            <DatePickerWithRange date={date} setDate={setDate}
              defaultDate={{ from: new Date(), to: new Date() }} />
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="p-4 md:p-6 lg:px-8">
        <div className="space-y-2">
          {/* Blended summary */}
          <section>
            <h2 className="text-xl font-semibold flex flex-row items-center justify-between">
              <div className='flex flex-row items-center space-x-2'>
                <Blend className="h-5 w-5" />
                <span>Blended summary</span>
                {(dataSource === 'all' || dataSource === 'facebook') && (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                {(dataSource === 'all' || dataSource === 'google') && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" >
                    <path d="M13.5437 4.24116L13.5441 4.24138C13.904 4.43971 14.2179 4.70303 14.4689 5.01529C14.7198 5.3275 14.903 5.68264 15.009 6.0601L15.4904 5.92486L15.009 6.0601C15.115 6.43752 15.1422 6.83078 15.0891 7.21776C15.0361 7.60457 14.9038 7.97861 14.6989 8.31855C14.6988 8.31873 14.6987 8.31891 14.6986 8.3191L8.41444 18.701C7.9918 19.3741 7.30557 19.868 6.49825 20.0687C5.68937 20.2699 4.83087 20.1586 4.10949 19.7614C3.38872 19.3646 2.86649 18.7168 2.64727 17.9633C2.42868 17.212 2.5264 16.4083 2.92214 15.7226L9.20689 5.33823C9.20695 5.33813 9.20702 5.33802 9.20708 5.33792C9.62451 4.65082 10.3142 4.14383 11.1301 3.93599C11.9464 3.72804 12.8151 3.83872 13.5437 4.24116Z" fill="#FFB70A" stroke="#FFB70A"></path><path d="M21.5404 15.4544L15.24 5.04127C14.7453 4.25097 13.9459 3.67817 13.0138 3.44633C12.0817 3.21448 11.0917 3.34215 10.2572 3.80182C9.4226 4.26149 8.8103 5.01636 8.55224 5.90372C8.29418 6.79108 8.41102 7.73988 8.87757 8.54562L15.178 18.9587C15.6726 19.749 16.4721 20.3218 17.4042 20.5537C18.3362 20.7855 19.3262 20.6579 20.1608 20.1982C20.9953 19.7385 21.6076 18.9836 21.8657 18.0963C22.1238 17.2089 22.0069 16.2601 21.5404 15.4544Z" fill="#3B8AD8"></path><path d="M9.23018 16.2447C9.07335 15.6884 8.77505 15.1775 8.36166 14.7572C7.94827 14.3369 7.43255 14.0202 6.86011 13.835C6.28768 13.6499 5.67618 13.6021 5.07973 13.6958C4.48328 13.7895 3.92026 14.0219 3.44049 14.3723C2.96071 14.7227 2.57898 15.1804 2.32906 15.7049C2.07914 16.2294 1.96873 16.8045 2.00762 17.3794C2.0465 17.9542 2.23347 18.5111 2.55199 19.0007C2.8705 19.4902 3.31074 19.8975 3.83376 20.1863C4.46363 20.5354 5.1882 20.6983 5.91542 20.6542C6.64264 20.6101 7.33969 20.361 7.91802 19.9386C8.49636 19.5162 8.92988 18.9395 9.16351 18.2817C9.39715 17.624 9.42035 16.915 9.23018 16.2447Z" fill="#2CAA14"></path>
                  </svg>
                )}
              </div>
              <div className="flex flex-row items-center space-x-2">
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
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  
                </Button>
              </div> 
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className='bg-cyan-800'><Filter className="h-5 w-5 mr-2" />Filter</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuCheckboxItem
                    checked={dataSource === 'all'}
                    onCheckedChange={() => handleDataSourceChange('all')}
                    >All Data</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={dataSource === 'facebook'}
                    onCheckedChange={() => handleDataSourceChange('facebook')}
                   >Facebook Ads</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={dataSource === 'google'}
                    onCheckedChange={() => handleDataSourceChange('google')}
                   >Google Ads</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
              
            </h2>
            <AdAccountMetricsCard metrics={metrics} date={date || { from: new Date(), to: new Date() }} isLoading={isLoading} icon={dataSource === 'all' ? '' : dataSource === 'facebook' ? 'Facebook' : 'Google'} />
          </section>
        </div>


        {(dataSource === 'all' || dataSource === 'facebook') && fbAdAccountsMetrics.length > 0 && fbAdAccountsMetrics.map((accountMetrics, index) => {
          const fbmetrics = [
            { label: 'Amount Spent', value: `₹ ${accountMetrics.spend || '0'}` },
            {
              label: 'Revenue',
              value: `₹ ${parseFloat(accountMetrics.Revenue?.value || '0').toLocaleString()}`
            },
            {
              label: 'ROAS (Ads only)',
              value: accountMetrics.purchase_roas && accountMetrics.purchase_roas.length > 0
                ? parseFloat(accountMetrics.purchase_roas[0].value).toFixed(2)
                : '0'
            },
            { label: 'Ads Purchases', value: accountMetrics.purchases?.value || '0' },
            { label: 'CPC (All clicks)', value: `₹ ${parseFloat(accountMetrics.cpc || '0').toLocaleString()}` },
            { label: 'CPM', value: `₹ ${parseFloat(accountMetrics.cpm || '0').toFixed(2).toLocaleString()}` },
            { label: 'CTR', value: `${parseFloat(accountMetrics.ctr || '0').toFixed(2)} %` },
            { label: 'Cost per Purchase (All)', value: `₹ ${parseFloat(accountMetrics.cpp || '0').toLocaleString()}` },
          ];

          return (
            <AdAccountMetricsCard
              key={index}
              icon="Facebook"
              title={`Facebook - ${accountMetrics.account_name}`}
              metrics={fbmetrics}  // Pass fbmetrics for the current account
              date={date || { from: new Date(), to: new Date() }}
              isLoading={isLoading}
              errorMessage={accountMetrics.message}
            />
          );
        })}

        {(dataSource === 'all' || dataSource === 'google') && googleAdMetrics && (
          <AdAccountMetricsCard
            icon='Google'
            title={`Google Ads - ${googleAdMetrics?.adAccountName}`}
            metrics={googleMetrics}
            date={date || { from: new Date(), to: new Date() }}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  )
}








