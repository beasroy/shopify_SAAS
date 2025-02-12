import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from "date-fns"
import { Blend} from "lucide-react"
import { useNavigate, useParams } from 'react-router-dom';
import axios from "axios"
import AdAccountMetricsCard from '@/pages/AnalyticsDashboard/AdAccountsMetricsCard';
import { AdAccountData } from '@/pages/Dashboard/interfaces.ts'
import Header from '@/components/dashboard_component/Header.tsx';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/index.ts';
import CollapsibleSidebar from '@/pages/Dashboard/CollapsibleSidebar';
import { FaMeta } from 'react-icons/fa6';



export default function MetaDashboard() {
    const [isLoading, setIsLoading] = useState(false);
    const [fbAdAccountsMetrics, setFbAdAccountsMetrics] = useState<AdAccountData[]>([]);
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
    const dateFrom = useSelector((state: RootState) => state.date.from);
    const dateTo = useSelector((state: RootState) => state.date.to);
    const date = useMemo(() => ({
        from: dateFrom,
        to: dateTo
    }), [dateFrom, dateTo]);


    const user = useSelector((state: RootState) => state.user.user);

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
            const fbAdResponse = await axios.post(
                `${baseURL}/api/metrics/fbAd/${brandId}`,
                { startDate, endDate, userId },
                { withCredentials: true }
            );
            const fbData = fbAdResponse.data.data;
            setFbAdAccountsMetrics(fbData);
            calculateAggregatedMetrics(fbData);

        } catch (error) {
            console.error('Error fetching ad data:', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                alert('Your session has expired. Please log in again.');
                navigate('/');
            }
        } finally {
            setIsLoading(false);
        }
    }, [navigate, date, brandId, userId]);



    useEffect(() => {
        fetchAdData();
    }, [fetchAdData]);



    useEffect(() => {
        fetchAdData();

        const intervalId = setInterval(fetchAdData, 5 * 60 * 1000);


        return () => clearInterval(intervalId);
    }, [fetchAdData]);


    const calculateAggregatedMetrics = useCallback((fbData: AdAccountData[]) => {
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

        setRawMetrics({
            totalSpent,
            totalRevenue,
            totalROAS: totalRevenue / totalSpent || 0,
            totalPurchases,
            totalCTR: (totalClicks / totalImpressions) * 100 || 0,
            totalCPC: totalSpent / totalClicks || 0,
            totalCPM: (totalSpent * 1000) / totalImpressions || 0,
            totalCPP: totalPurchases > 0 ? (totalSpent / totalPurchases) : 0,
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



    return (
        <div className="flex h-screen"> 
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-auto">
                <div className="min-h-screen bg-gray-100">
                    <Header
                        title="Adaccount summary"
                        Icon={FaMeta}
                        showDatePicker={true}
                        showSettings={true}
                        showRefresh={true}
                        isLoading={false}
                        handleManualRefresh={() => {
                            fetchAdData();
                        }}
                        locale={locale}
                        setLocale={setLocale} />


                    {/* Main content */}
                    <main className="p-4 md:p-6 lg:px-8">
                        <div className="space-y-2">
                            {/* Blended summary */}
                            <section>
                                <h2 className="text-xl font-semibold flex flex-row items-center justify-between">
                                    <div className='flex flex-row items-center space-x-2'>
                                        <Blend className="h-5 w-5" />
                                        <span>Blended summary</span>

                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                        </svg>

                                    </div>



                                </h2>
                                <AdAccountMetricsCard
                                    metrics={metrics}
                                    date={{
                                        from: date.from ? new Date(date.from) : undefined,
                                        to: date.to ? new Date(date.to) : undefined
                                    }}
                                    isLoading={isLoading}
                                    icon={'Facebook'}
                                />
                            </section>
                        </div>


                        {fbAdAccountsMetrics?.length > 0 && fbAdAccountsMetrics.map((accountMetrics, index) => {
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
                                </>
                            );
                        })}
                    </main>
                </div>
            </div>
        </div>
    )
}








