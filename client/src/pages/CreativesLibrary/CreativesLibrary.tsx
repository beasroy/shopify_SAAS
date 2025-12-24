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
  ListFilter
} from "lucide-react";
import { cn } from "@/lib/utils";
import CreativeCard from "./components/CreativeCard";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface CarouselImage {
  url: string;
  link?: string | null;
  name?: string | null;
  description?: string | null;
}

export interface Creative {
  ad_id: string;
  ad_name: string;
  ad_status: string;
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
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState<"all" | "image" | "video" | "carousel">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED">("all");
  const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(
    new Set(AVAILABLE_KPIS.map(kpi => kpi.key))
  );
  const { brandId } = useParams();
  
  // Ref for infinite scroll observer
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const lastCardRef = React.useRef<HTMLDivElement | null>(null);

  const axiosInstance = createAxiosInstance();

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
        limit: 12, // 12 ads per account for nice grid layout
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
          setCreatives(response.data.creatives);
        } else {
          setCreatives(prev => [...prev, ...response.data.creatives]);
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



  // Fetch creatives when brand changes
  useEffect(() => {
    if (brandId) {
      console.log("🔄 Brand changed, fetching creatives...");
      fetchCreatives(null, true);
    }
  }, [brandId]);

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
  }, [creatives.length, hasMore, loading, nextCursor, searchTerm, formatFilter, statusFilter]); // Re-run when these change

  const handleRefresh = () => {
    fetchCreatives(null, true);
  };

  // Filter creatives based on search, format, and status
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
        creative.ad_status?.toUpperCase() === statusFilter.toUpperCase();
      
      return matchesSearch && matchesFormat && matchesStatus;
    });
  }, [creatives, searchTerm, formatFilter, statusFilter]);

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


      <div className="flex-1 h-screen overflow-auto mx-auto p-6 space-y-6">

      {initialLoading ? (
      <div>
        <Loader isLoading={true} />
      </div>
    ) : (
      <>
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
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="DELETED">Deleted</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
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
      {creatives.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {filteredCreatives.map((creative, index) => {
              // Attach ref to last FILTERED card for infinite scroll
              // This allows infinite scroll to work even when filters are active
              const isLastFilteredCreative = index === filteredCreatives.length - 1;
              const shouldAttachRef = isLastFilteredCreative && hasMore && !loading;
              
              return (
                <div
                  key={creative.ad_id}
                  ref={shouldAttachRef ? lastCardRef : null}
                  className="h-full"
                >
                  <CreativeCard creative={creative} selectedKPIs={selectedKPIs} />
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
          {(searchTerm || formatFilter !== "all" || statusFilter !== "all") && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredCreatives.length} of {creatives.length} loaded ads
                {searchTerm && ` matching "${searchTerm}"`}
                {formatFilter !== "all" && ` (${formatFilter} format)`}
                {statusFilter !== "all" && ` (${statusFilter.toLowerCase()} status)`}
                {hasMore && ". Keep scrolling to load more!"}
              </p>
            </div>
          )}

          {/* Info message when no filters */}
          {!searchTerm && formatFilter === "all" && statusFilter === "all" && (
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
                {searchTerm || formatFilter !== "all" || statusFilter !== "all"
                  ? ` Showing ${filteredCreatives.length} of ${creatives.length} loaded ads.`
                  : ` All ${creatives.length} ads loaded.`}
              </p>
            </div>
          )}

          {/* No results message when filters are active */}
          {filteredCreatives.length === 0 && (searchTerm || formatFilter !== "all" || statusFilter !== "all") && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12">
                  <Film className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Creatives Found</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {searchTerm && (formatFilter !== "all" || statusFilter !== "all")
                      ? `No creatives found matching "${searchTerm}"${formatFilter !== "all" ? ` (${formatFilter} format)` : ""}${statusFilter !== "all" ? ` (${statusFilter.toLowerCase()} status)` : ""}. Try adjusting your filters.`
                      : searchTerm
                      ? `No creatives found matching "${searchTerm}". Try adjusting your search.`
                      : formatFilter !== "all" && statusFilter !== "all"
                      ? `No ${formatFilter} creatives with ${statusFilter.toLowerCase()} status found. Try selecting different filters.`
                      : formatFilter !== "all"
                      ? `No ${formatFilter} creatives found. Try selecting a different format.`
                      : `No ${statusFilter.toLowerCase()} creatives found. Try selecting a different status.`}
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
  </div>
  );
};

export default CreativesLibrary;

