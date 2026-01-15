
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import { useEffect, useCallback, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { format } from "date-fns";
import { ICampaignData } from "@/interfaces";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Loader from "@/components/dashboard_component/loader";
import MetaCampaignTable from "./components/MetaCampaignTable";
import MissingDateWarning from "@/components/dashboard_component/Missing-Date-Waning";
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal";
import ConnectPlatform from "@/pages/ReportPage/ConnectPlatformPage";
import NoAccessPage from "@/components/dashboard_component/NoAccessPage.";
import { selectFbTokenError } from "@/store/slices/TokenSllice";
import { Target } from "lucide-react";


function CampaignPage() {

    const [isLoading, setIsLoading] = useState(false);
    const [metaCampaign, setMetaCampaign] = useState<ICampaignData>();
    const dateFrom = useSelector((state: RootState) => state.date.from);
    const dateTo = useSelector((state: RootState) => state.date.to);
    const date = useMemo(() => ({
        from: dateFrom,
        to: dateTo
    }), [dateFrom, dateTo]);

    const axiosInstance = createAxiosInstance();
    const { brandId } = useParams();
    const brands = useSelector((state: RootState) => state.brand.brands);
    const selectedBrand = brands.find((brand) => brand._id === brandId);
    const hasFbAdAccount = (selectedBrand?.fbAdAccounts && selectedBrand?.fbAdAccounts.length > 0)
        ? true
        : false;
    const fbTokenError = useSelector(selectFbTokenError);

    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
            const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";
            try {
                const response = await axiosInstance.post(
                    `/api/meta/campaign/${brandId}`,
                    { startDate, endDate, },
                    { withCredentials: true }
                );
                const data = response.data;

                setMetaCampaign(data);
            } catch (error) {
                console.error('Error fetching Facebook ad data:', error);
            }
        } catch (error) {
            console.error('Error fetching ad data:', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                alert('Your session has expired. Please log in again.');
                navigate('/');
            }
        } finally {
            setIsLoading(false);
        }
    }, [navigate, date, brandId]);



    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 6 * 60 * 60 * 1000); // 6 hours
        return () => clearInterval(intervalId);
    }, [fetchData]);



    const accountData = metaCampaign?.accountData

   
    return (
        <div className="flex h-screen bg-gray-100">
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-auto">
                {fbTokenError ? (
                    <NoAccessPage
                        platform="Facebook Ads"
                        message="Looks like we need to refresh your Facebook Ads connection to optimize your campaigns."
                        icon={<Target className="w-8 h-8 text-red-500" />}
                        loginOptions={[
                            {
                                label: "Connect Facebook Ads",
                                provider: "facebook"
                            }
                        ]}
                    />
                ) : !hasFbAdAccount ? (
                    <>
                        <ConnectPlatform
                            platform="facebook"
                            brandId={brandId ?? ''}
                            onSuccess={(platform, accountName, accountId) => {
                                console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
                            }}
                        />
                    </>) : (!date.from || !date.to) ? <MissingDateWarning /> : ((isLoading) ? <Loader isLoading={isLoading} /> :
                        <>
                        
                            <main className="p-3 overflow-auto">
                                <div className="grid grid-cols-1 gap-6">
                                    {accountData && (
                                        <MetaCampaignTable
                                            data={accountData.map(account => ({
                                                account_name: account.account_name,
                                                account_id: account.account_id,
                                                campaigns: account.campaigns.map(campaign => ({
                                                    ...campaign,
                                                    Campaign: campaign.campaignName
                                                }))
                                            }))}
                                          
                                            blendedSummary={metaCampaign?.blendedSummary?.map(campaign => ({
                                                ...campaign,
                                                Campaign: campaign.campaignName
                                            }))}
                                        />
                                    )}
                                </div>
                            </main>


                        </>
                    )}
                <HelpDeskModal />
            </div>
        </div>
    )
}
export default CampaignPage;

