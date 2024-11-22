import { GoogleLogo } from "@/pages/CampaignMetricsPage";
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchTerm {
  id: string;
  searchTerm: string
  matchType: string
  status: string
  campaignName: string
  adGroup: string
  impressions: number
  clicks: number
  ctr: string
  cost: string
}

interface CampaignAdGroupPair {
  campaignName: string;
  adGroups: string[];
}

export default function SearchTermTable() {
  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;
  const { brandId } = useParams();
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [campaignAdGroupPairs, setCampaignAdGroupPairs] = useState<CampaignAdGroupPair[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedAdGroup, setSelectedAdGroup] = useState<string>('all');
  const [filterApplied, setFilterApplied] = useState(false);
  

  const rowsPerPage = 100;

  const columns = [
    { id: 'searchTerm', header: 'Search Term' },
    { id: 'matchType', header: 'Match Type' },
    { id: 'status', header: 'Status' },
    { id: 'campaignName', header: 'Campaign Name' },
    { id: 'adGroupName', header: 'Ad Group' },
    { id: 'impressions', header: 'Impressions' },
    { id: 'clicks', header: 'Clicks' },
    { id: 'ctr', header: 'CTR' },
    { id: 'cost', header: 'Cost' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setIsLoadingCampaigns(true);

    try {
        // Access the cachedCampaignAdGroupPairs irrespective of filter state
        const cachedCampaignAdGroupPairs = localStorage.getItem('campaignAdGroupPairs');
        const parsedCampaignAdGroupPairs = cachedCampaignAdGroupPairs ? JSON.parse(cachedCampaignAdGroupPairs) : [];

        // Skip cache if filters are applied
        if (!filterApplied) {
            const cachedData = localStorage.getItem(`pageData-${currentPage}`);
            const cachedTimestamp = localStorage.getItem(`pageDataTimestamp-${currentPage}`);
            const cachedTotalRecords = localStorage.getItem(`pageDataTotalRecords`);
            const cachedTotalPages = localStorage.getItem(`pageDataTotalPages`);
            const cachedBrandId = localStorage.getItem(`pageDataBrandId-${currentPage}`); // Storing brandId in the cache

            const isCacheExpired = cachedTimestamp && (Date.now() - Number(cachedTimestamp)) > 300000;

            // Check if cached data is valid and brandId matches
            if (cachedData && cachedBrandId === brandId && !isCacheExpired) {
                setSearchTerms(JSON.parse(cachedData));
                setTotalRecords(Number(cachedTotalRecords));
                setTotalPages(Number(cachedTotalPages));
                setCampaignAdGroupPairs(parsedCampaignAdGroupPairs);
                return;
            }
        }

        // Dynamically add filters to the API body
        const requestBody: { limit: number; page: number; campaign?: string; adGroup?: string } = {
            limit: rowsPerPage,
            page: currentPage,
        };

        if (selectedCampaign && selectedCampaign !== 'all') {
            requestBody.campaign = selectedCampaign;
        }

        if (selectedAdGroup && selectedAdGroup !== 'all') {
            requestBody.adGroup = selectedAdGroup;
        }

        const response = await axios.post(
            `${baseURL}/api/segment/searchTermMetrics/${brandId}`,
            requestBody,
            {
                withCredentials: true,
            }
        );

        if (response.data.success) {
            const newData = response.data.data;
            setSearchTerms(newData);
            setTotalRecords(response.data.totalRecords);
            setTotalPages(response.data.totalPages);
            {!filterApplied && setCampaignAdGroupPairs(response.data.campaignAdGroupPairs)};

            // Cache data only if filters are not applied
            if (!filterApplied) {
                localStorage.setItem(`pageData-${currentPage}`, JSON.stringify(newData));
                localStorage.setItem(`pageDataTimestamp-${currentPage}`, Date.now().toString());
                localStorage.setItem(`pageDataTotalRecords`, response.data.totalRecords.toString());
                localStorage.setItem(`pageDataTotalPages`, response.data.totalPages.toString());
                localStorage.setItem(`pageDataBrandId-${currentPage}`, brandId || 'defaultBrandId'); // Provide a default value
                localStorage.setItem('campaignAdGroupPairs', JSON.stringify(response.data.campaignAdGroupPairs));
            }

            setHasMoreData(currentPage * rowsPerPage < response.data.totalRecords);
        } else {
            console.log('Failed to fetch search term metrics: ', response.data.message);
        }
    } catch (err) {
        console.log('Error fetching search term metrics:', err);
    } finally {
        setLoading(false);
        setIsLoadingCampaigns(false);
    }
}, [baseURL, brandId, currentPage, rowsPerPage, selectedCampaign, selectedAdGroup, filterApplied]);


  

  

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 300000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handleCampaignChange = (value: string) => {
    setSelectedCampaign(value);
    setSelectedAdGroup('all');
    setCurrentPage(1)
    if (value === 'all') {
      setFilterApplied(false);
    } else {
      setFilterApplied(true);
    }
  };
  

  const handleAdGroupChange = (value: string) => {
    setSelectedAdGroup(value);
    setCurrentPage(1)
    if (value === 'all') {
      setFilterApplied(false);
    } else {
      setFilterApplied(true);
    }
  };

  const filteredAdGroups = selectedCampaign !== 'all'
    ? campaignAdGroupPairs.find(pair => pair.campaignName === selectedCampaign)?.adGroups || []
    : [];



  return (
    <div>
      <div className="flex flex-row gap-2 items-center mb-3">
        <GoogleLogo />
        <h1 className="text-lg font-semibold">Google Ads Search Term Insights</h1>
      </div>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border-blue-800 border">
        <div className="p-4">
          <div className="flex space-x-4 mb-4">
            <Select disabled={isLoadingCampaigns} onValueChange={handleCampaignChange} value={selectedCampaign}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isLoadingCampaigns ? "Loading..." : "Select Campaign"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaignAdGroupPairs.map((pair) => (
                  <SelectItem key={pair.campaignName} value={pair.campaignName}>
                    {pair.campaignName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCampaign !=='all' && <Select 
              disabled={selectedCampaign === 'all'} 
              onValueChange={handleAdGroupChange} 
              value={selectedAdGroup}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Ad Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ad Groups</SelectItem>
                {filteredAdGroups.map((adGroup) => (
                  <SelectItem key={adGroup} value={adGroup}>
                    {adGroup}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>}
          </div>
       

        <div className="max-h-[380px] overflow-auto">
          {loading ? (
            <TableSkeleton />
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-[#134B70] rounded-xl min-w-[150px]">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className="px-4 py-3 text-left text-xs font-medium min-w-[150px] uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-1 text-white">
                        {column.header}
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchTerms.map((row, i) => (
                  <tr key={i} className="min-w-[200px]">
                    {columns.map((column) => {
                      const value = row[column.id as keyof SearchTerm];
                      const isStatusColumn = column.id === 'status';

                      const renderCell = () => {
                        if (isStatusColumn) {
                          const statusValue = value ? String(value) : '';
                          const getStatusColor = (status: string) => {
                            switch (status.trim().toUpperCase()) {
                              case 'ADDED':
                                return 'text-green-800';
                              case 'NONE':
                                return 'text-yellow-800';
                              default:
                                return 'text-gray-700';
                            }
                          };
                          const colorClass = getStatusColor(statusValue);

                          return (
                            <div className={`px-2 py-1 rounded ${colorClass}`}>
                              {statusValue}
                            </div>
                          );
                        }

                        return value;
                      };

                      return (
                        <td
                          key={column.id}
                          className={`min-w-[200px] px-4 py-2.5 text-sm`}
                        >
                          {renderCell()}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {searchTerms.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-2 text-sm text-gray-500 text-center"
                    >
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between px-4 pt-3 border-t">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * rowsPerPage) + 1} to{' '}
            {Math.min(currentPage * rowsPerPage, totalRecords || 0)} of{' '}
            {totalRecords || 0} entries
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 inline-block mr-1" />
              Previous
            </button>
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={!hasMoreData}
            >
              Next
              <ChevronRight className="h-4 w-4 inline-block ml-1" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

