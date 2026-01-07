import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { FaThreads , FaFacebookMessenger , FaInstagram ,FaFacebookF  } from "react-icons/fa6";
import { IoMdPeople } from "react-icons/io";


interface ScrapedAd {
  _id: string;
  snapshot?: {
    images?: any[];
    videos?: any[];
    cards?: any[];
    title?: string;
    body?: { text?: string };
    caption?: string;
    link_url?: string;
    cta_text?: string;
  };
  is_active?: boolean;
  publisher_platform?: string[];
  start_date_formatted?: string;
  end_date_formatted?: string;
  collation_id?: string;
  collation_count?: number;
}

interface AdCardProps {
  ad: ScrapedAd;
  onClick: () => void;
}

// Get platform logo component - pure utility function, no memoization needed
export const getPlatformLogo = (platform: string) => {
  const platformLower = platform.toLowerCase();
  if (platformLower.includes('threads')) {
    return <FaThreads className="w-3 h-3" />;
  } else if (platformLower.includes('messenger')) {
    return <FaFacebookMessenger className="w-3 h-3" />;
  } else if (platformLower.includes('instagram')) {
    return <FaInstagram className="w-3 h-3" />;
  } else if (platformLower.includes('facebook') || platformLower.includes('meta')) {
    return <FaFacebookF className="w-3 h-3" />;
  } else if (platformLower.includes('audience_network')) {
    return <IoMdPeople className="w-3 h-3" />;
  }
  return null;
};

const AdCard: React.FC<AdCardProps> = ({ ad, onClick }) => {
  const snapshot = ad.snapshot || {};
  const hasImages = snapshot.images && snapshot.images.length > 0;
  const hasVideos = snapshot.videos && snapshot.videos.length > 0;
  const hasCards = snapshot.cards && snapshot.cards.length > 0;
  
  // Get first card if cards exist
  const firstCard = hasCards ? snapshot.cards?.[0] : null;
  
  // If cards exist, prioritize showing card data
  const showCardData = hasCards && firstCard;
  
  // Get first media item (only if no cards)
  const firstImage = !showCardData && hasImages ? snapshot.images?.[0] : null;
  const firstVideo = !showCardData && hasVideos ? snapshot.videos?.[0] : null;
  
  // Determine media URL and type
  let mediaUrl: string | null = null;
  let mediaType: 'image' | 'video' | 'card' | null = null;
  
  // Check if card has video
  const cardHasVideo = showCardData && (
    firstCard?.video_sd_url || 
    firstCard?.video_hd_url || 
    firstCard?.video_preview_image_url ||
    firstCard?.watermarked_video_sd_url ||
    firstCard?.watermarked_video_hd_url
  );
  
  // Check if card has image
  const cardHasImage = showCardData && (
    firstCard?.resized_image_url || 
    firstCard?.image_url
  );
  
  if (showCardData) {
    // Priority: video preview image > video URL > card image
    if (cardHasVideo) {
      mediaUrl = firstCard.video_preview_image_url || 
                 firstCard.video_sd_url || 
                 firstCard.video_hd_url ||
                 firstCard.watermarked_video_sd_url ||
                 firstCard.watermarked_video_hd_url;
      mediaType = 'video';
    } else if (cardHasImage) {
      mediaUrl = firstCard.resized_image_url || firstCard.image_url;
      mediaType = 'card';
    }
  } else if (firstVideo?.video_preview_image_url || firstVideo?.video_sd_url) {
    mediaUrl = firstVideo.video_preview_image_url || firstVideo.video_sd_url;
    mediaType = 'video';
  } else if (firstImage?.url || firstImage) {
    mediaUrl = typeof firstImage === 'string' ? firstImage : (firstImage.resized_image_url || firstImage.url);
    mediaType = 'image';
  }
  
  // Get title - prioritize card title if cards exist
  const displayTitle = showCardData && firstCard?.title 
    ? firstCard.title 
    : snapshot.body?.text;
  
  // Format dates using date-fns
  const formatDate = (dateString?: string): string | null => {
    if (!dateString) return null;
    try {
      // Try parsing as ISO string first
      let date = parseISO(dateString);
      if (!isValid(date)) {
        // If that fails, try parsing as regular date
        date = new Date(dateString);
      }
      if (isValid(date)) {
        return format(date, 'dd/MM/yyyy');
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    return null;
  };

  const formattedStartDate = formatDate(ad.start_date_formatted);
  const formattedEndDate = formatDate(ad.end_date_formatted);

  // Get formatted date string
  const getFormattedDateRange = (): string | null => {
    if (formattedStartDate && formattedEndDate) {
      return `${formattedStartDate} - ${formattedEndDate}`;
    } else if (formattedStartDate) {
      return `Started at ${formattedStartDate}`;
    }
    return null;
  };

  const formattedDateRange = getFormattedDateRange();





  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden relative"

    >
      {/* Active/Inactive Badge - Top Left Corner */}
      {ad.is_active !== undefined && (
        <div className="absolute top-2 left-2 z-20">
          <Badge variant={ad.is_active ? 'default' : 'secondary'}>
            {ad.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      )}
      
      {/* Collation Count Badge - Top Right Corner */}
   
      
      <CardContent className="p-0">
        {/* Media Preview */}
        <div className="relative w-full aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
          {mediaUrl ? (
            <>
              {(mediaType === 'video' || (showCardData && cardHasVideo)) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <Play className="w-12 h-12 text-white" />
                </div>
              )}
              <img
                src={mediaUrl}
                alt={displayTitle || snapshot.title || 'Ad preview'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              {mediaType === 'video' || (showCardData && cardHasVideo) ? (
                <Play className="w-12 h-12" />
              ) : (
                <ImageIcon className="w-12 h-12" />
              )}
              <span className="text-xs mt-2">No preview</span>
            </div>
          )}
        </div>
        
        {/* Ad Info */}
        <div className="p-3 space-y-2">
          {displayTitle && (
            <p className="text-sm font-semibold line-clamp-2">
              {displayTitle}
            </p>
          )}
        
 
          {ad.publisher_platform && ad.publisher_platform.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">platforms :</span>
              {ad.publisher_platform.map((platform) => {
                const logo = getPlatformLogo(platform);
                if (!logo) return null;
                return (
                  <span key={`${ad._id}-${platform}`} className="flex items-center">
                    {logo}
                  </span>
                );
              })}
            </div>
          )}
          
          {/* Formatted Date Range */}
          {formattedDateRange && (
            <p className="text-xs text-muted-foreground">
              {formattedDateRange}
            </p>
          )}
             {ad.collation_count && ad.collation_count > 1 && (
     
         <p className="text-xs text-muted-foreground">
            <strong>{ad.collation_count} ads</strong> use this creative and text
          </p>

      )}
           <button
            onClick={onClick}
            className="w-full mt-4 flex items-center justify-between px-3 py-2.5 rounded-lg bg-gradient-to-r from-black/10 to-black/5 hover:from-black/20 hover:to-black/10 transition-colors border border-black/10 group/btn"
          >
            <span className="text-sm font-semibold text-black">View Ad</span>
            <ChevronRight className="w-4 h-4 text-black group-hover/btn:translate-x-1 transition-transform" />
          </button>
        
        </div>
      </CardContent>
    </Card>
  );
};

export default AdCard;

