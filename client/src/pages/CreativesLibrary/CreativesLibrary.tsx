import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import createAxiosInstance from "../ConversionReportPage/components/axiosInstance";
import Loader from "@/components/dashboard_component/loader";
import { format } from "date-fns";
import { 
  Film, 
  Search,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import CreativeCard from "./components/CreativeCard";
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import { useParams } from "react-router-dom";

export interface CarouselImage {
  url: string;
  link?: string | null;
  name?: string | null;
  description?: string | null;
}

export interface Creative {
  ad_id: string;
  ad_name: string;
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
}

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
  const { brandId } = useParams();
  
  // Ref for infinite scroll observer
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const lastCardRef = React.useRef<HTMLDivElement | null>(null);
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const date = useMemo(() => ({
      from: dateFrom,
      to: dateTo
  }), [dateFrom, dateTo]);
  


  const axiosInstance = createAxiosInstance();

    // Create stable date strings for dependency tracking
    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

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
        startDate,
        endDate,
        includeAllAds: true,
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



  // Fetch creatives when brand or date changes
  useEffect(() => {
    if (brandId && startDate && endDate) {
      console.log("🔄 Date or brand changed, fetching creatives...", { startDate, endDate });
      fetchCreatives(null, true);
    }
  }, [brandId, startDate, endDate]); // Use date strings - simple and reliable!

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

    // Observe the last card
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
  }, [creatives.length, hasMore, loading, nextCursor]); // Re-run when these change

  const handleRefresh = () => {
    fetchCreatives(null, true);
  };


  // Filter creatives based on search and type


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
             
              <DatePickerWithRange
  
      
  />
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
            {creatives.map((creative) => {
              // Attach ref to last UNFILTERED card for infinite scroll
              // We need to find the actual last creative in the full array, not the filtered one
              const isActualLastCreative = creative.ad_id === creatives[creatives.length - 1]?.ad_id;
              const shouldAttachRef = isActualLastCreative && !searchTerm; // Enable on all tabs, disable only for search
              
              return (
                <div
                  key={creative.ad_id}
                  ref={shouldAttachRef ? lastCardRef : null}
                  className="h-full"
                >
                  <CreativeCard creative={creative} />
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

          {/* Info message when searching */}
          {searchTerm && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Showing {creatives.length} search results from {creatives.length} loaded ads. Clear search to enable infinite scroll.
              </p>
            </div>
          )}

          {/* Info message when filtering by type */}
          {!searchTerm  && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Showing {creatives.length} loaded ads. keep scrolling to load more!
              </p>
            </div>
          )}

          {/* End Message */}
          {!hasMore && creatives.length > 0 && !searchTerm && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                🎉 You've reached the end! All {creatives.length} ads loaded.
              </p>
            </div>
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
                  : "No creatives available for the selected date range"}
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

