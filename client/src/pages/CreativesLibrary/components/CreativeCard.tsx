import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  ExternalLink,
  Play,
  Pause,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Creative } from "../CreativesLibrary";

interface CreativeCardProps {
  creative: Creative;
}

const CreativeCard: React.FC<CreativeCardProps> = ({ creative }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  const carouselImages = creative.carousel_images || [];
  const hasCarousel = creative.creative_type === "carousel" && carouselImages.length > 0;

  // Reset carousel index when creative changes
  useEffect(() => {
    setCarouselIndex(0);
  }, [creative.ad_id]);

  const handleVideoToggle = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleCarouselNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
  };

  const handleCarouselPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  const handleShowFullImage = () => {
    setCarouselIndex(0); // Reset to first image when opening modal
    setShowFullImage(true);
  };


  const formatCurrency = (num: number | undefined) => {
    if (num === undefined || num === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatNumber = (num: number | undefined, decimals: number = 0) => {
    if (num === undefined || num === null) return '-';
    return num.toFixed(decimals);
  };

  const formatPercentage = (num: number | undefined, decimals: number = 2) => {
    if (num === undefined || num === null) return '-';
    return `${num.toFixed(decimals)}%`;
  };

  const formatRatio = (num: number | undefined, decimals: number = 2) => {
    if (num === undefined || num === null) return '-';
    return `${num.toFixed(decimals)}x`;
  };

  return (
    <>
      <div 
        className={cn(
          "flex flex-col border border-border rounded-lg bg-card overflow-hidden",
          "hover:border-primary/30 hover:shadow-lg transition-all duration-200",
          "group h-full"
        )}
      >
        {/* Media Section - Top */}
        <div className="relative w-full aspect-square bg-muted overflow-hidden">
          {hasCarousel ? (
            <>
              {/* Carousel */}
              <div className="relative w-full h-full">
                <img
                  src={carouselImages[carouselIndex]?.url}
                  alt={carouselImages[carouselIndex]?.name || creative.ad_name}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
                
                {/* Carousel Navigation */}
                {carouselImages.length > 1 && (
                  <>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="!w-8 !h-8 !rounded-full bg-black/50 hover:!bg-black/70 hover:!w-8 hover:!h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto !border-0 !p-0 !m-0 !min-w-[2rem] !min-h-[2rem] !max-w-[2rem] !max-h-[2rem] flex-shrink-0"
                        onClick={handleCarouselPrev}
                        style={{ transform: 'none', width: '2rem', height: '2rem' }}
                      >
                        <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                      </Button>
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="!w-8 !h-8 !rounded-full bg-black/50 hover:!bg-black/70 hover:!w-8 hover:!h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto !border-0 !p-0 !m-0 !min-w-[2rem] !min-h-[2rem] !max-w-[2rem] !max-h-[2rem] flex-shrink-0"
                        onClick={handleCarouselNext}
                        style={{ transform: 'none', width: '2rem', height: '2rem' }}
                      >
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      </Button>
                    </div>
                    
                    {/* Carousel Indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {carouselImages.map((img, index) => (
                        <button
                          key={img.url || `carousel-${index}`}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            index === carouselIndex 
                              ? "w-6 bg-white" 
                              : "w-1.5 bg-white/50"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCarouselIndex(index);
                          }}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
                
                {/* Zoom Button */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none z-10">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full pointer-events-auto"
                    onClick={handleShowFullImage}
                  >
                    <Maximize2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : creative.creative_type === "video" && creative.creative_url ? (
            <>
              <video
                ref={videoRef}
                src={creative.creative_url}
                poster={creative.thumbnail_url || undefined}
                className="w-full h-full object-cover"
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full"
                  onClick={handleVideoToggle}
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </Button>
              </div>
            </>
          ) : creative.creative_url || creative.thumbnail_url ? (
            <>
              <img
                src={creative.creative_url || creative.thumbnail_url}
                alt={creative.ad_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                onClick={handleShowFullImage}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full"
                  onClick={handleShowFullImage}
                >
                  <Maximize2 className="w-5 h-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-3 flex flex-col flex-1">
          {/* Header */}
          <div className="mb-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold line-clamp-2 flex-1 leading-tight">
            {creative.ad_name}
              </h3>
              <span className={cn(
                "inline-block text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                creative.creative_type === "video" 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : creative.creative_type === "image"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  : creative.creative_type === "carousel"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              )}>
                {creative.creative_type === "video" ? "Video" : creative.creative_type === "image" ? "Image" : creative.creative_type === "carousel" ? "Carousel" : "Unknown"}
              </span>
            </div>
        </div>

          {/* Metrics - Clean table layout */}
          <div className="space-y-1 flex-1 text-xs">
            {/* Financial Metrics */}
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Spend</span>
              <span className="font-semibold">{formatCurrency(creative.spend)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-semibold">{formatCurrency(creative.revenue)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">ROAS</span>
              <span className="font-semibold">{formatRatio(creative.roas)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">CPC</span>
              <span className="font-semibold">{formatCurrency(creative.cpc)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">CPP</span>
              <span className="font-semibold">{formatCurrency(creative.cpp)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Orders</span>
              <span className="font-semibold">{formatNumber(creative.orders)}</span>
            </div>

            {/* Performance Metrics */}
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Impressions</span>
              <span className="font-semibold">{formatNumber(creative.impressions)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Clicks</span>
              <span className="font-semibold">{formatNumber(creative.clicks)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">CTR</span>
              <span className="font-semibold">{formatPercentage(creative.ctr)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Frequency</span>
              <span className="font-semibold">{formatNumber(creative.frequency, 2)}</span>
            </div>

            {/* Engagement Metrics */}
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Hook Rate</span>
              <span className="font-semibold">{formatPercentage(creative.hook_rate)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Engagement Rate</span>
              <span className="font-semibold">
                {creative.engagementRate !== undefined ? formatPercentage(creative.engagementRate * 100) : '-'}
              </span>
            </div>

          
              <>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Video Views</span>
                  <span className="font-semibold">{formatNumber(creative.video_views)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">25% Watched</span>
                  <span className="font-semibold">{formatNumber(creative.video_p25_watched)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">50% Watched</span>
                  <span className="font-semibold">{formatNumber(creative.video_p50_watched)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">100% Watched</span>
                  <span className="font-semibold">{formatNumber(creative.video_p100_watched)}</span>
                </div>
              </>

          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
              className="w-full text-xs h-7"
            onClick={() => window.open(creative.creative_url || creative.thumbnail_url, '_blank')}
          >
              <ExternalLink className="w-3 h-3 mr-1.5" />
            View Full Size
          </Button>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && (hasCarousel || creative.creative_url || creative.thumbnail_url) && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {hasCarousel ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={carouselImages[carouselIndex]?.url}
                  alt={carouselImages[carouselIndex]?.name || creative.ad_name}
                  className="max-w-full max-h-full object-contain rounded-lg pointer-events-none"
                  onClick={(e) => e.stopPropagation()}
                />
                {carouselImages.length > 1 && (
                  <>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="!w-12 !h-12 !rounded-full bg-black/50 hover:!bg-black/70 hover:!w-12 hover:!h-12 text-white pointer-events-auto !border-0 !p-0 !m-0 !min-w-[3rem] !min-h-[3rem] !max-w-[3rem] !max-h-[3rem] flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCarouselPrev(e);
                        }}
                        style={{ transform: 'none', width: '3rem', height: '3rem' }}
                      >
                        <ChevronLeft className="w-6 h-6 flex-shrink-0" />
                      </Button>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="!w-12 !h-12 !rounded-full bg-black/50 hover:!bg-black/70 hover:!w-12 hover:!h-12 text-white pointer-events-auto !border-0 !p-0 !m-0 !min-w-[3rem] !min-h-[3rem] !max-w-[3rem] !max-h-[3rem] flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCarouselNext(e);
                        }}
                        style={{ transform: 'none', width: '3rem', height: '3rem' }}
                      >
                        <ChevronRight className="w-6 h-6 flex-shrink-0" />
                      </Button>
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30 pointer-events-auto">
                      {carouselImages.map((img, index) => (
                        <button
                          key={img.url || `modal-carousel-${index}`}
                          className={cn(
                            "h-2 rounded-full transition-all cursor-pointer",
                            index === carouselIndex 
                              ? "w-8 bg-white" 
                              : "w-2 bg-white/50"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCarouselIndex(index);
                          }}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
            <img
              src={creative.creative_url || creative.thumbnail_url}
              alt={creative.ad_name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-40"
              onClick={() => setShowFullImage(false)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default CreativeCard;

