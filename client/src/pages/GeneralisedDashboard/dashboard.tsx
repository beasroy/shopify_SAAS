import {
  Activity,
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
  CalendarDays, History
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { useCallback, useEffect, useState } from "react"
import createAxiosInstance from "../ConversionReportPage/components/axiosInstance"
import DashboardSkeleton from "./components/DashboardSkeleton"
import { Button } from "@/components/ui/button"
import { FacebookLogo, GoogleLogo } from "../AnalyticsDashboard/AdAccountsMetricsCard"
import { Ga4Logo, ShopifyLogo } from "./components/OtherPlatformModalContent"
import { GiFlatPlatform } from "react-icons/gi"

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

function MetricRow({ title, icon: Icon, current, previous, change, trend }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-slate-100">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <span className="text-sm font-medium text-slate-700">{title}</span>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-sm font-semibold">{current.toLocaleString()}</div>
          <div className="text-xs text-slate-500">vs {previous.toLocaleString()}</div>
        </div>
        <div
          className={cn(
            "px-2 py-1 rounded-full text-xs font-medium flex items-center min-w-[60px] justify-center",
            trend === "up" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
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

function PeriodCard({ period, data }: PeriodCardProps) {
  const [selectedTab, setSelectedTab] = useState("analytics");

  const gradients = {
    "Today": "from-blue-50 to-indigo-50",
    "Last 7 Days": "from-purple-50 to-pink-50",
    "Last 30 Days": "from-orange-50 to-amber-50"
  };

  const dateRanges = data.analytics?.dateRanges || data.facebook?.dateRanges || data.google?.dateRanges;

  return (
    <Card className="overflow-auto">
      {/* Header Section */}
      <CardHeader className={`bg-gradient-to-r p-3 flex flex-row justify-between items-center ${gradients[period]}`}>
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-slate-700" />
          <CardTitle className="text-sm font-semibold text-slate-800">{period}</CardTitle>
        </div>

        {/* Date Ranges */}
        {dateRanges && (
            <div className="flex flex-col items-end text-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-slate-600" />
                <span className="font-medium text-slate-700">
                {new Date(dateRanges.current.start).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit',
                })} - 
                {new Date(dateRanges.current.end).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit',
                })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <History className="h-3.5 w-3.5" />
                <span>
                {new Date(dateRanges.previous.start).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit',
                })} - 
                {new Date(dateRanges.previous.end).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit',
                })}
              </span>
              </div>
            </div>
          )}
      </CardHeader>

      {/* Custom Tabs */}
      <div className="flex border-b border-gray-300">
        <button
          className={`flex-1 py-2 text-center ${selectedTab === "analytics" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setSelectedTab("analytics")}
        >
          Analytics
        </button>
        <button
          className={`flex-1 py-2 text-center ${selectedTab === "adMetrics" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setSelectedTab("adMetrics")}
        >
          Ad Metrics
        </button>
      </div>

      <CardContent className="px-5 py-2">
        {selectedTab === "analytics" && (
          <div className="space-y-0.5">
            {data.analytics && (
              <>
                <MetricRow title="Sessions" icon={Users} {...data.analytics.sessions} />
                <MetricRow title="Cart Additions" icon={ShoppingCart} {...data.analytics.addToCarts} />
                <MetricRow title="Checkouts" icon={ShoppingBag} {...data.analytics.checkouts} />
                <MetricRow title="Purchases" icon={Tag} {...data.analytics.purchases} />
              </>
            )}
          </div>
        )}

        {selectedTab === "adMetrics" && (
          <div className="space-y-1">
            {data.facebook && (
              <>
                <MetricRow title="Meta Spend" icon={Coins} {...data.facebook.spend} />
                <MetricRow title="Meta ROAS" icon={TrendingUpDown} {...data.facebook.roas} />
              </>
            )}
            {data.google && (
              <>
                <MetricRow title="Google Spend" icon={Coins} {...data.google.spend} />
                <MetricRow title="Google ROAS" icon={TrendingUpDown} {...data.google.roas} />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function PlatformCard({
  name,
  icon: Icon,
  connected,
  accounts,
  accountLabel,
  bgColor,
  iconColor,
  borderColor,
}: {
  name: string
  icon: any
  connected: boolean
  accounts: string[]
  accountLabel: string
  bgColor: string
  iconColor: string
  borderColor: string
}) {
  return (
    <Card className={cn("overflow-hidden", borderColor)}>
      <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 pb-2", bgColor)}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={cn("h-4 w-4 mr-2", iconColor)} />
          {name}
        </CardTitle>
        {connected ? (
          <div className="flex items-center text-green-500 text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </div>
        ) : (
          <div className="flex items-center text-red-500 text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1" />
            Not Connected
          </div>
        )}
      </CardHeader>
      <CardContent>
        <CardDescription>
          {connected
            ? `${accounts.length} ${accountLabel}${accounts.length !== 1 ? "s" : ""} Connected`
            : "No accounts connected"}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

const SummaryDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.user)
  const brandId = useSelector((state: RootState) => state.brand.selectedBrandId)
  const brands = useSelector((state: RootState) => state.brand.brands)
  const selectedBrand = brands.find((brand) => brand._id === brandId)

  const fbAccounts = selectedBrand?.fbAdAccounts ?? []
  const googleAccount = selectedBrand?.googleAdAccount ? [selectedBrand.googleAdAccount] : []
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto p-8">
        <div className="mb-8 space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-1 bg-blue-500 rounded-full" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome Back, {userName}</h1>
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
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-row items-center gap-2 mb-4">
            <GiFlatPlatform className="h-6 w-6" />
            <h2 className="text-xl font-semibold text-slate-800">Connected Platforms</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <PlatformCard
              name="Shopify"
              icon={ShopifyLogo}
              connected={shopifyAccount.length > 0}
              accounts={shopifyAccount}
              accountLabel="Store"
              bgColor="bg-green-50"
              iconColor="text-green-600"
              borderColor="border-green-200"
            />
            <PlatformCard
              name="Facebook Ads"
              icon={FacebookLogo}
              connected={fbAccounts.length > 0}
              accounts={fbAccounts}
              accountLabel="Ad Account"
              bgColor="bg-blue-50"
              iconColor="text-blue-600"
              borderColor="border-blue-200"
            />
            <PlatformCard
              name="Google Ads"
              icon={GoogleLogo}
              connected={googleAccount.length > 0}
              accounts={googleAccount}
              accountLabel="Google Ads Account"
              bgColor="bg-red-50"
              iconColor="text-red-600"
              borderColor="border-red-200"
            />
            <PlatformCard
              name="GA4"
              icon={Ga4Logo}
              connected={ga4Accounts.length > 0}
              accounts={ga4Accounts}
              accountLabel="GA4 Account"
              bgColor="bg-yellow-50"
              iconColor="text-amber-600"
              borderColor="border-amber-200"
            />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-6 w-6" />
            <h2 className="text-xl font-semibold text-slate-800">Performance Overview</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
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