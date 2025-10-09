import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FacebookLogo, GoogleLogo, Ga4Logo } from "@/data/logo";
import { RefreshCw, Minimize2, Maximize2, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Trend = "up" | "down" | "neutral";
export type Period = "yesterday" | "last7Days" | "last30Days";
export type Source = "meta" | "google" | "analytics";
export type Platform = "Facebook" | "Google Ads" | "Google Analytics";

export interface MetricData {
    current: number;
    previous: number;
    change: number;
    trend: Trend;
  }
  
  export interface MetricsData {
    [metric: string]: MetricData;
  }
  
  export interface PerformanceSummary {
    success: boolean;
    periodData: {
      [key in Period]: MetricsData;
    };
  }
  

// Dynamic Performance Table Component
export default function PerformanceTable({ 
    performanceData,
    apiStatus,
    onRefresh,
    loading
  }: { 
    performanceData: {
      meta?: PerformanceSummary['periodData'];
      google?: PerformanceSummary['periodData'];
      analytics?: PerformanceSummary['periodData'];
    };
    apiStatus: {
      meta: boolean;
      google: boolean;
      analytics: boolean;
    };
    onRefresh: () => void;
    loading: boolean;
  }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const periodLabels: Record<Period, string> = {
      "yesterday": "Yesterday",
      "last7Days": "Last 7 Days",
      "last30Days": "Last 30 Days"
    };
  
    const metricLabels: Record<string, string> = {
      metaspend: 'Meta Spend',
      metaroas: 'Meta ROAS',
      googlespend: 'Google Spend',
      googleroas: 'Google ROAS',
      sessions: 'Sessions',
      addToCarts: 'Add to Carts',
      checkouts: 'Checkouts',
      purchases: 'Purchases',
      addToCartRate: 'Add to Cart Rate',
      checkoutRate: 'Checkout Rate',
      purchaseRate: 'Purchase Rate'
    };
  
    // Get platform logo
    const getPlatformLogo = (metricKey: string) => {
      if (metricKey.startsWith('meta')) return <FacebookLogo width={"1rem"} height={"1rem"} />;
      if (metricKey.startsWith('google')) return <GoogleLogo width={"1rem"} height={"1rem"} />;
      return <Ga4Logo width={"1rem"} height={"1rem"} />;
    };
  
    // Collect all unique metrics across all periods and sources
    const getAllMetrics = () => {
      const metricsSet = new Set<string>();
      
      ['yesterday', 'last7Days', 'last30Days'].forEach((period) => {
        if (performanceData.meta?.[period as Period] && apiStatus.meta) {
          Object.keys(performanceData.meta[period as Period]).forEach(key => metricsSet.add(key));
        }
        if (performanceData.google?.[period as Period] && apiStatus.google) {
          Object.keys(performanceData.google[period as Period]).forEach(key => metricsSet.add(key));
        }
        if (performanceData.analytics?.[period as Period] && apiStatus.analytics) {
          Object.keys(performanceData.analytics[period as Period]).forEach(key => metricsSet.add(key));
        }
      });
  
      return Array.from(metricsSet);
    };
  
    const allMetrics = getAllMetrics();
  
    // Get metric data for a specific period
    const getMetricData = (period: Period, metricKey: string): MetricData | null => {
      // Check meta
      if (performanceData.meta?.[period]?.[metricKey] && apiStatus.meta) {
        return performanceData.meta[period][metricKey];
      }
      // Check google
      if (performanceData.google?.[period]?.[metricKey] && apiStatus.google) {
        return performanceData.google[period][metricKey];
      }
      // Check analytics
      if (performanceData.analytics?.[period]?.[metricKey] && apiStatus.analytics) {
        return performanceData.analytics[period][metricKey];
      }
      return null;
    };
  
    const formatMetricValue = (value: number, metricKey: string) => {
      if (metricKey.toLowerCase().includes('roas') || metricKey.toLowerCase().includes('rate')) {
        return value.toFixed(2);
      }
      return value >= 1000 ? Math.round(value).toLocaleString() : value;
    };
  
    if (allMetrics.length === 0) {
      return (
        <div className="bg-white border rounded-lg shadow-md p-6">
          <div className="text-center text-slate-500 py-8">
            No performance data available. Connect your platforms to see metrics.
          </div>
          </div>
        );
      }
  
    const periods: Period[] = ['yesterday', 'last7Days', 'last30Days'];
    const DEFAULT_VISIBLE_ROWS = 4;
    const visibleMetrics = isExpanded ? allMetrics : allMetrics.slice(0, DEFAULT_VISIBLE_ROWS);
    const hasMoreRows = allMetrics.length > DEFAULT_VISIBLE_ROWS;
  
    return (
      <div className="bg-white border rounded-lg shadow-md p-6 overflow-x-auto">
        {/* Header with Title and Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">Performance Overview</h2>
          <div className="flex gap-2">
            <Button
              onClick={onRefresh}
              disabled={loading}
              size="sm"
              variant="outline"
              className="hover:bg-slate-100"
              title="Refresh data"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            {hasMoreRows && (
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                size="sm"
                variant="outline"
                className="hover:bg-slate-100"
                title={isExpanded ? "Collapse table" : "Expand table"}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left p-3 font-semibold text-slate-700 bg-slate-50 sticky left-0 z-10 min-w-[180px]">
                Metric
              </th>
              {periods.map((period) => (
                <th key={period} className="text-center p-3 font-semibold text-slate-700 bg-slate-50 min-w-[220px]">
                  <div className="mb-2">{periodLabels[period]}</div>
                  <div className="flex justify-around text-xs font-normal text-slate-500">
                    <span className="w-16">Current</span>
                    <span className="w-16">Previous</span>
                    <span className="w-16">Change</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="transition-all duration-300">
            {visibleMetrics.map((metricKey, metricIdx) => (
              <tr 
                key={metricKey} 
                className={cn(
                  "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                  metricIdx % 2 === 0 ? "bg-white" : "bg-slate-25"
                )}
              >
                <td className="p-3 font-medium text-slate-800 bg-slate-50 sticky left-0 z-10 border-r border-slate-200">
                  <div className="flex items-center gap-2">
                    {getPlatformLogo(metricKey)}
                    <span>{metricLabels[metricKey] || metricKey}</span>
                  </div>
                </td>
                {periods.map((period) => {
                  const data = getMetricData(period, metricKey);
                  
                  if (!data) {
                    return (
                      <td key={period} className="p-3 text-center text-slate-400 text-sm">
                        <div className="flex justify-around">
                          <span className="w-16">-</span>
                          <span className="w-16">-</span>
                          <span className="w-16">-</span>
                        </div>
                      </td>
                    );
                  }
  
                  return (
                    <td key={period} className="p-3">
                      <div className="flex justify-around items-center text-sm">
                        {/* Current Value */}
                        <div className="w-16 text-center font-semibold text-slate-800">
                          {formatMetricValue(data.current, metricKey)}
                        </div>
                        
                        {/* Previous Value */}
                        <div className="w-16 text-center text-slate-600">
                          {formatMetricValue(data.previous, metricKey)}
        </div>
  
                        {/* Change */}
                        <div className={cn(
                          "w-16 text-center font-medium flex items-center justify-center gap-1",
                          {
                            "text-green-600": data.trend === "up",
                            "text-red-600": data.trend === "down",
                            "text-slate-600": data.trend === "neutral"
                          }
                        )}>
                          {data.trend === "up" && <ArrowUpIcon className="h-3 w-3" />}
                          {data.trend === "down" && <ArrowDownIcon className="h-3 w-3" />}
                          <span className="text-xs">{Math.abs(data.change)}%</span>
                        </div>
        </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Footer indicator when collapsed */}
        {!isExpanded && hasMoreRows && (
          <div className="mt-4 text-center">
            <Button
              onClick={() => setIsExpanded(true)}
              size="sm"
              variant="ghost"
              className="text-slate-600 hover:text-slate-900"
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Show {allMetrics.length - DEFAULT_VISIBLE_ROWS} more metrics
            </Button>
          </div>
        )}
      </div>
    );
  }