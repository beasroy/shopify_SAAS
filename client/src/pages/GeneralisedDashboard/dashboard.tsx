import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import createAxiosInstance from "../ConversionReportPage/components/axiosInstance";
import Loader from "@/components/dashboard_component/loader";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import HeaderTutorialButton from "@/components/Tutorial/HeaderTutorialButton";
import { FacebookLogo, GoogleLogo, Ga4Logo } from "@/data/logo";
import { useNavigate } from "react-router-dom";

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
  performanceData,
  apiStatus
}: { 
  period: Period;
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
}) {
  // Combine metrics from all sources for the specified period
  const combineMetrics = () => {
    const allMetrics: { [source: string]: MetricsData } = {};
    
    if (performanceData.meta?.[period] && apiStatus.meta) {
      allMetrics.meta = performanceData.meta[period];
    }
    if (performanceData.google?.[period] && apiStatus.google) {
      allMetrics.google = performanceData.google[period];
    }
    if (performanceData.analytics?.[period] && apiStatus.analytics) {
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

  // Create cards for each data source, showing "No Data Found" for failed ones
  const renderSourceCards = () => {
    const cards = [];

    // Check if we need to display "No Data Found" for Meta
    if (!apiStatus.meta) {
      cards.push(
        <div key="meta-no-data" className="col-span-1 p-3 rounded-md border shadow-sm flex flex-col justify-center items-center bg-gray-50 h-24">
          <FacebookLogo width={"1.5rem"} height={"1.5rem"}/>
          <span className="text-sm text-slate-500">No data found</span>
        </div>
      );
    }

    // Check if we need to display "No Data Found" for Google
    if (!apiStatus.google) {
      cards.push(
        <div key="google-no-data" className="col-span-1 p-3 rounded-md border shadow-sm flex flex-col justify-center items-center bg-gray-50 h-24">
          <GoogleLogo width={"1.5rem"} height={"1.5rem"} />
          <span className="text-sm text-slate-500">No data found</span>
        </div>
      );
    }

    // Check if we need to display "No Data Found" for Analytics
    if (!apiStatus.analytics) {
      cards.push(
        <div key="analytics-no-data" className="col-span-1 p-3 rounded-md border shadow-sm flex flex-col justify-center items-center bg-gray-50 h-24">
          <Ga4Logo width={"1.5rem"} height={"1.5rem"}  />
          <span className="text-sm text-slate-500">No data found</span>
        </div>
      );
    }

    // Add actual metric cards for successful API calls
    Object.entries(combinedMetrics).forEach(([source, sourceMetrics]) => 
      Object.entries(sourceMetrics).forEach(([key, metricData]) => {
        cards.push(
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
        );
      })
    );

    return cards;
  };

  return (
    <div className="bg-white border rounded-lg shadow-md p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">
          {periodLabels[period]} Performance Overview
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {renderSourceCards()}
      </div>
    </div>
  );
}

// Main dashboard component
const SummaryDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.user);
  const brandId = useSelector((state: RootState) => state.brand.selectedBrandId);
  const brand = useSelector((state: RootState) => state.brand.brands);
  console.log(brand);

  const userName = user?.username;
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<{
    meta?: PerformanceSummary['periodData'];
    google?: PerformanceSummary['periodData'];
    analytics?: PerformanceSummary['periodData'];
  }>({});

  const navigate = useNavigate();
  
  // Track API call success/failure status
  const [apiStatus, setApiStatus] = useState({
    meta: true,
    google: true,
    analytics: true
  });

  const axiosInstance = createAxiosInstance();

  const fetchPerformanceData = useCallback(async () => {
    if (!brandId) {
      console.log('No brand ID available, skipping API calls');
      return;
    }
    
    setLoading(true);
    setPerformanceData({});
    setApiStatus({
      meta: true,
      google: true,
      analytics: true
    });

    try {
      const metaPromise = axiosInstance.post(
        `api/summary/facebook-ads/${brandId}`,
        { withCredentials: true }
      ).catch(error => {
        console.error('Error fetching Meta data:', error);
        setApiStatus(prev => ({ ...prev, meta: false }));
        return { data: { success: false } };
      });

      const googlePromise = axiosInstance.post(
        `api/summary/google-ads/${brandId}`,
        { withCredentials: true }
      ).catch(error => {
        console.error('Error fetching Google data:', error);
        setApiStatus(prev => ({ ...prev, google: false }));
        return { data: { success: false } };
      });

      const analyticsPromise = axiosInstance.post(
        `api/summary/analytics/${brandId}`,
        { withCredentials: true }
      ).catch(error => {
        console.error('Error fetching Analytics data:', error);
        setApiStatus(prev => ({ ...prev, analytics: false }));
        return { data: { success: false } };
      });
      
      const [metaResponse, googleResponse, analyticsResponse] = await Promise.all([
        metaPromise,
        googlePromise,
        analyticsPromise
      ]);

      setPerformanceData({
        meta: metaResponse.data.success ? metaResponse.data.periodData : undefined,
        google: googleResponse.data.success ? googleResponse.data.periodData : undefined,
        analytics: analyticsResponse.data.success ? analyticsResponse.data.periodData : undefined
      });
      
      // Update API status based on response success property
      setApiStatus({
        meta: metaResponse.data.success,
        google: googleResponse.data.success,
        analytics: analyticsResponse.data.success
      });
    } catch (error) {
      console.error('Error in fetchPerformanceData:', error);
      // If we had an overall error, mark all APIs as failed
      setApiStatus({
        meta: false,
        google: false,
        analytics: false
      });
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
      fetchPerformanceData();
  }, [fetchPerformanceData]);

  useEffect(()=>{
    if(!user?.brands || user.brands.length === 0){
      navigate("/brand-setup")
    }
  },[])

  if (loading) {
    return <Loader isLoading={loading} />;
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
              apiStatus={apiStatus}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SummaryDashboard;