import Header from "@/components/dashboard_component/Header";
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar";
import { FaMeta } from "react-icons/fa6";
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
        const intervalId = setInterval(fetchData, 3 * 60 * 60 * 1000); // 3 hours
        return () => clearInterval(intervalId);
    }, [fetchData]);

    useEffect(() => {
        console.log("meta campaign", metaCampaign)
    }, [])

    const blendedSummary = metaCampaign?.blendedSummary
    const accountData = metaCampaign?.accountData

    let height = '';
    if (metaCampaign?.blendedSummary && metaCampaign?.blendedSummary.length > 1) {
        height = 'max-h-[calc(100vh-400px)]';
    } else {
        height = 'max-h-[calc(100vh-210px)]'
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-hidden flex flex-col">
                {(!date.from || !date.to) ? <MissingDateWarning /> :(   (isLoading) ? <Loader isLoading={isLoading}/>  : 
                    <>     
                    <div className="flex-none">
                    <Header title='Meta Campaign Trends' Icon={FaMeta} showDatePicker={true} />
                </div>
                <main className="p-4 md:p-6 lg:px-8 overflow-auto">
                <div className="grid grid-cols-1 gap-6">
                    {(blendedSummary && blendedSummary.length > 0) && (
                        <MetaCampaignTable
                            data={{
                                account_name: "Blended Summary",
                                account_id: "blended_summary",
                                campaigns: blendedSummary.map(campaign => ({
                                    ...campaign,
                                    Campaign: campaign.campaignName
                                }))
                            }}
                            height={height}
                            type="blended-summary"
                        />
                    )}
                    {(accountData && accountData.map(account => (
                        <MetaCampaignTable
                            key={account.account_id}
                            data={{
                                account_name: account.account_name,
                                account_id: account.account_id,
                                campaigns: account.campaigns.map(campaign => ({
                                    ...campaign,
                                    Campaign: campaign.campaignName
                                }))
                            }}
                            height={height}
                        />
                    )))}
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

