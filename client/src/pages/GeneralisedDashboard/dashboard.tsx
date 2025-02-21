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
  Info,
  Tag,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { GiFlatPlatform } from "react-icons/gi";


export type Trend = "up" | "down"
export type Period = "daily" | "weekly" | "monthly"

export interface MetricData {
  current: number
  previous: number
  change: number
  trend: Trend
}

export interface PeriodSummary {
  title: string
  sessions: MetricData
  addToCarts: MetricData
  checkouts: MetricData
  purchases: MetricData
}

export interface Highlight {
  metric: string
  period: "daily" | "weekly" | "monthly"
  message: string
}

export interface AnalyticsSummary {
  summaries: {
    daily: PeriodSummary
    weekly: PeriodSummary
    monthly: PeriodSummary
  }
  highlights: Highlight[]
}

const iconMap = {
  sessions: Users,
  addToCarts: ShoppingCart,
  checkouts: ShoppingBag,
  purchases: Tag,
}

function MetricComparison({
  title,
  metric,
  current,
  previous,
  change,
  trend,
  description,
  periodTitle,
}: {
  title: string
  metric: keyof typeof iconMap
  current: number
  previous: number
  change: number
  trend: "up" | "down"
  description: string
  periodTitle: string
}) {
  const Icon = iconMap[metric]
  const data = [
    { name: "Previous", value: previous },
    { name: "Current", value: current },
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-50 p-4">
        <CardTitle className="text-base font-medium text-slate-700 flex items-center justify-between">
          <span className="flex items-center">
            <Icon className="h-5 w-4 mr-2 text-slate-500" />
            <p className="flex flex-row items-center gap-2">{title} <span className="text-xs text-slate-500">({periodTitle})</span></p>
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Info className="h-4 w-4" />
                  <span className="sr-only">Info</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-row items-center gap-5">
            <div className="text-2xl font-bold">{current.toLocaleString()}</div>
            <div className="text-sm text-slate-500">vs {previous.toLocaleString()} previous</div>
          </div>
          <div
            className={cn("text-sm font-medium flex items-center", trend === "up" ? "text-green-500" : "text-red-500")}
          >
            {trend === "up" ? <ArrowUpIcon className="h-4 w-4 mr-1" /> : <ArrowDownIcon className="h-4 w-4 mr-1" />}
            {(change)}%
          </div>
        </div>
        <ResponsiveContainer width="100%" height={40}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" hide />
            <Bar
              dataKey="value"
              fill={trend === "up" ? "#10B981" : "#EF4444"}
              radius={[0, 4, 4, 0]}
              barSize={10} // Added this to make bars slimmer
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
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
  // Extract Shopify shop name
  const shopifyShopName = selectedBrand?.shopifyAccount?.shopName || ""
  const shopifyAccount = shopifyShopName ? [shopifyShopName] : []

  const userName = user?.username
  const [loading, setLoading] = useState<boolean>(false)
  const [metrics, setMetrics] = useState<AnalyticsSummary>()
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("daily")

  const axiosInstance = createAxiosInstance()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.post(
        `api/analytics/atcsummary/${brandId}`,
        {
          userId: user?.id,
        },
        { withCredentials: true },
      )

      const fetchedData = response.data || []

      setMetrics(fetchedData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [brandId, user?.id])

  useEffect(() => {
    setMetrics(undefined) // Reset metrics when brandId changes
    fetchData()
    const intervalId = setInterval(fetchData, 15 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [fetchData, brandId]) // Added brandId to dependencies

  const handleManualRefresh = () => {
    fetchData()
  }

  if (loading) {
    return <DashboardSkeleton />
  }


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
              onClick={handleManualRefresh}
              disabled={loading}
              size="sm"
              variant="outline"
              className="hover:bg-slate-100"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-row items-center gap-2">
              <Activity />
              <h2 className="text-xl font-semibold text-slate-800">Performance Analytics</h2>
            </div>
            <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
              {(["daily", "weekly", "monthly"] as const).map((period) => (
                <Button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  variant={selectedPeriod === period ? "default" : "ghost"}
                  size="sm"
                  className="text-sm"
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            <MetricComparison
              title="Active Sessions"
              metric="sessions"
              current={metrics?.summaries[selectedPeriod].sessions.current ?? 0}
              previous={metrics?.summaries[selectedPeriod].sessions.previous ?? 0}
              change={metrics?.summaries[selectedPeriod].sessions.change ?? 0}
              trend={metrics?.summaries[selectedPeriod].sessions.trend ?? "down"}
              description="Number of active user sessions on your website"
              periodTitle={metrics?.summaries[selectedPeriod].title ?? ""}
            />
            <MetricComparison
              title="Cart Additions"
              metric="addToCarts"
              current={metrics?.summaries[selectedPeriod].addToCarts.current ?? 0}
              previous={metrics?.summaries[selectedPeriod].addToCarts.previous ?? 0}
              change={metrics?.summaries[selectedPeriod].addToCarts.change ?? 0}
              trend={metrics?.summaries[selectedPeriod].addToCarts.trend ?? "down"}
              description="Number of times items were added to shopping carts"
              periodTitle={metrics?.summaries[selectedPeriod].title ?? ""}
            />
            <MetricComparison
              title="Checkout Initiated"
              metric="checkouts"
              current={metrics?.summaries[selectedPeriod].checkouts.current ?? 0}
              previous={metrics?.summaries[selectedPeriod].checkouts.previous ?? 0}
              change={metrics?.summaries[selectedPeriod].checkouts.change ?? 0}
              trend={metrics?.summaries[selectedPeriod].checkouts.trend ?? "down"}
              description="Number of times users started the checkout process"
              periodTitle={metrics?.summaries[selectedPeriod].title ?? ""}
            />
            <MetricComparison
              title="Completed Sales"
              metric="purchases"
              current={metrics?.summaries[selectedPeriod].purchases.current ?? 0}
              previous={metrics?.summaries[selectedPeriod].purchases.previous ?? 0}
              change={metrics?.summaries[selectedPeriod].purchases.change ?? 0}
              trend={metrics?.summaries[selectedPeriod].purchases.trend ?? "down"}
              description="Number of completed purchases"
              periodTitle={metrics?.summaries[selectedPeriod].title ?? ""}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SummaryDashboard

