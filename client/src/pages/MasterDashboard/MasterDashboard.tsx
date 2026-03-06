import React, { useCallback } from "react";
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

import axios from "axios";
import { baseURL } from "@/data/constant";
import Loader from "@/components/dashboard_component/loader";
import ColumnManagementSheet from "../AnalyticsDashboard/Components/ColumnManagementSheet";

const brandsList = [
    "68ca95ad548d518de4fca1af",
    "68cc2437e78884ea57ff5385",
    "68d3ca10e78884ea57ff6485",
    "68dd21f5e78884ea57ff762f",
    "6941510e2deb1bce03ca02a2",
    "695b86742d2fb7ad98fb57db",
    "695e30a0ff8894bc66d801c5",
    "6996c6db049176b75d224988",
]


export interface BrandMetrics {
    brandId: string;
    brandName: string;

    // Facebook / Meta Metrics
    fbTotalCPC: number | string;
    fbTotalCPP: number | string;
    fbTotalCTR: number | string;
    metaROAS: number | string;
    metaRevenue: number | string;
    metaSpend: number | string;

    // Google Metrics (Note: These appear as strings in your data)
    googleSpend: number | string;
    googleTotalCPC: string | number;
    googleTotalCPP: string | number;
    googleTotalCTR: string | number;

    // Aggregate Financial Metrics
    netSales: number | string;
    overallROAS: number | string;
    refundAmount: number | string;
    totalSales: number | string;
    totalSpend: number | string;

    // Funnel Metrics
    atc: number | string;
    atcRate: number | string;
    checkouts: number | string;
    checkoutRate: number | string;
    purchases: number | string;
    purchaseRate: number | string;
    metaSalesTrend: "up" | "down" | "neutral";
    metaSalesChange: number | string;
}


type ColumnConfig = {
    key: keyof BrandMetrics
    header: string
    width: number
    minWidth?: number
    align?: "left" | "right" | "center"
}

const columnConfig: ColumnConfig[] = [
    { key: "brandName", header: "Brand Name", width: 400, minWidth: 450, align: "left" },
    { key: "totalSales", header: "Total Sales", width: 140, minWidth: 130, align: "right" },
    { key: "refundAmount", header: "Refund Amount", width: 140, minWidth: 130, align: "right" },
    { key: "metaSpend", header: "Meta Spend", width: 140, minWidth: 130, align: "right" },
    { key: "metaRevenue", header: "Meta Revenue", width: 140, minWidth: 130, align: "right" },
    { key: "metaROAS", header: "Meta ROAS", width: 140, minWidth: 130, align: "right" },
    { key: "fbTotalCPC", header: "Facebook CPC", width: 140, minWidth: 130, align: "right" },
    { key: "fbTotalCPP", header: "Facebook CPP", width: 140, minWidth: 130, align: "right" },
    { key: "fbTotalCTR", header: "Facebook CTR", width: 140, minWidth: 130, align: "right" },
    { key: "googleSpend", header: "Google Spend", width: 140, minWidth: 130, align: "right" },
    { key: "googleTotalCPC", header: "Google CPC", width: 140, minWidth: 130, align: "right" },
    { key: "googleTotalCPP", header: "Google CPP", width: 140, minWidth: 130, align: "right" },
    { key: "googleTotalCTR", header: "Google CTR", width: 140, minWidth: 130, align: "right" },
    { key: "totalSpend", header: "Total Spend", width: 140, minWidth: 130, align: "right" },
    { key: "overallROAS", header: "Overall ROAS", width: 140, minWidth: 130, align: "right" },
    { key: "atc", header: "ATC", width: 140, minWidth: 130, align: "right" },
    { key: "atcRate", header: "ATC Rate", width: 140, minWidth: 130, align: "right" },
    { key: "checkouts", header: "Checkouts", width: 140, minWidth: 130, align: "right" },
    { key: "checkoutRate", header: "Checkout Rate", width: 140, minWidth: 130, align: "right" },
    { key: "purchases", header: "Purchases", width: 140, minWidth: 130, align: "right" },
    { key: "purchaseRate", header: "Purchase Rate", width: 140, minWidth: 130, align: "right" },
]

export type RevenueTrend = "up" | "down" | "neutral";
export interface RevenueMetrics {
    revenue: {
        current: number;
        previous: number;
        change: number | null; // null if previous = 0
        trend: RevenueTrend;
    }
}

export default function MasterDashboard() {
    const dataFrom = useSelector((state: RootState) => state.date.from);
    const dataTo = useSelector((state: RootState) => state.date.to);
    const date = React.useMemo(() => ({
        from: dataFrom,
        to: dataTo
    }), [dataFrom, dataTo]);


    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const { tokenError } = useTokenError();


    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [dateRangeFilter, setDateRangeFilter] = useState<string>('yesterday')
    console.log("error---->", error)
    const [brandMetrics, setBrandMetrics] = useState<BrandMetrics[]>([])

    const [fbAdData, setFbAdData] = useState<any[]>([])
    const [googleAdData, setGoogleAdData] = useState<any[]>([])
    const [brandMetricsData, setBrandMetricsData] = useState<BrandMetrics[]>([])
    const [funnelMetrics, setFunnelMetrics] = useState<any[]>([])
    const [metaSalesSummary, setMetaSalesSummary] = useState<{ [key: string]: RevenueMetrics }>({})

    const allColumnKeys = columnConfig.map(col => col.key as string)

    const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys)
    const [columnOrder, setColumnOrder] = useState<string[]>(allColumnKeys)

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const handleManualRefresh = React.useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams: Record<string, string> = {};
            if (dateRangeFilter) queryParams.dateRangeFilter = dateRangeFilter;

            const [fbRes, googleRes, brandRes, funnelRes, metaSalesSummaryRes] = await Promise.all([
                axios.get(`${baseURL}/api/masterDashboard/fb-ad-data`, {
                    params: queryParams,
                    withCredentials: true,
                }),
                axios.get(`${baseURL}/api/masterDashboard/google-ad-data`, {
                    params: queryParams,
                    withCredentials: true,
                }),
                axios.get(`${baseURL}/api/masterDashboard/brand-metrics`, {
                    params: queryParams,
                    withCredentials: true,
                }),
                axios.get(`${baseURL}/api/masterDashboard/brand-funnel-metrics`, {
                    params: queryParams,
                    withCredentials: true,
                }),
                axios.get(`${baseURL}/api/masterDashboard/meta-sales-summary`, {
                    params: queryParams,
                    withCredentials: true,
                }),
            ]);

            const fbAdData = fbRes.data.results || [];
            const googleAdData = googleRes.data.brands || [];
            const brandMetricsData: BrandMetrics[] = brandRes.data.brands || [];
            const funnelMetricsData = funnelRes.data.brands || [];
            const metaSalesSummaryData = metaSalesSummaryRes.data.salesSummary || [];

            // set your states here
            setFbAdData(fbAdData)
            setGoogleAdData(googleAdData)
            setBrandMetricsData(brandMetricsData)
            setFunnelMetrics(funnelMetricsData)
            setMetaSalesSummary(metaSalesSummaryData)

            // setBrandMetrics(brandMetricsData)
        } catch (err) {
            console.error(err);

            const message =
                axios.isAxiosError(err) && err.response?.data?.message
                    ? err.response.data.message
                    : "Something went wrong";

            setError(message);
        } finally {
            setLoading(false);
        }
    }, [dateRangeFilter]);

    useEffect(() => {
        fetchDashboardData();
    }, [dateRangeFilter, refreshTrigger]);


    useEffect(() => {
        if (loading) return;
        const data: BrandMetrics[] = brandsList.reduce((acc: BrandMetrics[], brandId: string) => {
            const fbDataItem = fbAdData.find((item: any) => item.brandId === brandId);

            const aggregatedMetrics = fbDataItem?.aggregatedMetrics;
            const googleDataItem = googleAdData?.find((item: any) => item.brandId === brandId);

            const brandMetricsItem = brandMetricsData.find((item: any) => item.brandId === brandId);
            const funnelMetricsItem = funnelMetrics.find((item: any) => item.brandId === brandId);
            const metaSalesSummaryItem = metaSalesSummary[brandId]?.revenue;
            
            acc.push({
                brandId: brandId,
                brandName: brandMetricsItem?.brandName ?? '',
                fbTotalCTR: aggregatedMetrics?.fbTotalCTR ?? 0,
                fbTotalCPC: aggregatedMetrics?.fbTotalCPC ?? 0,
                fbTotalCPP: aggregatedMetrics?.fbTotalCPP ?? 0,
                metaROAS: brandMetricsItem?.metaROAS ?? 0,
                metaRevenue: brandMetricsItem?.metaRevenue ?? 0,
                metaSpend: brandMetricsItem?.metaSpend ?? 0,
                googleSpend: brandMetricsItem?.googleSpend ?? 0,
                googleTotalCTR: googleDataItem?.aggregatedMetrics?.googleTotalCTR ?? 0,
                googleTotalCPC: googleDataItem?.aggregatedMetrics?.googleTotalCPC ?? 0,
                googleTotalCPP: googleDataItem?.aggregatedMetrics?.googleTotalCPP ?? 0,
                netSales: brandMetricsItem?.netSales ?? 0,
                overallROAS: brandMetricsItem?.overallROAS ?? 0,
                refundAmount: brandMetricsItem?.refundAmount ?? 0,
                totalSales: brandMetricsItem?.totalSales ?? 0,
                totalSpend: brandMetricsItem?.totalSpend ?? 0,
                atc: funnelMetricsItem?.metrics?.atc ?? 0,
                atcRate: funnelMetricsItem?.metrics?.atcRate ?? 0,
                checkouts: funnelMetricsItem?.metrics?.checkouts ?? 0,
                checkoutRate: funnelMetricsItem?.metrics?.checkoutRate ?? 0,
                purchases: funnelMetricsItem?.metrics?.purchases ?? 0,
                purchaseRate: funnelMetricsItem?.metrics?.purchaseRate ?? 0,
                metaSalesTrend: metaSalesSummaryItem?.trend ?? 'neutral',
                metaSalesChange: metaSalesSummaryItem?.change ?? 0,
            })
            return acc;

        }, [])
        setBrandMetrics(data)

    }, [fbAdData, googleAdData])



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
                                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">

                                                <div className="flex gap-2">

                                                    <Button
                                                        variant={dateRangeFilter === 'yesterday' ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setDateRangeFilter('yesterday')}
                                                    >
                                                        Yesterday
                                                    </Button>
                                                    <Button
                                                        variant={dateRangeFilter === 'last_7d' ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setDateRangeFilter('last_7d')}
                                                    >
                                                        Last 7 Days
                                                    </Button>
                                                    <Button
                                                        variant={dateRangeFilter === 'last_30d' ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setDateRangeFilter('last_30d')}
                                                    >
                                                        Last 30 Days
                                                    </Button>



                                                </div>

                                                <div className="flex flex-row items-center gap-1.5">
                                                    <NumberFormatSelector />
                                                    <Button id="refresh" onClick={handleManualRefresh} size="icon" variant="outline">
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                    <ColumnManagementSheet
                                                        visibleColumns={visibleColumns}
                                                        columnOrder={columnOrder}
                                                        availableColumns={allColumnKeys}
                                                        onVisibilityChange={setVisibleColumns}
                                                        onOrderChange={setColumnOrder}
                                                    />
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
                                                            columnConfig={columnConfig}
                                                            visibleColumns={visibleColumns}
                                                            columnOrder={columnOrder}
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