import React, { useState, useRef, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';
import { useParams } from 'react-router-dom';
import ConnectGA4 from '../ReportPage/ConnectGA4Page';
import { Palette, Radar } from 'lucide-react';
import { useTokenError } from '@/context/TokenErrorContext';
import NoGA4AcessPage from '../ReportPage/NoGA4AccessPage.';
import CityTypeConversion from './components/CityConversion';
import ChannelConversion from './components/ChannelConversion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import RegionConversion from './components/RegionConversion';
import LandingPageConversion from './components/LandingPageConversion';
import { CustomTabs } from './components/CustomTabs';
import CampaignConversion from './components/CampaignConversion';
import PagePathConversion from './components/PagePathConversion';
import PageTitleConversion from './components/PageTitleConversion';
import CountryConversion from './components/CountryConversion';
import { useSelector } from 'react-redux';
import { RootState } from "@/store/index.ts";

const WebsiteConversionReportPage: React.FC = () => {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
    to: new Date(),
  });
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
    return <ConnectGA4 />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-none">
          <header className="bg-white px-6 py-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radar className="h-6 w-6" />
                <h1 className="text-xl font-semibold">
                Camapign and Website Performance
                </h1>
              </div>
              <div className='flex items-center gap-3'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid gap-4">
                      <h3 className="font-medium leading-none">Color Information</h3>
                      <div className="grid gap-2">
                        {colorInfo.map(({ color, condition }) => (
                          <div key={color} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${color}`} />
                            <span className="text-xs">{condition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <DatePickerWithRange
                  date={date}
                  setDate={setDate}
                />
              </div>
            </div>
          </header>

          {/* Tabs */}
          <div className="bg-white px-6 sticky top-0 z-10">
            <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={containerRef} className="flex-1 overflow-auto">
          <div className="px-6 py-4 space-y-6">
            <div id="channel" ref={refs.channel} >
              <ChannelConversion dateRange={date} />
            </div>
            <div id="campaign" ref={refs.campaign} >
              <CampaignConversion dateRange={date} />
            </div>
            <div id="country" ref={refs.country} >
              <CountryConversion dateRange={date} />
            </div>
            <div id="city" ref={refs.city} >
              <CityTypeConversion dateRange={date} />
            </div>
            <div id="region" ref={refs.region} >
              <RegionConversion dateRange={date} />
            </div>
            <div id="landingPage" ref={refs.landingPage}>
              <LandingPageConversion dateRange={date} />
            </div>
            <div id="pagePath" ref={refs.pagePath}>
              <PagePathConversion dateRange={date} />
            </div>
            <div id="pageTitle" ref={refs.pageTitle}>
              <PageTitleConversion dateRange={date} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteConversionReportPage;