import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Filter, ChevronLeft, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip'
import { GoogleLogo } from '@/pages/CampaignMetricsPage'

type Metrics = {
    totalClicks: number
    totalImpressions: number
    ctr: number
    totalCost: number
    products: number
}

type Category = {
    name: string
    metrics: Metrics
    subcategories: Category[]
}

type ColumnDef = {
    id: string
    header: string
    accessorKey: string
    cell: (value: any) => React.ReactNode
}

type TabConfig = {
    id: string
    label: string
    apiEndpoint: string
    columns: ColumnDef[]
    data: any[]
    lastUpdated: number | null,
}

export default function ProductTab() {
    const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL
    const { brandId } = useParams()

    const [tabs, setTabs] = useState<TabConfig[]>([
        { id: 'products', label: 'Products', apiEndpoint: `${baseURL}/api/segment/productMetrics/${brandId}`, columns: [], data: [], lastUpdated: null },
        { id: 'categories', label: 'Categories', apiEndpoint: `${baseURL}/api/segment/categoryMetrics/${brandId}`, columns: [], data: [], lastUpdated: null },
        { id: 'brands', label: 'Brands', apiEndpoint: `${baseURL}/api/segment/brandMetrics/${brandId}`, columns: [], data: [], lastUpdated: null },
        { id: 'productTypes', label: 'Product types', apiEndpoint: `${baseURL}/api/segment/typeMetrics/${brandId}`, columns: [], data: [], lastUpdated: null },
    ])
    const [activeTab, setActiveTab] = useState(tabs[0].id)
    const [currentPage, setCurrentPage] = useState(1)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [filterApplied, setFilterApplied] = useState(false);
    const rowsPerPage = 100
    const [prevActiveTab, setPrevActiveTab] = useState<string | null>(null);
    const [filterData, setFilterData] = useState<any>({});
    const cacheRef = useRef<{ [key: string]: { data: any; timestamp: number } }>({});
    const POLL_INTERVAL = 5 * 60 * 1000; 


    const handleTabChange = (newTabId: string) => {
        setActiveTab(newTabId);
        setCurrentPage(1); 
        setExpandedCategories(new Set()); 
    };



const fetchTabData = useCallback(
    async (tabId: string, body: Record<string, any> = {}, isFilterApplied: boolean = false) => {
        if (loading) return;

        setLoading(true);

        const tab = tabs.find(t => t.id === tabId);
        if (!tab) {
            console.warn(`Tab not found for ID: ${tabId}`);
            return;
        }

        // Get cached data from cacheRef
        const cachedData = cacheRef.current[tabId];
        const now = Date.now();

        // Check if cached data is still valid and use it if necessary
        if (!isFilterApplied && cachedData && now - cachedData.timestamp < POLL_INTERVAL) {
            setTabs(prevTabs =>
                prevTabs.map(t =>
                    t.id === tabId ? { ...t, data: cachedData.data, lastUpdated: cachedData.timestamp } : t
                )
            );
            setLoading(false);
            return;
        }

        // If filter is applied, update the cache only for the 'products' tab (force data fetch)
        if (isFilterApplied && tabId === 'products') {
            cacheRef.current['products'] = null as any; // Clear cache for the 'products' tab
        }

        if (isFilterApplied && tabId !== 'products' && cachedData && now - cachedData.timestamp < POLL_INTERVAL) {
            setTabs(prevTabs =>
                prevTabs.map(t =>
                    t.id === tabId ? { ...t, data: cachedData.data, lastUpdated: cachedData.timestamp } : t
                )
            );
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(tab.apiEndpoint, body, { withCredentials: true });

            if (response.data.success) {
                const result = response.data;
                const data = result[`${tabId}Data`] || [];
                const columns: ColumnDef[] = Object.keys(data[0] || {}).map(key => ({
                    id: key,
                    header: key.charAt(0).toUpperCase() + key.slice(1),
                    accessorKey: key,
                    cell: (value: any) => {
                        if (key === 'issues' && Array.isArray(value)) {
                            return value.length > 0 ? value[0].description : 'No issues';
                        }

                        return String(value);
                    }
                }));

                setTabs(prevTabs =>
                    prevTabs.map(t =>
                        t.id === tabId ? { ...t, columns, data, lastUpdated: now } : t
                    )
                );

                // Cache the fetched data with a timestamp
                cacheRef.current[tabId] = { data, timestamp: now };
            } else {
                console.error(`Failed to fetch data for ${tabId}`);
            }
        } catch (error) {
            console.error(`Error fetching data for ${tabId}:`, error);
        } finally {
            setLoading(false);
        }
    },
    [tabs, loading, cacheRef, filterApplied] // Add dependencies that should trigger redefinition
);




    useEffect(() => {
        const intervalId = setInterval(() => {
            // Only fetch data if it's been more than 5 minutes since last fetch
            fetchTabData(activeTab, filterApplied ? filterData : {}, filterApplied ? true : false);
        }, POLL_INTERVAL);

        return () => clearInterval(intervalId); 
    }, [activeTab, filterApplied, filterData]);


    useEffect(() => {
        const requestBody = filterApplied ? filterData : {};
        if (prevActiveTab !== activeTab || filterApplied) {
            fetchTabData(activeTab, requestBody, filterApplied ? true : false); 
            setPrevActiveTab(activeTab); 
        }
    }, [activeTab, filterApplied, filterData, prevActiveTab]); 


    const handleRowClick = (currentTab: string, rowData: Record<string, any>) => {
        const tabColumnMapping: Record<string, string> = {
            brands: 'Brand', // Column name to fetch value when on Brand tab
            productTypes: 'Type', // Column name to fetch value when on Product types tab
            categories: 'name' // Column name to fetch value when on Categories tab
        };
    
        const bodyKeyMapping: Record<string, string> = {
            brands: 'brands', // Key to send in the API request body when on Brand tab
            productTypes: 'productType', // Key to send in the API request body when on Product types tab
            categories: 'categoryName' // Key to send in the API request body when on Categories tab
        };
    
        const columnToFetch = tabColumnMapping[currentTab];
        const bodyKey = bodyKeyMapping[currentTab];
    
        if (columnToFetch && bodyKey) {
            const valueToSend = rowData[columnToFetch]; // Get value from the row based on the column name
    
            if (valueToSend) {
                const filterPayload: Record<string, any> = {
                    [bodyKey]: valueToSend, // Add the main key-value pair
                };
    
                // Add the additional key for the 'categories' tab
                if (currentTab === 'categories' && rowData.level) {
                    filterPayload['categoryLevel'] = rowData.level; // Add the additional key
                }
    
                // Set filter state
                setFilterData(filterPayload); // Set custom filter data
                setFilterApplied(true); // Mark filter as applied
                setActiveTab('products'); // Switch to the Products tab
            } else {
                console.warn(`No value found for column "${columnToFetch}" in row`, rowData);
            }
        } else {
            console.warn(`No column or body key mapping found for tab: ${currentTab}`);
        }
    };
    


    const toggleCategory = (categoryPath: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev)
            if (newSet.has(categoryPath)) {
                newSet.delete(categoryPath)
            } else {
                newSet.add(categoryPath)
            }
            return newSet
        })
    }

    const renderCategoryRow = (category: Category, depth: number = 0, path: string = '') => {
        const currentPath = path ? `${path}.${category.name}` : category.name
        const isExpanded = expandedCategories.has(currentPath)
    
        return (
            <React.Fragment key={currentPath}>
                <tr className={`${isExpanded ? 'bg-gray-100' : 'bg-white'}`}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm flex items-center">
                        <div style={{ marginLeft: `${depth * 20}px` }} onClick={() => toggleCategory(currentPath)} className="flex items-center cursor-pointer">
                            {category.subcategories.length > 0 && (
                                <button className="mr-2">
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                            )}
                            {category.name}
                        </div>
                    </td>
                    <td
                        className="px-4 py-2 whitespace-nowrap text-sm cursor-pointer text-blue-500 underline"
                        onClick={() => handleRowClick(activeTab, category)} // Adding handleRowClick to the Products column
                    >
                        {category.metrics.products}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{category.metrics.totalClicks}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{category.metrics.totalImpressions}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{category.metrics.ctr.toFixed(2)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{category.metrics.totalCost.toFixed(2)}</td>
                </tr>
                {isExpanded &&
                    category.subcategories.map(subCategory =>
                        renderCategoryRow(subCategory, depth + 1, currentPath)
                    )}
            </React.Fragment>
        )
    }
    

    const getCurrentTabData = () => {
        const currentTab = tabs.find(tab => tab.id === activeTab)
        if (!currentTab || currentTab.id === 'categories') return { columns: [], data: [] }

        const startIndex = (currentPage - 1) * rowsPerPage
        const endIndex = startIndex + rowsPerPage
        return {
            columns: currentTab.columns,
            data: currentTab.data.slice(startIndex, endIndex)
        }
    }

    const { columns, data } = getCurrentTabData()
    const totalPages = Math.ceil((tabs.find(tab => tab.id === activeTab)?.data.length || 0) / rowsPerPage)

    const categoryColumns = [
        { id: 'name', header: 'Name' },
        { id: 'products', header: 'Products' },
        { id: 'totalClicks', header: 'Clicks' },
        { id: 'totalImpressions', header: 'Impressions' },
        { id: 'ctr', header: 'CTR' },
        { id: 'totalCost', header: 'Cost' },

    ]
    function TableSkeleton() {
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                    <thead>
                        <tr>
                            {['w-24', 'w-32', 'w-32', 'w-24', 'w-24', 'w-24'].map((width, index) => (
                                <th key={index} className="px-4 py-2 border-b">
                                    <Skeleton className={`h-4 ${width}`} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <tr key={index}>
                                {['w-24', 'w-32', 'w-32', 'w-24', 'w-24', 'w-24'].map((width, idx) => (
                                    <td key={idx} className="px-4 py-2 border-b">
                                        <Skeleton className={`h-4 ${width}`} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className='w-full'>
            <div className='flex flex-row gap-2 items-center mb-3'>
                <GoogleLogo />
                <h1 className='text-lg font-semibold'>Google Ads Product Insights</h1>
            </div>
            <div className='bg-white p-3 rounded-xl shadow-md'>
                <div className="flex items-center justify-between border-b">
                    <div className="flex" role="tablist">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-controls={`tabpanel-${tab.id}`}
                                id={`tab-${tab.id}`}
                                onClick={() => {
                                    handleTabChange(tab.id); // Call the handleTabChange function
                                }}
                                className={`relative px-4 py-2 bg-white shadow-none hover:bg-gray-100 ${activeTab === tab.id ? 'text-cyan-700 font-semibold' : 'text-gray-600'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-700" />
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 p-2">
                        <button className="p-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100">
                            <Filter className={` ${filterApplied ? 'text-blue-600' : 'text-black'} h-4 w-4`} />
                        </button>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className={`p-2 bg-black text-sm border border-gray-300 rounded-md hover:bg-gray-800`}>
                                        <RefreshCw className={`h-4 w-4 text-white ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </TooltipTrigger>
                                {tabs.find(t => t.id === activeTab)?.lastUpdated && (
                                    <TooltipContent className='mb-2 shadow-md'>
                                        <p className='text-xs bg-white px-2 py-1 text-gray-700 rounded-xl'>Last updated: {new Date(tabs.find(t => t.id === activeTab)?.lastUpdated || 0).toLocaleString()}</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <div className="p-4">
                    {filterApplied && (
                        <div className="flex items-center gap-2 mb-2 w-fit p-2 bg-gray-100 rounded-full">
                            <span className="text-xs font-medium">{Object.entries(filterData).map(([key, value]) => `${key}: ${value}`).join(', ')}</span>
                            <button
                                onClick={() => {
                                    setFilterApplied(false);
                                    setFilterData({});
                                    setActiveTab('products')
                                    cacheRef.current['products'] = null as any;
                                    fetchTabData('products', {}, false);
                                }}
                                className="text-red-500 hover:text-gray-700"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                    <div className="rounded-md border">
                        <div className="max-h-[380px] overflow-auto">
                            {loading ? <TableSkeleton /> : (<table className="w-full">
                                <thead className="sticky top-0 z-10 bg-[#134B70]">
                                    <tr>
                                        {(activeTab === 'categories' ? categoryColumns : columns).map(column => (
                                            <th key={column.id} className="px-4 py-3 text-left text-xs font-medium min-w-[150px] uppercase tracking-wider">
                                                <div className="flex items-center gap-1 text-white">
                                                    {column.header}
                                                    <ChevronDown className="h-4 w-4" />
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {activeTab === 'categories' ? (
                                        tabs.find(tab => tab.id === 'categories')?.data.map((category: Category) =>
                                            renderCategoryRow(category)
                                        )
                                    ) : (
                                        data.map((row, i) => (
                                            <tr key={i} className="max-w-[200px]">
                                            {columns.map((column) => {
                                                const value = column.cell(row[column.accessorKey]); // Get the cell value
                                                const isIssuesColumn = column.id === 'issues';
                                                const isProductColumn = column.id === 'Products';
                                                const isStatusColumn = column.id === 'status';
                                                const isNoIssues = typeof value === 'string' && value.trim().toLowerCase() === 'no issues';
                                        
                                                const getStatusColor = (status: string) => {
                                                    switch (status.trim().toUpperCase()) {
                                                        case "UNSPECIFIED": return 'text-gray-800';  // UNSPECIFIED
                                                        case "UNKNOWN": return 'text-yellow-800'; // UNKNOWN
                                                        case "NOT_ELIGIBLE": return 'text-red-800'; // NOT_ELIGIBLE
                                                        case "ELIGIBLE_LIMITED": return 'text-orange-800'; // ELIGIBLE_LIMITED
                                                        case "ELIGIBLE": return 'text-green-800'; // ELIGIBLE
                                                        default: return 'text-gray-700'; // Default color if status is unknown
                                                    }
                                                };
                                        
                                                // Render the cell value based on the column type
                                                const renderCell = () => {
                                                    if (isIssuesColumn) {
                                                        const icon = isNoIssues ? (
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                        ) : (
                                                            <AlertCircle className="w-4 h-4 mr-2" />
                                                        );
                                        
                                                        return (
                                                            <div className="flex items-center">
                                                                {icon}
                                                                {value}
                                                            </div>
                                                        );
                                                    }
                                        
                                                    if (isStatusColumn) {
                                                        const statusValue = value ? String(value) : ''; // Ensure value is treated as string and compare in uppercase
                                                        const colorClass = getStatusColor(statusValue); // Get the appropriate color class
                                        
                                                        return (
                                                            <div className={`px-2 py-1 rounded ${colorClass}`}>
                                                                {statusValue}
                                                            </div>
                                                        );
                                                    }
                                        
                                                    return column.cell ? column.cell(value) : value;
                                                };
                                        
                                                return (
                                                    <td
                                                        key={column.id}
                                                        className={`px-4 py-2.5 whitespace-nowrap text-sm ${isProductColumn ? 'cursor-pointer text-blue-700 underline' : 'cursor-default'}
                                                        ${isIssuesColumn ? (isNoIssues ? 'text-green-600' : 'text-red-600') : ''}`}
                                                        onClick={() => isProductColumn && handleRowClick(activeTab, row)}
                                                    >
                                                        {renderCell()}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        
                                        
                                        ))
                                    )}
                                    {(activeTab === 'categories' ? tabs.find(tab => tab.id === 'categories')?.data.length === 0 : data.length === 0) && (
                                        <tr>
                                            <td
                                                colSpan={(activeTab === 'categories' ? categoryColumns : columns).length}
                                                className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-center"
                                            >
                                                No data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>)}
                        </div>
                        <div className="flex items-center justify-between px-4 py-4 border-t">
                            <div className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, tabs.find(t => t.id === activeTab)?.data.length || 0)} of {tabs.find(t => t.id === activeTab)?.data.length || 0} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 inline-block ml-1" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    )
}