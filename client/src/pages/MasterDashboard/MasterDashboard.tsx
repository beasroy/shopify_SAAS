import React from "react";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import MissingDateWarning from "@/components/dashboard_component/Missing-Date-Waning";
import { useState, useEffect } from "react";
import { RootState } from "@/store";
import { useSelector } from "react-redux";
import { useTokenError } from "@/context/TokenErrorContext";
import NoAccessPage from "@/components/dashboard_component/NoAccessPage.";
import { ChartBar, Maximize, Minimize, RefreshCw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NumberFormatSelector from "@/components/dashboard_component/NumberFormatSelector";
import MasterTable from "./compoents/MasterTable";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { format } from "date-fns";
import axios from "axios";
import { baseURL } from "@/data/constant";
import Loader from "@/components/dashboard_component/loader";


export interface BrandMetrics {
    brandId: string;
    brandName: string;

    totalSales: String;
    refundAmount: String;
    netSales: String;

    metaSpend: String;
    metaRevenue: String;
    googleSpend: String;
    totalSpend: String;

    metaROAS: String;
    overallROAS: String;
}

export default function MasterDashboard() {
    const dataFrom = useSelector((state: RootState) => state.date.from);
    const dataTo = useSelector((state: RootState) => state.date.to);
    const date = React.useMemo(() => ({
        from: dataFrom,
        to: dataTo
    }), [dataFrom, dataTo]);
    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : ""
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : ""

    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const { tokenError } = useTokenError();
    // const selectedBrand = brands.find((brand) => brand._id === brandId);
    // const hasGA4Account = setSelectedBrandId?.ga4Account ?? false;

    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    const [brandMetrics, setBrandMetrics] = useState<BrandMetrics[]>([])

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const handleManualRefresh = React.useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                const queryParams: Record<string, string> = {}

                if (startDate) queryParams.startDate = startDate
                if (endDate) queryParams.endDate = endDate


                const brandMetricsResponse = await axios.get(`${baseURL}/api/masterDashboard/brand-metrics`, {
                    params: queryParams,
                    withCredentials: true,
                })
                const brandMetricsData: BrandMetrics[] = brandMetricsResponse.data.brands || []
                setBrandMetrics(brandMetricsData)
            } catch (err) {
                console.error(err)
                const message =
                    axios.isAxiosError(err) && err.response?.data?.message ? err.response.data.message : "Something went wrong"
                setError(message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [refreshTrigger, startDate, endDate])
    console.log("Error", error)

    if (tokenError) {
        return <div className="flex h-screen bg-gray-100">
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-0">
                <NoAccessPage
                    platform="Google Analytics"
                    message="We need access to your Google Analytics account to show you amazing insights about your website performance."
                    icon={<ChartBar className="w-8 h-8 text-blue-600" />}
                    loginOptions={[
                        {
                            label: "Connect Google Analytics",
                            context: "googleAnalyticsSetup",
                            provider: "google"
                        }
                    ]}
                />
            </div>
        </div>
    }

    // if (!hasGA4Account) {
    //     return <div className="flex h-screen bg-gray-100">
    //         <CollapsibleSidebar />
    //         <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-0">
    //             <ConnectPlatform
    //                 platform="google analytics"
    //                 brandId={brandId ?? ''}
    //                 onSuccess={(platform, accountName, accountId) => {
    //                     console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
    //                 }}
    //             />
    //         </div>
    //     </div>
    // }



    return (
        <div className="flex h-screen bg-gray-100">
            <CollapsibleSidebar />


            <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-0">
                {
                    (!date.from || !date.to) ? (
                        <MissingDateWarning />
                    ) : (
                        <>
                            <div className="flex-none">
                            </div>
                            <div className="flex-1 overflow-auto">
                                <div className="p-2 space-y-6">
                                    <Card className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
                                        <CardContent className="p-3">
                                            <div className="flex flex-col md:flex-row justify-end items-center gap-4 mb-4">

                                                <div className="flex flex-row items-center gap-1.5">
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
                                            <div className="rounded-md overflow-hidden">
                                                {
                                                    loading ? <Loader isLoading={loading} /> : (
                                                        <MasterTable
                                                            brands={brandMetrics}
                                                            primaryColumn="Brand Name"
                                                            initialPageSize="50"
                                                        />
                                                    )
                                                }

                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </>
                    )
                }
            </div>
        </div>
    )
}