import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import MissingDateWarning from "@/components/dashboard_component/Missing-Date-Waning";
import NumberFormatSelector from "@/components/dashboard_component/NumberFormatSelector";
import { Card, CardContent } from "@/components/ui/card";
import { RootState } from "@/store";
import { Captions, LandmarkIcon, Maximize, Minimize, RefreshCw, RouteIcon } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { SideTab } from "@/components/ui/side-tab";
import BounceRateHome from "./component/BounceRateHome";
import CollectionPage from "./component/CollectionPage";
import Loader from "@/components/dashboard_component/loader";
import { useParams } from "react-router-dom";
import createAxiosInstance from "../ConversionReportPage/components/axiosInstance";
import { format } from 'date-fns';
import ProductPage from "./component/ProductPage"

export const normalizePath = (path = "", page = "") => {
    if (!path || path === "(not set)" || !page) return null;
    // Remove query params & hash
    let cleanPath = path.split("?")[0].split("#")[0];

    const pathIncludesProduct = cleanPath?.split("/")?.includes(page);

    if (!pathIncludesProduct) return null

    return cleanPath;
};


export default function BounceRatePage() {

    const [tabData, setTabData] = React.useState<any[]>([]);

    const dateFrom = useSelector((state: RootState) => state.date.from);
    const dateTo = useSelector((state: RootState) => state.date.to);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);

    const [loading, setLoading] = useState<boolean>(false);
    const { brandId } = useParams();
    const axiosInstance = createAxiosInstance();

    const handleManualRefresh = React.useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const date = useMemo(() => ({
        from: dateFrom,
        to: dateTo
    }), [dateFrom, dateTo]);

    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

    const [activeTab, setActiveTab] = useState('allPage');
    const [isFullScreen, setIsFullScreen] = useState(false);

    const handleTabDataUpdate = (data: any[], tabType?: string) => {
        if (tabType === activeTab) {
            setTabData(data);
        }
    };
    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value);

    };

    const tabs = [
        { label: 'All Page', value: 'allPage', icon: <LandmarkIcon className="w-4 h-4" /> },
        { label: 'Collection', value: 'collectionPage', icon: <RouteIcon className="w-4 h-4" /> },
        { label: 'Product', value: 'productPage', icon: <Captions className="w-4 h-4" /> }
    ];


    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.post(`/api/analytics/bounceRateReportHome/${brandId}`, {
                startDate: startDate,
                endDate: endDate
            }, { withCredentials: true });

            const fetchedData = response.data || [];
            setTabData(fetchedData?.data)
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [brandId, startDate, endDate]);

    useEffect(() => {
        if (date.from && date.to) {
            fetchData();
        }
    }, [fetchData, refreshTrigger]);


    return (
        <div className="flex h-screen bg-gray-100">
            <CollapsibleSidebar />
            <SideTab
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
            <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-0">
                {
                    (!date.from || !date.to) ? (
                        <MissingDateWarning />
                    ) :
                        (<>
                            <div className="flex-none">
                            </div>
                            <div className="flex-1 overflow-auto">
                                <div className="p-2 space-y-6">
                                    <Card id={`${activeTab}-report`} className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
                                        <CardContent className="p-3">
                                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                                                <div className="flex-grow items-center gap-3">
                                                </div>
                                                <div className="flex flex-row items-center gap-1.5 ">
                                                    <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                                                        <DatePickerWithRange
                                                            defaultDate={{
                                                                from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                                                                to: new Date()
                                                            }}
                                                        />
                                                    </div>
                                                    <NumberFormatSelector />

                                                    <Button id="refresh" onClick={handleManualRefresh} size="icon" variant="outline">
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                        
                                                    <Button id="expand-button" onClick={toggleFullScreen} size="icon" variant="outline">
                                                        {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            {
                                                loading ? (<Loader isLoading={loading} />)
                                                    : (
                                                        <div className="rounded-md overflow-hidden">
                                                            <div id={activeTab}>
                                                                {
                                                                    activeTab === "allPage" && (
                                                                        <BounceRateHome
                                                                            isFullScreen={isFullScreen}
                                                                            onDataUpdate={handleTabDataUpdate}
                                                                            tabData={tabData}
                                                                        />
                                                                    )
                                                                }
                                                                {
                                                                    activeTab === "collectionPage" && (
                                                                        <CollectionPage
                                                                            isFullScreen={isFullScreen}
                                                                            onDataUpdate={handleTabDataUpdate}
                                                                            tabData={tabData}
                                                                        />
                                                                    )
                                                                }
                                                                {
                                                                    activeTab === "productPage" && (
                                                                        <ProductPage
                                                                            isFullScreen={isFullScreen}
                                                                            onDataUpdate={handleTabDataUpdate}
                                                                            tabData={tabData}
                                                                        />
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                            }
                                        </CardContent>
                                    </Card>

                                </div>
                            </div>
                        </>
                        )
                }
            </div >
        </div >
    )
}