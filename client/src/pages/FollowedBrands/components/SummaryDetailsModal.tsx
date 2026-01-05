import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Play, ExternalLink, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getPlatformLogo } from './AdCard';

interface ScrapedAd {
  _id: string;
  snapshot?: {
    images?: any[];
    videos?: any[];
    cards?: any[];
    title?: string;
    caption?: string;
    link_url?: string;
    cta_text?: string;
    cta_type?: string;
    body?: { text?: string };
  };
  is_active?: boolean;
  publisher_platform?: string[];
  start_date_formatted?: string;
  end_date_formatted?: string;
  entity_type?: string;
}

interface SummaryDetailsModalProps {
  ads: ScrapedAd[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SummaryDetailsModal: React.FC<SummaryDetailsModalProps> = ({
  ads,
  open,
  onOpenChange,
}) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  if (ads.length === 0) return null;

  const currentAd = ads[currentAdIndex];
  const snapshot = currentAd.snapshot || {};
  const hasCards = snapshot.cards && snapshot.cards.length > 0;
  const hasImages = snapshot.images && snapshot.images.length > 0;
  const hasVideos = snapshot.videos && snapshot.videos.length > 0;

  // Get carousel items
  const carouselItems = hasCards
    ? snapshot?.cards?.map((card: any) => {
      // Check if card has video
      const hasVideo = card.video_sd_url || card.video_hd_url || card.watermarked_video_sd_url || card.watermarked_video_hd_url;

      if (hasVideo) {
        return {
          type: 'video',
          videoUrl: card.video_hd_url || card.video_sd_url || card.watermarked_video_hd_url || card.watermarked_video_sd_url,
          poster: card.video_preview_image_url || card.resized_image_url,
          link: card.link,
          name: card.name,
          description: card.description,
          body: card.body,
          cta_text: card.cta_text,
        };
      }

      // Card has image
      return {
        type: 'card',
        image: card.original_image_url || card.image_url,
        link: card.link,
        name: card.name,
        description: card.description,
        body: card.body,
        cta_text: card.cta_text,
      };
    }) ?? []
    : hasImages
      ? snapshot.images?.map((img: any) => ({
        type: 'image',
        url: typeof img === 'string' ? img : img.url,
      })) ?? []
      : [];

  const currentCarouselItem = carouselItems[currentCarouselIndex];

  const nextCarousel = () => {
    setCurrentCarouselIndex((prev) => (prev + 1) % carouselItems.length);
  };

  const prevCarousel = () => {
    setCurrentCarouselIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  const nextAd = () => {
    setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    setCurrentCarouselIndex(0);
  };

  const prevAd = () => {
    setCurrentAdIndex((prev) => (prev - 1 + ads.length) % ads.length);
    setCurrentCarouselIndex(0);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Ad Details {ads.length > 1 && `(${currentAdIndex + 1} of ${ads.length})`}
          </DialogTitle>
          <DialogDescription>
            {snapshot.title || 'Ad Summary Details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ad Navigation */}
          {ads.length > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={prevAd}
                disabled={currentAdIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Ad {currentAdIndex + 1} of {ads.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextAd}
                disabled={currentAdIndex === ads.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Main Content: Side by Side Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Media Display - Left Side (Reduced Width) */}
            <div className="lg:col-span-1 flex">
              <Card className="w-full flex flex-col">
                <CardContent className="p-0 flex-1 flex flex-col">
                  {hasCards && carouselItems.length > 0 ? (
                    <div className="relative flex-1 flex flex-col">
                      <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden min-h-[280px]">
                        {currentCarouselItem.type === 'video' && 'videoUrl' in currentCarouselItem ? (
                          <video
                            src={currentCarouselItem.videoUrl}
                            controls
                            className="w-full h-full object-contain"
                            poster={currentCarouselItem.poster}
                            style={{ maxHeight: '100%' }}
                          />
                        ) : 'image' in currentCarouselItem && currentCarouselItem.image ? (
                          <img
                            src={currentCarouselItem.image}
                            alt={'name' in currentCarouselItem ? currentCarouselItem.name || 'Carousel item' : 'Carousel item'}
                            className="w-full h-full object-contain"
                            style={{ maxHeight: '100%' }}
                          />
                        ) : (
                          <div className="text-muted-foreground">No media</div>
                        )}
                      </div>

                      {currentCarouselItem.type === 'video' && 'videoUrl' in currentCarouselItem && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1 z-10">
                          <Play className="w-3 h-3" />
                          Video
                        </div>
                      )}

                      {carouselItems.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
                            onClick={prevCarousel}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
                            onClick={nextCarousel}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>

                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {carouselItems.map((_, idx) => (
                              <button
                                key={idx}
                                className={`w-2 h-2 rounded-full ${idx === currentCarouselIndex ? 'bg-white' : 'bg-white/50'
                                  }`}
                                onClick={() => setCurrentCarouselIndex(idx)}
                              />
                            ))}
                          </div>

                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {currentCarouselIndex + 1} / {carouselItems.length}
                          </div>
                        </>
                      )}
                    </div>
                  ) : hasVideos && snapshot.videos && snapshot.videos.length > 0 ? (
                    <div className="relative flex-1 bg-black min-h-[280px]">
                      <video
                        src={snapshot.videos[0].video_sd_url || snapshot.videos[0].video_hd_url}
                        controls
                        className="w-full h-full"
                        poster={snapshot.videos[0].video_preview_image_url}
                      />
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        Video
                      </div>
                    </div>
                  ) : hasImages && snapshot.images && snapshot.images.length > 0 ? (
                    <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden min-h-[280px]">
                      <img
                        src={typeof snapshot.images[0] === 'string' ? snapshot.images[0] : snapshot.images[0].url}
                        alt={snapshot.title || 'Ad image'}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 bg-gray-100 flex items-center justify-center text-muted-foreground min-h-[280px]">
                      No media available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Details - Right Side */}
            <div className="lg:col-span-1 flex">
              <Card className="w-full flex flex-col">
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-4 flex-1 flex flex-col">


                    {/* Body - from card or snapshot */}
                    {hasCards && 'body' in currentCarouselItem && currentCarouselItem.body ? (
                      <div>

                        <p className="text-sm text-muted-foreground">
                          {typeof currentCarouselItem.body === 'string'
                            ? currentCarouselItem.body
                            : currentCarouselItem.body.text || JSON.stringify(currentCarouselItem.body)}
                        </p>
                      </div>
                    ) : snapshot.body?.text && (
                      <div>
                        <p className="text-sm text-muted-foreground">{snapshot.body.text}</p>
                      </div>
                    )}



                    <div className="grid grid-cols-2 gap-4">
                      {/* Active Status */}
                      <div>


                        <Badge variant={currentAd.is_active ? 'default' : 'secondary'}>
                          {currentAd.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {/* Publisher Platform */}
                      {currentAd.publisher_platform && currentAd.publisher_platform.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">platforms :</span>
                          {currentAd.publisher_platform.map((platform) => {
                            const logo = getPlatformLogo(platform);
                            if (!logo) return null;
                            return (
                              <span key={`${currentAd._id}-${platform}`} className="flex items-center">
                                {logo}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {/* Start Date */}
                      {currentAd.start_date_formatted && (
                        <div>
                          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Start Date</span>
                          </h3>
                          <p className="text-sm">{currentAd.start_date_formatted}</p>
                        </div>
                      )}

                      {/* End Date */}
                      {currentAd.end_date_formatted && (
                        <div>
                          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>End Date</span>
                          </h3>
                          <p className="text-sm">{currentAd.end_date_formatted}</p>
                        </div>
                      )}


                    </div>
                    {/* CTA Button - from card or snapshot */}
                    {hasCards && 'link' in currentCarouselItem && currentCarouselItem.link && 'cta_text' in currentCarouselItem && currentCarouselItem.cta_text ? (
                      <div>
                        <Button
                          onClick={() => {
                            if (currentCarouselItem.link) {
                              window.open(currentCarouselItem.link, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="w-full"
                        >
                          {currentCarouselItem.cta_text}
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    ) : snapshot.link_url && snapshot.cta_text && (
                      <div>
                        <Button
                          onClick={() => {
                            if (snapshot.link_url) {
                              window.open(snapshot.link_url, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="w-full"
                        >
                          {snapshot.cta_text}
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SummaryDetailsModal;

