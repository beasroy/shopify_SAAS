import React, { useMemo, useState } from 'react';
import { FaMeta } from "react-icons/fa6";
import AudienceFbReport from './component/AudienceFbReport';
import PlacementFbReport from './component/PlacementFbReport';
import PlatformFbReport from './component/PlatformFbReport';
import CountryFbReport from './component/CountryFbReport';
import DeviceFbReport from './component/DeviceFbReport';
import GenderFbReport from './component/GenderFbReport';
import AgeFbReport from './component/AgeFbReport';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Header from '@/components/dashboard_component/Header';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';
import CollapsibleSidebar from '@/components/dashboard_component/CollapsibleSidebar';
import { CustomTabs } from '@/pages/ConversionReportPage/components/CustomTabs';
import MissingDateWarning from '@/components/dashboard_component/Missing-Date-Waning';
import NoAccessPage from '@/components/dashboard_component/NoAccessPage.';
import ConnectPlatform from '@/pages/ReportPage/ConnectPlatformPage';
import { selectFbTokenError } from '@/store/slices/TokenSllice';
import { useParams } from 'react-router-dom';
import { Target } from 'lucide-react';
import Footer from '@/pages/LandingPage/components/Footer';

const FbReportPage: React.FC = () => {
    const dateFrom = useSelector((state: RootState) => state.date.from);
    const dateTo = useSelector((state: RootState) => state.date.to);
    const date = useMemo(() => ({
        from: dateFrom,
        to: dateTo
    }), [dateFrom, dateTo]);
    const [activeTab, setActiveTab] = useState('age');
    const { brandId } = useParams();
    const brands = useSelector((state: RootState) => state.brand.brands);
    const selectedBrand = brands.find((brand) => brand._id === brandId);
    const hasFbAdAccount = (selectedBrand?.fbAdAccounts && selectedBrand?.fbAdAccounts.length > 0)
        ? true
        : false;
    const fbTokenError = useSelector(selectFbTokenError);

    const dateRange = {
        from: date.from ? new Date(date.from) : undefined,
        to: date.to ? new Date(date.to) : undefined
    }

    const tabs = [
        { label: 'Age', value: 'age' },
        { label: 'Gender', value: 'gender' },
        { label: 'Country', value: 'country' },
        { label: 'Platform', value: 'platform' },
        { label: 'Placement', value: 'placement' },
        { label: 'Impression Device', value: 'impressionDevice' },
        { label: 'Audience Segments', value: 'audienceSegments' }
    ];

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-auto">
                <Header
                    title='Meta Reports'
                    Icon={FaMeta}
                    showDatePicker={true}
                />

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
                    <ConnectPlatform
                        platform="facebook"
                        brandId={brandId ?? ''}
                        onSuccess={(platform, accountName, accountId) => {
                            console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
                        }}
                    />
                ) : (!date.from || !date.to) ? (
                    <MissingDateWarning />
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="bg-white px-6 sticky top-0 z-10">
                            <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-auto">
                            <div className="px-6 py-4 space-y-6">
                                {activeTab === 'audienceSegments' && (
                                    <div id="audienceSegments">
                                        <AudienceFbReport dateRange={dateRange} />
                                    </div>
                                )}
                                {activeTab === 'placement' && (
                                    <div id="placement">
                                        <PlacementFbReport dateRange={dateRange} />
                                    </div>
                                )}
                                {activeTab === 'platform' && (
                                    <div id="platform">
                                        <PlatformFbReport dateRange={dateRange} />
                                    </div>
                                )}
                                {activeTab === 'country' && (
                                    <div id="country">
                                        <CountryFbReport dateRange={dateRange} />
                                    </div>
                                )}
                                {activeTab === 'impressionDevice' && (
                                    <div id="impressionDevice">
                                        <DeviceFbReport dateRange={dateRange} />
                                    </div>
                                )}
                                {activeTab === 'gender' && (
                                    <div id="gender">
                                        <GenderFbReport dateRange={dateRange} />
                                    </div>
                                )}
                                {activeTab === 'age' && (
                                    <div id="age">
                                        <AgeFbReport dateRange={dateRange} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
                <Footer />
                <HelpDeskModal />
            </div>
        </div>
    );
};

export default FbReportPage;