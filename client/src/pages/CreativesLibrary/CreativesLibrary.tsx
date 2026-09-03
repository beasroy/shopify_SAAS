import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import createAxiosInstance from "../ConversionReportPage/components/axiosInstance";
import Loader from "@/components/dashboard_component/loader";
import { 
  Film, 
  Search,
  RefreshCw,
  AlertCircle,
  ListFilter,
  Folder
} from "lucide-react";
import { SideTab } from "@/components/ui/side-tab";
import { cn } from "@/lib/utils";
import CreativeCard from "./components/CreativeCard";
import CreativeGroupCard, { CreativeGroup } from "./components/CreativeGroupCard";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import { useParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";


export interface CarouselImage {
  url: string;
  link?: string | null;
  name?: string | null;
  description?: string | null;
}

export interface Creative {
  creative_id: string;
  ad_id: string;
  ad_name: string;
  ad_status: string;
  status: string;
  created_time: string;
  creative_type: "video" | "image" | "carousel" | "unknown";
  creative_url: string;
  thumbnail_url: string;
  carousel_images?: CarouselImage[] | null;
  spend: number;
  ctr: number;
  cpc?: number;
  cpp?: number;
  clicks: number;
  roas: number;
  orders: number;
  hook_rate: number;
  impressions?: number;
  video_views?: number;
  revenue?: number;
  engagementRate?: number;
  frequency?: number;
  video_p25_watched?: number;
  video_p50_watched?: number;
  video_p100_watched?: number;
  video_p25_watched_rate?: number;
  video_p50_watched_rate?: number;
  video_p100_watched_rate?: number;
}

// KPI Configuration
export interface KPIConfig {
  key: string;
  label: string;
  category: "financial" | "performance" | "engagement" | "video";
}

export const AVAILABLE_KPIS: KPIConfig[] = [
  // Financial Metrics
  { key: "spend", label: "Spend", category: "financial" },
  { key: "revenue", label: "Revenue", category: "financial" },
  { key: "roas", label: "ROAS", category: "financial" },
  { key: "cpc", label: "CPC", category: "financial" },
  { key: "cpp", label: "CPP", category: "financial" },
  { key: "orders", label: "Orders", category: "financial" },
  // Performance Metrics
  { key: "impressions", label: "Impressions", category: "performance" },
  { key: "clicks", label: "Clicks", category: "performance" },
  { key: "ctr", label: "CTR", category: "performance" },
  { key: "frequency", label: "Frequency", category: "performance" },
  // Engagement Metrics
  { key: "hook_rate", label: "Hook Rate", category: "engagement" },
  { key: "engagementRate", label: "Engagement Rate", category: "engagement" },
  // Video Metrics
  { key: "video_views", label: "Video Views", category: "video" },
  { key: "video_p25_watched", label: "25% Watched", category: "video" },
  { key: "video_p50_watched", label: "50% Watched", category: "video" },
  { key: "video_p100_watched", label: "100% Watched", category: "video" },
  { key: "video_p25_watched_rate", label: "25% Watched Rate", category: "video" },
  { key: "video_p50_watched_rate", label: "50% Watched Rate", category: "video" },
  { key: "video_p100_watched_rate", label: "100% Watched Rate", category: "video" },
];

const CATEGORY_LABELS: Record<string, string> = {
  financial: "Financial Metrics",
  performance: "Performance Metrics",
  engagement: "Engagement Metrics",
  video: "Video Metrics",
};

interface CreativesResponse {
  success: boolean;
  brandId: string;
  limit: number;
  total_creatives: number;
  hasMore: boolean;
  nextCursor: string | null;
  oldestCreatedTime?: string | null;
  creatives: Creative[];
  fetchTime: number;
  fromCache?: boolean;
  stats: {
    accountsProcessed: number;
    totalAds: number;
    videosProcessed: number;
  };
}

const CreativesLibrary: React.FC = () => {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [groups, setGroups] = useState<CreativeGroup[]>([]);
  const [viewMode, setViewMode] = useState<"groups" | "individual">("individual");
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isAddingToGroup, setIsAddingToGroup] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<CreativeGroup | null>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState<"all" | "image" | "video" | "carousel">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "PAUSED" >("all");
  const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(
    new Set(AVAILABLE_KPIS.map(kpi => kpi.key))
  );
  const { brandId } = useParams();
  
  // Get date range from Redux store
  const dateFrom = useSelector((state: RootState) => state.date?.from);
  const dateTo = useSelector((state: RootState) => state.date?.to);
  
  // Ref for infinite scroll observer
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const lastCardRef = React.useRef<HTMLDivElement | null>(null);

  const axiosInstance = createAxiosInstance();
  const dispatch = useDispatch();

  const fetchCreatives = async (cursor: string | null = null, reset: boolean = false) => {
    if (reset) {
      setInitialLoading(true);
      setCreatives([]);
      setNextCursor(null);
      setError(null);
    } else {
      setLoading(true);
    }

    try {
      const requestBody: any = {
        limit: 15, //  ads per account for nice grid layout
        thumbnailWidth: 600,  // Request 600px width thumbnails
        thumbnailHeight: 600, // Request 600px height thumbnails
      };

      // Only add cursor if it exists (for pagination)
      if (cursor) {
        requestBody.after = cursor;
      }

      const response = await axiosInstance.post<CreativesResponse>(
        `/api/ads/meta-creative/${brandId}`,
        requestBody
      );

      if (response.data.success) {
        if (reset) {
          // Sort by created_time (newest first) for initial load
          const sorted = [...response.data.creatives].sort((a, b) => {
            const timeA = new Date(a.created_time || 0).getTime();
            const timeB = new Date(b.created_time || 0).getTime();
            return timeB - timeA; // Descending order (newest first)
          });
          setCreatives(sorted);
        } else {
          // Merge new creatives with existing ones, deduplicate by creative_id, and sort globally
          setCreatives(prev => {
            // Create a Map to deduplicate by creative_id (keep the first occurrence)
            const creativeMap = new Map<string, Creative>();
            
            // Add existing creatives first (they take priority)
            prev.forEach(creative => {
              if (!creativeMap.has(creative.creative_id)) {
                creativeMap.set(creative.creative_id, creative);
              }
            });
            
            // Add new creatives (only if not already present)
            response.data.creatives.forEach(creative => {
              if (!creativeMap.has(creative.creative_id)) {
                creativeMap.set(creative.creative_id, creative);
              }
            });
            
            // Convert Map to array and sort globally by created_time (newest first)
            const merged = Array.from(creativeMap.values()).sort((a, b) => {
              const timeA = new Date(a.created_time || 0).getTime();
              const timeB = new Date(b.created_time || 0).getTime();
              return timeB - timeA; // Descending order (newest first)
            });
            
            console.log(`🔄 Merged ${prev.length} existing + ${response.data.creatives.length} new = ${merged.length} total creatives (sorted globally)`);
            return merged;
          });
        }
        setHasMore(response.data.hasMore);
        setNextCursor(response.data.nextCursor);
        setError(null);
      } else {
        setError("Failed to fetch creatives");
      }
    } catch (err: any) {
      console.error("Error fetching creatives:", err);
      setError(err.response?.data?.message || "Failed to fetch creatives. Please try again.");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };



  const fetchGroups = async () => {
    try {
      const response = await axiosInstance.get(`/api/ads/groups/${brandId}`);
      if (response.data.success) setGroups(response.data.groups);
    } catch (err) {
      console.error("Error fetching groups", err);
    }
  };

  // Fetch creatives when brand changes
  useEffect(() => {
    if (brandId) {
      console.log("🔄 Brand changed, fetching creatives and groups...");
 
      fetchCreatives(null, true);
      fetchGroups();
    }
  }, [brandId, dispatch]);

  // Infinite scroll: Set up intersection observer
  useEffect(() => {
    // Only set up observer if we have creatives and potentially more data
    if (!creatives.length || !hasMore || loading) {
      return;
    }

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    const observer = new IntersectionObserver(
      (entries) => {
        // When last card is visible and we have more data and not currently loading
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting && hasMore && !loading && nextCursor) {
          console.log("🔄 Infinite scroll triggered! Loading more creatives...");
          fetchCreatives(nextCursor);
        }
      },
      {
        root: null,
        rootMargin: "300px", // Start loading 300px before reaching the bottom
        threshold: 0.1,
      }
    );

    observerRef.current = observer;

    // Observe the last card (works with filtered results too)
    const currentLastCard = lastCardRef.current;
    if (currentLastCard) {
      console.log("👀 Observing last card for infinite scroll");
      observer.observe(currentLastCard);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (currentLastCard && observer) {
        observer.unobserve(currentLastCard);
      }
      observer.disconnect();
    };
  }, [creatives.length, hasMore, loading, nextCursor, searchTerm, formatFilter, statusFilter, dateFrom, dateTo]); // Re-run when these change

  // Automatically fetch missing creatives for the active group
  useEffect(() => {
    if (isDrawerOpen && activeGroup && hasMore && !loading && nextCursor) {
      const missingIds = activeGroup.adIds.filter(id => !creatives.some(c => c.creative_id === id || c.ad_id === id));
      if (missingIds.length > 0) {
        console.log(`🔄 Active group has ${missingIds.length} missing creatives. Auto-fetching next page...`);
        fetchCreatives(nextCursor);
      }
    }
  }, [isDrawerOpen, activeGroup, creatives, hasMore, loading, nextCursor]);

  const handleRefresh = () => {
    fetchCreatives(null, true);
  };

  // Filter creatives based on search, format, status, and date range
  const filteredCreatives = useMemo(() => {
    return creatives.filter((creative) => {
      // Filter by search term
      const matchesSearch = searchTerm === "" || 
        creative.ad_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by format
      const matchesFormat = formatFilter === "all" || 
        creative.creative_type === formatFilter;
      
      // Filter by status (case-insensitive)
      const matchesStatus = statusFilter === "all" || 
        creative.status === statusFilter;
      
      // Filter by date range (created_time)
      // Only apply date filtering if BOTH dates are selected to avoid filtering out all data
      let matchesDate = true;
      if (dateFrom && dateTo) {
        const creativeDate = new Date(creative.created_time);
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        
        // Set time to start of day for fromDate and end of day for toDate
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        
        matchesDate = creativeDate >= fromDate && creativeDate <= toDate;
      }
      
      return matchesSearch && matchesFormat && matchesStatus && matchesDate;
    });
  }, [creatives, searchTerm, formatFilter, statusFilter, dateFrom, dateTo]);

  // Handle KPI selection
  const handleKPIToggle = (kpiKey: string) => {
    setSelectedKPIs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kpiKey)) {
        newSet.delete(kpiKey);
      } else {
        newSet.add(kpiKey);
      }
      return newSet;
    });
  };

  const handleSelectAllKPIs = () => {
    setSelectedKPIs(new Set(AVAILABLE_KPIS.map(kpi => kpi.key)));
  };

  const handleDeselectAllKPIs = () => {
    setSelectedKPIs(new Set());
  };

  // Group KPIs by category
  const kpisByCategory = useMemo(() => {
    const grouped: Record<string, KPIConfig[]> = {
      financial: [],
      performance: [],
      engagement: [],
      video: [],
    };
    for (const kpi of AVAILABLE_KPIS) {
      grouped[kpi.category].push(kpi);
    }
    return grouped;
  }, []);

  const handleSelectToggle = (id: string, isSelected: boolean) => {
    setSelectedAds(prev => isSelected ? [...prev, id] : prev.filter(aid => aid !== id));
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedAds.length === 0) return;
    setIsCreatingGroup(true);
    try {
      const response = await axiosInstance.post(`/api/ads/groups/${brandId}`, {
        name: newGroupName,
        adIds: selectedAds
      });
      if (response.data.success) {
        setGroups([response.data.group, ...groups]);
        setSelectedAds([]);
        setIsCreateModalOpen(false);
        setNewGroupName("");
      }
    } catch (err) {
      console.error("Failed to create group", err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAddToGroup = async (groupId: string) => {
    if (selectedAds.length === 0) return;
    const group = groups.find(g => g._id === groupId);
    if (!group) return;
    setIsAddingToGroup(true);
    try {
      const newAdIds = [...new Set([...group.adIds, ...selectedAds])];
      const response = await axiosInstance.patch(`/api/ads/groups/${brandId}/${groupId}`, {
        adIds: newAdIds
      });
      if (response.data.success) {
        setGroups(groups.map(g => g._id === groupId ? response.data.group : g));
        setSelectedAds([]);
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to add to group", err);
    } finally {
      setIsAddingToGroup(false);
    }
  };

  const handleRemoveFromGroup = async (creativeId: string) => {
    if (!activeGroup) return;
    try {
      const newAdIds = activeGroup.adIds.filter(id => id !== creativeId);
      const response = await axiosInstance.patch(`/api/ads/groups/${brandId}/${activeGroup._id}`, {
        adIds: newAdIds
      });
      if (response.data.success) {
        const updatedGroup = response.data.group;
        setGroups(groups.map(g => g._id === activeGroup._id ? updatedGroup : g));
        setActiveGroup(updatedGroup);
        if (updatedGroup.adIds.length === 0) {
          setIsDrawerOpen(false); // Close if empty
        }
      }
    } catch (err) {
      console.error("Failed to remove from group", err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const response = await axiosInstance.delete(`/api/ads/groups/${brandId}/${groupId}`);
      if (response.data.success) {
        setGroups(groups.filter(g => g._id !== groupId));
        setIsDrawerOpen(false);
        setActiveGroup(null);
      }
    } catch (err) {
      console.error("Failed to delete group", err);
    }
  };


  if (!brandId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Brand Selected</h2>
        <p className="text-muted-foreground">Please select a brand to view creatives.</p>
      </div>
    );
  }

 
  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <SideTab 
        tabs={[
          { label: "Creatives", value: "individual", icon: <Film className="w-4 h-4" /> },
          { label: "Groups", value: "groups", icon: <Folder className="w-4 h-4" /> }
        ]}
        activeTab={viewMode}
        onTabChange={(v: string) => setViewMode(v as "groups" | "individual")}
      />

      <div className="flex-1 h-screen overflow-auto mx-auto p-6 space-y-6">

      {initialLoading ? (
      <div>
        <Loader isLoading={true} />
      </div>
    ) : (
      <>
          {viewMode === "individual" && (
            <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by ad name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Filter by type */}
            <div className="flex gap-2">
              <DatePickerWithRange />
              <Select value={formatFilter} onValueChange={(value) => setFormatFilter(value as "all" | "image" | "video" | "carousel")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "ACTIVE" | "PAUSED" )}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>  
                </SelectContent>
              </Select>
    
              
              {/* Metrics Selector */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="relative"
                  >
                    <ListFilter className="w-4 h-4 mr-2" />
                    Metrics
                    {selectedKPIs.size > 0 && selectedKPIs.size < AVAILABLE_KPIS.length && (
                      <Badge 
                        variant="secondary" 
                        className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                      >
                        {selectedKPIs.size}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Select Metrics</SheetTitle>
                    <SheetDescription>
                      Choose which metrics to display on creative cards
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleSelectAllKPIs}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleDeselectAllKPIs}
                      >
                        Deselect All
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    {/* Financial Metrics */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">
                        {CATEGORY_LABELS.financial}
                      </Label>
                      <div className="space-y-2 pl-2">
                        {kpisByCategory.financial.map((kpi) => (
                          <div key={kpi.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={kpi.key}
                              checked={selectedKPIs.has(kpi.key)}
                              onCheckedChange={() => handleKPIToggle(kpi.key)}
                            />
                            <Label
                              htmlFor={kpi.key}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {kpi.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Performance Metrics */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">
                        {CATEGORY_LABELS.performance}
                      </Label>
                      <div className="space-y-2 pl-2">
                        {kpisByCategory.performance.map((kpi) => (
                          <div key={kpi.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={kpi.key}
                              checked={selectedKPIs.has(kpi.key)}
                              onCheckedChange={() => handleKPIToggle(kpi.key)}
                            />
                            <Label
                              htmlFor={kpi.key}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {kpi.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Engagement Metrics */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">
                        {CATEGORY_LABELS.engagement}
                      </Label>
                      <div className="space-y-2 pl-2">
                        {kpisByCategory.engagement.map((kpi) => (
                          <div key={kpi.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={kpi.key}
                              checked={selectedKPIs.has(kpi.key)}
                              onCheckedChange={() => handleKPIToggle(kpi.key)}
                            />
                            <Label
                              htmlFor={kpi.key}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {kpi.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Video Metrics */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">
                        {CATEGORY_LABELS.video}
                      </Label>
                      <div className="space-y-2 pl-2">
                        {kpisByCategory.video.map((kpi) => (
                          <div key={kpi.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={kpi.key}
                              checked={selectedKPIs.has(kpi.key)}
                              onCheckedChange={() => handleKPIToggle(kpi.key)}
                            />
                            <Label
                              htmlFor={kpi.key}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {kpi.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Button
                onClick={handleRefresh}
                variant="outline"
                size="icon"
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>   
            </div>
          </div>
          )}
      

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Creatives Grid */}
      {viewMode === "groups" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
          {groups.length > 0 ? groups.map(group => (
            <div key={group._id} className="h-full">
              <CreativeGroupCard 
                group={group} 
                creatives={creatives} 
                onClick={() => { setActiveGroup(group); setIsDrawerOpen(true); }} 
                onDelete={() => handleDeleteGroup(group._id)}
              />
            </div>
          )) : (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-white rounded-lg border border-dashed">
              No groups created yet. Select ads in Individual view to create one!
            </div>
          )}
        </div>
      ) : creatives.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {filteredCreatives.map((creative, index) => {
              // Attach ref to last FILTERED card for infinite scroll
              // This allows infinite scroll to work even when filters are active
              const isLastFilteredCreative = index === filteredCreatives.length - 1;
              const shouldAttachRef = isLastFilteredCreative && hasMore && !loading;
              
              return (
                <div
                  key={creative.creative_id}
                  ref={shouldAttachRef ? lastCardRef : null}
                  className="h-full"
                >
                  <CreativeCard 
                    creative={creative} 
                    selectedKPIs={selectedKPIs} 
                    isSelected={selectedAds.includes(creative.creative_id)}
                    onSelectToggle={handleSelectToggle}
                    selectionMode={selectedAds.length > 0}
                  />
                </div>
              );
            })}
          </div>

          {/* Loading Indicator for Infinite Scroll */}
          {loading && !initialLoading && (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading more creatives...</span>
              </div>
            </div>
          )}

          {/* Info message when filtering */}
          {(searchTerm || formatFilter !== "all" || statusFilter !== "all" || (dateFrom && dateTo)) && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredCreatives.length} of {creatives.length} loaded ads
                {searchTerm && ` matching "${searchTerm}"`}
                {formatFilter !== "all" && ` (${formatFilter} format)`}
                {statusFilter !== "all" && ` (${statusFilter.toLowerCase()} status)`}
                {(dateFrom || dateTo) && ` (date filtered)`}
                {hasMore && ". Keep scrolling to load more!"}
              </p>
            </div>
          )}

          {/* Info message when no filters */}
          {!searchTerm && formatFilter === "all" && statusFilter === "all" && !(dateFrom && dateTo) && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Showing {creatives.length} loaded ads. Keep scrolling to load more!
              </p>
            </div>
          )}

          {/* End Message */}
          {!hasMore && creatives.length > 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                🎉 You've reached the end! 
                {searchTerm || formatFilter !== "all" || statusFilter !== "all" || (dateFrom && dateTo)
                  ? ` Showing ${filteredCreatives.length} of ${creatives.length} loaded ads.`
                  : ` All ${creatives.length} ads loaded.`}
              </p>
            </div>
          )}

          {/* No results message when filters are active */}
          {filteredCreatives.length === 0 && (searchTerm || formatFilter !== "all" || statusFilter !== "all" || (dateFrom && dateTo)) && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12">
                  <Film className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Creatives Found</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {searchTerm && (formatFilter !== "all" || statusFilter !== "all" || (dateFrom && dateTo))
                      ? `No creatives found matching "${searchTerm}"${formatFilter !== "all" ? ` (${formatFilter} format)` : ""}${statusFilter !== "all" ? ` (${statusFilter.toLowerCase()} status)` : ""}${(dateFrom && dateTo) ? ` (date filtered)` : ""}. Try adjusting your filters.`
                      : searchTerm
                      ? `No creatives found matching "${searchTerm}". Try adjusting your search.`
                      : formatFilter !== "all" && statusFilter !== "all"
                      ? `No ${formatFilter} creatives with ${statusFilter.toLowerCase()} status found. Try selecting different filters.`
                      : formatFilter !== "all"
                      ? `No ${formatFilter} creatives found. Try selecting a different format.`
                      : statusFilter !== "all"
                      ? `No ${statusFilter.toLowerCase()} creatives found. Try selecting a different status.`
                      : (dateFrom && dateTo)
                      ? `No creatives found in the selected date range. Try adjusting the date filter.`
                      : `No creatives found. Try adjusting your filters.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Film className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Creatives Found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm 
                  ? "Try adjusting your search "
                  : "No creatives available"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </>
    )}
    </div>

    {/* Floating Action Bar */}
    {selectedAds.length > 0 && viewMode === "individual" && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center space-x-4 z-50">
        <span className="font-semibold">{selectedAds.length} selected</span>
        <Separator orientation="vertical" className="h-6 bg-gray-600" />
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">Create Group</Button>
        <Button size="sm" variant="secondary" onClick={() => setIsAddModalOpen(true)}>Add to Existing</Button>
        <Button size="icon" variant="ghost" className="rounded-full hover:bg-gray-800 h-8 w-8 text-white" onClick={() => setSelectedAds([])}>
          <Film className="w-4 h-4 hidden" /> {/* Just to satisfy import requirement if X isn't available */}
          ✕
        </Button>
      </div>
    )}

    {/* Modals & Drawer */}
    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label>Group Name</Label>
          <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g., Summer Campaign" className="mt-2" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isCreatingGroup}>Cancel</Button>
          <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || isCreatingGroup}>
            {isCreatingGroup ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Existing Group</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">No existing groups found.</p>
          ) : groups.map(g => (
            <Button key={g._id} variant="outline" className="w-full justify-start" onClick={() => handleAddToGroup(g._id)} disabled={isAddingToGroup}>
              {isAddingToGroup ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Film className="w-4 h-4 mr-2" />}
              {g.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>

    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[800px] sm:w-[800px] overflow-y-auto bg-gray-50">
        <SheetHeader>
          <SheetTitle>{activeGroup?.name}</SheetTitle>
          <SheetDescription>{activeGroup?.adIds.length} Creatives</SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid grid-cols-2 gap-4 pb-20">
          {activeGroup?.adIds.map(id => {
            const creative = creatives.find(c => c.creative_id === id || c.ad_id === id);
            if (!creative) return null;
            return (
              <div key={id} className="relative group">
                <CreativeCard creative={creative} selectedKPIs={selectedKPIs} />
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md"
                  onClick={() => handleRemoveFromGroup(id)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
          
          {/* Loading indicator for missing paginated ads */}
          {isDrawerOpen && activeGroup && loading && activeGroup.adIds.some(id => !creatives.some(c => c.creative_id === id || c.ad_id === id)) && (
            <div className="col-span-2 flex flex-col items-center justify-center py-10">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading missing ads...</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  </div>
  );
};

export default CreativesLibrary;

