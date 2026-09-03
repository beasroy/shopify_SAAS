import React from "react";
import { Folder, Trash2 } from "lucide-react";
import type { Creative } from "../CreativesLibrary";

export interface CreativeGroup {
  _id: string;
  name: string;
  adIds: string[];
}

interface CreativeGroupCardProps {
  group: CreativeGroup;
  creatives: Creative[];
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

const CreativeGroupCard: React.FC<CreativeGroupCardProps> = ({ group, creatives, onClick, onDelete }) => {
  // Find creatives that belong to this group
  const groupCreatives = creatives.filter(c => group.adIds.includes(c.creative_id) || group.adIds.includes(c.ad_id));
  
  // Get up to 2 thumbnails safely
  const thumbnails = groupCreatives.slice(0, 2).map(c => {
    if (c.creative_type === "carousel" && c.carousel_images && c.carousel_images.length > 0) {
      return c.carousel_images[0].url;
    }
    return c.thumbnail_url || (c as any).image_url || c.creative_url;
  }).filter(url => typeof url === 'string' && url.trim() !== '');

  return (
    <div
      onClick={onClick}
      className="flex flex-col border border-border rounded-lg bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer h-full group relative"
    >
      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          className="absolute top-3 right-3 z-20 p-2 bg-red-100/90 text-red-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 shadow-sm backdrop-blur-sm"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <div className="relative w-full aspect-square bg-muted p-2 z-0">
        {thumbnails.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gray-100 dark:bg-gray-800 rounded-md">
            <Folder className="w-16 h-16 mb-2 opacity-50" />
            <span className="text-sm font-medium">Empty Group</span>
          </div>
        ) : (
          <div className={`w-full h-full grid gap-1 rounded-md overflow-hidden ${thumbnails.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {thumbnails.map((url, i) => (
              <div key={i} className="relative w-full h-full bg-gray-200 dark:bg-gray-800">
                <img
                  src={url}
                  alt={`Thumbnail ${i}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Overlay gradient for styling */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="p-4 flex flex-col items-start justify-between flex-1">
        <div className="flex items-center gap-2 mb-2 w-full overflow-hidden">
          <Folder className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-base font-bold truncate flex-1 text-gray-900 dark:text-gray-100">
            {group.name || "Unnamed Group"}
          </h3>
        </div>
        
        <div className="flex items-center justify-between w-full mt-auto">
          <span className="text-sm text-muted-foreground font-medium">
            {group.adIds.length} {group.adIds.length === 1 ? "Creative" : "Creatives"}
          </span>
          <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            View contents →
          </span>
        </div>
      </div>
    </div>
  );
};

export default CreativeGroupCard;
