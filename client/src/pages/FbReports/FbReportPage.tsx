import React, { useState } from 'react';
import { DateRange } from 'react-day-picker';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';
import { CustomTabs } from '../ConversionReportPage/components/CustomTabs';
import { FaMeta } from "react-icons/fa6";
import RegionFbReport from './component/RegionFbReport';
import AudienceFbReport from './component/AudienceFbReport';
import PlacementFbReport from './component/PlacementFbReport';
import PlatformFbReport from './component/PlatformFbReport';
import CountryFbReport from './component/CountryFbReport';
import DeviceFbReport from './component/DeviceFbReport';
import GenderFbReport from './component/GenderFbReport';
import AgeFbReport from './component/AgeFbReport';




const FbReportPage: React.FC = () => {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
        to: new Date(),
    });
    const [activeTab, setActiveTab] = useState('age');

    const tabs = [
        { label: 'Age', value: 'age' },
        { label: 'Gender', value: 'gender' },
        { label: 'Country', value: 'country' },
        { label: 'Region', value: 'region' },
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
                {/* Header */}
                <div className="flex-none">
                    <header className="bg-white px-6 py-3 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FaMeta className="h-6 w-6" />
                                <h1 className="text-xl font-semibold">Meta Reports</h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <DatePickerWithRange date={date} setDate={setDate} />
                            </div>
                        </div>
                    </header>

                    {/* Tabs */}
                    <div className="bg-white px-6 sticky top-0 z-10">
                        <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto">
                    <div className="px-6 py-4 space-y-6">
                        {activeTab === 'region' && (
                            <div id="region">
                                <RegionFbReport dateRange={date} />
                            </div>
                        )}
                        {activeTab === 'audienceSegments' && (
                            <div id="audienceSegments">
                                <AudienceFbReport dateRange={date} />
                            </div>
                        )}
                        {activeTab === 'placement' && (
                            <div id="placement">
                                <PlacementFbReport dateRange={date} />
                            </div>
                        )}
                        {activeTab === 'platform' && (
                            <div id="platform">
                                <PlatformFbReport dateRange={date} />
                            </div>
                        )}
                         {activeTab === 'country' && (
                            <div id="country">
                                <CountryFbReport dateRange={date} />
                            </div>
                        )}
                         {activeTab === 'impressionDevice' && (
                            <div id="impressionDevice">
                                <DeviceFbReport dateRange={date} />
                            </div>
                        )}
                        {activeTab === 'gender' && (
                            <div id="gender">
                                <GenderFbReport dateRange={date} />
                            </div>
                        )}
                         {activeTab === 'age' && (
                            <div id="age">
                                <AgeFbReport dateRange={date} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

};

export default FbReportPage;