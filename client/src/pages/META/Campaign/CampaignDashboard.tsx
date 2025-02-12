import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from "date-fns"
import { useNavigate, useParams } from 'react-router-dom';
import axios from "axios"
import Header from '@/components/dashboard_component/Header.tsx';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/index.ts';
import CollapsibleSidebar from '@/pages/Dashboard/CollapsibleSidebar';
import { FaMeta } from 'react-icons/fa6';
import MetaCampaignTable from './MetaCampaignTable';


export interface MetaCampaign {
    [key: string]: number | string;
}

export interface AccountData {
    account_name: string;
    campaigns: MetaCampaign[];
}

export interface MetaCampaignResponse {
    success: boolean;
    data: AccountData[];
}

export default function CampaignDashboard() {
    const [isLoading, setIsLoading] = useState(false);
    const [fbCampaignMetrics, setFbCampaignMetrics] = useState<MetaCampaignResponse | null>(null);
    const [locale, setLocale] = useState<"en-IN" | "en-US">("en-IN");
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
            const baseURL = import.meta.env.PROD
                ? import.meta.env.VITE_API_URL
                : import.meta.env.VITE_LOCAL_API_URL;

            const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
            const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

            const fbAdResponse = await axios.post(
                `${baseURL}/api/metrics/fbCampaign/${brandId}`,
                { startDate, endDate, userId },
                { withCredentials: true }
            );

            setFbCampaignMetrics(fbAdResponse.data);
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

        const intervalId = setInterval(fetchAdData, 15 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [fetchAdData]);

    let height = '';
    if (fbCampaignMetrics?.data && fbCampaignMetrics.data.length > 1) {
        height = 'max-h-[calc(100vh-400px)]';
    } else {
        height = 'max-h-[calc(100vh-210px)]'
    }

    return (
        <div className="flex h-screen">
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-auto">
                <div className="min-h-screen bg-gray-100">
                    <Header
                        title="Campaign Report"
                        Icon={FaMeta}
                        showDatePicker={true}
                        showSettings={true}
                        showRefresh={true}
                        isLoading={isLoading}
                        handleManualRefresh={fetchAdData}
                        locale={locale}
                        setLocale={setLocale}
                    />

                    <main className="p-4 md:p-6 lg:px-8">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                            </div>
                        ) : fbCampaignMetrics?.data && fbCampaignMetrics.data.length > 0 ? (
                            fbCampaignMetrics.data.map((account, index) => (
                                <div key={index} className="mb-6">
                                    <MetaCampaignTable data={account} height={height} />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No campaign data available
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}