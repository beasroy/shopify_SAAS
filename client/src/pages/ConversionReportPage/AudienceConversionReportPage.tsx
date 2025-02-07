import React, { useState, useRef, useEffect, useMemo } from 'react';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { useParams } from 'react-router-dom';
import { Radar } from 'lucide-react';
import { useTokenError } from '@/context/TokenErrorContext';
import NoGA4AcessPage from '../ReportPage/NoGA4AccessPage.';
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

const AudienceConversionReportPage: React.FC = () => {
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
  const containerRef = useRef<HTMLDivElement>(null);

  const colorInfo = [
    { color: 'bg-green-100', condition: 'High Traffic, High Conversion' },
    { color: 'bg-blue-100', condition: 'High Traffic, Low Conversion' },
    { color: 'bg-yellow-100', condition: 'Low Traffic, High Conversion' },
    { color: 'bg-red-50', condition: 'Low Traffic, Low Conversion' },
  ];

  const tabs = [
    { label: 'Age', value: 'age' },
    { label: 'Gender', value: 'gender' },
    { label: 'Interest', value: 'interest' },
    { label: 'Device', value: 'device' },
    { label: 'Operating System', value: 'operatingSystem' },
    { label: 'Browser', value: 'browser' },
    { label: 'Source', value: 'source' },
  ];

  const refs = {
    age: useRef<HTMLDivElement>(null),
    gender: useRef<HTMLDivElement>(null),
    interest: useRef<HTMLDivElement>(null),
    device: useRef<HTMLDivElement>(null),
    operatingSystem: useRef<HTMLDivElement>(null),
    browser: useRef<HTMLDivElement>(null),
    source: useRef<HTMLDivElement>(null),
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
            title="Audience & Traffic sources"
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
            <div id="age" ref={refs.age}>
              <AgeConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="gender" ref={refs.gender}>
              <GenderConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="interest" ref={refs.interest} >
              <InterestConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="device" ref={refs.device} >
              <DeviceTypeConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="operatingSystem" ref={refs.operatingSystem} >
              <OperatingSystemConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="browser" ref={refs.browser} >
              <BrowserConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="source" ref={refs.source} >
              <SourceConversion dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudienceConversionReportPage;