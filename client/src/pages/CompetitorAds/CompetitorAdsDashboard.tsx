import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import axiosInstance from "@/services/axiosConfig";
import Loader from "@/components/dashboard_component/loader";
import { 
  Search,
  UserPlus,
  X,
  ExternalLink,
  AlertCircle,
  Image as ImageIcon,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CompetitorAd {
  id: string;
  ad_id: string;
  snapUrl: string;
  pageName: string;
  pageId: string;
  adCreatedTime: string;
  adStopTime?: string;
  adStatus: string;
  linkTitles?: string[];
  linkDescriptions?: string[];
  metadata?: {
    pageId?: string;
    pageName?: string;
    adStopTime?: string;
    linkTitles?: string[];
    linkDescriptions?: string[];
  };
}

interface SearchResponse {
  success: boolean;
  ads: CompetitorAd[];
  totalFound: number;
  competitorBrandName: string;
}

interface CompetitorAdsResponse {
  success: boolean;
  ads: CompetitorAd[];
  totalCount: number;
  limit: number;
  skip: number;
}

const CompetitorAdsDashboard: React.FC = () => {
  const { brandId } = useParams();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CompetitorAd[]>([]);
  const [followedBrands, setFollowedBrands] = useState<string[]>([]);
  const [followedAds, setFollowedAds] = useState<Record<string, CompetitorAd[]>>({});
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brandId) {
      fetchFollowedBrands();
    }
  }, [brandId]);

  useEffect(() => {
    if (brandId && followedBrands.length > 0) {
      fetchFollowedAds();
    } else if (brandId && followedBrands.length === 0) {
      // If no followed brands, set loading to false
      setInitialLoading(false);
      setLoading(false);
    }
  }, [brandId, followedBrands]);

  const fetchFollowedBrands = async () => {
    if (!brandId) return;
    
    setInitialLoading(true);
    try {
      const response = await axiosInstance.get(
        `/api/competitor/competitor-brands/${brandId}`
      );
      if (response.data.success) {
        const brands = response.data.competitorBrands || [];
        setFollowedBrands(brands);
        // If no brands, stop loading
        if (brands.length === 0) {
          setInitialLoading(false);
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error("Error fetching followed brands:", err);
      setInitialLoading(false);
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to fetch followed brands.",
        variant: "destructive",
      });
    }
  };

  const fetchFollowedAds = async () => {
    if (!brandId || followedBrands.length === 0) {
      setInitialLoading(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const adsMap: Record<string, CompetitorAd[]> = {};
      
      for (const brandName of followedBrands) {
        try {
          const response = await axiosInstance.get<CompetitorAdsResponse>(
            `/api/competitor/competitor-ads/${brandId}`,
            {
              params: {
                competitorBrandName: brandName,
                limit: 50 // Increased limit to show more ads
              }
            }
          );
          if (response.data.success) {
            adsMap[brandName] = response.data.ads || [];
          }
        } catch (err) {
          console.error(`Error fetching ads for ${brandName}:`, err);
          adsMap[brandName] = [];
        }
      }
      
      setFollowedAds(adsMap);
    } catch (err) {
      console.error("Error fetching followed ads:", err);
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!brandId || !searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a brand name to search.",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    setError(null);
    
    try {
      const response = await axiosInstance.get<SearchResponse>(
        `/api/competitor/search-ads/${brandId}`,
        {
          params: {
            competitorBrandName: searchTerm.trim(),
            limit: 20
          }
        }
      );

      if (response.data.success) {
        setSearchResults(response.data.ads || []);
        if (response.data.ads.length === 0) {
          toast({
            title: "No ads found",
            description: `No ads found for "${searchTerm.trim()}"`,
          });
        }
      }
    } catch (err: any) {
      console.error("Error searching ads:", err);
      setError(err.response?.data?.message || "Failed to search ads. Please try again.");
      setSearchResults([]);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to search ads.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleFollow = async (brandName: string) => {
    if (!brandId) return;

    setFollowing(brandName);
    
    try {
      const response = await axiosInstance.post(
        `/api/competitor/competitor-brands/${brandId}`,
        { competitorBrandName: brandName }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: `Now following ${brandName}. Ads are being fetched...`,
        });
        
        // Update followed brands list
        setFollowedBrands(response.data.competitorBrands || []);
        
        // Clear search results for this brand
        setSearchResults([]);
        setSearchTerm("");
        
        // Fetch ads for the newly followed brand
        setTimeout(() => {
          fetchFollowedAds();
        }, 2000);
      }
    } catch (err: any) {
      console.error("Error following brand:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to follow brand.",
        variant: "destructive",
      });
    } finally {
      setFollowing(null);
    }
  };

  const handleUnfollow = async (brandName: string) => {
    if (!brandId) return;

    try {
      const response = await axiosInstance.delete(
        `/api/competitor/competitor-brands/${brandId}`,
        {
          data: { competitorBrandName: brandName }
        }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: `Unfollowed ${brandName}`,
        });
        
        // Update followed brands list
        setFollowedBrands(response.data.competitorBrands || []);
        
        // Remove ads for this brand
        const newFollowedAds = { ...followedAds };
        delete newFollowedAds[brandName];
        setFollowedAds(newFollowedAds);
      }
    } catch (err: any) {
      console.error("Error unfollowing brand:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to unfollow brand.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    if (!brandId) return;
    
    setLoading(true);
    try {
      await fetchFollowedAds();
      toast({
        title: "Refreshed",
        description: "Competitor ads have been refreshed.",
      });
    } catch (err) {
      console.error("Error refreshing ads:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!brandId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Brand Selected</h2>
        <p className="text-muted-foreground">Please select a brand to view competitor ads.</p>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <CollapsibleSidebar />
        <div className="flex-1 h-screen overflow-auto mx-auto p-6 space-y-6 flex items-center justify-center">
          <Loader isLoading={true} />
        </div>
      </div>
    );
  }

  const isFollowing = (brandName: string) => followedBrands.includes(brandName);
  
  // Get brand name from search results (use pageName from first ad if available)
  const getSearchBrandName = () => {
    if (searchResults.length > 0) {
      // Search results have pageName directly, stored ads have it in metadata
      return searchResults[0]?.pageName || searchResults[0]?.metadata?.pageName || searchTerm;
    }
    return searchTerm;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      
      <div className="flex-1 h-screen overflow-auto mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Competitor Ads</h1>
            <p className="text-muted-foreground mt-1">
              Search and follow competitor brands to track their ads
            </p>
          </div>
          {followedBrands.length > 0 && (
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>

        {/* Search Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter competitor brand name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching || !searchTerm.trim()}
              >
                {searching ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Search Results for "{searchTerm}"
                </h2>
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    {isFollowing(getSearchBrandName()) ? (
                      <Badge variant="secondary">Following</Badge>
                    ) : (
                      <Button
                        onClick={() => handleFollow(getSearchBrandName())}
                        disabled={following === getSearchBrandName()}
                        size="sm"
                      >
                        {following === getSearchBrandName() ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Following...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {searchResults.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Followed Brands */}
        {followedBrands.length > 0 && (
          <div className="space-y-6">
            {followedBrands.map((brandName) => {
              const ads = followedAds[brandName] || [];
              const isLoadingAds = loading && !ads.length;
              
              return (
                <Card key={brandName}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">{brandName}</h2>
                        {ads.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {ads.length} {ads.length === 1 ? 'ad' : 'ads'}
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={() => handleUnfollow(brandName)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Unfollow
                      </Button>
                    </div>
                    {(() => {
                      if (isLoadingAds) {
                        return (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        );
                      }
                      if (ads.length > 0) {
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {ads.map((ad) => (
                              <AdCard key={ad.id || ad.ad_id} ad={ad} />
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No ads found for this brand</p>
                          <p className="text-xs mt-2">Ads will appear here once they are fetched</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {followedBrands.length === 0 && searchResults.length === 0 && !searching && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Competitor Brands</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Search for a competitor brand name above to see their ads, then click "Follow" to track them.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Ad Card Component
const AdCard: React.FC<{ ad: CompetitorAd }> = ({ ad }) => {
  const [showFullImage, setShowFullImage] = useState(false);
  
  const adDate = ad.adCreatedTime 
    ? format(new Date(ad.adCreatedTime), "MMM dd, yyyy")
    : "Unknown date";

  return (
    <>
      <div className="border border-border rounded-lg bg-card overflow-hidden hover:shadow-lg transition-shadow">
        {/* Ad Snapshot */}
        <div className="relative w-full aspect-square bg-muted overflow-hidden">
          {ad.snapUrl ? (
            <>
              <iframe
                src={ad.snapUrl}
                className="w-full h-full border-0"
                title={`Ad snapshot for ${ad.pageName || "Competitor ad"}`}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                loading="lazy"
              />
              <div className="absolute top-2 left-2 z-10">
                <Badge
                  variant={ad.adStatus === "ACTIVE" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {ad.adStatus || "UNKNOWN"}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setShowFullImage(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowFullImage(true);
                  }
                }}
                className="absolute inset-0 bg-transparent hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary z-20 cursor-pointer"
                aria-label="View full size ad"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-12 h-12" />
            </div>
          )}
        </div>

        {/* Ad Info */}
        <div className="p-3">
          <div className="mb-2">
            <p className="text-sm font-semibold line-clamp-1">
              {ad.pageName || ad.metadata?.pageName || "Unknown Brand"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {adDate}
            </p>
          </div>

          {(ad.metadata?.linkTitles || ad.linkTitles) && (ad.metadata?.linkTitles || ad.linkTitles)!.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {(ad.metadata?.linkTitles || ad.linkTitles)![0]}
              </p>
            </div>
          )}

          {ad.snapUrl && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs mt-2"
              onClick={() => window.open(ad.snapUrl, '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1.5" />
              View Ad
            </Button>
          )}
        </div>
      </div>

      {/* Full Size Modal */}
      {showFullImage && ad.snapUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowFullImage(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowFullImage(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Full size ad view"
          tabIndex={-1}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <iframe
              src={ad.snapUrl}
              className="max-w-full max-h-full w-full h-full border-0 rounded-lg"
              title={`Full size ad snapshot for ${ad.pageName || "Competitor ad"}`}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-40"
              onClick={() => setShowFullImage(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default CompetitorAdsDashboard;

