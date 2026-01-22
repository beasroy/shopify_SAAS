

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Heart} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CatalogAd {
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
}

interface CatalogBrand {
  _id: string;
  pageId?: string;
  pageName?: string;
  pageUrl: string;
  adCount: number;
  ads?: CatalogAd[];
  createdAt: string;
  updatedAt: string;
}

interface CatalogAdCardProps {
  brand: CatalogBrand;
  onFollow: (scrapedBrandId: string) => void;
  isFollowing?: boolean;
}

const CatalogAdCard: React.FC<CatalogAdCardProps> = ({ brand, onFollow, isFollowing = false }) => {
  const [isFollowingState, setIsFollowingState] = useState(isFollowing);

  
  const ad = brand.ads && brand.ads.length > 0 ? brand.ads[0] : null;
  
  if (!ad) {
    return null;
  }

  const snapshot = ad.snapshot || {};
  const hasCards = snapshot.cards && snapshot.cards.length > 0;
  
  // Get first card for metadata
  const firstCard = hasCards ? snapshot.cards?.[0] : null;
  
  // Check if first card has video
  const firstCardHasVideo = firstCard && (
    firstCard?.video_sd_url || 
    firstCard?.video_hd_url || 
    firstCard?.watermarked_video_sd_url ||
    firstCard?.watermarked_video_hd_url
  );
  
  // Get all cards for collage display (max 5 images) - only if no video
  const cardImages = hasCards && !firstCardHasVideo ? (snapshot.cards?.slice(0, 5) || []) : [];
  
  // Determine if displaying collage or single media (don't show collage if video exists)
  const isCollageMode = hasCards && cardImages.length > 0 && !firstCardHasVideo;
  
  // Single media fallback
  const hasImages = snapshot.images && snapshot.images.length > 0;
  const hasVideos = snapshot.videos && snapshot.videos.length > 0;
  
  const firstImage = hasImages ? snapshot.images?.[0] : null;
  const firstVideo = hasVideos ? snapshot.videos?.[0] : null;
  
  let mediaUrl: string | null = null;
  let videoUrl: string | null = null;
  let mediaType: 'image' | 'video' | null = null;
  
  if (!isCollageMode) {
    const firstCardHasImage = firstCard && (
      firstCard?.resized_image_url || 
      firstCard?.original_image_url ||
      firstCard?.image_url
    );
    
    if (firstCard) {
      if (firstCardHasVideo) {
        // Get video URL (prefer HD, fallback to SD)
        videoUrl = firstCard.video_hd_url || 
                   firstCard.video_sd_url ||
                   firstCard.watermarked_video_hd_url ||
                   firstCard.watermarked_video_sd_url;
        // Use preview image as thumbnail
        mediaUrl = firstCard.video_preview_image_url || videoUrl;
        mediaType = 'video';
      } else if (firstCardHasImage) {
        mediaUrl = firstCard.resized_image_url || firstCard.original_image_url || firstCard.image_url;
        mediaType = 'image';
      }
    } else if (firstVideo?.video_preview_image_url || firstVideo?.video_sd_url) {
      videoUrl = firstVideo.video_sd_url || firstVideo.video_hd_url;
      mediaUrl = firstVideo.video_preview_image_url || videoUrl;
      mediaType = 'video';
    } else if (firstImage?.url || firstImage) {
      mediaUrl = typeof firstImage === 'string' ? firstImage : (firstImage.resized_image_url || firstImage.url);
      mediaType = 'image';
    }
  }
  



  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowingState(true);
    onFollow(brand._id);
  };

  const handleCTAClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (snapshot.link_url) {
      window.open(snapshot.link_url, '_blank');
    }
  };

  // Get body text
  const bodyText = firstCard?.title || snapshot.body?.text || '';
  const croppedBodyText = bodyText.length > 80 ? bodyText.substring(0, 80) + '...' : bodyText;

  return (
    <div className="group relative cursor-pointer">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-pink-500/15 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
      
      <Card className="overflow-hidden relative h-full bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Header Section - Top */}
          <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">
                {brand.pageName || 'Unknown Brand'}
              </h3>
              <p className="text-xs text-gray-500">{brand.adCount} ads</p>
            </div>
            <Button
              variant={isFollowingState ? "default" : "outline"}
              size="sm"
              onClick={handleFollow}
              className={`h-7 w-7 p-0 flex-shrink-0 transition-all duration-300 rounded-full ${
                isFollowingState 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 transition-all ${isFollowingState ? 'fill-rose-500' : ''}`} />
            </Button>
          </div>

          {/* Media Section - Collage or Single */}
          <div className="relative w-full bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden flex-shrink-0">
            {isCollageMode ? (
              // Enhanced Collage with masonry-style layout
              <div className="aspect-[4/5] p-1 bg-gray-900">
                {cardImages.length === 1 ? (
                  // Single image fills entire collage
                  <div className="w-full h-full relative overflow-hidden rounded-lg">
                    <img
                      src={cardImages[0].resized_image_url || cardImages[0].original_image_url || cardImages[0].image_url || "/placeholder.svg"}
                      alt="Card 1"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : cardImages.length === 2 ? (
                  // Two images side by side
                  <div className="grid grid-cols-2 gap-1 h-full">
                    {cardImages.map((card, idx) => (
                      <div key={idx} className="relative overflow-hidden rounded-lg bg-gray-700 group/item">
                        <img
                          src={card.resized_image_url || card.original_image_url || card.image_url || "/placeholder.svg"}
                          alt={`Card ${idx + 1}`}
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : cardImages.length === 3 ? (
                  // Three images: full width top, two below
                  <div className="flex flex-col gap-1 h-full">
                    <div className="w-full h-1/2 relative overflow-hidden rounded-lg bg-gray-700 group/item">
                      <img
                        src={cardImages[0].resized_image_url || cardImages[0].original_image_url || cardImages[0].image_url || "/placeholder.svg"}
                        alt="Card 1"
                        className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex gap-1 h-1/2">
                      <div className="flex-1 relative overflow-hidden rounded-lg bg-gray-700 group/item">
                        <img
                          src={cardImages[1].resized_image_url || cardImages[1].image_url || "/placeholder.svg"}
                          alt="Card 2"
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1 relative overflow-hidden rounded-lg bg-gray-700 group/item">
                        <img
                          src={cardImages[2].resized_image_url || cardImages[2].image_url || "/placeholder.svg"}
                          alt="Card 3"
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : cardImages.length === 4 ? (
                  // Four images: 2x2 grid
                  <div className="grid grid-cols-2 gap-1 h-full">
                    {cardImages.map((card, idx) => (
                      <div key={idx} className="relative overflow-hidden rounded-lg bg-gray-700 group/item">
                        <img
                          src={card.resized_image_url || card.image_url || "/placeholder.svg"}
                          alt={`Card ${idx + 1}`}
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  // Five images: top row (3) + bottom row (2)
                  <div className="flex flex-col gap-1 h-full">
                    <div className="flex gap-1 h-1/2">
                      <div className="flex-1 relative overflow-hidden rounded-lg bg-gray-700 group/item">
                        <img
                          src={cardImages[0].resized_image_url || cardImages[0].image_url || "/placeholder.svg"}
                          alt="Card 1"
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1 relative overflow-hidden rounded-lg bg-gray-700 group/item">
                        <img
                          src={cardImages[1].resized_image_url || cardImages[1].image_url || "/placeholder.svg"}
                          alt="Card 2"
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1 relative overflow-hidden rounded-lg bg-gray-700 group/item">
                        <img
                          src={cardImages[2].resized_image_url || cardImages[2].image_url || "/placeholder.svg"}
                          alt="Card 3"
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-1 h-1/2">
                      <div className="flex-1 relative overflow-hidden rounded-lg bg-gray-700 group/item">
                        <img
                          src={cardImages[3].resized_image_url || cardImages[3].image_url || "/placeholder.svg"}
                          alt="Card 4"
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1 relative overflow-hidden rounded-lg bg-gray-700 group/item">
                        <img
                          src={cardImages[4].resized_image_url || cardImages[4].image_url || "/placeholder.svg"}
                          alt="Card 5"
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Single Media
              <div className="relative w-full aspect-[4/3] flex items-center justify-center bg-black">
                {mediaUrl ? (
                  <>
                    {mediaType === 'video' && videoUrl ? (
                      <>
                    
                          <video
                   
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            controls
                            
                          
                            onClick={(e) => e.stopPropagation()}
                          />
                      
                      </>
                    ) : (
                      <img
                        src={mediaUrl || "/placeholder.svg"}
                        alt={brand.pageName || 'Ad preview'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-12 h-12 mb-2" />
                    <span className="text-xs">No preview</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="px-3 pb-3 pt-2 flex-grow flex flex-col justify-between">
            {/* Ad Text */}
            {croppedBodyText && (
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2">
                {croppedBodyText}
              </p>
            )}

            {/* CTA Button */}
            {snapshot.cta_text && (
              <Button
                onClick={handleCTAClick}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium shadow-none hover:shadow-sm transition-all duration-300 rounded-lg py-1.5 h-auto text-xs"
              >
                {snapshot.cta_text}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CatalogAdCard;
