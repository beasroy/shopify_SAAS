import React, { useState,useMemo } from 'react';
import CollapsibleSidebar from '../../components/dashboard_component/CollapsibleSidebar';
import { useParams } from 'react-router-dom';
import { ChartBar, Radar } from 'lucide-react';
import { useTokenError } from '@/context/TokenErrorContext';
import DeviceTypeConversion from './components/DeviceConversion';
import GenderConversion from './components/GenderConversion';
import AgeConversion from './components/AgeConversion';
import { CustomTabs } from './components/CustomTabs';
import InterestConversion from './components/InterestConversion';
import OperatingSystemConversion from './components/OperatingSystemConversion';
import BrowserConversion from './components/BrowserConversion';
import SourceConversion from './components/SourceConversion';
import { useSelector } from 'react-redux';
import { RootState } from "@/store/index.ts";
import Header from '@/components/dashboard_component/Header';
import ConnectPlatform from '../ReportPage/ConnectPlatformPage';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';
import PageTitleConversion from './components/PageTitleConversion';
import PagePathConversion from './components/PagePathConversion';
import LandingPageConversion from './components/LandingPageConversion';
import RegionConversion from './components/RegionConversion';
import CityTypeConversion from './components/CityConversion';
import CountryConversion from './components/CountryConversion';
import CampaignConversion from './components/CampaignConversion';
import ChannelConversion from './components/ChannelConversion';
import MissingDateWarning from '@/components/dashboard_component/Missing-Date-Waning';
import NoAccessPage from '@/components/dashboard_component/NoAccessPage.';
import Footer from '../LandingPage/components/Footer';

const ConversionLens: React.FC = () => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);
  const { brandId } = useParams<{ brandId: string }>();
  const brands = useSelector((state: RootState) => state.brand.brands);
  const selectedBrand = brands.find((brand) => brand._id === brandId);
  const hasGA4Account = selectedBrand?.ga4Account ?? false;
  const { tokenError } = useTokenError();

  const [activeTab, setActiveTab] = useState('age');
 

  const tabs = [
    { label: 'Age', value: 'age' },
    { label: 'Gender', value: 'gender' },
    { label: 'Interest', value: 'interest' },
    { label: 'Device', value: 'device' },
    { label: 'Operating System', value: 'operatingSystem' },
    { label: 'Browser', value: 'browser' },
    { label: 'Source', value: 'source' },
    { label: 'Channel', value: 'channel' },
    { label: 'Campaign', value: 'campaign' },
    { label: 'Country', value: 'country' },
    { label: 'City', value: 'city' },
    { label: 'Region', value: 'region' },
    { label: 'Landing Page', value: 'landingPage' },
    { label: 'Page Path', value: 'pagePath' },
    { label: 'Page Title', value: 'pageTitle' }
  ];



  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  if (tokenError) {
    return <NoAccessPage
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
  />;
  }


  if (!hasGA4Account) {
    return <ConnectPlatform
      platform="google analytics"
      brandId={brandId ?? ''}
      onSuccess={(platform, accountName, accountId) => {
        console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
      }} />;
  }


  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      
         <div className="flex-1 h-screen overflow-hidden flex flex-col">
         {(!date.from || !date.to) ? (
          <MissingDateWarning />
        ) : (
          <>
            {/* Header */}
            <div className="flex-none">
              <Header
                title="Conversion Lens"
                Icon={Radar}
                showDatePicker={true}
              />

              <div id="report-tab" className="bg-white px-6 sticky top-0 z-10 w-full">
                <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
              </div>
            </div>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto">
              <div className="px-6 py-4 space-y-6">
                {activeTab === 'age' && <div id="age-conversion-report">
                  <AgeConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}
                {activeTab === 'gender' && <div id="gender">
                  <GenderConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}

                {activeTab === 'interest' && <div id="interest">
                  <InterestConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}

                {activeTab === 'device' && <div id="device" >
                  <DeviceTypeConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}
                {activeTab === 'operatingSystem' && <div id="operatingSystem" >
                  <OperatingSystemConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}
                {activeTab === 'browser' && <div id="browser">
                  <BrowserConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}

                {activeTab === 'source' && <div id="source" >
                  <SourceConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}

                {activeTab === 'channel' && <div id="channel" >
                  <ChannelConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}

                {activeTab === 'campaign' && <div id="campaign">
                  <CampaignConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}
                {activeTab === 'country' && <div id="country">
                  <CountryConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}
                {activeTab === 'city' && <div id="city">
                  <CityTypeConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}

                {activeTab === 'region' && <div id="region" >
                  <RegionConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}
                {activeTab === 'landingPage' && <div id="landingPage" >
                  <LandingPageConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}
                {activeTab === 'pagePath' && <div id="pagePath">
                  <PagePathConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}

                {activeTab === 'pageTitle' && <div id="pageTitle" >
                  <PageTitleConversion dateRange={{
                    from: date.from ? new Date(date.from) : undefined,
                    to: date.to ? new Date(date.to) : undefined
                  }} />
                </div>}
              </div>
              <Footer />
              <HelpDeskModal />
            </div>
          </>
        )}
      </div>
     
      </div>
      );
};

      export default ConversionLens;