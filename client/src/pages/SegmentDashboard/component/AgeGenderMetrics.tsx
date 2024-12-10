import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Package, Layers, ArrowUp, ArrowDown, ArrowUpDown, Filter } from 'lucide-react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { GoogleLogo } from '@/pages/CampaignMetricsPage';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TabConfig = {
    id: string;
    label: string;
    apiEndpoint: string;
    columns: ColumnDef[];
    data: any[];
    lastUpdated: number | null;
    totalPages?: number;
    currentPage?: number;
    campaignAdGroupPairs?: CampaignAdGroupPair[];
};

type CampaignAdGroupPair = {
    campaignName: string;
    adGroups: string[];
};

type ColumnDef = {  
    id: string;
    header: string;
    accessorKey: string;
    cell: (value: any) => React.ReactNode;
};

type MetricKey = keyof typeof metricLabels;

type FilterState = {
    status: string;
    campaign: string;
    adGroup: string;
    ageRange?: string;
    gender?: string;
    campaignStatus: string;
};

const metricLabels = {
    totalConversions: 'Total Conversions',
    totalClicks: 'Total Clicks',
    totalCost: 'Total Cost',
    totalCTR: 'Total C T R'
};

// Define rows per page constant
const ROWS_PER_PAGE = 100;

export default function AgeAndGenderMetrics() {
    const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;
    const { brandId } = useParams();

    if (!brandId) {
        return <div>Error: Brand ID is missing</div>;
    }

    // State for filters
    const [filters, setFilters] = useState<FilterState>({
        campaign: 'all',
        adGroup: 'all',
        ageRange: 'all',
        gender: 'all',
        status: 'all', 
        campaignStatus: 'all' 
    });

    // State for filter options with campaign statuses
    const [filterOptions, setFilterOptions] = useState<{
        campaigns: string[];
        adGroups: string[];
        ageRanges: string[];
        genders: string[];
        campaignAdGroupMap?: Record<string, string[]>;
        statusOptions: string[]; // Added statusOptions
    }>({
        campaigns: [],
        adGroups: [],
        ageRanges: [],
        genders: [],
        campaignAdGroupMap: {},
        statusOptions: ['REMOVED', 'PAUSED', 'ENABLED'], // Added status options
    });

    // Existing state variables
    const [data, setData] = useState<any[]>([]);
    const [tabs, setTabs] = useState<TabConfig[]>([
        { 
            id: 'age', 
            label: 'Age', 
            apiEndpoint: `${baseURL}/api/segment/ageMetrics/${brandId}`, 
            columns: [], 
            data: [], 
            lastUpdated: null,
            totalPages: 1,
            currentPage: 1
        },
        { 
            id: 'gender', 
            label: 'Gender', 
            apiEndpoint: `${baseURL}/api/segment/genderMetrics/${brandId}`, 
            columns: [], 
            data: [], 
            lastUpdated: null,
            totalPages: 1,
            currentPage: 1
        },
    ]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [activeTab, setActiveTab] = useState(tabs[0].id);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showGraph, setShowGraph] = useState(false);
    const [graphData, setGraphData] = useState<any>(null);
    const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['totalClicks', 'totalCost']);

    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date()
    });

    // Add handleMetricChange function
    const handleMetricChange = (metric: MetricKey) => {
        setSelectedMetrics(prev => 
            prev.includes(metric) 
                ? prev.filter(m => m !== metric)
                : [...prev, metric]
        );
    };

    // State variables for caching filter options
    const [cachedAgeRanges, setCachedAgeRanges] = useState<string[]>([]);
    const [cachedGenders, setCachedGenders] = useState<string[]>([]);
    
    const fetchData = async (
        tabId: string, 
        requestData?: {
            startDate: string;
            endDate: string;
            page: number;
            limit: number;
            status?: string; // Ensure status is included here
            campaign?: string;
            adGroup?: string;
            agerange?: string;
            gender?: string;
        }, 
        _forceRefresh?: boolean
    ) => {
        try {
            setLoading(true);
            const apiEndpoint = tabId === 'gender' 
                ? `${baseURL}/api/segment/genderMetrics/${brandId}`
                : `${baseURL}/api/segment/ageMetrics/${brandId}`;
    
            // Prepare the request body with all possible filters
            const requestBody = {
                startDate: requestData?.startDate || (date?.from ? format(date.from, "yyyy-MM-dd") : ""),
                endDate: requestData?.endDate || (date?.to ? format(date.to, "yyyy-MM-dd") : ""),
                page: requestData?.page || currentPage,
                limit: requestData?.limit || ROWS_PER_PAGE,
                ...(requestData?.status && { status: requestData.status }), // Ensure this line is present
                ...(requestData?.campaign && requestData.campaign !== 'all' && { campaign: requestData.campaign }),
                ...(requestData?.adGroup && requestData.adGroup !== 'all' && { adGroup: requestData.adGroup }),
                ...(activeTab === 'age' && requestData?.agerange && requestData.agerange !== 'all' && { agerange: requestData.agerange }),
                ...(activeTab === 'gender' && requestData?.gender && requestData.gender !== 'all' && { gender: requestData.gender })
            };
    
            console.log("Fetch Request Body:", requestBody); // Debug logging
    
            const response = await axios.post(apiEndpoint, requestBody, { withCredentials: true });
    
            if (response.data.success) {
                // Extract campaign names for both age and gender metrics
                const campaignNames: string[] = response.data.campaignAdGroupPairs?.map((pair: { campaignName: string }) => pair.campaignName) || [];
                const genderCampaignNames: string[] = response.data.genderCampaignAdGroupPairs?.map((pair: { campaignName: string }) => pair.campaignName) || [];
                
                // In fetchData function
                const campaignAdGroupMap = response.data.campaignAdGroupPairs.reduce((acc: Record<string, string[]>, pair: CampaignAdGroupPair) => {
                    acc[pair.campaignName] = pair.adGroups;
                    return acc;
                }, {});

                setFilterOptions(prevOptions => ({
                    ...prevOptions,
                    campaigns: campaignNames,
                    adGroups: response.data.campaignAdGroupPairs.flatMap((pair: { adGroups: any; }) => pair.adGroups),
                    campaignAdGroupMap: campaignAdGroupMap
                }));

                console.log("whole data");
                console.log("Extracted Campaign Names:", campaignNames); // Debugging log
            
                const data = tabId === 'gender' ? response.data.genderData || [] : response.data.ageData || [];
            
                if (tabId === 'age') {
                    const ageRanges = new Set(data.map((item: any) => item.ageRange));
            
                    if (cachedAgeRanges.length === 0) {
                        setCachedAgeRanges(Array.from(ageRanges) as string[]);
                    }
            
                    setFilterOptions(prevOptions => ({
                        ...prevOptions,
                        ageRanges: cachedAgeRanges.length > 0 ? cachedAgeRanges : Array.from(ageRanges) as string[],
                        genders: prevOptions.genders
                    }));
                } else {
                    const genders = new Set(data.map((item: any) => 
                        item.gender === 'MALE' ? 'MALE' : 
                        item.gender === 'FEMALE' ? 'FEMALE' : 
                        item.gender
                    ));
            
                    if (cachedGenders.length === 0) {
                        setCachedGenders(Array.from(genders) as string[]);
                    }
            
                    setFilterOptions(prevOptions => ({
                        ...prevOptions,
                        campaigns: [...new Set([...campaignNames, ...genderCampaignNames])], // Combine both sets of campaign names
                        genders: cachedGenders.length > 0 ? cachedGenders : Array.from(genders) as string[]
                    }));
                }
            
                setData(data);
    
                const columns: ColumnDef[] = data.length > 0
                    ? Object.keys(data[0] || {})
                        .filter(key => key !== 'adGroupStatus')
                        .map(key => ({
                            id: key,
                            header: key === 'campaignStatus' 
                                ? 'Campaign Status' 
                                : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                            accessorKey: key,
                            cell: (value: any) => {
                                if (key === 'cost') {
                                    return `$${Number(value).toFixed(2)}`;
                                }
                                if (['roas', 'conversionsRate', 'ctr'].includes(key)) {
                                    return `${(Number(value) * 100).toFixed(2)}%`;
                                }
                                if (key === 'campaignStatus') {
                                    // Capitalize and style campaign status
                                    const statusColor = {
                                        'REMOVED': 'text-red-600',
                                        'PAUSED': 'text-yellow-600',
                                        'ENABLED': 'text-green-600'
                                    }[value as string] || '';
                                    return (
                                        <span className={`font-medium ${statusColor}`}>
                                            {value === 'REMOVED' ? 'Removed' : 
                                             value === 'PAUSED' ? 'Paused' : 
                                             value === 'ENABLED' ? 'Enabled' : value}
                                        </span>
                                    );
                                }
                                return String(value);
                            }
                        }))
                    : [];
                
                setTabs(prevTabs =>
                    prevTabs.map(t =>
                        t.id === tabId
                            ? { ...t, columns, data, lastUpdated: Date.now() }
                            : t
                    )
                );
    
                const aggregatedData = tabId === 'gender' 
                    ? response.data.aggregatedRecords 
                    : response.data.ageRangeAggregatedMetrics;
                
                const processedGraphData = Object.entries(aggregatedData || {}).map(([key, metrics]) => {
                    const displayKey = tabId === 'gender' 
                        ? (key === 'MALE' ? 'Male' : key === 'FEMALE' ? 'Female' : key)
                        : key;
                        
                    const baseEntry = {
                        [tabId === 'gender' ? 'gender' : 'ageRange']: displayKey
                    };
                    
                    if (metrics && typeof metrics === 'object' && !Array.isArray(metrics)) {
                        const typedMetrics = metrics as Record<string, number>;
                        return {
                            ...baseEntry,
                            totalConversions: typedMetrics.totalConversions || 0,
                            totalClicks: typedMetrics.totalClicks || 0,
                            totalCost: typedMetrics.totalCost || 0,
                            totalCTR: typedMetrics.totalCTR || 0
                        };
                    }
                    return baseEntry;
                });
    
                setGraphData(processedGraphData);
                setTotalRecords(response.data.totalRecords || 0);
                setTotalPages(response.data.totalPages || 1);
                setHasMoreData(currentPage * ROWS_PER_PAGE < response.data.totalRecords);
            }
        } catch (error) {
            console.error(`Error fetching data:`, error);
            setGraphData(null);
        } finally {
            setLoading(false);
        }
    };



    const handleFilterChange = (filterKey: keyof FilterState, value: string) => {
        setFilters(prev => {
            const updatedFilters = {
                ...prev,
                [filterKey]: value
            };
    
            // Reset dependent filters when certain filters change
            if (filterKey === 'campaign') {
                updatedFilters.adGroup = 'all';
            }
    
            return updatedFilters;
        });
    
        // Prepare request body with updated filters
        const requestBody = {
            startDate: date?.from ? format(date.from, "yyyy-MM-dd") : "",
            endDate: date?.to ? format(date.to, "yyyy-MM-dd") : "",
            page: 1,
            limit: ROWS_PER_PAGE,
            status: filters.status === 'all' ? undefined : filters.status,
            campaign: filterKey === 'campaign' ? value : filters.campaign,
            adGroup: filterKey === 'adGroup' ? value : filters.adGroup,
            
            // Specifically handle age and gender filters
            ...(activeTab === 'age' && {
                agerange: filterKey === 'ageRange' ? value : 
                          filters.ageRange !== 'all' ? filters.ageRange : undefined
            }),
            ...(activeTab === 'gender' && {
                gender: filterKey === 'gender' ? value : 
                        filters.gender !== 'all' ? filters.gender : undefined
            })
        };
    
        // Debug logging
        console.log('Filter Change Request:', {
            filterKey,
            value,
            activeTab,
            requestBody
        });
    
        // Force data refresh with new filters
        fetchData(activeTab, requestBody, true);
    };
    useEffect(() => {
        const requestBody = {
            startDate: date?.from ? format(date.from, "yyyy-MM-dd") : "",
            endDate: date?.to ? format(date.to, "yyyy-MM-dd") : "",
            page: currentPage,
            limit: ROWS_PER_PAGE,
            status: filters.status === 'all' ? undefined : filters.status,
            campaign: filters.campaign === 'all' ? undefined : filters.campaign,
            adGroup: filters.adGroup === 'all' ? undefined : filters.adGroup,
            
            // Conditional filters based on active tab
            ...(activeTab === 'age' && filters.ageRange !== 'all' && { 
                agerange: filters.ageRange 
            }),
            ...(activeTab === 'gender' && filters.gender !== 'all' && { 
                gender: filters.gender 
            })
        };
    
        console.log('UseEffect Fetch Request:', { 
            activeTab, 
            filters, 
            requestBody 
        });
        
        fetchData(activeTab, requestBody);
    
        const intervalId = setInterval(() => {
            fetchData(activeTab, requestBody);
        }, 300000); // 5 minutes
    
        return () => clearInterval(intervalId);
    }, [
        activeTab, 
        date, 
        currentPage, 
        filters.campaign,
        filters.adGroup,
        filters.ageRange,
        filters.gender,
        filters.status
    ]);
    const handleTabChange = (newTabId: string) => {
        setActiveTab(newTabId);
        setCurrentPage(1);
        const requestBody = {
            startDate: date?.from ? format(date.from, "yyyy-MM-dd") : "",
            endDate: date?.to ? format(date.to, "yyyy-MM-dd") : "",
            page: 1,
            limit: ROWS_PER_PAGE
        };
        fetchData(newTabId, requestBody);
    };

    const sortableColumns = [
        'campaignName',
        'adGroupName',
        'campaignStatus',
        'ageRange',
        'conversionsValue',
        'conversionsRate',
        'avg_cpc', 
        'cost',
        'roas',
        'conversions',
        'clicks',
        'ctr'
    ];

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

    const { columns } = (() => {
        const currentTab = tabs.find(tab => tab.id === activeTab);
        if (!currentTab) return { columns: [] };
        return {
            columns: currentTab.columns,
        };
    })();

    const sortedData = useMemo(() => {
        if (!sortColumn) return data;

        return [...data].sort((a, b) => {
            const aValue = a[sortColumn];
            const bValue = b[sortColumn];

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
            }

            const stringA = String(aValue || '').toLowerCase();
            const stringB = String(bValue || '').toLowerCase();

            if (stringA < stringB) return sortOrder === 'asc' ? -1 : 1;
            if (stringA > stringB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortColumn, sortOrder]);

   // Handle page change
    const handlePageChange = (newPage: number) => {
        const validPage = Math.min(Math.max(1, newPage), totalPages);
        setCurrentPage(validPage);
        // Fetch data for the new page
        const requestBody = {
            startDate: date?.from ? format(date.from, "yyyy-MM-dd") : "",
            endDate: date?.to ? format(date.to, "yyyy-MM-dd") : "",
            page: validPage,
            limit: ROWS_PER_PAGE
        };
        fetchData(activeTab, requestBody);
    };

    const colorPalette = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

    return (
        <div className='w-full'>
            <div className='flex flex-row gap-2 items-center mb-4'>
                <GoogleLogo />
                <h1 className='text-xl font-bold text-gray-800'>Age and Gender Metrics</h1>
            </div>
            <div className='bg-white p-6 rounded-xl shadow-lg border border-gray-200'>
                <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                    <div className="flex space-x-2" role="tablist">
                        {tabs.map(tab => (
                            <Button
                                key={tab.id}
                                variant={activeTab === tab.id ? "default" : "ghost"}
                                onClick={() => handleTabChange(tab.id)}
                                className="relative"
                            >
                                {tab.id === 'age' ? <Package className="w-4 h-4 mr-2" /> : <Layers className="w-4 h-4 mr-2" />}
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                                )}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <DatePickerWithRange
                            date={date}
                            setDate={setDate}
                            defaultDate={{
                                from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                                to: new Date(),
                            }}
                        />
                        {showGraph && (
                            <div className="flex gap-2">
                                {Object.keys(metricLabels).map(metric => (
                                    <label key={metric} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedMetrics.includes(metric as MetricKey)}
                                            onChange={() => handleMetricChange(metric as MetricKey)}
                                        />
                                        <span className="text-sm text-gray-700">{metricLabels[metric as MetricKey]}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {
                                const requestBody = {
                                    startDate: date?.from ? format(date.from, "yyyy-MM-dd") : "",
                                    endDate: date?.to ? format(date.to, "yyyy-MM-dd") : "",
                                    page: 1,
                                    limit: 1000
                                };
                                fetchData(activeTab, requestBody, true);
                            }}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? '' : ''}`} />
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowGraph(!showGraph)}
                        >
                            {showGraph ? "Show Table" : "Show Graph"}
                        </Button>
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
                                        <h3 className="font-medium mb-2">Campaign</h3>
                                        <Select 
                                            onValueChange={(value) => handleFilterChange('campaign', value)} 
                                            value={filters.campaign}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select campaign" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {filterOptions.campaigns.map(campaign => (
                                                    <SelectItem key={campaign} value={campaign}>
                                                        {campaign}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {filters.campaign !== 'all' && (
                                        <div>
                                            <h3 className="font-medium mb-2">Ad Group</h3>
                                            <Select 
                                                onValueChange={(value) => handleFilterChange('adGroup', value)} 
                                                value={filters.adGroup}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select ad group" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Ad Groups</SelectItem>
                                                    {(filters.campaign === 'all' 
                                                        ? filterOptions.adGroups 
                                                        : filterOptions.campaignAdGroupMap?.[filters.campaign] || []
                                                    ).map(adGroup => (
                                                        <SelectItem key={adGroup} value={adGroup}>
                                                            {adGroup}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-medium mb-2">Status</h3>
                                        <Select 
                                            onValueChange={(value) => handleFilterChange('status', value)} 
                                            value={filters.status}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {filterOptions.statusOptions.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {activeTab === 'age' && (
                                        <div>
                                            <h3 className="font-medium mb-2">Age Range</h3>
                                            <Select 
                                                onValueChange={(value) => handleFilterChange('ageRange', value)} 
                                                value={filters.ageRange}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select age range" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    {filterOptions.ageRanges.map((range) => (
                                                        <SelectItem key={range} value={range}>
                                                            {range.replace('AGE_RANGE_', '').replace(/_/g, '-')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {activeTab === 'gender' && (
                                        <div>
                                            <h3 className="font-medium mb-2">Gender</h3>
                                            <Select 
                                                onValueChange={(value) => handleFilterChange('gender', value)} 
                                                value={filters.gender}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    {filterOptions.genders.map((gender) => (
                                                        <SelectItem key={gender} value={gender}>
                                                            {gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : gender}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
                        </div>
                    ) : showGraph ? (
                        activeTab === 'age' && graphData ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={graphData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="ageRange" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Legend />
                                    {selectedMetrics.map((metric, index) => (
                                        <Bar key={metric} dataKey={metric} fill={colorPalette[index % colorPalette.length]} name={metricLabels[metric as MetricKey]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            activeTab === 'gender' && graphData ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={graphData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="gender" />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Legend />
                                        {selectedMetrics.map((metric, index) => (
                                            <Bar key={metric} dataKey={metric} fill={colorPalette[index % colorPalette.length]} name={metricLabels[metric as MetricKey]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : null
                        )
                    ) : (
                        <div className="rounded-md border border-gray-200 overflow-hidden">
                            <div className="max-h-[350px] overflow-auto">
                                <table className="w-full">
                                    <thead className="sticky top-0 z-10 bg-[#4A628A]">
                                        <tr>
                                            {columns.map(column => (
                                                <th 
                                                    key={column.id} 
                                                    className="px-4 py-3 text-left text-xs font-medium text-gray-50 uppercase tracking-wider min-w-[150px] cursor-pointer"
                                                    onClick={() => sortableColumns.includes(column.id) && handleSort(column.id)}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        {column.header}
                                                        {sortableColumns.includes(column.id) && (
                                                            sortColumn === column.id ? (
                                                                sortOrder === 'asc' ? <ArrowUp className="ml-1 w-4 h-6 text-[#ffffff]" /> : <ArrowDown className="ml-1 w-4 h-6 text-[#ffffff]" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-1 w-4 h-6 text-gray-300" />
                                                            )
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sortedData.map((row, rowIndex) => (
                                            <tr 
                                                key={rowIndex} 
                                                className="hover:bg-gray-50"
                                            >
                                                {columns.map((column) => (
                                                    <td 
                                                        key={column.id} 
                                                        className="px-4 py-2.5 text-sm whitespace-nowrap min-w-[150px]"
                                                    >
                                                        {column.cell(row[column.accessorKey])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {sortedData.length === 0 && (
                                            <tr>
                                                <td 
                                                    colSpan={columns.length} 
                                                    className="px-4 py-4 text-center text-gray-500"
                                                >
                                                    No data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
                                <div className="text-sm text-gray-700">
                                    {sortedData.length > 0 ? (
                                        `Showing ${((currentPage - 1) * ROWS_PER_PAGE) + 1} to ${Math.min(currentPage * ROWS_PER_PAGE, totalRecords)} of ${totalRecords} entries`
                                    ) : (
                                        'Showing 0 entries'
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    <div className="text-sm text-gray-700">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={!hasMoreData}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>  
            </div>
        </div>
    );
}