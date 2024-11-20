import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Filter, ChevronLeft, X, CheckCircle, AlertCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Skeleton } from '@/components/ui/skeleton'

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
}

export default function ProductTab() {
    const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL
    const { brandId } = useParams()

    const [tabs, setTabs] = useState<TabConfig[]>([
        { id: 'products', label: 'Products', apiEndpoint: `${baseURL}/api/segment/productMetrics/${brandId}`, columns: [], data: [] },
        { id: 'categories', label: 'Categories', apiEndpoint: `${baseURL}/api/segment/categoryMetrics/${brandId}`, columns: [], data: [] },
        { id: 'brands', label: 'Brands', apiEndpoint: `${baseURL}/api/segment/brandMetrics/${brandId}`, columns: [], data: [] },
        { id: 'productTypes', label: 'Product types', apiEndpoint: `${baseURL}/api/segment/typeMetrics/${brandId}`, columns: [], data: [] },
    ])
    const [activeTab, setActiveTab] = useState(tabs[0].id)
    const [currentPage, setCurrentPage] = useState(1)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [filterApplied, setFilterApplied] = useState(false);
    const rowsPerPage = 100
    const [prevActiveTab, setPrevActiveTab] = useState<string | null>(null);
    const [filterData, setFilterData] = useState<any>({});



    const handleTabChange = (newTabId: string) => {
        setActiveTab(newTabId);
        setCurrentPage(1); // Reset pagination to the first page when switching tabs
        setExpandedCategories(new Set()); // Reset any expanded categories

        // If you're switching to the 'products' tab, reset the filter
        if (newTabId === 'products') {
            setFilterApplied(false); // Reset filter state for products tab
            fetchTabData('products', {}); // Call API to fetch all data for the 'products' tab without a filter
        }
    };

    const fetchTabData = async (tabId: string, body: Record<string, any> = {}) => {
        if (loading) {
            return; // Prevent making another request if the previous one is still in progress
        }
    
        setLoading(true);
    
        const tab = tabs.find(t => t.id === tabId);
        if (!tab) {
            console.warn(`Tab not found for ID: ${tabId}`);
            return;
        }
    
        // If it's the 'products' tab, send the request only if the body is not empty
        const requestBody = tabId === 'products' && Object.keys(body).length > 0 ? body : {}; // Check if body has keys
    
        try {
            const response = await axios.post(
                tab.apiEndpoint,
                requestBody, // Dynamically pass the body
                { withCredentials: true }
            );
    
            if (response.data.success) {
                const result = response.data;
                const Data = result[`${tabId}Data`]?.[0] || {};
    
                const columns: ColumnDef[] = Object.keys(Data).map(key => ({
                    id: key,
                    header: key.charAt(0).toUpperCase() + key.slice(1),
                    accessorKey: key,
                    cell: (value: any) => {
                        if (key === 'issues' && Array.isArray(value)) {
                            return value.length > 0 ? value[0].description : 'No issues';
                        }
                
                        return String(value);
                    },
                }));
    
                setTabs(prevTabs =>
                    prevTabs.map(t =>
                        t.id === tabId ? { ...t, columns, data: result[`${tabId}Data`] } : t
                    )
                );
            } else {
                console.error(`Failed to fetch data for ${tabId}`);
            }
        } catch (error) {
            console.error(`Error fetching data for ${tabId}:`, error);
        } finally {
            setLoading(false);
        }
    };
    


    const handleRowClick = (currentTab: string, rowData: Record<string, any>) => {
        const tabColumnMapping: Record<string, string> = {
            brands: 'Brand', // Column name to fetch value when on Brand tab
            productTypes: 'Type', // Column name to fetch value when on Product Category tab
            // Add more mappings for other tabs as needed
        };

        const bodyKeyMapping: Record<string, string> = {
            brands: 'brands', // Key to send in the API request body when on Brand tab
            productTypes: 'productType', // Key to send in the API request body when on Product Category tab
            // Add more mappings for other tabs as needed
        };

        const columnToFetch = tabColumnMapping[currentTab];
        const bodyKey = bodyKeyMapping[currentTab];

        if (columnToFetch && bodyKey) {
            const valueToSend = rowData[columnToFetch]; // Get value from the row based on the column name

            if (valueToSend) {
                // Set filter state first
                setFilterData({ [bodyKey]: valueToSend });  // Set custom filter data
                setFilterApplied(true); // Mark filter as applied
                setActiveTab('products'); // Switch to the Products tab

            } else {
                console.warn(`No value found for column "${columnToFetch}" in row`, rowData);
            }
        } else {
            console.warn(`No column or body key mapping found for tab: ${currentTab}`);
        }
    };

    // useEffect to trigger data fetch whenever activeTab or filterApplied changes
    useEffect(() => {
        const requestBody = filterApplied ? filterData : {};
        console.log(filterData)

        if (prevActiveTab !== activeTab || filterApplied) {
            fetchTabData(activeTab, requestBody); // Fetch data for the current active tab with filter
            setPrevActiveTab(activeTab); // Update the previous active tab to prevent unnecessary re-fetching
        }
    }, [activeTab, filterApplied, filterData, prevActiveTab]); // Add filterData as a dependency to re-fetch when filter changes






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
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{category.metrics.products}</td>
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
        <div className='max-w-full'>
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
                        <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            <Filter className={` ${filterApplied ? 'text-blue-600' : 'text-black'} h-4 w-4 inline-block`} />
                        </button>
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
                                    fetchTabData(activeTab, {});
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
                                              const value = row[column.accessorKey]; // Destructure the value
                                              const isIssuesColumn = column.id === 'issues';
                                              const isProductColumn = column.id === 'Products';
                                              const isNoIssues = value === 'No issues';
                                          
                                              // Render the cell value based on the column type
                                              const renderCell = () => {
                                                if (isIssuesColumn) {
                                                  // Check if the issue is 'No issues' or not
                                                  const icon = isNoIssues ? (
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                  ) : (
                                                    <AlertCircle className="w-4 h-4 mr-2" />
                                                  );
                                          
                                                  return (
                                                    <div className="flex items-center">
                                                      {icon}
                                                      {column.cell ? column.cell(value) : value}
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