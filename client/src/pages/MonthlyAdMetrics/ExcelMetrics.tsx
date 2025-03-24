import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { format } from "date-fns"
import { useParams } from "react-router-dom"
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar"
import { CalendarRange, ChevronDown, Maximize, Minimize } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { ShopifyLogo } from "../GeneralisedDashboard/components/OtherPlatformModalContent"
import { FacebookLogo, GoogleLogo } from "@/pages/AnalyticsDashboard/AdAccountsMetricsCard"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import Header from "@/components/dashboard_component/Header"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange"
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal"
import { ITooltipHeaderProps, IMonthlyAggregate } from "@/interfaces/index"




function TooltipHeader({
    title,
    tooltip,
    colSpan = 1,
    rowSpan,
    isSubHeader = false,
    isImportant = false,
}: Readonly<ITooltipHeaderProps & { isImportant?: boolean }>) {
    return (
        <th
            className={`
                ${isSubHeader ? 'text-xs font-medium' : 'font-semibold text-sm'}
                text-center whitespace-nowrap border-r border-gray-400 p-2
                ${isSubHeader ? 'bg-gradient-to-b from-gray-100 to-gray-200' : 'bg-gradient-to-r from-gray-100 to-gray-200'}
                ${isImportant ? 'bg-blue-50 !font-bold' : ''}
                relative overflow-hidden
                ${!isSubHeader ? 'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-500/20' : ''}
            `}
            colSpan={colSpan}
            rowSpan={rowSpan}
        >
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className={`
                            flex items-center justify-center gap-1 cursor-help
                            ${isImportant ? 'text-blue-700' : ''}
                        `}>
                            {isImportant && <span className="text-blue-500">●</span>}
                            {title}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className="mb-3">
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

    const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen)
    }

    const getTableHeight = () => {
        if (isFullScreen) {
            return 'max-h-[calc(100vh-80px)]'
        }
        return 'max-h-[calc(100vh-200px)]'
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
                setError("Failed to fetch data. Please try again later.")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [brandId, startDate, endDate, baseURL])

    const toggleMonth = (monthYear: string) => {
        setExpandedMonths((prev) =>
            prev.includes(monthYear)
                ? prev.filter((m) => m !== monthYear)
                : [...prev, monthYear]
        )
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR"
        }).format(value)
    }

    const formatPercentage = (value: number) => {
        return `${value.toFixed(2)}`
    }

    const processedData = useMemo(() => {
        const safeDivide = (numerator: number, denominator: number) =>
            (denominator ? numerator / denominator : 0)

        return metricsData.map((monthData: IMonthlyAggregate) => {
            const processedDailyMetrics = monthData.dailyMetrics.map((daily) => ({
                ...daily,
                metaSales: daily.metaSpend * (daily.metaROAS || 0),
                googleSales: daily.googleSpend * (daily.googleROAS || 0),
                adSales: (daily.totalSpend * daily.grossROI) || 0,
                ROI: safeDivide(daily.totalSales, daily.totalSpend)
            }))

            const metaSales = processedDailyMetrics.reduce((sum, daily) => sum + daily.metaSales, 0)
            const googleSales = processedDailyMetrics.reduce((sum, daily) => sum + daily.googleSales, 0)
            const totalAdSales = (metaSales + googleSales) || 0

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

    const renderContent = (): React.ReactNode => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-[calc(100vh-300px)]">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
                </div>
            )
        }

        if (error) {
            return <div className="rounded-lg bg-red-50 p-4 text-red-600 border border-red-200">{error}</div>
        }

        return (
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
                <div className={`${getTableHeight()}  overflow-auto`}>
                    <table className={`w-full border-collapse`}>
                        <thead className="sticky top-0 z-20 text-sm">
                            <tr>
                                <th className="w-3 bg-gradient-to-r from-gray-100 to-gray-200 border-r border-gray-400 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-500/20" rowSpan={2} />
                                <TooltipHeader title="Date" tooltip="Date" rowSpan={2} />
                                <TooltipHeader title="Shopify (Actual Sales Data)" tooltip="Shopify Metrics" colSpan={5} />
                                <TooltipHeader title="Meta + Google" tooltip="Meta + Google" colSpan={3} />
                                <TooltipHeader title="Meta (Facebook & Instagram Ads)" tooltip="Meta Metrics" colSpan={3} />
                                <TooltipHeader title="Google Ads" tooltip="Google Metrics" colSpan={3} />
                            </tr>
                            <tr>
                                <TooltipHeader title="Net Sales" tooltip="Net Sales = Gross Sales - Discount" isSubHeader />
                                <TooltipHeader 
                                    title="Net ROI" 
                                    tooltip="Net ROI = Net Sales / Total Spend" 
                                    isSubHeader 
                                    isImportant={true}
                                />
                                <TooltipHeader title="Returns" tooltip="Returns" isSubHeader />
                                <TooltipHeader
                                    title="Total Sales"
                                    tooltip="Total Sales = Net Sales - Returns"
                                    isSubHeader
                                />
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
                                />
                                <TooltipHeader
                                    title="Sales"
                                    tooltip="Sales = (MetaSales + GoogleSales)"
                                    isSubHeader
                                />
                                <TooltipHeader
                                    title="ROI"
                                    tooltip="ROI = (MetaSales + GoogleSales)/ Total Spent"
                                    isSubHeader
                                /> 
                                <TooltipHeader title="Spend" tooltip="Meta Spent" isSubHeader />
                                <TooltipHeader title="Sales" tooltip="Meta Sales = Meta Spent * Meta ROAS" isSubHeader />
                                <TooltipHeader title="ROAS" tooltip="Meta ROAS" isSubHeader />
                                <TooltipHeader title="Spend" tooltip="Google Spent" isSubHeader />
                                <TooltipHeader title="Sales" tooltip="Google Sales = Google Spent * Google ROAS" isSubHeader />
                                <TooltipHeader title="ROAS" tooltip="Google ROAS" isSubHeader /> 
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
                                                        ${isExpanded ? 'bg-blue-100/30 '
                                                    : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent'} 
                                                        border-b border-gray-200 cursor-pointer 
                                                        transition-colors text-sm 
                                                    `}
                                            onClick={() => toggleMonth(monthYear)}
                                        >
                                            <td id="expand-month" className="w-3 px-4 py-2">
                                                <div className={`
                          w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center
                          transition-all duration-300 transform
                          ${isExpanded ? 'rotate-180 bg-blue-500' : 'hover:bg-blue-200'}
                        `}>
                                                    <ChevronDown className={`w-4 h-4 ${isExpanded ? 'text-white' : 'text-blue-500'}`} />
                                                </div>

                                            </td>
                                            <td className="px-4 py-3 text-left font-medium whitespace-nowrap">
                                                {format(new Date(monthData.year, monthData.month - 1), "MMM yyyy")}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatCurrency(monthData.totalSales)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                <div className={`
                                                    inline-flex items-center gap-1 px-2 py-1 rounded
                                                    ${monthData.ROI ? 'bg-blue-50' : ''}
                                                `}>
                                                    {formatPercentage(monthData.ROI)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatCurrency(monthData.refundAmount)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatCurrency(monthData.shopifySales)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                <div className={`
                                                    inline-flex items-center gap-1 px-2 py-1 rounded
                                                    ${monthData.netROI ? 'bg-blue-50' : ''}
                                                `}>
                                                    {formatPercentage(monthData.netROI)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatCurrency(monthData.totalSpend)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatCurrency(monthData.totalSpend * monthData.grossROI) || 0}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatPercentage(monthData.grossROI)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatCurrency(monthData.metaSpend)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatCurrency(monthData.metaSales)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatPercentage(monthData.metaROAS)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatCurrency(monthData.googleSpend)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatCurrency(monthData.googleSales)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                {formatPercentage(monthData.googleROAS)}
                                            </td>
                                           
                                         
                                        </tr>
                                        {isExpanded &&
                                            monthData.dailyMetrics.map((daily: any) => (
                                                <tr
                                                    key={daily._id}
                                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="w-5 px-4 py-1.5" />
                                                    <td className="px-4 py-1.5 text-xs text-left text-gray-600">
                                                        {format(new Date(daily.date), "dd/MM/yyyy")}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right text-gray-700">
                                                        {formatCurrency(daily.totalSales)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right">
                                                        <div className={`
                                                            inline-flex items-center gap-1 px-2 py-1 rounded
                                                            ${daily.ROI ? 'bg-blue-50 font-semibold' : ''}
                                                        `}>
                                                            {formatPercentage(daily.ROI)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right text-gray-700">
                                                        {formatCurrency(daily.refundAmount)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right text-gray-700">
                                                        {formatCurrency(daily.shopifySales)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right">
                                                        <div className={`
                                                            inline-flex items-center gap-1 px-2 py-1 rounded
                                                            ${daily.netROI ? 'bg-blue-50 font-semibold' : ''}
                                                        `}>
                                                            {formatPercentage(daily.netROI)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right  text-gray-700">
                                                        {formatCurrency(daily.totalSpend)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right  text-gray-700">
                                                        {formatCurrency(daily.adSales)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right  text-gray-700">
                                                        {formatPercentage(daily.grossROI)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right text-gray-700">
                                                        {formatCurrency(daily.metaSpend)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right text-gray-700">
                                                        {formatCurrency(daily.metaSales)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right  text-gray-700">
                                                        {formatPercentage(daily.metaROAS)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right  text-gray-700">
                                                        {formatCurrency(daily.googleSpend)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right  text-gray-700">
                                                        {formatCurrency(daily.googleSales)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-xs text-right  text-gray-700">
                                                        {formatPercentage(daily.googleROAS)}
                                                    </td>   
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

    return (
        <div className="flex h-screen">
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-hidden bg-gray-100">
                <Header title="Marketing Insights Tracker" Icon={CalendarRange} showDatePicker={true} />

                <Card id="metrics-table" className={`${isFullScreen ? 'fixed inset-0 z-50 m-0' : 'm-6'}`}>
                    <CardContent>
                        <div className="flex flex-row items-center justify-between mb-3">
                            <div className="flex flex-row items-center gap-4">
                                <h2 className="text-lg font-semibold text-gray-900 ">
                                    Key Performance Metrics by Month with Daily Drill-Down
                                </h2>
                                <div className="flex flex-row gap-2">
                                    <FacebookLogo width={20} height={20} />
                                    <GoogleLogo width={20} height={20} />
                                    <ShopifyLogo width={20} height={20} />
                                </div>
                            </div>
                            <div className="flex flex-row items-center gap-3">
                                {isFullScreen && <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                                    <DatePickerWithRange
                                        defaultDate={{
                                            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                                            to: new Date()
                                        }}
                                    />
                                </div>}
                                <Button onClick={toggleFullScreen} size="icon" variant="outline">
                                    {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {renderContent()}
                    </CardContent>
                </Card>
            </div>
            <HelpDeskModal />
        </div>
    )
}

