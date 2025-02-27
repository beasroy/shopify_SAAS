import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from "date-fns"
import { Blend, LineChart} from "lucide-react"
import { useNavigate, useParams } from 'react-router-dom';
import axios from "axios"
import AdAccountMetricsCard, { CampaignGrid } from "./AdAccountsMetricsCard.tsx"
import { AdAccountData, GoogleAdAccountData } from '@/pages/Dashboard/interfaces.ts'
type DataSource = 'all' | 'facebook' | 'google'
import { CustomTabs } from '../ConversionReportPage/components/CustomTabs.tsx';
import Header from '@/components/dashboard_component/Header.tsx';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/index.ts';




export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [fbAdAccountsMetrics, setFbAdAccountsMetrics] = useState<AdAccountData[]>([]);
  const [googleAdMetrics, setGoogleAdMetrics] = useState<GoogleAdAccountData>();
  const [activeTab, setActiveTab] = useState<string>('all'); 
  const [dataSource, setDataSource] = useState<DataSource>('all');
  const [locale, setLocale] = useState<"en-IN" | "en-US">("en-IN"); 
  const [rawMetrics, setRawMetrics] = useState({
    totalSpent: 0,
    totalRevenue: 0,
    totalROAS: 0,
    totalPurchases: 0,
    totalCTR: 0,
    totalCPC: 0,
    totalCPM: 0,
    totalCPP: 0,
  });
  const { brandId } = useParams();
  const navigate = useNavigate();
  const tabs: { label: string; value: DataSource }[] = [
    { label: "All Data", value: "all" },
    { label: "Meta", value: "facebook" },
    { label: "Google", value: "google" },
  ];

  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);


  const handleDataSourceChange = (newValue: string) => {
    const selectedTab = tabs.find((tab) => tab.value === newValue);
    if (selectedTab && selectedTab.value !== dataSource) {
      setActiveTab(selectedTab.value); 
      setDataSource(selectedTab.value); 
    }
  };

  const user = useSelector((state : RootState) => state.user.user);

  const userId = user?.id;


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
        try {
          const fbAdResponse = await axios.post(
            `${baseURL}/api/metrics/fbAdAndCampaign/${brandId}`,
            { startDate, endDate, userId },
            { withCredentials: true }
          );
          fbData = fbAdResponse.data.data;
          console.log("fbdata", fbData);
          setFbAdAccountsMetrics(fbData);
        } catch (fbError) {
          console.error('Error fetching Facebook ad data:', fbError);
        }
      }

      if (dataSource === 'all' || dataSource === 'google') {
        try {
          const googleAdResponse = await axios.post(
            `${baseURL}/api/metrics/googleAdAndCampaign/${brandId}`,
            { startDate, endDate, userId },
            { withCredentials: true }
          );
          googleData = googleAdResponse.data?.data || [];
          console.log(googleData);
          setGoogleAdMetrics(googleData);
        } catch (googleError) {
          console.error('Error fetching Google ad data:', googleError);
        }
      }

      calculateAggregatedMetrics(
        dataSource === 'google' ? [] : fbData,
        dataSource === 'facebook' ? undefined : googleData
      );
   
    } catch (error) {
      console.error('Error fetching ad data:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, date, dataSource, brandId, userId]);



  useEffect(() => {
    fetchAdData();
  }, [fetchAdData]);



  useEffect(() => {
    fetchAdData();

    const intervalId = setInterval(fetchAdData, 5 * 60 * 1000);


    return () => clearInterval(intervalId);
  }, [fetchAdData]);

  
  const calculateAggregatedMetrics = useCallback((fbData: AdAccountData[], googleData: GoogleAdAccountData | undefined) => {
    let totalSpent = 0;
    let totalRevenue = 0;
    let totalPurchases = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
  
    if (fbData?.length) {
      fbData.forEach(account => {
        totalSpent += parseFloat(account.spend || '0');
        totalRevenue += parseFloat(account.Revenue?.value || '0');
        totalPurchases += parseFloat(account.purchases?.value || '0');
        totalClicks += parseFloat(account.clicks || '0');
        totalImpressions += parseFloat(account.impressions || '0');
      });
    }
  
    if (googleData?.adMetrics) {
      totalSpent += parseFloat(googleData.adMetrics.totalSpend || '0');
      totalRevenue += parseFloat(googleData.adMetrics.totalConversionsValue || '0');
      totalPurchases += parseFloat(googleData.adMetrics.totalConversions || '0');
      totalClicks += parseFloat(googleData.adMetrics.totalClicks || '0');
      totalImpressions += parseFloat(googleData.adMetrics.totalImpressions || '0');
    }
    
  
    setRawMetrics({
      totalSpent,
      totalRevenue,
      totalROAS: totalRevenue / totalSpent || 0,
      totalPurchases,
      totalCTR: (totalClicks / totalImpressions) * 100 || 0,
      totalCPC: totalSpent / totalClicks || 0,
      totalCPM: (totalSpent * 1000) / totalImpressions || 0,
      totalCPP: totalPurchases > 0 ? (totalSpent / totalPurchases) : 0 ,
    });
  }, []);


  const formattedMetrics = useMemo(() => {
    return {
      totalSpent: `₹ ${rawMetrics.totalSpent.toLocaleString(locale)}`,
      totalRevenue: `₹ ${rawMetrics.totalRevenue.toLocaleString(locale)}`,
      totalROAS: Number((rawMetrics.totalROAS).toFixed(2)).toLocaleString(locale),
      totalPurchases: rawMetrics.totalPurchases.toLocaleString(locale),
      totalCTR: `${Number((rawMetrics.totalCTR).toFixed(2)).toLocaleString(locale)} %`,
      totalCPC: Number((rawMetrics.totalCPC).toFixed(2)).toLocaleString(locale),
      totalCPM: Number((rawMetrics.totalCPM).toFixed(2)).toLocaleString(locale),
      totalCPP: Number((rawMetrics.totalCPP).toFixed(2)).toLocaleString(locale),
    };
  }, [rawMetrics, locale]);
    

// Use formattedMetrics for rendering
const metrics = [
  {
    label: 'Amount Spent',
    value: formattedMetrics.totalSpent,
    tooltipContent: 'The sum of ad spends for all advertising platforms',
  },
  {
    label: 'Revenue',
    value: formattedMetrics.totalRevenue,
    tooltipContent: 'Revenue from Ads Purchases',
  },
  {
    label: 'ROAS (Ads only)',
    value: formattedMetrics.totalROAS,
    tooltipContent: 'Blended ROAS = Ads Purchases value / Blended Ad Spend',
  },
  {
    label: 'Ads Purchases',
    value: formattedMetrics.totalPurchases,
    tooltipContent: 'Ads Purchases = Fb Ads Purchase + Google Conversions',
  },
  {
    label: 'CTR',
    value: formattedMetrics.totalCTR,
    tooltipContent:
      'Average CTR from all advertising platforms = (Blended Clicks / Blended Impressions)*100',
  },
  {
    label: 'CPC',
    value: formattedMetrics.totalCPC,
    tooltipContent:
      'Average CPC from all advertising platforms = (Blended Ad Spend / Blended Clicks)',
  },
  {
    label: 'CPM',
    value: formattedMetrics.totalCPM,
    tooltipContent:
      'Average CPM from all advertising platforms = (Blended Ad Spend * 1000 / Blended Impressions)',
  },
  {
    label: 'CPP',
    value: formattedMetrics.totalCPP,
    tooltipContent:
      'Average CPP from all advertising platforms = (Blended Ad Spend / Blended Purchases)',
  },
];


  const googleMetrics = [
    {
      label: 'Total Cost',
      value: googleAdMetrics
        ? `₹ ${parseFloat(googleAdMetrics?.adMetrics?.totalSpend || '0').toLocaleString(locale)}` 
        : '₹ 0',
    },
    {
      label: 'Conversion Value',
      value: googleAdMetrics ? `₹ ${parseFloat(googleAdMetrics?.adMetrics?.totalConversionsValue).toLocaleString(locale)}` : ' 0',
    },
    {
      label: 'ROAS',
      value: googleAdMetrics ? parseFloat(googleAdMetrics?.adMetrics?.roas).toLocaleString(locale) : '0.00',
    },
    {
      label: 'Conversions',
      value: googleAdMetrics ? parseFloat(googleAdMetrics?.adMetrics?.totalConversions).toLocaleString(locale) : '0',
    },
    {
      label: 'CPC',
      value: googleAdMetrics ? `₹ ${parseFloat(googleAdMetrics?.adMetrics?.totalCPC).toLocaleString(locale)}` : ' 0',
    },
    {
      label: 'CPM',
      value: googleAdMetrics ? `₹ ${parseFloat(googleAdMetrics?.adMetrics?.totalCPM).toLocaleString(locale)}` : ' 0',
    },
    {
      label: 'CTR',
      value: googleAdMetrics ? `${parseFloat(googleAdMetrics?.adMetrics?.totalCTR).toLocaleString(locale)} %` : ' 0',
    },
    {
      label: 'Cost Per Conversion',
      value: googleAdMetrics ? `₹ ${parseFloat(googleAdMetrics?.adMetrics?.totalCostPerConversion).toLocaleString(locale)}` : ' 0',
    },
  ]


  return (
    <div className="min-h-screen bg-gray-100">
        <Header
      title="AdMetrics Dashboard"
      Icon={LineChart}
      showDatePicker={true}
      showSettings={true}
      showRefresh={true}
      isLoading={false}
      handleManualRefresh={() => {
        fetchAdData();
      }} 
      locale={locale}
      setLocale={setLocale}/>

      <div className="bg-white px-6 sticky top-0 z-10">
        <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleDataSourceChange} />
      </div>


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
              
          

            </h2>
            <AdAccountMetricsCard 
              metrics={metrics} 
              date={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} 
              isLoading={isLoading} 
              icon={dataSource === 'all' ? '' : dataSource === 'facebook' ? 'Facebook' : 'Google'} 
            />
          </section>
        </div>


        {(dataSource === 'all' || dataSource === 'facebook') && fbAdAccountsMetrics?.length > 0 && fbAdAccountsMetrics.map((accountMetrics, index) => {
          const fbmetrics = [
            { label: 'Amount Spent', value: `₹ ${parseFloat(accountMetrics.spend || '0').toLocaleString(locale)}` },
            {
              label: 'Revenue',
              value: `₹ ${parseFloat(accountMetrics.Revenue?.value || '0').toLocaleString(locale)}`
            },
            {
              label: 'ROAS (Ads only)',
              value: accountMetrics.purchase_roas && accountMetrics.purchase_roas.length > 0
                ? parseFloat(accountMetrics.purchase_roas[0].value).toFixed(2)
                : '0'
            },
            { label: 'Ads Purchases', value: accountMetrics.purchases?.value || '0' },
            { label: 'CPC (All clicks)', value: `₹ ${new Intl.NumberFormat(locale).format(parseFloat(accountMetrics.cpc || '0'))}` },
            { label: 'CPM', value: `₹ ${new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(parseFloat(accountMetrics.cpm || '0'))}` },
            { label: 'CTR', value: `${parseFloat(accountMetrics.ctr || '0').toFixed(2)} %` },
            { label: 'Cost per Purchase (All)', value: `₹ ${new Intl.NumberFormat(locale).format(parseFloat(accountMetrics.cpp || '0'))}` },
          ];

          return (
            <>
              <AdAccountMetricsCard
                key={index}
                icon="Facebook"
                title={`Facebook - ${accountMetrics.account_name}`}
                metrics={fbmetrics}  // Pass fbmetrics for the current account
                date={{ 
                  from: date.from ? new Date(date.from) : undefined,
                  to: date.to ? new Date(date.to) : undefined 
                }}
                isLoading={isLoading}
                errorMessage={accountMetrics.message}
              />
              <CampaignGrid 
                campaigns={accountMetrics.campaigns || []} 
                isLoading={isLoading} 
                icon="Facebook" 
              />
            </>
          );
        })}

        {
          (dataSource === 'all' || dataSource === 'google') && (
            googleAdMetrics && Object.keys(googleAdMetrics).length > 0 ? (
              <>
                <AdAccountMetricsCard
                  icon="Google"
                  title={`Google Ads - ${googleAdMetrics?.adAccountName}`}
                  metrics={googleMetrics}
                  date={{ 
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined 
                  }}
                  isLoading={isLoading}
                />
                <CampaignGrid campaigns={googleAdMetrics.campaignData || []} isLoading={isLoading} icon="Google" />
              </>
            ) : (
              <section>
                <div className='flex flex-row gap-2 items-center'>
                  <h3 className="text-lg font-semibold">Google Ad Metrics</h3>
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M13.5437 4.24116L13.5441 4.24138C13.904 4.43971 14.2179 4.70303 14.4689 5.01529C14.7198 5.3275 14.903 5.68264 15.009 6.0601L15.4904 5.92486L15.009 6.0601C15.115 6.43752 15.1422 6.83078 15.0891 7.21776C15.0361 7.60457 14.9038 7.97861 14.6989 8.31855C14.6988 8.31873 14.6987 8.31891 14.6986 8.3191L8.41444 18.701C7.9918 19.3741 7.30557 19.868 6.49825 20.0687C5.68937 20.2699 4.83087 20.1586 4.10949 19.7614C3.38872 19.3646 2.86649 18.7168 2.64727 17.9633C2.42868 17.212 2.5264 16.4083 2.92214 15.7226L9.20689 5.33823C9.20695 5.33813 9.20702 5.33802 9.20708 5.33792C9.62451 4.65082 10.3142 4.14383 11.1301 3.93599C11.9464 3.72804 12.8151 3.83872 13.5437 4.24116Z" fill="#FFB70A" stroke="#FFB70A"></path>
                    <path d="M21.5404 15.4544L15.24 5.04127C14.7453 4.25097 13.9459 3.67817 13.0138 3.44633C12.0817 3.21448 11.0917 3.34215 10.2572 3.80182C9.4226 4.26149 8.8103 5.01636 8.55224 5.90372C8.29418 6.79108 8.41102 7.73988 8.87757 8.54562L15.178 18.9587C15.6726 19.749 16.4721 20.3218 17.4042 20.5537C18.3362 20.7855 19.3262 20.6579 20.1608 20.1982C20.9953 19.7385 21.6076 18.9836 21.8657 18.0963C22.1238 17.2089 22.0069 16.2601 21.5404 15.4544Z" fill="#3B8AD8"></path>
                    <path d="M9.23018 16.2447C9.07335 15.6884 8.77505 15.1775 8.36166 14.7572C7.94827 14.3369 7.43255 14.0202 6.86011 13.835C6.28768 13.6499 5.67618 13.6021 5.07973 13.6958C4.48328 13.7895 3.92026 14.0219 3.44049 14.3723C2.96071 14.7227 2.57898 15.1804 2.32906 15.7049C2.07914 16.2294 1.96873 16.8045 2.00762 17.3794C2.0465 17.9542 2.23347 18.5111 2.55199 19.0007C2.8705 19.4902 3.31074 19.8975 3.83376 20.1863C4.46363 20.5354 5.1882 20.6983 5.91542 20.6542C6.64264 20.6101 7.33969 20.361 7.91802 19.9386C8.49636 19.5162 8.92988 18.9395 9.16351 18.2817C9.39715 17.624 9.42035 16.915 9.23018 16.2447Z" fill="#2CAA14"></path>
                  </svg>
                </div>

                <div className="text-center text-gray-500 mt-4 bg-white p-2">
                  No Google Ad Account for this brand.
                </div>
              </section>
            )
          )
        }
      </main>
    </div>
  )
}








