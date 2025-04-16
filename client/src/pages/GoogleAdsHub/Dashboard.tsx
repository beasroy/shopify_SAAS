import React, { useState, useRef, useMemo } from 'react';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { SquareChartGantt } from 'lucide-react';
import SearchTerm from './components/SearchTerm';
import { CustomTabs } from '../ConversionReportPage/components/CustomTabs';
import Age from './components/Age';
import Gender from './components/Gender';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Header from '@/components/dashboard_component/Header';
import { useParams } from 'react-router-dom';
import { useTokenError } from '@/context/TokenErrorContext';
import NoGA4AcessPage from '../ReportPage/NoGA4AccessPage.';
import ConnectPlatform from '../ReportPage/ConnectPlatformPage';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';
import Keyword from './components/Keyword';
import Product from './components/Product';


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
  const hasGoogleAdAccount = selectedBrand?.googleAdAccount && selectedBrand?.googleAdAccount.length > 0 
    ? true
    : false;
  const { tokenError } = useTokenError();


  const tabs = [
    { label: 'Search Term', value: 'searchterm' },
    { label: 'Keyword', value: 'keyword' },
    { label: 'Age', value: 'age' },
    { label: 'Gender', value: 'gender' },
    { label: 'Product', value: 'product' }
  ];


  const handleTabChange = (value: string) => {
    setActiveTab(value);
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
                {activeTab === 'searchterm' && (
                  <div id="searchterm">
                    <SearchTerm dateRange={{
                      from: date.from ? new Date(date.from) : undefined,
                      to: date.to ? new Date(date.to) : undefined
                    }} />
                  </div>
                )}
                 {activeTab === 'keyword' && (
                  <div id="keyword">
                    <Keyword dateRange={{
                      from: date.from ? new Date(date.from) : undefined,
                      to: date.to ? new Date(date.to) : undefined
                    }} />
                  </div>
                )}
                {activeTab === 'age' && (
                  <div id="age" >
                    <Age dateRange={{
                      from: date.from ? new Date(date.from) : undefined,
                      to: date.to ? new Date(date.to) : undefined
                    }} />
                  </div>
                )}
                {activeTab === 'gender' && (
                  <div id="gender" >
                    <Gender dateRange={{
                      from: date.from ? new Date(date.from) : undefined,
                      to: date.to ? new Date(date.to) : undefined
                    }} />
                  </div>
                )}
               
                {activeTab === 'product' && (
                  <div id="product">
                    <Product dateRange={{
                      from: date.from ? new Date(date.from) : undefined,
                      to: date.to ? new Date(date.to) : undefined
                    }} />
                  </div>
                )}
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