import Header from "@/components/dashboard_component/Header";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import { FaMeta } from "react-icons/fa6";
import { useEffect, useCallback, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { format } from "date-fns";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "@/components/dashboard_component/loader";
import InterestTable from "./components/InterestTable";
import MissingDateWarning from "@/components/dashboard_component/Missing-Date-Waning";
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal";

// Define interface for interest data structure
interface InterestMetric {
  Interest: string;
  InterestId: string;
  Spend: number;
  Revenue: number;
  Roas: number;
  accounts?: string[];
}

interface AccountData {
  adAccountId: string;
  interestMetrics: InterestMetric[];
}

interface MetaInterestData {
  resultsByAccount: {
    [accountName: string]: AccountData;
  };
  blendedSummary: InterestMetric[];
}

function InterestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [metaInterest, setMetaInterest] = useState<MetaInterestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);

  const axiosInstance = createAxiosInstance();
  const { brandId } = useParams();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!date.from || !date.to) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const startDate = format(date.from, "yyyy-MM-dd");
      const endDate = format(date.to, "yyyy-MM-dd");
      
      const response = await axiosInstance.post(
        `/api/meta/interest/${brandId}`,
        { startDate, endDate },
        { withCredentials: true }
      );
      
      console.log("API Response:", response.data);
      
      if (response.data && response.data.data) {
        setMetaInterest(response.data.data);
      } else {
        console.error("Invalid data structure:", response.data);
        setError("Invalid data structure received from API");
      }
    } catch (error) {
      console.error('Error fetching interest data:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          alert('Your session has expired. Please log in again.');
          navigate('/');
        } else {
          setError(`API Error: ${error.response?.data?.message || error.message}`);
        }
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, date, brandId]);

  useEffect(() => {
    if (date.from && date.to) {
      fetchData();
    }
  }, [fetchData, date]);

  useEffect(() => {
    // Set up refresh interval
    const intervalId = setInterval(() => {
      if (date.from && date.to) {
        fetchData();
      }
    }, 3 * 60 * 60 * 1000); // 3 hours
    
    return () => clearInterval(intervalId);
  }, [fetchData, date]);

  // Get available accounts for dropdown with safe access
  const accounts = useMemo(() => {
    if (!metaInterest?.resultsByAccount) {
      console.log("No resultsByAccount found in metaInterest:", metaInterest);
      return [];
    }
    
    const accountKeys = Object.keys(metaInterest.resultsByAccount);
    console.log("Found accounts:", accountKeys);
    
    return accountKeys.filter(account => {
      const hasInterests = metaInterest.resultsByAccount[account]?.interestMetrics?.length > 0;
      console.log(`Account ${account} has interests: ${hasInterests}`);
      return hasInterests;
    });
  }, [metaInterest]);


  const tableHeight = useMemo(() => {

    const baseHeight = 'max-h-[calc(100vh-210px)]';
  
    if (!metaInterest?.resultsByAccount) return baseHeight;
    
    const accountCount = Object.keys(metaInterest.resultsByAccount).length;
    
    if (accountCount <= 1) return baseHeight;
    
    return 'max-h-[calc(100vh-400px)]';
  }, [metaInterest]);


  const hasBlendedData = metaInterest?.blendedSummary && metaInterest.blendedSummary.length > 0;
  console.log("Has blended data:", hasBlendedData, metaInterest?.blendedSummary?.length);
  
  const hasAccountData = accounts.length > 0;
  console.log("Has account data:", hasAccountData, accounts.length);
  
  const hasAnyData = hasBlendedData || hasAccountData;
  console.log("Has any data:", hasAnyData);


  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-hidden flex flex-col">
        {(!date.from || !date.to) ? (
          <MissingDateWarning />
        ) : ( (isLoading) ? <Loader isLoading={isLoading}/> :
          <>
            <div className="flex-none">
              <Header 
                title='Meta Interest Analysis' 
                Icon={FaMeta} 
                showDatePicker={true} 
              />
            </div>
            <main className="p-4 md:p-6 lg:px-8 overflow-auto">
              {error ? (
                <div className="text-center py-12">
                  <p className="text-red-500">{error}</p>
                  <button 
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              ) : metaInterest ? (
                <div className="grid grid-cols-1 gap-6">
                  {/* Blended Summary Table */}
                  {hasBlendedData && (
                    <InterestTable 
                      data={metaInterest} 
                      height={tableHeight}
                      showAccounts={true}
                    />
                  )}
                  
                  {/* Individual Account Tables */}
                  {hasAccountData && accounts.map((accountName) => (
                    <InterestTable 
                      key={accountName}
                      data={{
                        resultsByAccount: { 
                          [accountName]: metaInterest.resultsByAccount[accountName] 
                        },
                        blendedSummary: metaInterest.resultsByAccount[accountName].interestMetrics
                      }}
                      height={tableHeight}
                      accountName={accountName}
                      showAccounts={false}
                    />
                  ))}
                  
                  {/* No Data Message */}
                  {!hasAnyData && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No interest data available. Please try adjusting your date range.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No interest data available. Please try adjusting your date range.</p>
                </div>
              )}
            </main>
          </>
        )}
        <HelpDeskModal />
      </div>
    </div>
  );
}

export default InterestPage;