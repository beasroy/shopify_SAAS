import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import createAxiosInstance from "../ConversionReportPage/components/axiosInstance";
import DashboardSkeleton from "./components/DashboardSkeleton";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import HeaderTutorialButton from "@/components/Tutorial/HeaderTutorialButton";
import { FacebookLogo, GoogleLogo, Ga4Logo } from "@/data/logo";

export type Trend = "up" | "down" | "neutral";
export type Period = "yesterday" | "last7Days" | "last30Days";
export type Source = "meta" | "google" | "analytics";

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

// Styling constants for visual consistency
const METRIC_COLORS = {
  // Meta metrics
  "metaspend": "bg-blue-500",
  "metaroas": "bg-purple-500",
  
  // Analytics metrics
  "sessions": "bg-cyan-500",
  "addToCarts": "bg-orange-500",
  "checkouts": "bg-teal-500",
  "purchases": "bg-red-500",
  "addToCartRate": "bg-pink-500",
  "checkoutRate": "bg-emerald-500",
  "purchaseRate": "bg-rose-500",
  
  // Google metrics
  "spend": "bg-green-500",
  "roas": "bg-indigo-500",
};

const METRIC_BG_COLORS = {
  // Meta metrics
  "metaspend": "bg-blue-50 border-blue-100",
  "metaroas": "bg-purple-50 border-purple-100",
  
  // Analytics metrics
  "sessions": "bg-cyan-50 border-cyan-100",
  "addToCarts": "bg-orange-50 border-orange-100",
  "checkouts": "bg-teal-50 border-teal-100",
  "purchases": "bg-red-50 border-red-100",
  "addToCartRate": "bg-pink-50 border-pink-100",
  "checkoutRate": "bg-emerald-50 border-emerald-100",
  "purchaseRate": "bg-rose-50 border-rose-100",
  
  // Google metrics
  "spend": "bg-green-50 border-green-100",
  "roas": "bg-indigo-50 border-indigo-100",
};

const formatValue = (value: number, isRoas = false) => {
  if (isRoas) return value.toFixed(2);
  return value >= 1000 ? Math.round(value).toLocaleString() : value;
};

interface MetricCardProps {
  metric: keyof typeof METRIC_COLORS;
  label: string;
  value: number;
  change: number;
  trend: Trend;
  source: Source;
  prevValue: number;
}

function MetricCard({ 
  metric, 
  label,
  value, 
  change, 
  trend,
  prevValue,
  source
}: MetricCardProps) {

  
  return (
    <div className={cn("p-3 rounded-md border shadow-sm flex flex-col", METRIC_BG_COLORS[metric])}>
      <div className="flex flex-row items-center justify-between">
        <div className="flex items-center mb-1">
          <div className={cn("h-2 w-2 rounded-full mr-1.5", METRIC_COLORS[metric])}></div>
          <span className="text-xs font-medium text-slate-700">{label}</span>
        </div>
        {(() => {
          switch (source) {
            case "analytics":
              return <Ga4Logo width={"1rem"} height={"1rem"} />;
            case "meta":
              return <FacebookLogo width={"1rem"} height={"1rem"} />;
            default:
              return <GoogleLogo width={"1rem"} height={"1rem"} />;
          }
        })()}
      </div>
      <div className="text-lg font-bold text-slate-800">
         {formatValue(Number(value))}
      </div>
      <div className="flex items-center mt-1 justify-between">
        <span className="text-xs text-slate-500">vs {formatValue(Number(prevValue), false)}</span>
        <div
          className={cn(
            "flex items-center text-xs font-medium",
            trend === "up" ? "text-green-600" : "text-red-600"
          )}
        >
          {trend === "up" ? <ArrowUpIcon className="h-3 w-3 mr-0.5" /> : <ArrowDownIcon className="h-3 w-3 mr-0.5" />}
          {Math.abs(Number(change))}
        </div>
      </div>
    </div>
  );
}

function PerformanceCard({ 
  period,
  performanceData
}: { 
  period: Period;
  performanceData: {
    meta?: PerformanceSummary['periodData'];
    google?: PerformanceSummary['periodData'];
    analytics?: PerformanceSummary['periodData'];
  };
}) {
  // Combine metrics from all sources for the specified period
  const combineMetrics = () => {
    const allMetrics: { [source: string]: MetricsData } = {};
    
    if (performanceData.meta?.[period]) {
      allMetrics.meta = performanceData.meta[period];
    }
    if (performanceData.google?.[period]) {
      allMetrics.google = performanceData.google[period];
    }
    if (performanceData.analytics?.[period]) {
      allMetrics.analytics = performanceData.analytics[period];
    }
    
    return allMetrics;
  };

  const combinedMetrics = combineMetrics();


  const periodLabels = {
    "yesterday": "Yesterday",
    "last7Days": "Last 7 Days",
    "last30Days": "Last 30 Days"
  };

  if (Object.keys(combinedMetrics).length === 0) {
    return (
      <div className="bg-white border rounded-lg shadow-md p-6 text-center text-slate-500">
        No data available for {periodLabels[period]}
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow-md p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">
          {periodLabels[period]} Performance Overview
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(combinedMetrics).flatMap(([source, sourceMetrics]) => 
          Object.entries(sourceMetrics).map(([key, metricData]) => (
            <MetricCard
              key={`${source}-${key}`}
              metric={key as keyof typeof METRIC_COLORS}
              label={
                key === 'metaspend' ? 'Meta Spend' : 
                key === 'metaroas' ? 'Meta ROAS' : 
                key === 'spend' ? 'Google Spend' :
                key === 'roas' ? 'Google ROAS' :
                key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
              }
              value={metricData.current}
              change={metricData.change}
              trend={metricData.trend}
              prevValue={metricData.previous}
              source={source as Source}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Main dashboard component
const SummaryDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.user);
  const brandId = useSelector((state: RootState) => state.brand.selectedBrandId);

  const userName = user?.username;
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<{
    meta?: PerformanceSummary['periodData'];
    google?: PerformanceSummary['periodData'];
    analytics?: PerformanceSummary['periodData'];
  }>({});

  const axiosInstance = createAxiosInstance();

  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    setPerformanceData({});

    try {
      // Parallel API calls for different performance sources
      const [metaResponse, googleResponse, analyticsResponse] = await Promise.all([
        axiosInstance.post(
          `api/summary/facebook-ads/${brandId}`,
          { userId: user?.id },
          { withCredentials: true }
        ),
        axiosInstance.post(
          `api/summary/google-ads/${brandId}`,
          { userId: user?.id },
          { withCredentials: true }
        ),
        axiosInstance.post(
          `api/summary/analytics/${brandId}`,
          { userId: user?.id },
          { withCredentials: true }
        )
      ]);

      setPerformanceData({
        meta: metaResponse.data.success ? metaResponse.data.periodData : undefined,
        google: googleResponse.data.success ? googleResponse.data.periodData : undefined,
        analytics: analyticsResponse.data.success ? analyticsResponse.data.periodData : undefined
      });
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [brandId, user?.id]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto p-6 max-w-7xl">
        <div className="mb-6 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-1 bg-blue-500 rounded-full" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Welcome Back, {userName}</h1>
                <p className="text-slate-500 mt-1">Here's your performance overview</p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-3">
              <HeaderTutorialButton />
              <Button
                onClick={fetchPerformanceData}
                disabled={loading}
                size="sm"
                variant="outline"
                className="hover:bg-slate-100"
              >
                <RefreshCw className={cn("h-4 w-4 ", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>

        {/* Performance Cards for All Periods */}
        <div className="space-y-6">
          {(['yesterday', 'last7Days', 'last30Days'] as Period[]).map(period => (
            <PerformanceCard 
              key={period}
              period={period}
              performanceData={performanceData}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SummaryDashboard;