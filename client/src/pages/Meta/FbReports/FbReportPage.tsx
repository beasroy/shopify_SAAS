import React, { useMemo, useState } from 'react';
import AudienceFbReport from './component/AudienceFbReport';
import PlacementFbReport from './component/PlacementFbReport';
import PlatformFbReport from './component/PlatformFbReport';
import CountryFbReport from './component/CountryFbReport';
import DeviceFbReport from './component/DeviceFbReport';
import GenderFbReport from './component/GenderFbReport';
import AgeFbReport from './component/AgeFbReport';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';
import CollapsibleSidebar from '@/components/dashboard_component/CollapsibleSidebar';
import MissingDateWarning from '@/components/dashboard_component/Missing-Date-Waning';
import NoAccessPage from '@/components/dashboard_component/NoAccessPage.';
import ConnectPlatform from '@/pages/ReportPage/ConnectPlatformPage';
import { selectFbTokenError } from '@/store/slices/TokenSllice';
import { useParams } from 'react-router-dom';
import { Computer, MapPin, Monitor, Smartphone, SquareUser, Target, User, Users } from 'lucide-react';
import { SideTab } from '@/components/ui/side-tab';

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
        { label: 'Age', value: 'age', icon: <SquareUser className="w-4 h-4" /> },
        { label: 'Gender', value: 'gender', icon: <User className="w-4 h-4" /> },
        { label: 'Country', value: 'country' , icon: < MapPin className="w-4 h-4" /> },
        { label: 'Platform', value: 'platform' , icon: <Computer className="w-4 h-4" /> },
        { label: 'Placement', value: 'placement', icon: <Smartphone className="w-4 h-4" /> },
        { label: 'Impression Device', value: 'impressionDevice' , icon: <Monitor className="w-4 h-4" /> },
        { label: 'Audience Segments', value: 'audienceSegments', icon: <Users className="w-4 h-4" /> }
    ];

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <CollapsibleSidebar />
            <SideTab 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
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
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-auto">
                            <div className="p-3 space-y-6">
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
       
                <HelpDeskModal />
            </div>
        </div>
    );
};

export default FbReportPage;