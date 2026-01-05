import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import CollapsibleSidebar from '@/components/dashboard_component/CollapsibleSidebar';
import { baseURL } from '@/data/constant';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import AdCard from './components/AdCard';
import SummaryDetailsModal from './components/SummaryDetailsModal';
import Loader from '@/components/dashboard_component/loader';
import { useParams } from 'react-router-dom';

interface ScrapingBrand {
  _id: string;
  pageId?: string;
  pageName?: string;
  pageUrl: string;
  adCount: number;
  ads?: ScrapedAd[];
  createdAt: string;
  updatedAt: string;
}

interface ScrapedAd {
  _id: string;
  scrapingBrandId: string;
  entity_type?: string;
  is_active?: boolean;
  publisher_platform?: string[];
  page_name?: string;
  snapshot?: {
    body?: { text?: string };
    branded_content?: any;
    caption?: string;
    cards?: any[];
    cta_text?: string;
    cta_type?: string;
    display_format?: string;
    images?: any[];
    is_reshared?: boolean;
    link_description?: string;
    link_url?: string;
    title?: string;
    videos?: any[];
    additional_info?: any;
    extra_images?: any[];
  };
  start_date_formatted?: string;
  end_date_formatted?: string;
  collation_id?: string;
  collation_count?: number;
}

const FollowedBrands: React.FC = () => {
  const { brandId } = useParams();
  const [brands, setBrands] = useState<ScrapingBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [pageUrl, setPageUrl] = useState('');
  const [selectedAds, setSelectedAds] = useState<ScrapedAd[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Fetch all brands and their ads
  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${baseURL}/api/scraping/get-followed-brands/${brandId}`, {
        withCredentials: true
      });

      if (response.data.success) {
        setBrands(response.data.data);
      } else {
        toast({
          variant: 'destructive',
          description: 'Failed to fetch brands'
        });
      }
    } catch (error: any) {
      console.error('Error fetching brands:', error);
      toast({
        variant: 'destructive',
        description: error.response?.data?.message || 'Error fetching brands'
      });
    } finally {
      setLoading(false);
    }
  };

  // Scrape and save new brand
  const handleScrape = async () => {
    if (!pageUrl.trim()) {
      toast({
        variant: 'destructive',
        description: 'Please enter a page URL'
      });
      return;
    }

    setScraping(true);
    try {
      const response = await axios.post(
        `${baseURL}/api/scraping/scrape-brand`,
        {
          pageUrl: pageUrl.trim(),
          count: 200,
          countries: ['IN'],
          activeStatus: 'all',
          brandId : brandId
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast({
          description: `Successfully scraped ${response.data.data.saveResult.adsSaved} ads`
        });
        setPageUrl('');
        // Refresh brands list
        await fetchBrands();
      } else {
        toast({
          variant: 'destructive',
          description: 'Failed to scrape page'
        });
      }
    } catch (error: any) {
      console.error('Error scraping:', error);
      toast({
        variant: 'destructive',
        description: error.response?.data?.message || 'Error scraping page'
      });
    } finally {
      setScraping(false);
    }
  };

  // Toggle brand expansion
  const toggleBrandExpansion = (brandId: string) => {
    setExpandedBrands(prev => {
      const newSet = new Set(prev);
      if (newSet.has(brandId)) {
        newSet.delete(brandId);
      } else {
        newSet.add(brandId);
      }
      return newSet;
    });
  };

  // Handle summary details
  const handleSummaryDetails = (ads: ScrapedAd[]) => {
    setSelectedAds(ads);
    setShowSummaryModal(true);
  };

  const unfollowBrand = async (scrapedBrandId: string) => {
    if (!brandId) {
      toast({
        variant: 'destructive',
        description: 'Brand ID is missing'
      });
      return;
    }

    try {
      const response = await axios.post(
        `${baseURL}/api/scraping/unfollow-brand/${brandId}`,
        { scrapedBrandId },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast({
          description: 'Brand unfollowed successfully'
        });
        // Refresh brands list
        await fetchBrands();
      } else {
        toast({
          variant: 'destructive',
          description: response.data.message || 'Failed to unfollow brand'
        });
      }
    } catch (error: any) {
      console.error('Error unfollowing brand:', error);
      toast({
        variant: 'destructive',
        description: error.response?.data?.message || 'Error unfollowing brand'
      });
    }
  };
  useEffect(() => {
    fetchBrands();
  }, [brandId]);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <CollapsibleSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader isLoading={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      
      <div className="flex-1 h-screen overflow-auto p-6 space-y-6">
        {/* Header with Search */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Followed Brands</h1>
            <p className="text-muted-foreground mt-1">
              Track and analyze competitor Facebook ads
            </p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Paste Facebook page URL..."
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                className="pl-10 pr-4 w-full md:w-[400px]"
              />
            </div>
            <Button
              onClick={handleScrape}
              disabled={scraping || !pageUrl.trim()}
              className="whitespace-nowrap"
            >
              {scraping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Brand
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Brands List */}
        {brands.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Brands Found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Start by adding a Facebook page URL to scrape ads
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {brands.map((brand) => {
              // Filter ads: only show ads without collation_id OR ads with collation_id AND collation_count
              const filteredAds = (brand.ads || []).filter((ad) => {
                const collationId = ad.collation_id;
                const collationCount = ad.collation_count || 0;
                // Show if: no collation_id (standalone) OR has collation_id with collation_count (representative)
                return !collationId || (collationId && collationCount > 0);
              });
              
              const isExpanded = expandedBrands.has(brand._id);
              const displayAds = isExpanded ? filteredAds : filteredAds.slice(0, 4);
              const hasMoreAds = filteredAds.length > 4;
              
              return (
                <Card key={brand._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl" onClick={() => window.open(brand.pageUrl, '_blank')}>
                          {brand.pageName || 'Unknown Brand'}
                        </CardTitle>
                    
                        <p className="text-sm text-muted-foreground">
                          Total <strong>{brand.adCount}</strong> ads 
                        </p>
                      </div>
                      <div className='flex flex-row items-center gap-2'>   
                         {hasMoreAds && (
                        <Button
                          variant="outline"
                          onClick={() => toggleBrandExpansion(brand._id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              View All
                            </>
                          )}
                        </Button>
                      )}
                      <Button 
                        variant="destructive"
                        onClick={() => unfollowBrand(brand._id)}
                      >
                        Unfollow
                      </Button>
                    </div>
                  
                    </div>
                  </CardHeader>
                  <CardContent>
                    {displayAds.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No ads available
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {displayAds.map((ad) => {
                          const collationId = ad.collation_id;
                          const collationCount = ad.collation_count || 0;
                          
                          // If ad has collation_id and collation_count, find all ads in the group
                          if (collationId && collationCount > 1) {
                            const collationAds = brand.ads?.filter(
                              a => a.collation_id === collationId
                            ) || [];
                            
                            return (
                              <AdCard
                                key={ad._id}
                                ad={ad}
                                onClick={() => handleSummaryDetails(collationAds)}
                              />
                            );
                          }
                          
                          // Standalone ad (no collation_id) or collation_count is 1
                          return (
                            <AdCard
                              key={ad._id}
                              ad={ad}
                              onClick={() => handleSummaryDetails([ad])}
                            />
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Details Modal */}
      {showSummaryModal && (
        <SummaryDetailsModal
          ads={selectedAds}
          open={showSummaryModal}
          onOpenChange={setShowSummaryModal}
        />
      )}
    </div>
  );
};

export default FollowedBrands;

