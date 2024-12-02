import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Package, Layers, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { GoogleLogo } from '@/pages/CampaignMetricsPage';

type TabConfig = {
    id: string;
    label: string;
    apiEndpoint: string;
    columns: ColumnDef[];
    data: any[];
    lastUpdated: number | null;
    totalPages?: number;
    currentPage?: number;
};

type ColumnDef = {  
    id: string;
    header: string;
    accessorKey: string;
    cell: (value: any) => React.ReactNode;
};

export default function AgeAndGenderMetrics() {
    const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;
    const { brandId } = useParams();

    if (!brandId) {
        return <div>Error: Brand ID is missing</div>;
    }

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

    const [activeTab, setActiveTab] = useState(tabs[0].id);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showGraph, setShowGraph] = useState(false);
    const rowsPerPage = 100;
    const [graphData, setGraphData] = useState<any>(null);

    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of the current month
        to: new Date() // Current date
    });

    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

    const handleDateRangeChange = (range: { startDate: Date | null, endDate: Date | null }) => {
        const newDateRange = {
            from: range.startDate || undefined, 
            to: range.endDate || undefined
        };
        
        setDate(newDateRange);
        
        const requestBody = {
            startDate: range.startDate ? format(range.startDate, "yyyy-MM-dd") : "",
            endDate: range.endDate ? format(range.endDate, "yyyy-MM-dd") : ""
        };

        fetchAllPages(activeTab, requestBody, true);
    };

    const handleTabChange = (newTabId: string) => {
        setActiveTab(newTabId);
        setCurrentPage(1);
        fetchAllPages(newTabId);
    };

    const defaultDateRange = {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of the current month
        to: new Date(),   // Current date
    };
    
    const fetchAllPages = useCallback(
        async (tabId: string, additionalFilters: Record<string, any> = {}, forceRefresh = false) => {
            if (loading && !forceRefresh) return;
    
            setLoading(true);
    
            const tab = tabs.find(t => t.id === tabId);
            if (!tab) {
                console.error(`Tab not found for ID: ${tabId}`);
                setLoading(false);
                return;
            }
    
            try {
                const response = await axios.post(tab.apiEndpoint, {
                    ...additionalFilters
                }, { withCredentials: true });
    
                if (response.data.success) {
                    const data = tabId === 'gender' 
                        ? response.data.genderData || [] 
                        : response.data.ageData || [];
                    
                    console.log("Fetched Data:", data);
    
                    const columns: ColumnDef[] = data.length > 0
                        ? Object.keys(data[0] || {}).map(key => ({
                            id: key,
                            header: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                            accessorKey: key,
                            cell: (value: any) => String(value)
                        }))
                        : [];
    
                    setTabs(prevTabs =>
                        prevTabs.map(t =>
                            t.id === tabId
                                ? { ...t, columns, data, lastUpdated: Date.now() }
                                : t
                        )
                    );
    
                    fetchMetrics(tabId);
                } else {
                    console.error(`Failed to fetch data for ${tabId}`);
                }
            } catch (error) {
                console.error(`Error fetching data for ${tabId}:`, error);
            } finally {
                setLoading(false);
            }
        },
        [tabs, loading]
    );

    const fetchMetrics = async (tabId: string) => {
        try {
            const apiEndpoint = tabId === 'gender' 
                ? `${baseURL}/api/segment/genderMetrics/${brandId}`
                : `${baseURL}/api/segment/ageMetrics/${brandId}`;

            const requestBody = {
                startDate,
                endDate,
                page: currentPage,
                limit: 1000
            };

            console.log("Request Body for Gender Metrics:", requestBody);

            const response = await axios.post(apiEndpoint, requestBody, { withCredentials: true });

            if (response.data.success) {
                const data = tabId === 'gender' 
                ? response.data.genderData || [] 
                : response.data.ageData || [];
            
            console.log("Fetched Data:", data);

            const columns: ColumnDef[] = data.length > 0
                ? Object.keys(data[0] || {}).map(key => ({
                    id: key,
                    header: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                    accessorKey: key,
                    cell: (value: any) => String(value)
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

            console.log("Aggregated Data:", aggregatedData);
            console.log("Tab ID:", tabId);

            if (tabId === 'gender') {
                console.log("Gender Data:", response.data.genderData);
            }

            console.log("Mapped Graph Data:", Object.entries(aggregatedData).map(([key, metrics]) => ({
                [tabId === 'gender' ? 'gender' : 'ageRange']: key.replace("AGE_RANGE_", "").replace(/_/g, "-"),
                ...metrics
            })));

            setGraphData(Object.entries(aggregatedData).map(([key, metrics]) => {
                const baseEntry = {
                    [tabId === 'gender' ? 'gender' : 'ageRange']: key.replace("AGE_RANGE_", "").replace(/_/g, "-")
                };
                
                return metrics && typeof metrics === 'object' && !Array.isArray(metrics)
                    ? { ...baseEntry, ...metrics } 
                    : baseEntry;
            }));
        } else {
            console.error(`Failed to fetch data for ${tabId}`);
            setGraphData(null);
        }
    } catch (error) {
        console.error(`Error fetching data for ${tabId}:`, error);
        setGraphData(null);
    }
};

useEffect(() => {
    if (brandId) {
        fetchMetrics(activeTab);
    }
}, [brandId, activeTab, startDate, endDate]);

const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

const handleSort = (column: string) => {
    console.log('Sorting Column:', column);
    console.log('Sort Order:', sortOrder);
    if (sortColumn === column) {
        setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    } else {
        setSortColumn(column);
        setSortOrder('asc');
    }
};

const { columns, data } = (() => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return { columns: [], data: [] };

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    
    return {
        columns: currentTab.columns,
        data: currentTab.data.slice(startIndex, endIndex)
    };
})();

const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

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
}, [data, sortColumn, sortOrder]);

const sortableColumns = ['cost', 'roas', 'conversions', 'conversionsValue', 'conversionsRate', 'clicks'];

const totalPages = Math.ceil((tabs.find(tab => tab.id === activeTab)?.data.length || 0) / rowsPerPage);

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
                        defaultDate={defaultDateRange}
                        onChange={handleDateRangeChange}
                    />
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => {
                            const requestBody = {
                                startDate: date?.from ? format(date.from, "yyyy-MM-dd") : "",
                                endDate: date?.to ? format(date.to, "yyyy-MM-dd") : ""
                            };
                            fetchAllPages(activeTab, requestBody, true);
                        }}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => setShowGraph(!showGraph)}
                    >
                        {showGraph ? "Show Table" : "Show Graph"}
                    </Button>
                </div>
            </div>

            <div className='space-y-4'>
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
                                <Bar dataKey="totalClicks" fill="#8884d8" name="Total Clicks" />
                                <Bar dataKey="totalCost" fill="#82ca9d" name="Total Cost" />
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
                                    <Bar dataKey="totalClicks" fill="#8884d8" name="Total Clicks" />
                                    <Bar dataKey="totalCost" fill="#82ca9d" name="Total Cost" />
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
                                                onClick={() => sortableColumns.includes(column.id.toLowerCase()) && handleSort(column.id)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {column.header}
                                                    {sortableColumns.includes(column.id.toLowerCase()) && (
                                                        console.log('Column ID:', column.id),
                                                        console.log('Sort Column:', sortColumn),
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
                                    {loading ? (
                                        <TableSkeleton />
                                    ) : sortedData.length > 0 ? (
                                        sortedData.map((row, rowIndex) => (
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
                                        ))
                                    ) : (
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
                                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
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

const TableSkeleton = () => (
<div className="animate-pulse">
    {[...Array(5)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex border-b last:border-b-0 p-4">
            {[...Array(4)].map((_, colIndex) => (
                <div 
                    key={colIndex} 
                    className="h-4 bg-gray-200 rounded w-1/4 mr-4 last:mr-0"
                ></div>
            ))}
        </div>
    ))}
</div>
);