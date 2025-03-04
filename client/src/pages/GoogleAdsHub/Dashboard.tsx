import React, { useState, useEffect, useRef } from 'react';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { SquareChartGantt } from 'lucide-react';
import SearchTerm from './components/SearchTerm';
import { CustomTabs } from '../ConversionReportPage/components/CustomTabs';
import Age from './components/Age';
import Gender from './components/Gender';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { RootState } from '@/store';
import Header from '@/components/dashboard_component/Header';
import { useParams } from 'react-router-dom';
import { useTokenError } from '@/context/TokenErrorContext';
import NoGA4AcessPage from '../ReportPage/NoGA4AccessPage.';
import ConnectPlatform from '../ReportPage/ConnectPlatformPage';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';
import Keyword from './components/Keyword';
import Product from './components/Product';
// import Product from './components/Product';
// import Brand from './components/Brand';


const GoogleAdsDashboard: React.FC = () => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);
  const [activeTab, setActiveTab] = useState('searchterm');
  const containerRef = useRef<HTMLDivElement>(null);
  const brands = useSelector((state: RootState) => state.brand.brands);
  const { brandId } = useParams<{ brandId: string }>();
  const selectedBrand = brands.find((brand) => brand._id === brandId);
  const hasGoogleAdAccount = selectedBrand?.googleAdAccount?.clientId
  ? selectedBrand.googleAdAccount.clientId
  : false;
  const { tokenError } = useTokenError();

  const tabs = [
    { label: 'Search Term', value: 'searchterm' },
    { label: 'Age', value: 'age' },
    { label: 'Gender', value: 'gender' },
    { label: 'Keyword', value: 'keyword'},
    { label: 'Product', value: 'product'}
  ];

  const refs = {
    searchterm: useRef<HTMLDivElement>(null),
    age: useRef<HTMLDivElement>(null),
    gender: useRef<HTMLDivElement>(null),
    keyword: useRef<HTMLDivElement>(null),
    product: useRef<HTMLDivElement>(null)
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

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-hidden flex flex-col">
      {tokenError ? (
          <NoGA4AcessPage />
        ) : !hasGoogleAdAccount ? (
          <>
            <ConnectPlatform
              platform="google ads"
              brandId={brandId ?? ''}
              onSuccess={(platform, accountName, accountId) => {
                console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
              }}
            />
          </>
        ) : (
          <>
        {/* Header */}
        <div className="flex-none">
        <Header showDatePicker={true} Icon={SquareChartGantt} title='Google Ads Reports' />
          {/* Tabs */}
          <div className="bg-white px-6 sticky top-0 z-10">
            <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={containerRef} className="flex-1 overflow-auto">
          <div className="px-6 py-4 space-y-6">
            <div id="searchterm" ref={refs.searchterm}>
              <SearchTerm dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="age" ref={refs.age}>
              <Age dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="gender" ref={refs.gender}>
              <Gender dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
             <div id="keyword" ref={refs.keyword}>
              <Keyword dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
            <div id="product" ref={refs.product}>
              <Product dateRange={{ 
                from: date.from ? new Date(date.from) : undefined,
                to: date.to ? new Date(date.to) : undefined 
              }} />
            </div>
        
          </div>
        </div>
        </>
        )}
      </div>
      <HelpDeskModal />
    </div>
  );
};

export default GoogleAdsDashboard;