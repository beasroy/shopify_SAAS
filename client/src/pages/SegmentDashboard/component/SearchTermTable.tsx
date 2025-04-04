import { GoogleLogo } from '@/data/logo';
import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Filter, RefreshCw, Zap, DollarSign, Percent, MousePointer, CreditCard, TrendingUp, Target, Users, Megaphone, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

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
  performance: string
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
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [statusOptions, setStatusOptions] = useState<[]>([]);
  const [selectedAdGroup, setSelectedAdGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
    from: dateFrom,
    to: dateTo
  }), [dateFrom, dateTo]);
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

  const rowsPerPage = 100;

  const columns = [
    { id: 'searchTerm', header: 'Search Term', icon: <Search className="w-4 h-4" /> },
    { id: 'matchType', header: 'Match Type', icon: <Zap className="w-4 h-4" /> },
    { id: 'status', header: 'Status', icon: <Filter className="w-4 h-4" /> },
    { id: 'campaignName', header: 'Campaign Name', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'adGroupName', header: 'Ad Group', icon: <Users className="w-4 h-4" /> },
    { id: 'cost', header: 'Cost', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'conversions', header: 'Conversions', icon: <Target className="w-4 h-4" /> },
    { id: 'conversionsValue', header: 'Conv. Value', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'conversionsRate', header: 'Conv. Rate', icon: <Percent className="w-4 h-4" /> },
    { id: 'clicks', header: 'Clicks', icon: <MousePointer className="w-4 h-4" /> },
    { id: 'ctr', header: 'CTR', icon: <Percent className="w-4 h-4" /> },
    { id: 'avg_cpc', header: 'Avg. CPC', icon: <CreditCard className="w-4 h-4" /> },
  ]

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const sortedSearchTerms = useMemo(() => {
    if (!sortColumn) return searchTerms;

    return [...searchTerms].sort((a, b) => {
      const aValue = a[sortColumn as keyof SearchTerm];
      const bValue = b[sortColumn as keyof SearchTerm];

      // Handle numeric comparisons
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }

      // String comparison (case-insensitive)
      const stringA = String(aValue).toLowerCase();
      const stringB = String(bValue).toLowerCase();

      if (stringA < stringB) return sortOrder === 'asc' ? -1 : 1;
      if (stringA > stringB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchTerms, sortColumn, sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Prepare request body
      const requestBody = {
        limit: rowsPerPage,
        page: currentPage,
        startDate,
        endDate,
        ...(selectedCampaign && selectedCampaign !== 'all' && { campaign: selectedCampaign }),
        ...(selectedAdGroup && selectedAdGroup !== 'all' && { adGroup: selectedAdGroup }),
        ...(selectedStatus && selectedStatus !== 'all' && { status: selectedStatus }),
      };

      // Make API request
      const { data: response } = await axios.post(
        `${baseURL}/api/segment/searchTermMetrics/${brandId}`,
        requestBody,
        { withCredentials: true }
      );

      if (response.success) {
        // Set data in state
        setSearchTerms(response.data);
        setTotalRecords(response.totalRecords);
        setTotalPages(response.totalPages);
        setHasMoreData(currentPage * rowsPerPage < response.totalRecords);
        setCampaignAdGroupPairs(response.campaignAdGroupPairs);
        setStatusOptions(response.statusOptions)
      } else {
        console.error('Failed to fetch search term metrics:', response.message);
      }

    } catch (error) {
      console.error('Error fetching search term metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [
    baseURL,
    brandId,
    currentPage,
    rowsPerPage,
    selectedCampaign,
    selectedAdGroup,
    selectedStatus,
    startDate,
    endDate
  ]);


  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 300000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handleCampaignChange = (value: string) => {
    setSelectedCampaign(value);
    setSelectedAdGroup('all');
    setCurrentPage(1)
  };

  const handleAdGroupChange = (value: string) => {
    setSelectedAdGroup(value);
    setCurrentPage(1)
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1)
  };

  const filteredAdGroups = selectedCampaign !== 'all'
    ? campaignAdGroupPairs?.find(pair => pair.campaignName === selectedCampaign)?.adGroups || []
    : [];

  return (
    <div className="w-full">
      <div className="flex flex-row gap-2 items-center mb-4">
        <GoogleLogo />
        <h1 className="text-xl font-bold text-gray-800">Google Ads Search Term Insights</h1>
      </div>
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-md">
        <div className="p-4">
          <div className="flex justify-between mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="bg-white border-gray-300 hover:bg-gray-50 transition-colors duration-200">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Status</h3>
                    <Select onValueChange={handleStatusChange} value={selectedStatus}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Campaign</h3>
                    <Select onValueChange={handleCampaignChange} value={selectedCampaign}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Campaigns</SelectItem>
                        {campaignAdGroupPairs.map((pair) => (
                          <SelectItem key={pair.campaignName} value={pair.campaignName}>{pair.campaignName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedCampaign !== 'all' && (
                    <div>
                      <h3 className="font-medium mb-2">Ad Group</h3>
                      <Select
                        disabled={selectedCampaign === 'all'}
                        onValueChange={handleAdGroupChange}
                        value={selectedAdGroup}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Ad Group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Ad Groups</SelectItem>
                          {filteredAdGroups.map((adGroup) => (
                            <SelectItem key={adGroup} value={adGroup}>{adGroup}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center space-x-4">
              <DatePickerWithRange
              
              />
              <Button
                variant="outline"
                className="bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                onClick={fetchData}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 overflow-hidden">
            <div className="max-h-[380px] overflow-auto rounded-lg">
              {loading ? (
                <TableSkeleton />
              ) : (
                <table className="w-full text-center">
                  <thead className="sticky top-0 z-10 bg-[#4A628A] rounded-t-lg">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.id}
                          className="px-4 py-3 text-xs font-medium text-gray-50 uppercase tracking-wider min-w-[200px] cursor-pointer"
                          onClick={() => handleSort(column.id)}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {column.icon}
                            {column.header}
                            {sortColumn === column.id ? (
                              sortOrder === 'asc' ? <ArrowUp className="ml-1 w-4 h-6 text-[#ffffff]" /> : <ArrowDown className="ml-1 w-4 h-6 text-[#ffffff]" />
                            ) : (
                              <ArrowUpDown className="ml-1 w-4 h-6 text-gray-300" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedSearchTerms.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors duration-150">
                        {columns.map((column) => {
                          const value = row[column.id as keyof SearchTerm];
                          const isStatusColumn = column.id === 'status';
                          const isSearchTermColumn = column.id === 'searchTerm'

                          const renderCell = () => {
                            if (isStatusColumn) {
                              const statusValue = value ? String(value) : '';
                              const getStatusColor = (status: string) => {
                                switch (status.trim().toUpperCase()) {
                                  case 'ADDED':
                                    return 'bg-green-100 text-green-800';
                                  case 'NONE':
                                    return 'bg-yellow-100 text-yellow-800';
                                  default:
                                    return 'bg-gray-100 text-gray-800';
                                }
                              };
                              const colorClass = getStatusColor(statusValue);

                              return (
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                                  {statusValue}
                                </div>
                              );
                            }

                            if (isSearchTermColumn) {
                              const searchTermValue = value ? String(value) : '';
                              const performance = row.performance;
                              const isPerformingWell = performance === 'Best Performing Keyword';

                              return (
                                <div className="px-2 py-1 rounded-full font-medium flex flex-col items-center">
                                  <span className={`text-xs ${isPerformingWell ? 'text-green-600' : 'text-red-600'}`}>
                                    {performance}
                                  </span>
                                  <span className="text-sm mt-1">{searchTermValue}</span>
                                </div>
                              );
                            }

                            return value;
                          };

                          return (
                            <td
                              key={column.id}
                              className="px-4 py-2.5 text-sm min-w-[200px]"
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
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to{' '}
                {Math.min(currentPage * rowsPerPage, totalRecords || 0)} of{' '}
                {totalRecords || 0} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={!hasMoreData}
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
