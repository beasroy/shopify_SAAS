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





const FbReportPage: React.FC = () => {
    const dateFrom = useSelector((state: RootState) => state.date.from);
    const dateTo = useSelector((state: RootState) => state.date.to);
    const date = useMemo(() => ({
        from: dateFrom,
        to: dateTo
    }), [dateFrom, dateTo]);
    const [activeTab, setActiveTab] = useState('age');

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
            <div className="flex-1 h-screen overflow-hidden flex flex-col">
                {(!date.from || !date.to) ? <MissingDateWarning /> :
                 (<>

                <div className="flex-none">
                    <Header title='Meta Reports' Icon={FaMeta} showDatePicker={true} />

                    {/* Tabs */}
                    <div className="bg-white px-6 sticky top-0 z-10">
                        <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
                    </div>
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
                </>)}
                <HelpDeskModal />
            </div>
       
        </div>
    );

};

export default FbReportPage;