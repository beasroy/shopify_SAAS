import { Activity, ArrowDownIcon, ArrowUpIcon, RefreshCw, ShoppingBag, ShoppingCart, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useCallback, useEffect, useState } from 'react';
import createAxiosInstance from '../ConversionReportPage/components/axiosInstance';
import DashboardSkeleton from './components/DashboardSkeleton.tsx';
import { Button } from '@/components/ui/button.tsx';


export type Trend = 'up' | 'down';

export interface MetricData {
  current: number;
  previous: number;
  change: number;
  trend: Trend;
}

export interface PeriodSummary {
  title: string;
  sessions: MetricData;
  addToCarts: MetricData;
  checkouts: MetricData;
  purchases: MetricData;
}

export interface Highlight {
  metric: string;
  period: 'daily' | 'weekly' | 'monthly';
  message: string;
}

export interface AnalyticsSummary {
  summaries: {
    daily: PeriodSummary;
    weekly: PeriodSummary;
    monthly: PeriodSummary;
  };
  highlights: Highlight[];
}


const iconMap = {
  sessions: Users,
  addToCarts: ShoppingCart,
  checkouts: ShoppingBag,
  purchases: Activity
};

function MetricCard({
  title,
  metric,
  current,
  previous,
  change,
  trend,
  delay
}: {
  title: string;
  metric: keyof typeof iconMap;
  current: number;
  previous: number;
  change: number;
  trend: "up" | "down";
  delay: number;
}) {
  const Icon = iconMap[metric];

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:scale-[1.02] animate-fade-up",
      "bg-white border-0",
      "text-teal-800"
    )}
      style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute top-0 right-0 p-4">
        <Icon className="h-6 w-6 text-blue-700 opacity-50" />
      </div>
      <div className="p-6">
        <h3 className="text-sm font-medium text-blue-700">{title}</h3>
        <div className="mt-4 flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-teal-800">{current.toLocaleString()}</span>
          <span className="text-sm text-gray-500">current</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {trend === "up" ? (
              <ArrowUpIcon className="h-4 w-4 text-green-400" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 text-red-400" />
            )}
            <span className={cn(
              "font-semibold",
              trend === "up" ? "text-green-400" : "text-red-400"
            )}>
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
          <span className="text-sm text-gray-500">vs {previous.toLocaleString()}</span>
        </div>
      </div>
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-1",
        trend === "up" ? "bg-blue-400/20" : "bg-red-400/20"
      )}>
        <div
          className={cn(
            "h-full transition-all duration-1000",
            trend === "up" ? "bg-blue-400/40 animate-expand-right" : "bg-red-400/40 animate-shrink-left"
          )}
          style={{ width: `${Math.min(Math.abs(change), 100)}%` }}
        />
      </div>
    </Card>
  );
}

function TimeSection({ title, data, delay = 0 }: {
  title: string;
  data: PeriodSummary;
  delay?: number;
}) {
  const sessiontrend: "up" | "down" = (data.sessions.trend === "up" || data.sessions.trend === "down")
    ? data.sessions.trend
    : "down";

  const addToCarttrend: "up" | "down" = (data.addToCarts.trend === "up" || data.addToCarts.trend === "down")
    ? data.addToCarts.trend
    : "down";

  const checkoutstrend: "up" | "down" = (data.checkouts.trend === "up" || data.checkouts.trend === "down")
    ? data.checkouts.trend
    : "down";

  const purchasestrend: "up" | "down" = (data.purchases.trend === "up" || data.purchases.trend === "down")
    ? data.purchases.trend
    : "down";




  return (
    <div className="space-y-6 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          {title}
        </h2>
        <div className="h-[1px] flex-1 mx-4 bg-gradient-to-r from-slate-700 to-transparent" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Sessions"
          metric="sessions"
          current={data.sessions.current}
          previous={data.sessions.previous}
          change={data.sessions.change}
          trend={sessiontrend}
          delay={delay + 100}
        />
        <MetricCard
          title="Cart Additions"
          metric="addToCarts"
          current={data.addToCarts.current}
          previous={data.addToCarts.previous}
          change={data.addToCarts.change}
          trend={addToCarttrend}
          delay={delay + 200}
        />
        <MetricCard
          title="Checkout Initiated"
          metric="checkouts"
          current={data.checkouts.current}
          previous={data.checkouts.previous}
          change={data.checkouts.change}
          trend={checkoutstrend}
          delay={delay + 300}
        />
        <MetricCard
          title="Completed Sales"
          metric="purchases"
          current={data.purchases.current}
          previous={data.purchases.previous}
          change={data.purchases.change}
          trend={purchasestrend}
          delay={delay + 400}
        />
      </div>
    </div>
  );
}

const SummaryDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.user);
  const brandId = useSelector((state: RootState) => state.brand.selectedBrandId)
  const userId = user?.id;
  const userName = user?.username;
  const [loading, setLoading] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<AnalyticsSummary>();

  const axiosInstance = createAxiosInstance();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {

      const response = await axiosInstance.post(`api/analytics/atcsummary/${brandId}`, {
        userId: user?.id
      }, { withCredentials: true })

      const fetchedData = response.data || [];

      setMetrics(fetchedData);

    } catch (error) {
      console.error("Error fetching data:", error);

    } finally {
      setLoading(false);
    }
  }, [brandId, userId]);

  useEffect(() => {
    fetchData();
    console.log(metrics);
    const intervalId = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handleManualRefresh = () => {
    fetchData();
  };

  if (loading) {
    return <DashboardSkeleton />
  }
 

  return (
    <div className="min-h-screen bg-slate-100 text-black">
      <div className="mx-auto max-w-7xl p-8">
        <div className="mb-6 space-y-4 animate-fade-up flex flex-row justify-between items-start">
          <div className="flex items-center space-x-4 ">
            <div className="h-12 w-1 bg-blue-500 rounded-full" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome Back, {userName}
              </h1>
              <p className="text-slate-400 mt-1">
                Here's your business performance overview
              </p>
            </div>
          </div>
          <Button
            onClick={handleManualRefresh}
            disabled={loading}
            size="sm"
            variant="outline"
            className="hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="space-y-10">
          <TimeSection
            title={metrics?.summaries.daily.title ?? "Default Title"}
            data={metrics?.summaries.daily ?? {
              title: "Default Title",
              sessions: { current: 0, previous: 0, change: 0, trend: "down" },
              addToCarts: { current: 0, previous: 0, change: 0, trend: "down" },
              checkouts: { current: 0, previous: 0, change: 0, trend: "down" },
              purchases: { current: 0, previous: 0, change: 0, trend: "down" }
            }}
            delay={200}
          />

          <TimeSection
            title={metrics?.summaries.weekly?.title ?? "Default Title"}
            data={metrics?.summaries.weekly ?? {
              title: "Default Title",
              sessions: { current: 0, previous: 0, change: 0, trend: "down" },
              addToCarts: { current: 0, previous: 0, change: 0, trend: "down" },
              checkouts: { current: 0, previous: 0, change: 0, trend: "down" },
              purchases: { current: 0, previous: 0, change: 0, trend: "down" }
            }}
            delay={400}
          />

          <TimeSection
            title={metrics?.summaries.monthly?.title ?? "Default Title"}
            data={metrics?.summaries.monthly ?? {
              title: "Default Title",
              sessions: { current: 0, previous: 0, change: 0, trend: "down" },
              addToCarts: { current: 0, previous: 0, change: 0, trend: "down" },
              checkouts: { current: 0, previous: 0, change: 0, trend: "down" },
              purchases: { current: 0, previous: 0, change: 0, trend: "down" }
            }}
            delay={600}
          />
        </div>
      </div>
    </div>
  );
}

export default SummaryDashboard;
