import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Users,
  XCircle,
  Tag,
  Coins,
  TrendingUpDown,
  Clock,
  CalendarDays
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { useCallback, useEffect, useState } from "react"
import createAxiosInstance from "../ConversionReportPage/components/axiosInstance"
import DashboardSkeleton from "./components/DashboardSkeleton"
import { Button } from "@/components/ui/button"
import { FacebookLogo, GoogleLogo } from "../AnalyticsDashboard/AdAccountsMetricsCard"
import { Ga4Logo, ShopifyLogo } from "./components/OtherPlatformModalContent"

export type Trend = "up" | "down"
export type Period = "Today" | "Last 7 Days" | "Last 30 Days"

export interface DateRange {
  start: string
  end: string
}

export interface MetricData {
  current: number
  previous: number
  change: number
  trend: Trend
}

export interface PeriodData {
  title: string
  dateRanges: {
    current: DateRange
    previous: DateRange
  }
  sessions: MetricData
  addToCarts: MetricData
  checkouts: MetricData
  purchases: MetricData
  spend: MetricData
  roas: MetricData
}

export interface Summary {
  summaries: Record<Period, PeriodData>
}

const iconMap = {
  sessions: Users,
  addToCarts: ShoppingCart,
  checkouts: ShoppingBag,
  purchases: Tag,
  spend: Coins,
  roas: TrendingUpDown,
} as const

interface MetricRowProps {
  title: string
  icon: typeof iconMap[keyof typeof iconMap]
  current: number
  previous: number
  change: number
  trend: Trend
}

export function MetricRow({ title, icon: Icon, current, previous, change, trend }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-md bg-slate-100/80 shadow-sm">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
        <span className="text-sm font-medium text-slate-800">{title}</span>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-800">{current.toLocaleString()}</div>
          <div className="text-xs text-slate-500 flex items-center justify-end">
            <span className="mr-1">vs</span>
            <span>{previous.toLocaleString()}</span>
          </div>
        </div>
        <div
          className={cn(
            "px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center shadow-sm w-[80px]",
            trend === "up"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-rose-50 text-rose-700 border border-rose-100",
          )}
        >
          {trend === "up" ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
          {change}%
        </div>
      </div>
    </div>
  )
}



interface PeriodCardProps {
  period: Period
  data: {
    analytics?: PeriodData
    facebook?: PeriodData
    google?: PeriodData
  }
}

export function PeriodCard({ period, data }: PeriodCardProps) {
  const gradients = {
    Today: "from-blue-100/70 to-indigo-100/70",
    "Last 7 Days": "from-violet-100/70 to-purple-100/70",
    "Last 30 Days": "from-amber-100/70 to-orange-100/70",
  }

  const dateRanges = data.analytics?.dateRanges || data.facebook?.dateRanges || data.google?.dateRanges

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    })
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-300 h-[390px] flex flex-col">
      <CardHeader className={`bg-gradient-to-r p-4 ${gradients[period]} border-b border-slate-200 flex-shrink-0`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="bg-white/80 p-2 rounded-full shadow-sm">
              <Clock className="h-5 w-5 text-slate-700" />
            </div>
            <CardTitle className="text-base font-semibold text-slate-800">{period}</CardTitle>
          </div>

          {dateRanges && (
            <div className="bg-white/90 rounded-md px-3 py-1.5 shadow-sm border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <CalendarDays className="h-3.5 w-3.5 text-slate-600" />
                <span>
                  {formatDate(dateRanges.current.start)} - {formatDate(dateRanges.current.end)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[10px]">
                <span className="text-slate-400">vs</span>
                <span>
                  {formatDate(dateRanges.previous.start)} - {formatDate(dateRanges.previous.end)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto flex-grow">
        <div className="px-5 py-3 space-y-4">
          {/* Analytics Section */}
          {data.analytics && (
            <div>
              <div className="flex items-center mb-3">
                <div className="h-4 w-1 bg-blue-500 rounded-full mr-2.5"></div>
                <h3 className="text-sm font-semibold text-slate-800">Analytics</h3>
              </div>
              <div className="space-y-0.5">
                <MetricRow title="Sessions" icon={Users} {...data.analytics.sessions!} />
                <MetricRow title="Cart Additions" icon={ShoppingCart} {...data.analytics.addToCarts!} />
                <MetricRow title="Checkouts" icon={ShoppingBag} {...data.analytics.checkouts!} />
                <MetricRow title="Purchases" icon={Tag} {...data.analytics.purchases!} />
              </div>
            </div>
          )}

          {/* Facebook Section */}
          {data.facebook && (
            <div>
              <div className="flex items-center mb-3">
                <div className="h-4 w-1 bg-indigo-500 rounded-full mr-2.5"></div>
                <h3 className="text-sm font-semibold text-slate-800">Meta</h3>
              </div>
              <div className="space-y-0.5">
                <MetricRow title="Meta Spend" icon={Coins} {...data.facebook.spend!} />
                <MetricRow title="Meta ROAS" icon={TrendingUpDown} {...data.facebook.roas!} />
              </div>
            </div>
          )}

          {/* Google Section */}
          {data.google && (
            <div>
              <div className="flex items-center mb-3">
                <div className="h-4 w-1 bg-emerald-500 rounded-full mr-2.5"></div>
                <h3 className="text-sm font-semibold text-slate-800">Google</h3>
              </div>
              <div className="space-y-0.5">
                <MetricRow title="Google Spend" icon={Coins} {...data.google.spend!} />
                <MetricRow title="Google ROAS" icon={TrendingUpDown} {...data.google.roas!} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface Platform {
  id: string;
  name: string;
  icon: React.ElementType;
  connected: boolean;
  accounts: string[];
  primaryColor: string;
}

interface PlatformConnectionsProps {
  platforms: Platform[];
}

export function PlatformConnections({ platforms }: PlatformConnectionsProps) {
  // Function to get correct border color class based on platform and connection status
  const getBorderColorClass = (platform:Platform) => {
    if (!platform.connected) return 'border-gray-200';
    
    switch (platform.id) {
      case 'shopify': return 'border-green-500';
      case 'facebook': return 'border-blue-500';
      case 'ga4': return 'border-yellow-500';
      case 'google-ads': return 'border-indigo-500';
      default: return 'border-gray-200';
    }
  };
  
  // Function to get correct background color class based on platform and connection status
  const getBgColorClass = (platform:Platform) => {
    if (!platform.connected) return 'bg-gray-50 hover:bg-gray-100';
    
    switch (platform.id) {
      case 'shopify': return 'bg-green-500/5 hover:bg-green-500/10';
      case 'facebook': return 'bg-blue-500/5 hover:bg-blue-500/10';
      case 'ga4': return 'bg-yellow-500/5 hover:bg-yellow-500/10';
      case 'google-ads': return 'bg-indigo-500/5 hover:bg-indigo-500/10';
      default: return 'bg-gray-50 hover:bg-gray-100';
    }
  };
  
  // Function to get icon background color
  const getIconBgColorClass = (platform:Platform) => {
    if (!platform.connected) return 'bg-gray-100';
    
    switch (platform.id) {
      case 'shopify': return 'bg-green-500/10';
      case 'facebook': return 'bg-blue-500/10';
      case 'ga4': return 'bg-yellow-500/10';
      case 'google-ads': return 'bg-indigo-500/10';
      default: return 'bg-gray-100';
    }
  };
  
  // Function to get icon text color
  const getIconTextColorClass = (platform:Platform) => {
    if (!platform.connected) return 'text-gray-400';
    
    switch (platform.id) {
      case 'shopify': return 'text-green-500';
      case 'facebook': return 'text-blue-500';
      case 'ga4': return 'text-yellow-500';
      case 'google-ads': return 'text-indigo-500';
      default: return 'text-gray-400';
    }
  };
  
  // Function to get status text color
  const getStatusTextColorClass = (platform:Platform) => {
    if (!platform.connected) return 'text-gray-400';
    
    switch (platform.id) {
      case 'shopify': return 'text-green-500';
      case 'facebook': return 'text-blue-500';
      case 'ga4': return 'text-yellow-500';
      case 'google-ads': return 'text-indigo-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border-t-2 border-r-2 border-l-2">
      {/* Status Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Platform Connections</h3>
          <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
            {platforms.filter(p => p.connected).length} of {platforms.length} Connected
          </span>
        </div>
      </div>

      {/* Segmented Bar */}
      <div className="flex w-full">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className={`
              flex-1 py-3 px-4
              ${getBgColorClass(platform)}
              border ${getBorderColorClass(platform)}
              transition-colors cursor-pointer relative group
            `}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${getIconBgColorClass(platform)}`}>
                <platform.icon
                  className={`h-4 w-4 ${getIconTextColorClass(platform)}`}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-medium truncate ${
                  platform.connected ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {platform.name}
                </span>
                <div className="flex items-center gap-1">
                  {platform.connected ? (
                    <CheckCircle2 className={`h-3 w-3 ${getStatusTextColorClass(platform)}`} />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400" />
                  )}
                  <span className={`text-[10px] truncate ${getStatusTextColorClass(platform)}`}>
                    {platform.connected
                      ? `${platform.accounts.length} ${platform.accounts.length === 1 ? 'account' : 'accounts'}`
                      : 'Not connected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SummaryDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.user)
  const brandId = useSelector((state: RootState) => state.brand.selectedBrandId)
  const brands = useSelector((state: RootState) => state.brand.brands)
  const selectedBrand = brands.find((brand) => brand._id === brandId)

  const fbAccounts = selectedBrand?.fbAdAccounts ?? []
  const googleAccount = selectedBrand?.googleAdAccount ? [selectedBrand.googleAdAccount.clientId] : []
  const ga4Accounts = selectedBrand?.ga4Account ? Object.values(selectedBrand.ga4Account) : []
  const shopifyShopName = selectedBrand?.shopifyAccount?.shopName || ""
  const shopifyAccount = shopifyShopName ? [shopifyShopName] : []

  const userName = user?.username
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState<Summary>()
  const [facebookad, setFacebookad] = useState<Summary>()
  const [googlead, setGooglead] = useState<Summary>()

  const axiosInstance = createAxiosInstance()

  const fetchData = useCallback(async () => {
    setLoading(true);
    setAnalytics(undefined);
    setFacebookad(undefined);
    setGooglead(undefined);

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
        if (requests[index].key === "facebookAds") setFacebookad(result.value.data);
        if (requests[index].key === "googleAds") setGooglead(result.value.data);
      } else {
        console.error(`Error fetching ${requests[index].key} data:`, result.reason);
      }
    });

    setLoading(false);
  }, [brandId, user?.id]);


  useEffect(() => {
    fetchData()
    console.log(facebookad)
    const intervalId = setInterval(fetchData, 15 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [fetchData])

  if (loading) {
    return <DashboardSkeleton />
  }

  const periods: Period[] = ["Today", "Last 7 Days", "Last 30 Days"]

  const platforms = [
    {
      id: 'shopify',
      name: 'Shopify',
      icon: ShopifyLogo,
      connected: shopifyAccount.length > 0 ? true : false,
      accounts: shopifyAccount,
      primaryColor: 'green-500'
    },
    {
      id: 'facebook',
      name: 'Facebook Ads',
      icon: FacebookLogo,
      connected: fbAccounts.length > 0 ? true : false,
      accounts: fbAccounts,
      primaryColor: 'blue-500'
    },
    {
      id: 'ga4',
      name: 'GA4',
      icon: Ga4Logo,
      connected: ga4Accounts.length > 0 ? true : false,
      accounts: ga4Accounts,
      primaryColor: 'yellow-500'
    },
    {
      id: 'google-ads',
      name: 'Google Ads',
      icon: GoogleLogo,
      connected: googleAccount.length > 0 ? true : false,
      accounts: googleAccount,
      primaryColor: 'indigo-500'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto p-8">
        <div className="mb-8 space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-1 bg-blue-500 rounded-full" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Welcome Back, {userName}</h1>
                <p className="text-slate-500 mt-1">Here's your business performance overview</p>
              </div>
            </div>
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

       <div className = "mb-8">
        <PlatformConnections platforms={platforms} />
        </div>
        <div className="mb-8">
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {periods.map((period) => (
              <PeriodCard
                key={period}
                period={period}
                data={{
                  analytics: analytics?.summaries[period],
                  facebook: facebookad?.summaries[period],
                  google: googlead?.summaries[period],
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SummaryDashboard