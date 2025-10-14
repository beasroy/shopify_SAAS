import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  ExternalLink,
  Play,
  Pause,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Creative } from "../CreativesLibrary";

interface CreativeCardProps {
  creative: Creative;
}

const CreativeCard: React.FC<CreativeCardProps> = ({ creative }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

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


  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-300 hover:shadow-lg",
          isHovered && "scale-[1.02]"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Media Section */}
        <div className="relative aspect-square bg-muted overflow-hidden group">
          {creative.creative_type === "video" && creative.creative_url ? (
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
              
              {/* Video Overlay Controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-12 h-12 rounded-full"
                  onClick={handleVideoToggle}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </Button>
              </div>
            </>
          ) : creative.creative_url || creative.thumbnail_url ? (
            <>
              <img
                src={creative.creative_url || creative.thumbnail_url}
                alt={creative.ad_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Zoom Button */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-10 h-10 rounded-full"
                  onClick={() => setShowFullImage(true)}
                >
                  <Maximize2 className="w-5 h-5" />
                </Button>
              </div>

            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-12 h-12" />
            </div>
          )}

       
        </div>

        {/* Content Section */}
        <div className="p-3">
          <CardTitle className="text-base font-semibold line-clamp-2 min-h-[1rem]">
            {creative.ad_name}
          </CardTitle>
        </div>

        <CardContent className="p-3">
          {/* Metrics - Compact Row Layout */}
          <div className="space-y-1.5">
            {/* Spend */}
            <div className="flex items-center justify-between py-1 border-b">
              <span className="text-xs text-muted-foreground">Spend</span>
              <span className="text-sm font-semibold">{formatCurrency(creative.spend)}</span>
            </div>

            {/* ROAS */}
            <div className="flex items-center justify-between py-1 border-b">
              <span className="text-xs text-muted-foreground">ROAS</span>
              <span className="text-sm font-semibold">{creative.roas > 0 ? `${creative.roas.toFixed(2)}x` : '-'}</span>
            </div>

            {/* CTR */}
            <div className="flex items-center justify-between py-1 border-b">
              <span className="text-xs text-muted-foreground">CTR</span>
              <span className="text-sm font-semibold">{creative.ctr.toFixed(2)}%</span>
            </div>

            {/* Hook Rate */}
            <div className="flex items-center justify-between py-1 border-b">
              <span className="text-xs text-muted-foreground">Hook Rate</span>
              <span className="text-sm font-semibold">{creative.hook_rate > 0 ? `${creative.hook_rate.toFixed(2)}%` : '-'}</span>
            </div>

          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(creative.creative_url || creative.thumbnail_url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Full Size
          </Button>
        </CardFooter>
      </Card>

      {/* Full Image Modal */}
      {showFullImage && (creative.creative_url || creative.thumbnail_url) && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={creative.creative_url || creative.thumbnail_url}
              alt={creative.ad_name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4"
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

