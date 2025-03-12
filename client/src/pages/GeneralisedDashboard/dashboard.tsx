import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  RefreshCw,
  Users,
  ShoppingCart,
  ShoppingBag,
  Tag,
  Coins,
  TrendingUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import createAxiosInstance from "../ConversionReportPage/components/axiosInstance";
import DashboardSkeleton from "./components/DashboardSkeleton";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import HeaderTutorialButton from "@/components/Tutorial/HeaderTutorialButton";

export type Trend = "up" | "down";
export type Period = "Yesterday" | "Last 7 Days" | "Last 30 Days";

export interface DateRange {
  start: string;
  end: string;
}

export interface MetricData {
  period: Period;
  dateRange: {
    current: DateRange;
    previous: DateRange;
  };
  current: number;
  previous: number;
  change: number;
  trend: Trend;
}

export interface MetricsData {
  [metric: string]: MetricData[] | undefined;
}

export interface Summary {
  success: boolean;
  metricsSummary: MetricsData;
}

// Styling constants for visual consistency
const PERIOD_COLORS = {
  "Yesterday": "bg-blue-500",
  "Last 7 Days": "bg-purple-500",
  "Last 30 Days": "bg-amber-500"
};

const PERIOD_BG_COLORS = {
  "Yesterday": "bg-blue-50 border-blue-100",
  "Last 7 Days": "bg-purple-50 border-purple-100",
  "Last 30 Days": "bg-amber-50 border-amber-100"
};

const formatValue = (value: number, isRoas = false) => {
  if (isRoas) return value.toFixed(2);
  return value >= 1000 ? Math.round(value).toLocaleString() : value;
};

// Component for individual period metric
const PeriodMetric = ({ period, value, previousValue, change, trend, isRoas = false }: { 
  period: Period, 
  value: number, 
  previousValue: number, 
  change: number, 
  trend: Trend,
  isRoas?: boolean
}) => {
  return (
    <div className={cn("p-3 rounded-md border shadow-sm flex flex-col", PERIOD_BG_COLORS[period])}>
      <div className="flex items-center mb-1">
        <div className={cn("h-2 w-2 rounded-full mr-1.5", PERIOD_COLORS[period])}></div>
        <span className="text-xs font-medium text-slate-700">{period}</span>
      </div>
      <div className="text-lg font-bold text-slate-800">{formatValue(value, isRoas)}</div>
      <div className="flex items-center mt-1 justify-between">
        <span className="text-xs text-slate-500">vs {formatValue(previousValue, isRoas)}</span>
        <div
          className={cn(
            "px-1.5 py-0.5 rounded text-xs font-medium flex items-center",
            trend === "up"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          )}
        >
          {trend === "up" ? <ArrowUpIcon className="h-3 w-3 mr-0.5" /> : <ArrowDownIcon className="h-3 w-3 mr-0.5" />}
          {Math.abs(change)}%
        </div>
      </div>
    </div>
  );
};

// Component for a metric group with all periods
const MetricGroupCard = ({ 
  title, 
  icon: Icon, 
  metricsData = [], 
  isRoas = false
}: { 
  title: string, 
  icon: React.FC<any>, 
  metricsData: MetricData[], 
  isRoas?: boolean 
}) => {
  const periods: Period[] = ["Yesterday", "Last 7 Days", "Last 30 Days"];
  
  // Convert array to object mapped by period for easier lookup
  const metricsByPeriod = metricsData.reduce((acc, metric) => {
    acc[metric.period] = metric;
    return acc;
  }, {} as Record<Period, MetricData>);
  
  return (
    <Card className="border-slate-200 shadow-md">
      <CardHeader className="p-4 pb-2 flex flex-row items-center space-x-2 border-b">
        <div className="p-2 rounded-md bg-slate-100">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <div className="grid grid-cols-3 gap-3">
          {periods.map(period => 
            metricsByPeriod[period] ? (
              <PeriodMetric
                key={period}
                period={period}
                value={metricsByPeriod[period].current}
                previousValue={metricsByPeriod[period].previous}
                change={metricsByPeriod[period].change}
                trend={metricsByPeriod[period].trend}
                isRoas={isRoas}
              />
            ) : (
              <div key={period} className="p-3 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center">
                <span className="text-xs text-slate-400">No data</span>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main dashboard component
const SummaryDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.user);
  const brandId = useSelector((state: RootState) => state.brand.selectedBrandId);
  
  const userName = user?.username;
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<Summary>();
  const [facebookAds, setFacebookAds] = useState<Summary>();
  const [googleAds, setGoogleAds] = useState<Summary>();

  const axiosInstance = createAxiosInstance();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setAnalytics(undefined);
    setFacebookAds(undefined);
    setGoogleAds(undefined);

    const requests = [
      {
        key: "analytics",
        promise: axiosInstance.post(
          `api/summary/analytics/${brandId}`,
          { userId: user?.id },
          { withCredentials: true }
        ),
      },
      {
        key: "facebookAds",
        promise: axiosInstance.post(
          `api/summary/facebook-ads/${brandId}`,
          { userId: user?.id },
          { withCredentials: true }
        ),
      },
      {
        key: "googleAds",
        promise: axiosInstance.post(
          `api/summary/google-ads/${brandId}`,
          { userId: user?.id },
          { withCredentials: true }
        ),
      },
    ];

    const results = await Promise.allSettled(requests.map((req) => req.promise));

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        if (requests[index].key === "analytics") setAnalytics(result.value.data);
        if (requests[index].key === "facebookAds") setFacebookAds(result.value.data);
        if (requests[index].key === "googleAds") setGoogleAds(result.value.data);
      } else {
        console.error(`Error fetching ${requests[index].key} data:`, result.reason);
      }
    });

    setLoading(false);
  }, [brandId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto p-6">
        <div className="mb-6 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-1 bg-blue-500 rounded-full" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Welcome Back, {userName}</h1>
                <p className="text-slate-500 mt-1">Here's your business performance overview</p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-3"><HeaderTutorialButton />
            <Button
              onClick={fetchData}
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

        <div className="space-y-2">
          {/* Analytics Section */}
            <div id="analytics-section">
              <div className="flex items-center mb-3">
                <div className="h-4 w-1 bg-amber-500 rounded-full mr-2.5"></div>
                <h2 className="text-lg font-semibold text-slate-800">Analytics</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 ">
                <div id="sessions-metric">
                <MetricGroupCard 
                    title="Sessions" 
                    icon={Users} 
                    metricsData={analytics?.metricsSummary.sessions || []} 
                  />
                </div>
                  <MetricGroupCard 
                    title="Cart Additions" 
                    icon={ShoppingCart} 
                    metricsData={analytics?.metricsSummary.addToCarts || []} 
                  />
                  <MetricGroupCard 
                    title="Checkouts" 
                    icon={ShoppingBag} 
                    metricsData={analytics?.metricsSummary.checkouts || []} 
                  />
                  <MetricGroupCard 
                    title="Purchases" 
                    icon={Tag} 
                    metricsData={analytics?.metricsSummary.purchases || []} 
                  />
              </div>
            </div>         
          {/* Meta Section */}
            <div>
              <div className="flex items-center mb-3 mt-6">
                <div className="h-4 w-1 bg-indigo-500 rounded-full mr-2.5"></div>
                <h2 className="text-lg font-semibold text-slate-800">Meta</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                  <MetricGroupCard 
                    title="Meta Spend" 
                    icon={Coins} 
                    metricsData={facebookAds?.metricsSummary.spend || []} 
                  />
                  <MetricGroupCard 
                    title="Meta ROAS" 
                    icon={TrendingUpDown} 
                    metricsData={facebookAds?.metricsSummary.roas || []} 
                    isRoas={true} 
                  />
              </div>
            </div>
            <div>
              <div className="flex items-center mb-3 mt-6">
                <div className="h-4 w-1 bg-emerald-500 rounded-full mr-2.5"></div>
                <h2 className="text-lg font-semibold text-slate-800">Google</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                  <MetricGroupCard 
                    title="Google Spend" 
                    icon={Coins} 
                    metricsData={googleAds?.metricsSummary.spend ?? []} 
                  />
                  <MetricGroupCard 
                    title="Google ROAS" 
                    icon={TrendingUpDown} 
                    metricsData={googleAds?.metricsSummary.roas ?? []} 
                    isRoas={true} 
                  />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryDashboard;