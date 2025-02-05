import React, { useState, useEffect, useRef } from 'react';
import { DateRange } from 'react-day-picker';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';
import { SquareChartGantt } from 'lucide-react';
import SearchTerm from './components/SearchTerm';
import { CustomTabs } from '../ConversionReportPage/components/CustomTabs';
import Age from './components/Age';
import Gender from './components/Gender';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import ConnectPlatform from '../ReportPage/ConnectPlatformPage';
import { useTokenError } from '@/context/TokenErrorContext';
import { useParams } from 'react-router-dom';
import NoGA4AcessPage from '../ReportPage/NoGA4AccessPage.';

const GoogleAdsDashboard: React.FC = () => {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
    to: new Date(),
  });
  const { brandId } = useParams<{ brandId: string }>();
  const brands = useSelector((state: RootState) => state.brand.brands);
  const selectedBrand = brands.find((brand) => brand._id === brandId);
  const hasGA4Account = selectedBrand?.googleAdAccount ? selectedBrand.googleAdAccount.length > 0 : false;
  const { tokenError } = useTokenError();
  const [activeTab, setActiveTab] = useState('searchterm');
  const containerRef = useRef<HTMLDivElement>(null);


  const tabs = [
    { label: 'Search Term', value: 'searchterm' },
    { label: 'Age', value: 'age' },
    { label: 'Gender', value: 'gender' },
  ];

  const refs = {
    searchterm: useRef<HTMLDivElement>(null),
    age: useRef<HTMLDivElement>(null),
    gender: useRef<HTMLDivElement>(null),
  };
 

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
      const headerHeight = 140;
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
        ) : !hasGA4Account ? (
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
            <div className="flex-none">
              <header className="bg-white px-6 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SquareChartGantt className="h-6 w-6" />
                    <h1 className="text-xl font-semibold">Google Ads Reports</h1>
                  </div>
                  <div className='flex items-center gap-3'>
                    <DatePickerWithRange date={date} setDate={setDate} />
                  </div>
                </div>
              </header>
              <div className="bg-white px-6 sticky top-0 z-10">
                <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
              </div>
            </div>
            <div ref={containerRef} className="flex-1 overflow-auto">
              <div className="px-6 py-4 space-y-6">
                <div id="searchterm" ref={refs.searchterm}><SearchTerm dateRange={date} /></div>
                <div id="age" ref={refs.age}><Age dateRange={date} /></div>
                <div id="gender" ref={refs.gender}><Gender dateRange={date} /></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleAdsDashboard;