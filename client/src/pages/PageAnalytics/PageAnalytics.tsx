import React from "react";
import { useTokenError } from "@/context/TokenErrorContext";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { RootState } from "@/store/index.ts";
import { ChartBar, Maximize, Minimize, RefreshCw } from "lucide-react";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import NoAccessPage from "@/components/dashboard_component/NoAccessPage.";
import ConnectPlatform from '../ReportPage/ConnectPlatformPage';

import MissingDateWarning from "@/components/dashboard_component/Missing-Date-Waning";
import { Card, CardContent } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { Button } from "@/components/ui/button";
import PagePathConversion from "./components/PagePathConversion";


const PageAnalytics: React.FC = () => {
    const dataFrom = useSelector((state: RootState) => state.date.from);
    const dataTo = useSelector((state: RootState) => state.date.to);
    const date = React.useMemo(() => ({
        from: dataFrom,
        to: dataTo
    }), [dataFrom, dataTo]);

    const { brandId } = useParams();
    const brands = useSelector((state: RootState) => state.brand.brands);
    const selectedBrand = brands.find((brand) => brand._id === brandId);
    const hasGA4Account = selectedBrand?.ga4Account ?? false;
    const { tokenError } = useTokenError();

    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const [pagePathFilter, setPagePathFilter] = React.useState<'all' | 'collection' | 'product'>('all');


    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const handleManualRefresh = React.useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);


  
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

    if (!hasGA4Account) {
        return <div className="flex h-screen bg-gray-100">
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-0">
                <ConnectPlatform
                    platform="google analytics"
                    brandId={brandId ?? ''}
                    onSuccess={(platform, accountName, accountId) => {
                        console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
                    }}
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
                            {/* Header */}
                            <div className="flex-none">
                            </div>
                            <div className="flex-1 overflow-auto">
                                <div className="p-2 space-y-6">
                                    <Card id={`pagePath-report`} className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
                                        <CardContent className="p-3">
                                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                                                {/* Filter tabs for Page Path and Page Title */}
                                                <div className="flex gap-2">
                                               
                                                            <Button
                                                                variant={pagePathFilter === 'all' ? 'default' : 'outline'}
                                                                size="sm"
                                                                onClick={() => setPagePathFilter('all')}
                                                            >
                                                                All
                                                            </Button>
                                                            <Button
                                                                variant={pagePathFilter === 'collection' ? 'default' : 'outline'}
                                                                size="sm"
                                                                onClick={() => setPagePathFilter('collection')}
                                                            >
                                                                Collection
                                                            </Button>
                                                            <Button
                                                                variant={pagePathFilter === 'product' ? 'default' : 'outline'}
                                                                size="sm"
                                                                onClick={() => setPagePathFilter('product')}
                                                            >
                                                                Product
                                                            </Button>
                                                        
                                                    

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
                                                    <Button id="refresh" onClick={handleManualRefresh} size="icon" variant="outline">
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                    <Button id="expand-button" onClick={toggleFullScreen} size="icon" variant="outline">
                                                        {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="rounded-md overflow-hidden">
                                                <PagePathConversion
                                                    isFullScreen={isFullScreen}
                                                    pagePathFilter={pagePathFilter}
                                                    refreshTrigger={refreshTrigger}
                                                />
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

export default PageAnalytics;