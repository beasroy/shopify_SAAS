import React, { useState, useRef, useMemo, useCallback } from 'react';
import CollapsibleSidebar from '../../components/dashboard_component/CollapsibleSidebar';
import { Keyboard, Maximize, Minimize, Package, RefreshCw, Search, SquareChartGantt, User, Users } from 'lucide-react';
import SearchTerm from './components/SearchTerm';
import { CustomTabs } from '../ConversionReportPage/components/CustomTabs';
import Age from './components/Age';
import Gender from './components/Gender';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Header from '@/components/dashboard_component/Header';
import { useParams } from 'react-router-dom';
import ConnectPlatform from '../ReportPage/ConnectPlatformPage';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';
import Keyword from './components/Keyword';
import Product from './components/Product';
import { SideTab } from '@/components/ui/side-tab';
import MissingDateWarning from '@/components/dashboard_component/Missing-Date-Waning';
import { Card, CardContent } from '@/components/ui/card';
import PerformanceSummary from '../ConversionReportPage/components/PerformanceSummary';
import { metricConfigs } from '@/data/constant';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';
import NumberFormatSelector from '@/components/dashboard_component/NumberFormatSelector';
import { Button } from '@/components/ui/button';
import ExcelDownload from '../ConversionReportPage/components/ExcelDownload';




// const GoogleAdsDashboard: React.FC = () => {
//   const dateFrom = useSelector((state: RootState) => state.date.from);
//   const dateTo = useSelector((state: RootState) => state.date.to);
//   const date = useMemo(() => ({
//     from: dateFrom,
//     to: dateTo
//   }), [dateFrom, dateTo]);
//   const [activeTab, setActiveTab] = useState('searchterm');
//   const containerRef = useRef<HTMLDivElement>(null);
//   const brands = useSelector((state: RootState) => state.brand.brands);
//   const { brandId } = useParams<{ brandId: string }>();
//   const selectedBrand = brands.find((brand) => brand._id === brandId);
//   const hasGoogleAdAccount = selectedBrand?.googleAdAccount && selectedBrand?.googleAdAccount.length > 0 
//     ? true
//     : false;



//   const tabs = [
//     { label: 'Search Term', value: 'searchterm' },
//     { label: 'Keyword', value: 'keyword' },
//     { label: 'Age', value: 'age' },
//     { label: 'Gender', value: 'gender' },
//     { label: 'Product', value: 'product' }
//   ];


//   const handleTabChange = (value: string) => {
//     setActiveTab(value);
//   };

//   return (
//     <div className="flex h-screen bg-gray-100">
//       <CollapsibleSidebar />
//       <div className="flex-1 h-screen overflow-auto">
//         {!hasGoogleAdAccount ? (
//           <>
//             <ConnectPlatform
//               platform="google ads"
//               brandId={brandId ?? ''}
//               onSuccess={(platform, accountName, accountId) => {
//                 console.log(`Successfully connected ${platform} account: ${accountName} (${accountId})`);
//               }}
//             />
//           </>
//         ) : (
//           <>
//             {/* Header */}
//             <div className="flex-none">
//               <Header showDatePicker={true} Icon={SquareChartGantt} title='Google Ads Reports' />
//               {/* Tabs */}
//               <div className="bg-white px-6 sticky top-0 z-10">
//                 <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
//               </div>
//             </div>

//             {/* Scrollable Content */}
//             <div ref={containerRef} className="flex-1 overflow-auto">
//               <div className="px-6 py-4 space-y-6">
//                 {activeTab === 'searchterm' && (
//                   <div id="searchterm">
//                     <SearchTerm dateRange={{
//                       from: date.from ? new Date(date.from) : undefined,
//                       to: date.to ? new Date(date.to) : undefined
//                     }} />
//                   </div>
//                 )}
//                  {activeTab === 'keyword' && (
//                   <div id="keyword">
//                     <Keyword dateRange={{
//                       from: date.from ? new Date(date.from) : undefined,
//                       to: date.to ? new Date(date.to) : undefined
//                     }} />
//                   </div>
//                 )}
//                 {activeTab === 'age' && (
//                   <div id="age" >
//                     <Age dateRange={{
//                       from: date.from ? new Date(date.from) : undefined,
//                       to: date.to ? new Date(date.to) : undefined
//                     }} />
//                   </div>
//                 )}
//                 {activeTab === 'gender' && (
//                   <div id="gender" >
//                     <Gender dateRange={{
//                       from: date.from ? new Date(date.from) : undefined,
//                       to: date.to ? new Date(date.to) : undefined
//                     }} />
//                   </div>
//                 )}

//                 {activeTab === 'product' && (
//                   <div id="product">
//                     <Product dateRange={{
//                       from: date.from ? new Date(date.from) : undefined,
//                       to: date.to ? new Date(date.to) : undefined
//                     }} />
//                   </div>
//                 )}
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//       <HelpDeskModal />
//     </div>
//   );
// };


const GoogleAdsDashboard: React.FC = () => {

  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [tabData, setTabData] = useState<any[]>([]);
  const [currentFilter, setCurrentFilter] = useState<string[] | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleTabDataUpdate = (data: any[], tabType?: string) => {
    if (tabType === activeTab) {
      setTabData(data);
    }
  };

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



  const tabs = [
    { label: 'Search Term', value: 'searchTerm', icon: <Search className="w-4 h-4" /> },
    { label: 'Keyword', value: 'keyword', icon: <Keyboard className="w-4 h-4" /> },
    { label: 'Age', value: 'age', icon: <Users className="w-4 h-4" /> },
    { label: 'Gender', value: 'gender', icon: <User className="w-4 h-4" /> },
    { label: 'Product', value: 'product', icon: <Package className="w-4 h-4" /> }
  ];

  const getPrimaryColumnForTab = (tab: string): string => {
    const columnMap: Record<string, string> = {
      'searchTerm': 'Search Term',
      'keyword': 'Keyword',
      'age': 'Age Range',
      'gender': 'Gender',
      'product': 'Product',

    };
    return columnMap[tab] || 'Unknown';
  };

  const handleCategoryFilter = (items: (string | number)[] | undefined) => {
    if (items === undefined) {
      setCurrentFilter(undefined);
    } else {
      setCurrentFilter(items.map(item => String(item)));
    }
  };

  const handleManualRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);


  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setTabData([]);
    setCurrentFilter(undefined);
  };

  const getFileNameForTab = (tab: string): string => {
    const fileMap: Record<string, string> = {
      'searchTerm': 'SearchTerm_Conversion_Report',
      'keyword': 'Keyword_Conversion_Report',
      'age': 'Age_Conversion_Report',
      'gender': 'Gender_Conversion_Report',
      'product': 'Product_Conversion_Report',
    };
    return fileMap[tab] || 'Conversion_Report';
  };

  const getSecondaryColumnsForTab = (tab: string): string[] => {
    const columnMap: Record<string, string[]> = {
      'searchTerm': ['Metric', 'Total Cost', 'Conv. Value / Cost'],
      'keyword': ['Metric', 'Total Cost', 'Conv. Value / Cost'],
      'age': ['Metric', 'Total Cost', 'Conv. Value / Cost'],
      'gender': ['Metric', 'Total Cost', 'Conv. Value / Cost'],
      'product': ['Metric', 'Total Cost', 'Conv. Value / Cost'],

    };
    return columnMap[tab] || [];
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />

      {/* Side Tab Navigation */}
      <SideTab
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-0">
        {
          (!date.from || !date.to) ? (
            <MissingDateWarning />
          ) : (
            <>
              {/* Header */}
              <div className="flex-none">
              </div>
              {/* Scrollable Content */}
              <div className="flex-1 overflow-auto">

                <div className='p-2 space-y-6'>
                  <Card id={`${activeTab}-report`} className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                        <div className="flex-grow items-center gap-3">
                          <PerformanceSummary
                            data={tabData}
                            primaryColumn={getPrimaryColumnForTab(activeTab)}
                            metricConfig={metricConfigs.googleAds || {}}
                            onCategoryFilter={handleCategoryFilter}
                          />

                        </div>
                        {/* Date Picker, Number Format Selector, Refresh Button */}
                        <div className="flex flex-row items-center gap-1.5 ">
                          <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                            <DatePickerWithRange
                              defaultDate={{
                                from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                                to: new Date()
                              }}
                            />
                          </div>
                          <NumberFormatSelector />
                          <Button id="refresh" onClick={handleManualRefresh} size="icon" variant="outline">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <ExcelDownload
                            data={tabData}
                            fileName={getFileNameForTab(activeTab)}
                            primaryColumn={getPrimaryColumnForTab(activeTab)}
                            secondaryColumns={getSecondaryColumnsForTab(activeTab)}
                            monthlyDataKey="MonthlyData"
                            monthlyMetrics={["Sessions", "Conv. Rate"]}
                            disabled={tabData.length === 0}
                          />

                          <Button id="expand-button" onClick={toggleFullScreen} size="icon" variant="outline">
                            {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md overflow-hidden">
                        <div id={activeTab}>
                          {activeTab === 'searchTerm' && (
                            <SearchTerm
                              dateRange={{
                                from: date.from ? new Date(date.from) : undefined,
                                to: date.to ? new Date(date.to) : undefined
                              }}
                              refreshTrigger={refreshTrigger}
                              currentFilter={currentFilter}
                              onDataUpdate={handleTabDataUpdate}
                            />
                          )}

                          {activeTab === 'keyword' && (
                            <Keyword
                              dateRange={{
                                from: date.from ? new Date(date.from) : undefined,
                                to: date.to ? new Date(date.to) : undefined
                              }}
                              refreshTrigger={refreshTrigger}
                              currentFilter={currentFilter}
                              onDataUpdate={handleTabDataUpdate}
                            />
                          )}
                          {activeTab === 'age' && (
                            <Age
                              dateRange={{
                                from: date.from ? new Date(date.from) : undefined,
                                to: date.to ? new Date(date.to) : undefined
                              }}
                              refreshTrigger={refreshTrigger}
                              currentFilter={currentFilter}
                              onDataUpdate={handleTabDataUpdate}
                            />
                          )}
                          {activeTab === 'gender' && (
                            <Gender
                              dateRange={{
                                from: date.from ? new Date(date.from) : undefined,
                                to: date.to ? new Date(date.to) : undefined
                              }}
                              refreshTrigger={refreshTrigger}
                              currentFilter={currentFilter}
                              onDataUpdate={handleTabDataUpdate}
                            />
                          )}
                          {activeTab === 'product' && (
                            <Product
                              dateRange={{
                                from: date.from ? new Date(date.from) : undefined,
                                to: date.to ? new Date(date.to) : undefined
                              }}
                              refreshTrigger={refreshTrigger}
                              currentFilter={currentFilter}
                              onDataUpdate={handleTabDataUpdate}
                            />
                          )}

                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )
        }
      </div>

      <HelpDeskModal />
    </div>
  );
};

export default GoogleAdsDashboard;