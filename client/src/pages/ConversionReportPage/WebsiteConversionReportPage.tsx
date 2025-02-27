import React, { useState, useRef, useEffect, useMemo } from 'react';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { useParams } from 'react-router-dom';
import {  Radar } from 'lucide-react';
import { useTokenError } from '@/context/TokenErrorContext';
import NoGA4AcessPage from '../ReportPage/NoGA4AccessPage.';
import CityTypeConversion from './components/CityConversion';
import ChannelConversion from './components/ChannelConversion';
import RegionConversion from './components/RegionConversion';
import LandingPageConversion from './components/LandingPageConversion';
import { CustomTabs } from './components/CustomTabs';
import CampaignConversion from './components/CampaignConversion';
import PagePathConversion from './components/PagePathConversion';
import PageTitleConversion from './components/PageTitleConversion';
import CountryConversion from './components/CountryConversion';
import { useSelector } from 'react-redux';
import { RootState } from "@/store/index.ts";
import Header from '@/components/dashboard_component/Header';
import ConnectPlatform from '../ReportPage/ConnectPlatformPage';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';

const WebsiteConversionReportPage: React.FC = () => {
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

  const [activeTab, setActiveTab] = useState('channel');
  const containerRef = useRef<HTMLDivElement>(null);

  const colorInfo = [
    { color: 'bg-green-100', condition: 'High Traffic, High Conversion' },
    { color: 'bg-blue-100', condition: 'High Traffic, Low Conversion' },
    { color: 'bg-yellow-100', condition: 'Low Traffic, High Conversion' },
    { color: 'bg-red-50', condition: 'Low Traffic, Low Conversion' },
  ];

  const tabs = [
    { label: 'Channel', value: 'channel' },
    { label: 'Campaign', value: 'campaign' },
    { label: 'Country', value: 'country' },
    { label: 'City', value: 'city' },
    { label: 'Region', value: 'region' },
    { label: 'Landing Page', value: 'landingPage' },
    { label: 'Page Path', value: 'pagePath' },
    { label: 'Page Title', value: 'pageTitle' }
  ];

  const refs = {
    country: useRef<HTMLDivElement>(null),
    city: useRef<HTMLDivElement>(null),
    region: useRef<HTMLDivElement>(null),
    channel: useRef<HTMLDivElement>(null),
    campaign: useRef<HTMLDivElement>(null),
    landingPage: useRef<HTMLDivElement>(null),
    pagePath: useRef<HTMLDivElement>(null),
    pageTitle: useRef<HTMLDivElement>(null),
  };

  // Observer to highlight active tab based on scroll position
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveTab(id);
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.7,
        rootMargin: '0px 0px 0px 0px'
      }
    );

    Object.keys(refs).forEach((key) => {
      const element = refs[key as keyof typeof refs].current;
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const targetRef = refs[value as keyof typeof refs];

    if (targetRef.current && containerRef.current) {
      const headerHeight = 140; // Height of header + tabs
      const elementTop = targetRef.current.getBoundingClientRect().top;
      const offset = elementTop - headerHeight;

      containerRef.current.scrollBy({
        top: offset,
        behavior: 'smooth'
      });
    }
  };

  if (tokenError) {
    return <NoGA4AcessPage />;
  }

  if (!hasGA4Account) {
    if (!hasGA4Account) {
      return <ConnectPlatform
        platform="google analytics"
        brandId={brandId ?? ''}
        onSuccess={(platform, accountName, accountId) => {
          console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
        }} />;
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-none">
        <Header
            title="Campaign and Website Performance"
            Icon={Radar}
            showDatePicker={true}
            showColorPalette={true}
            colorInfo={colorInfo}
           />

          {/* Tabs */}
          <div className="bg-white px-6 sticky top-0 z-10">
            <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={containerRef} className="flex-1 overflow-auto">
          <div className="px-6 py-4 space-y-6">
            <div id="channel" ref={refs.channel} >
              <ChannelConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="campaign" ref={refs.campaign} >
              <CampaignConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="country" ref={refs.country} >
              <CountryConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="city" ref={refs.city} >
              <CityTypeConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="region" ref={refs.region} >
              <RegionConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="landingPage" ref={refs.landingPage}>
              <LandingPageConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="pagePath" ref={refs.pagePath}>
              <PagePathConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="pageTitle" ref={refs.pageTitle}>
              <PageTitleConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
          </div>
        </div>
        <HelpDeskModal />
      </div>
    </div>
  );
};

export default WebsiteConversionReportPage;