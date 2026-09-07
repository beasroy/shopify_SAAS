import React from "react";
import { Folder, Trash2 } from "lucide-react";
import type { Creative } from "../CreativesLibrary";

export interface CreativeGroupMetrics {
  totalSpend: number;
  totalRevenue: number;
  totalOrders: number;
  totalImpressions: number;
  totalClicks: number;
  totalVideoViews: number;
  totalP25: number;
  totalP50: number;
  totalP100: number;
  roas: number;
  cpc: number;
  cpp: number;
  ctr: number;
  avgFrequency?: number;
  hookRate?: number;
  engagementRate?: number;
  p25Rate?: number;
  p50Rate?: number;
  p100Rate?: number;
}

export interface CreativeGroup {
  _id: string;
  name: string;
  adIds: string[];
  metrics?: CreativeGroupMetrics;
}

interface CreativeGroupCardProps {
  group: CreativeGroup;
  creatives: Creative[];
  selectedKPIs?: Set<string>;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

const CreativeGroupCard: React.FC<CreativeGroupCardProps> = ({ group, creatives, selectedKPIs, onClick, onDelete }) => {
  // Find creatives that belong to this group
  const groupCreatives = creatives.filter(c => group.adIds.includes(c.creative_id) || group.adIds.includes(c.ad_id));
  
  // Get up to 2 thumbnails safely
  const thumbnails = groupCreatives.slice(0, 2).map(c => {
    if (c.creative_type === "carousel" && c.carousel_images && c.carousel_images.length > 0) {
      return c.carousel_images[0].url;
    }
    return c.thumbnail_url || (c as any).image_url || c.creative_url;
  }).filter(url => typeof url === 'string' && url.trim() !== '');

  const metrics = group.metrics || {
    totalSpend: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalVideoViews: 0,
    totalP25: 0,
    totalP50: 0,
    totalP100: 0,
    roas: 0,
    cpc: 0,
    cpp: 0,
    ctr: 0,
  };

  const shouldShowKPI = (kpiKey: string) => {
    if (!selectedKPIs) return true;
    return selectedKPIs.has(kpiKey);
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

      <div className="p-3 flex flex-col items-start justify-start flex-1">
        <div className="flex items-center gap-2 mb-3 w-full overflow-hidden">
          <Folder className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-base font-bold truncate flex-1 text-gray-900 dark:text-gray-100">
            {group.name || "Unnamed Group"}
          </h3>
        </div>

        {/* Aggregate Metrics - Clean table layout */}
        <div className="space-y-1 w-full flex-1 text-xs mb-3">
          {shouldShowKPI("spend") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Spend</span>
              <span className="font-semibold">{formatCurrency(metrics.totalSpend)}</span>
            </div>
          )}
          {shouldShowKPI("revenue") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-semibold">{formatCurrency(metrics.totalRevenue)}</span>
            </div>
          )}
          {shouldShowKPI("roas") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">ROAS</span>
              <span className="font-semibold">{formatRatio(metrics.roas)}</span>
            </div>
          )}
          {shouldShowKPI("cpc") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">CPC</span>
              <span className="font-semibold">{formatCurrency(metrics.cpc)}</span>
            </div>
          )}
          {shouldShowKPI("cpp") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">CPP</span>
              <span className="font-semibold">{formatCurrency(metrics.cpp)}</span>
            </div>
          )}
          {shouldShowKPI("orders") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Orders</span>
              <span className="font-semibold">{formatNumber(metrics.totalOrders)}</span>
            </div>
          )}

          {shouldShowKPI("impressions") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Impressions</span>
              <span className="font-semibold">{formatNumber(metrics.totalImpressions)}</span>
            </div>
          )}
          {shouldShowKPI("clicks") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Clicks</span>
              <span className="font-semibold">{formatNumber(metrics.totalClicks)}</span>
            </div>
          )}
          {shouldShowKPI("ctr") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">CTR</span>
              <span className="font-semibold">{formatPercentage(metrics.ctr)}</span>
            </div>
          )}
          {shouldShowKPI("frequency") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Avg Frequency</span>
              <span className="font-semibold">{formatNumber(metrics.avgFrequency, 2)}</span>
            </div>
          )}

          {shouldShowKPI("hook_rate") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Avg Hook Rate</span>
              <span className="font-semibold">{formatPercentage(metrics.hookRate)}</span>
            </div>
          )}
          {shouldShowKPI("engagementRate") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Avg Engagement Rate</span>
              <span className="font-semibold">
                {metrics.engagementRate !== undefined ? formatPercentage(metrics.engagementRate) : '-'}
              </span>
            </div>
          )}

          {shouldShowKPI("video_views") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Video Views</span>
              <span className="font-semibold">{formatNumber(metrics.totalVideoViews)}</span>
            </div>
          )}
          {shouldShowKPI("video_p25_watched") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">25% Watched</span>
              <span className="font-semibold">{formatNumber(metrics.totalP25)}</span>
            </div>
          )}
          {shouldShowKPI("video_p50_watched") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">50% Watched</span>
              <span className="font-semibold">{formatNumber(metrics.totalP50)}</span>
            </div>
          )}
          {shouldShowKPI("video_p100_watched") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">100% Watched</span>
              <span className="font-semibold">{formatNumber(metrics.totalP100)}</span>
            </div>
          )}
          {shouldShowKPI("video_p25_watched_rate") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">25% Watched Rate</span>
              <span className="font-semibold">{formatPercentage(metrics.p25Rate)}</span>
            </div>
          )}
          {shouldShowKPI("video_p50_watched_rate") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">50% Watched Rate</span>
              <span className="font-semibold">{formatPercentage(metrics.p50Rate)}</span>
            </div>
          )}
          {shouldShowKPI("video_p100_watched_rate") && (
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">100% Watched Rate</span>
              <span className="font-semibold">{formatPercentage(metrics.p100Rate)}</span>
            </div>
          )}

          {selectedKPIs?.size === 0 && (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
              No metrics selected
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between w-full mt-auto pt-2 border-t">
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
