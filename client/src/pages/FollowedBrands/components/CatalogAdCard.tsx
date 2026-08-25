

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
  logoUrl?: string;
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

  
  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowingState(true);
    onFollow(brand._id);
  };

  return (
    <div className="group relative cursor-pointer">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-pink-500/15 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
      
      <Card className="overflow-hidden relative h-full bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Header Section - Top */}
          <div className="px-3 py-4 flex items-center justify-between gap-3 flex-shrink-0 h-full">
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
              {brand.logoUrl ? (
                <img 
                  src={brand.logoUrl} 
                  alt={brand.pageName || 'Brand Logo'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                    }
                  }}
                />
              ) : null}
              <ImageIcon className="w-5 h-5 text-gray-400" style={{ display: brand.logoUrl ? 'none' : 'block' }} />
            </div>
            
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CatalogAdCard;
