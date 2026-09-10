import { useEffect, useState, useCallback, useMemo } from "react";
import { Instagram, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAxiosInstance } from "@/pages/ConversionReportPage/components/axiosInstance";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

interface Props {
  brandId: string;
  dateFrom: string | null;
  dateTo: string | null;
  isInstagramConnected: boolean;
}

export type Trend = "up" | "down" | "neutral";

export interface MetricData {
  current: number;
  previous: number;
  change: number;
  trend: Trend;
}

export interface MetricsData {
  [metric: string]: MetricData;
}

export default function InstagramPerformanceTable({
  brandId,
  dateFrom,
  dateTo,
  isInstagramConnected
}: Props) {
  const axiosInstance = useAxiosInstance();
  const [loading, setLoading] = useState(false);
  const [periodData, setPeriodData] = useState<Record<string, MetricsData> | null>(null);
  const dateRange = useSelector((state: RootState) => state.date);

  // Determine active period
  const activePeriod = useMemo(() => {
    if (dateRange.from && dateRange.to) return "custom";
    return "last30Days"; // Default fallback
  }, [dateRange]);

  const fetchMetrics = useCallback(async () => {
    if (!brandId || !isInstagramConnected) return;

    setLoading(true);
    try {
      const dateParams =
        dateFrom && dateTo
          ? {
              customStart: dateFrom,
              customEnd: dateTo,
              ...(dateRange.compareFrom && dateRange.compareTo
                ? {
                    customCompareStart: dateRange.compareFrom,
                    customCompareEnd: dateRange.compareTo,
                  }
                : {}),
            }
          : {};

      const response = await axiosInstance.get(
        `/api/summary/instagram/${brandId}`,
        { params: dateParams }
      );
      if (response.data.success && response.data.periodData) {
        setPeriodData(response.data.periodData);
      }
    } catch (error) {
      console.error("Error fetching Instagram metrics", error);
    } finally {
      setLoading(false);
    }
  }, [brandId, isInstagramConnected, dateFrom, dateTo, dateRange.compareFrom, dateRange.compareTo, axiosInstance]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (!isInstagramConnected) return null;

  const metricLabels: Record<string, string> = {
    followers: "Total Followers",
    reach: "Accounts Reached",
    views: "Total Views",
    profile_views: "Profile Views",
    engagements: "Total Engagements",
    engagement_rate: "Engagement Rate (%)",
    link_clicks: "Total Link Clicks",
    net_follower_growth: "Net Follower Growth"
  };

  const formatValue = (key: string, value: number) => {
    if (key === "engagement_rate") return value.toFixed(2) + "%";
    return value >= 1000 ? value.toLocaleString() : value;
  };

  const kpis = periodData ? periodData[activePeriod] : null;

  return (
    <div className="bg-white border rounded-lg shadow-sm mt-8 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="border-b p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Instagram Organic Performance
            </h2>
            <p className="text-sm text-slate-500">
              Selected Date Range Overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
            className="text-slate-600 font-medium bg-white shadow-sm border-slate-200"
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-y-auto max-h-[400px]">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 font-semibold w-1/2">Metric</th>
              <th className="px-6 py-4 font-semibold text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !kpis ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-48" />
                  </td>
                  <td className="px-6 py-4 flex justify-end">
                    <Skeleton className="h-5 w-16" />
                  </td>
                </tr>
              ))
            ) : kpis ? (
              Object.entries(metricLabels).map(([key, label]) => {
                const metricData = kpis[key];
                const currentVal = metricData ? metricData.current : 0;
                
                return (
                  <tr key={key} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-2">
                      {label}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 font-semibold">
                      {formatValue(key, currentVal)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                  No data available for the selected period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
