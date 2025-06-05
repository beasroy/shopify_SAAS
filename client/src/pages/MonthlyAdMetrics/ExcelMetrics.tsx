"use client"

import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { format } from "date-fns"
import { useParams } from "react-router-dom"
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar"
import { CalendarRange, ChevronDown, Download, Maximize, Minimize } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { FacebookLogo, GoogleLogo, ShopifyLogo } from "@/data/logo.tsx"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import Header from "@/components/dashboard_component/Header"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange"
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal"
import type { ITooltipHeaderProps, IMonthlyAggregate } from "@/interfaces/index"
import Loader from "@/components/dashboard_component/loader"
import { baseURL } from "@/data/constant"
import DataBuilding from "./components/DataBuilding"

export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};

function TooltipHeader({
  title,
  tooltip,
  colSpan = 1,
  rowSpan,
  isSubHeader = false,
  isImportant = false,
  isFirstInSection = false, // Add this new prop
}: Readonly<ITooltipHeaderProps & { isImportant?: boolean; isFirstInSection?: boolean }>) {
  return (
    <th
      className={`
        ${isSubHeader ? "text-xs font-medium" : "font-semibold text-sm"}
        text-center whitespace-nowrap p-2
        ${isSubHeader ? "bg-slate-100" : "bg-slate-200"}
        ${isImportant ? "bg-blue-50 !font-bold text-blue-800" : ""}
        relative overflow-hidden
        ${!isSubHeader ? "sticky top-0 z-10" : ""}
        font-inter border-b border-r border-slate-300
        ${isFirstInSection ? "border-l-2 border-l-slate-300 shadow-sm" : ""}
      `}
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`
                flex items-center justify-center gap-1 cursor-help
                ${isImportant ? "text-blue-800" : ""}
              `}
            >
              {isImportant && <span className="text-blue-500">●</span>}
              {title}
            </span>
          </TooltipTrigger>
          <TooltipContent className="mb-3 z-20">
            <div className="text-gray-700 bg-white p-2 rounded-md text-sm border shadow-lg max-w-xs">
              {isImportant && <div className="font-semibold text-blue-600 mb-1">Key Metric</div>}
              {tooltip}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </th>
  )
}

// Excel-like cell component
function Cell({
  children,
  isNumeric = false,
  isHeader = false,
  isSticky = false,
  isExpanded = false,
  isImportant = false,
  isFirstInSection = false, // Add this new prop
  className = "",
}: {
  children?: React.ReactNode
  isNumeric?: boolean
  isHeader?: boolean
  isSticky?: boolean
  isExpanded?: boolean
  isImportant?: boolean
  isFirstInSection?: boolean
  className?: string
}) {
  return (
    <td
      className={`
        border-b border-r border-slate-200
        ${isNumeric ? "text-right font-roboto tabular-nums" : "text-left"} 
        ${isHeader ? "font-medium font-dm-sans" : ""}
        ${isSticky ? "sticky z-10" : ""}
        ${isExpanded ? "bg-blue-50/30" : "bg-white hover:bg-slate-50/80"}
        ${isSticky && isExpanded ? "bg-blue-50/30" : ""}
        ${isImportant ? "font-semibold text-blue-700" : ""}
        ${isFirstInSection ? "border-l-2 border-l-slate-300 shadow-sm" : ""}
        transition-colors
        ${className}
      `}
    >
      {children}
    </td>
  )
}

export const ExcelMetricsPage: React.FC = () => {
  const [metricsData, setMetricsData] = useState<IMonthlyAggregate[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false)
  const dateFrom = useSelector((state: RootState) => state.date.from)
  const dateTo = useSelector((state: RootState) => state.date.to)
  const [expandedMonths, setExpandedMonths] = useState<string[]>([])
  const { brandId } = useParams()

  const date = useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
    }),
    [dateFrom, dateTo],
  )

  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : ""
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : ""

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
  }

  const getTableHeight = () => {
    if (isFullScreen) {
      return "max-h-[calc(100vh-120px)]"
    }
    return "max-h-[calc(100vh-230px)]"
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const queryParams: Record<string, string> = {}

        if (startDate) queryParams.startDate = startDate
        if (endDate) queryParams.endDate = endDate

        const reportResponse = await axios.get(`${baseURL}/api/report/${brandId}`, {
          params: queryParams,
          withCredentials: true,
        })
        const metricsData: IMonthlyAggregate[] = reportResponse.data.data
        setMetricsData(metricsData)
      } catch (err) {
        console.error(err)
        const message =
          axios.isAxiosError(err) && err.response?.data?.message ? err.response.data.message : "Something went wrong"
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [brandId, startDate, endDate, baseURL])

  const toggleMonth = (monthYear: string) => {
    setExpandedMonths((prev) => (prev.includes(monthYear) ? prev.filter((m) => m !== monthYear) : [...prev, monthYear]))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}`
  }

  const processedData = useMemo(() => {
    const safeDivide = (numerator: number, denominator: number) => (denominator ? numerator / denominator : 0)

    return metricsData.map((monthData: IMonthlyAggregate) => {
      const processedDailyMetrics = monthData.dailyMetrics.map((daily) => ({
        ...daily,
        metaSales: daily.metaSpend * (daily.metaROAS || 0),
        googleSales: daily.googleSpend * (daily.googleROAS || 0),
        adSales: daily.totalSpend * daily.grossROI || 0,
        ROI: safeDivide(daily.totalSales, daily.totalSpend),
      }))

      const metaSales = processedDailyMetrics.reduce((sum, daily) => sum + daily.metaSales, 0)
      const googleSales = processedDailyMetrics.reduce((sum, daily) => sum + daily.googleSales, 0)
      const totalAdSales = metaSales + googleSales || 0

      return {
        ...monthData,
        metaSales,
        googleSales,
        totalAdSales,
        metaROAS: safeDivide(metaSales, monthData.metaSpend),
        googleROAS: safeDivide(googleSales, monthData.googleSpend),
        grossROI: safeDivide(totalAdSales, monthData.totalSpend),
        netROI: safeDivide(monthData.shopifySales, monthData.totalSpend),
        ROI: safeDivide(monthData.totalSales, monthData.totalSpend),
        dailyMetrics: processedDailyMetrics,
      }
    })
  }, [metricsData])

  useMemo(() => {
    if (!processedData.length) return null

    const totalSales = processedData.reduce((sum, month) => sum + month.totalSales, 0)
    const totalSpend = processedData.reduce((sum, month) => sum + month.totalSpend, 0)
    const totalROI = totalSpend ? totalSales / totalSpend : 0
    const metaSpend = processedData.reduce((sum, month) => sum + month.metaSpend, 0)
    const googleSpend = processedData.reduce((sum, month) => sum + month.googleSpend, 0)
    const metaSales = processedData.reduce((sum, month) => sum + month.metaSales, 0)
    const googleSales = processedData.reduce((sum, month) => sum + month.googleSales, 0)
    const metaROAS = metaSpend ? metaSales / metaSpend : 0
    const googleROAS = googleSpend ? googleSales / googleSpend : 0

    return {
      totalSales,
      totalSpend,
      totalROI,
      metaSpend,
      googleSpend,
      metaSales,
      googleSales,
      metaROAS,
      googleROAS,
    }
  }, [processedData])

  const renderTable = (): React.ReactNode => {
    if (error) {
      return <div className="rounded-lg bg-red-50 p-4 text-red-600 border border-red-200">{error}</div>
    }

    return (
      <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
        <div className={`${getTableHeight()} overflow-auto`}>
          <table className="w-full border-collapse font-inter">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="w-10 sticky left-0 z-30 bg-slate-200 border-b border-r border-slate-300" rowSpan={2} />
                <th
                  className="sticky left-[40px] z-20 text-center whitespace-nowrap p-2 font-semibold text-sm bg-slate-200 border-b border-r border-slate-300 border-l-2 border-l-slate-300 "
                  rowSpan={2}
                >
                  Date
                </th>
                <TooltipHeader
                  title="Shopify (Actual Sales Data)"
                  tooltip="Shopify Metrics"
                  colSpan={5}
                  isFirstInSection={true}
                />
                <TooltipHeader title="Meta + Google" tooltip="Meta + Google" colSpan={3} isFirstInSection={true} />
                <TooltipHeader
                  title="Meta (Facebook & Instagram Ads)"
                  tooltip="Meta Metrics"
                  colSpan={3}
                  isFirstInSection={true}
                />
                <TooltipHeader title="Google Ads" tooltip="Google Metrics" colSpan={3} isFirstInSection={true} />
              </tr>
              <tr>
                <TooltipHeader
                  title="Net Sales"
                  tooltip="Net Sales = Gross Sales - Discount"
                  isSubHeader
                  isFirstInSection={true}
                />
                <TooltipHeader
                  title="Net ROI"
                  tooltip="Net ROI = Net Sales / Total Spend"
                  isSubHeader
                  isImportant={true}
                />
                <TooltipHeader title="Returns" tooltip="Returns" isSubHeader />
                <TooltipHeader title="Total Sales" tooltip="Total Sales = Net Sales - Returns" isSubHeader />
                <TooltipHeader
                  title="Final ROI"
                  tooltip="Final ROI = Total Sales / Total Spend"
                  isSubHeader
                  isImportant={true}
                />
                <TooltipHeader
                  title="Spend"
                  tooltip="Total Spent = Meta Spent + Google Spent"
                  isSubHeader
                  isFirstInSection={true}
                />
                <TooltipHeader title="Sales" tooltip="Sales = (MetaSales + GoogleSales)" isSubHeader />
                <TooltipHeader
                  title="ROI"
                  tooltip="ROI = (MetaSales + GoogleSales)/ Total Spent"
                  isSubHeader
                  isImportant={true}
                />
                <TooltipHeader title="Spend" tooltip="Meta Spent" isSubHeader isFirstInSection={true} />
                <TooltipHeader title="Sales" tooltip="Meta Sales = Meta Spent * Meta ROAS" isSubHeader />
                <TooltipHeader title="ROAS" tooltip="Meta ROAS" isSubHeader isImportant={true} />
                <TooltipHeader title="Spend" tooltip="Google Spent" isSubHeader isFirstInSection={true} />
                <TooltipHeader title="Sales" tooltip="Google Sales = Google Spent * Google ROAS" isSubHeader />
                <TooltipHeader title="ROAS" tooltip="Google ROAS" isSubHeader isImportant={true} />
              </tr>
            </thead>
            <tbody>
              {processedData.map((monthData: any) => {
                const monthYear = `${monthData.year}-${monthData.month.toString().padStart(2, "0")}`
                const isExpanded = expandedMonths.includes(monthYear)
                return (
                  <React.Fragment key={monthYear}>
                    <tr
                      className={`
                        ${isExpanded ? "bg-blue-50/30" : "bg-white hover:bg-slate-50/80"} 
                        cursor-pointer transition-colors 
                      `}
                      onClick={() => toggleMonth(monthYear)}
                    >
                      <Cell isSticky isExpanded={isExpanded} className="w-10 px-2 py-2 sticky left-0">
                        <div
                          className={`
                            w-6 h-6 rounded-full flex items-center justify-center
                            transition-all duration-300 transform
                            ${isExpanded ? "rotate-180 bg-blue-500" : "bg-blue-100 hover:bg-blue-200"}
                          `}
                        >
                          <ChevronDown className={`w-4 h-4 ${isExpanded ? "text-white" : "text-blue-500"}`} />
                        </div>
                      </Cell>
                      <Cell
                        isHeader
                        isSticky
                        isExpanded={isExpanded}
                        className="sticky left-[40px] px-3 py-2.5 whitespace-nowrap bg-slate-50/80 text-sm border-l-2 border-l-slate-300 "
                      >
                        {format(new Date(monthData.year, monthData.month - 1), "MMM yyyy")}
                      </Cell>
                      <Cell
                        isNumeric
                        isExpanded={isExpanded}
                        className="px-3 py-2.5 font-medium text-sm"
                        isFirstInSection={true}
                      >
                        {formatCurrency(monthData.shopifySales)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} isImportant className="px-3 py-2.5 text-sm">
                        {formatPercentage(monthData.netROI)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} className="px-3 py-2.5 text-sm">
                        {formatCurrency(monthData.refundAmount)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} className="px-3 py-2.5 font-medium text-sm">
                        {formatCurrency(monthData.totalSales)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} isImportant className="px-3 py-2.5 text-sm">
                        {formatPercentage(monthData.ROI)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} className="px-3 py-2.5 text-sm" isFirstInSection={true}>
                        {formatCurrency(monthData.totalSpend)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} className="px-3 py-2.5 text-sm">
                        {formatCurrency(monthData.totalAdSales)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} isImportant className="px-3 py-2.5 text-sm">
                        {formatPercentage(monthData.grossROI)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} className="px-3 py-2.5 text-sm" isFirstInSection={true}>
                        {formatCurrency(monthData.metaSpend)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} className="px-3 py-2.5 text-sm">
                        {formatCurrency(monthData.metaSales)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} isImportant className="px-3 py-2.5 text-sm">
                        {formatPercentage(monthData.metaROAS)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} className="px-3 py-2.5 text-sm" isFirstInSection={true}>
                        {formatCurrency(monthData.googleSpend)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} className="px-3 py-2.5 text-sm">
                        {formatCurrency(monthData.googleSales)}
                      </Cell>
                      <Cell isNumeric isExpanded={isExpanded} isImportant className="px-3 py-2.5 text-sm">
                        {formatPercentage(monthData.googleROAS)}
                      </Cell>
                    </tr>
                    {isExpanded &&
                      monthData.dailyMetrics.map((daily: any) => (
                        <tr key={daily._id} className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                          <Cell isSticky className="w-10 px-2 py-1.5 sticky left-0 bg-slate-50/50" />
                          <Cell
                            isSticky
                            className="sticky left-[40px] px-3 py-1.5 text-xs text-gray-600 bg-slate-50/80 border-l-2 border-l-slate-300 "
                          >
                            {format(new Date(daily.date), "dd/MM/yyyy")}
                          </Cell>
                          <Cell isNumeric className="px-3 py-1.5 text-xs" isFirstInSection={true}>
                            {formatCurrency(daily.shopifySales)}
                          </Cell>
                          <Cell isNumeric isImportant className="px-3 py-1.5 text-xs">
                            {formatPercentage(daily.netROI)}
                          </Cell>
                          <Cell isNumeric className="px-3 py-1.5 text-xs">
                            {formatCurrency(daily.refundAmount)}
                          </Cell>
                          <Cell isNumeric className="px-3 py-1.5 text-xs">
                            {formatCurrency(daily.totalSales)}
                          </Cell>
                          <Cell isNumeric isImportant className="px-3 py-1.5 text-xs">
                            {formatPercentage(daily.ROI)}
                          </Cell>
                          <Cell isNumeric className="px-3 py-1.5 text-xs" isFirstInSection={true}>
                            {formatCurrency(daily.totalSpend)}
                          </Cell>
                          <Cell isNumeric className="px-3 py-1.5 text-xs">
                            {formatCurrency(daily.adSales)}
                          </Cell>
                          <Cell isNumeric isImportant className="px-3 py-1.5 text-xs">
                            {formatPercentage(daily.grossROI)}
                          </Cell>
                          <Cell isNumeric className="px-3 py-1.5 text-xs" isFirstInSection={true}>
                            {formatCurrency(daily.metaSpend)}
                          </Cell>
                          <Cell isNumeric className="px-3 py-1.5 text-xs">
                            {formatCurrency(daily.metaSales)}
                          </Cell>
                          <Cell isNumeric isImportant className="px-3 py-1.5 text-xs">
                            {formatPercentage(daily.metaROAS)}
                          </Cell>
                          <Cell isNumeric className="px-3 py-1.5 text-xs" isFirstInSection={true}>
                            {formatCurrency(daily.googleSpend)}
                          </Cell>
                          <Cell isNumeric className="px-3 py-1.5 text-xs">
                            {formatCurrency(daily.googleSales)}
                          </Cell>
                          <Cell isNumeric isImportant className="px-3 py-1.5 text-xs">
                            {formatPercentage(daily.googleROAS)}
                          </Cell>
                        </tr>
                      ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (loading) return <Loader isLoading={loading} />
    if (error === "No metrics data available yet. Please try again later.") return <DataBuilding />
    return (
      <div className="flex-1 h-screen overflow-hidden bg-slate-100">
        <Header title="Marketing Insights Tracker" Icon={CalendarRange} showDatePicker={true} />
        <Card
          id="metrics-table"
          className={`${isFullScreen ? "fixed inset-0 z-50 m-0 rounded-none" : "m-6"} shadow-md`}
        >
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <h2 className="text-xl font-semibold text-slate-800">Key Performance Metrics</h2>
                <div className="flex flex-row gap-3 items-center">
                  <FacebookLogo width={20} height={20} />
                  <GoogleLogo width={20} height={20} />
                  <ShopifyLogo width={20} height={20} />
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                {isFullScreen && (
                  <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                    <DatePickerWithRange
                      defaultDate={{
                        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        to: new Date(),
                      }}
                    />
                  </div>
                )}
                <Button onClick={toggleFullScreen} size="icon" variant="outline" className="bg-white">
                  {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" className="gap-2 bg-white">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
            {renderTable()}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-hidden flex flex-col">{renderContent()}</div>
      <HelpDeskModal />
    </div>
  )
}
