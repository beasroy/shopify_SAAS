import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { IBrand } from '@/interfaces';
import { updateBrandLabel } from '@/store/slices/BrandSlice';
import CollapsibleSidebar from '@/components/dashboard_component/CollapsibleSidebar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { baseURL } from '@/data/constant';
import Loader from '@/components/dashboard_component/loader';

export default function BrandConnections() {
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.user.user);
    const [allBrands, setAllBrands] = useState<IBrand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const tableRef = useRef<HTMLDivElement>(null);
    const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25);

    const [savingLabelId, setSavingLabelId] = useState<string | null>(null);

    const handleLabelUpdate = async (brandId: string, newLabel: string) => {
        setSavingLabelId(brandId);
        try {
            await axios.patch(`${baseURL}/api/brands/update/${brandId}`, { customLabel: newLabel }, { withCredentials: true });
            setAllBrands(prev => prev.map(b => b._id === brandId ? { ...b, customLabel: newLabel } : b));
            dispatch(updateBrandLabel({ id: brandId, customLabel: newLabel }));
        } catch (error) {
            console.error("Error updating label:", error);
        } finally {
            setSavingLabelId(null);
        }
    };

    useEffect(() => {
        const fetchAllBrands = async () => {
            try {
                const response = await axios.get(`${baseURL}/api/brands/all`, { withCredentials: true });
                setAllBrands(response.data);
            } catch (error) {
                console.error("Error fetching all brands:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllBrands();
    }, []);

    const filteredBrands = allBrands?.filter((brand: IBrand) => 
        brand.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a: IBrand, b: IBrand) => a.name.localeCompare(b.name)) || [];

    const effectiveItemsPerPage = itemsPerPage === 'all' ? filteredBrands.length : itemsPerPage;
    const totalPages = effectiveItemsPerPage > 0 ? Math.ceil(filteredBrands.length / effectiveItemsPerPage) : 1;
    const startIndex = (currentPage - 1) * effectiveItemsPerPage;
    const currentBrands = itemsPerPage === 'all' ? filteredBrands : filteredBrands.slice(startIndex, startIndex + effectiveItemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const isConnected = (status: boolean) => {
        return status ? (
            <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Connected</span>
            </div>
        ) : (
            <div className="flex items-center gap-2 text-red-500">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Not Connected</span>
            </div>
        );
    };

    const getActionRequired = (metaConnected: boolean, googleConnected: boolean, ga4Connected: boolean, shopifyConnected: boolean) => {
        const missing = [];
        if (!shopifyConnected) missing.push("Shopify");
        if (!metaConnected) missing.push("Meta");
        if (!googleConnected) missing.push("Google Ads");
        if (!ga4Connected) missing.push("GA4");
        
        if (missing.length === 0) {
             return <span className="text-green-600 font-medium">All Connected</span>;
        }
        
        return <span className="text-orange-500 font-medium">Need to connect {missing.join(' + ')}</span>;
    };

    if (!user?.isAdmin) {
        return (
            <div className="flex h-screen bg-gray-50 overflow-hidden">
                <CollapsibleSidebar />
                <div className="flex-1 flex flex-col overflow-hidden items-center justify-center">
                    <div className="text-center space-y-4">
                        <XCircle className="mx-auto h-12 w-12 text-red-500" />
                        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
                        <p className="text-gray-500">Only administrators can access the Brand Connections page.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <CollapsibleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Brand Connections</h1>
                            <p className="text-sm text-gray-500 mt-1">Manage and view connection status for all brands</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search brands..."
                                className="pl-10 w-full sm:w-[300px] bg-white"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>

                    <Card className="flex flex-col border-gray-200 shadow-sm bg-white overflow-hidden h-[calc(100vh-140px)]" ref={tableRef}>
                        <div className="flex-1 overflow-auto relative">
                            {loading ? (
                                <div className="absolute inset-0 z-50">
                                    <Loader isLoading={loading} />
                                </div>
                            ) : (
                                <Table className="w-full border-collapse">
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 sticky top-0 z-30">
                                            <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-l last:border-r border-gray-200 bg-gray-50 shadow-[4px_0_5px_0_rgba(0,0,0,0.09)] sticky left-0 z-40">Brand Name</TableHead>
                                            <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-l last:border-r border-gray-200 bg-gray-50">Shopify</TableHead>
                                            <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-l last:border-r border-gray-200 bg-gray-50">Meta</TableHead>
                                            <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-l last:border-r border-gray-200 bg-gray-50">Google Ads</TableHead>
                                            <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-l last:border-r border-gray-200 bg-gray-50">GA4</TableHead>
                                            <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-l last:border-r border-gray-200 bg-gray-50">Action Required</TableHead>
                                            <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-l last:border-r border-gray-200 bg-gray-50">Label</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentBrands.length > 0 ? (
                                            currentBrands.map((brand: IBrand) => {
                                                const metaConnected = !!(brand.fbAccessToken && brand.fbAdAccounts && brand.fbAdAccounts.length > 0);
                                                const googleConnected = !!(brand.googleAdsRefreshToken && brand.googleAdAccount && brand.googleAdAccount.length > 0);
                                                const ga4Connected = !!(brand.googleAnalyticsRefreshToken && brand.ga4Account && brand.ga4Account.PropertyID);
                                                const shopifyConnected = !!(brand.shopifyAccount && brand.shopifyAccount.shopifyAccessToken);
                                                
                                                return (
                                                    <TableRow key={brand._id} className="hover:bg-blue-50 transition-colors duration-150 group text-sm">
                                                        <TableCell className="px-3 py-2 align-middle border-b border-l last:border-r border-gray-200 font-medium text-gray-900 bg-white group-hover:bg-blue-50 sticky left-0 z-10 shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]">{brand.name}</TableCell>
                                                        <TableCell className="px-3 py-2 align-middle border-b border-l last:border-r border-gray-200">{isConnected(shopifyConnected)}</TableCell>
                                                        <TableCell className="px-3 py-2 align-middle border-b border-l last:border-r border-gray-200">{isConnected(metaConnected)}</TableCell>
                                                        <TableCell className="px-3 py-2 align-middle border-b border-l last:border-r border-gray-200">{isConnected(googleConnected)}</TableCell>
                                                        <TableCell className="px-3 py-2 align-middle border-b border-l last:border-r border-gray-200">{isConnected(ga4Connected)}</TableCell>
                                                        <TableCell className="px-3 py-2 align-middle border-b border-l last:border-r border-gray-200">{getActionRequired(metaConnected, googleConnected, ga4Connected, shopifyConnected)}</TableCell>
                                                        <TableCell className="px-3 py-2 align-middle border-b border-l last:border-r border-gray-200">
                                                            <Input
                                                                defaultValue={brand.customLabel || ""}
                                                                onBlur={(e) => {
                                                                    if (e.target.value !== (brand.customLabel || "")) {
                                                                        handleLabelUpdate(brand._id, e.target.value);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.currentTarget.blur();
                                                                    }
                                                                }}
                                                                disabled={savingLabelId === brand._id}
                                                                className="h-8 text-xs w-[120px]"
                                                                placeholder="Add label..."
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                                                    No brands found matching your search.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                        {filteredBrands.length > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700">Rows per page:</span>
                                    <Select
                                        value={String(itemsPerPage)}
                                        onValueChange={(value) => {
                                            if (value === "all") {
                                                setItemsPerPage("all");
                                            } else {
                                                setItemsPerPage(Number.parseInt(value, 10));
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-[80px] h-8 bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                            <SelectItem value="all">All</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700">
                                        {startIndex + 1}-{Math.min(startIndex + effectiveItemsPerPage, filteredBrands.length)} of {filteredBrands.length}
                                    </span>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(1)}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage >= totalPages || totalPages === 0}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(totalPages)}
                                            disabled={currentPage >= totalPages || totalPages === 0}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </main>
            </div>
        </div>
    );
}
