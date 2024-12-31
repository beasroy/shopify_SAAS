import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { format } from "date-fns"
import { useParams } from "react-router-dom"
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar"
import { CalendarRange,ChevronDown, ChevronRight, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateRange } from "react-day-picker"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"
import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ShopifyLogo } from "../GeneralisedDashboard/components/OtherPlatformModalContent"
import { FacebookLogo, GoogleLogo } from "../CampaignMetricsPage"



interface DailyMetric {
    _id: string
    date: string
    metaSpend: number
    metaROAS: number
    googleSpend: number
    googleROAS: number
    totalSpend: number
    grossROI: number
    shopifySales: number
    netROI: number
}

interface MonthlyAggregate {
    _id: {
        month: number
        year: number
    }
    metaSpend: number
    metaROAS: number
    googleSpend: number
    googleROAS: number
    totalSpend: number
    grossROI: number
    shopifySales: number
    netROI: number
    dailyMetrics: DailyMetric[]
    month: number
    year: number
}
function TooltipHeader({ title, tooltip, colSpan = 1, rowSpan, isSubHeader = false }: {
    title: string;
    tooltip: string;
    colSpan?: number;
    rowSpan?: number;
    isSubHeader?: boolean;
}) {
    return (
        <th
            className={`${isSubHeader
                    ? 'text-sm font-medium'
                    : 'font-medium'
                } text-center whitespace-nowrap bg-gray-100 border border-gray-300 text-gray-800 z-50`}
            colSpan={colSpan}
            rowSpan={rowSpan}
        >
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="flex items-center justify-center gap-1 p-0.5 cursor-help">
                            {title}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className="mb-3">
                        <div className="text-gray-700 bg-white p-2 rounded-md text-sm border shadow-lg max-w-xs">
                            {tooltip}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </th>
    )
}




export const ExcelMetricsPage: React.FC<any> = () => {
    const [metricsData, setMetricsData] = useState<MonthlyAggregate[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [expandedMonths, setExpandedMonths] = useState<string[]>([])
    const { brandId } = useParams();

    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
    const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";


    const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                const queryParams: any = {};

                if (startDate) queryParams.startDate = startDate;
                if (endDate) queryParams.endDate = endDate;

                // Fetch the metrics data
                const reportResponse = await axios.get(`${baseURL}/api/report/${brandId}`, {
                    params: queryParams, // Pass query parameters here
                    withCredentials: true,
                });
                const metricsData: MonthlyAggregate[] = reportResponse.data.data
                setMetricsData(metricsData)
            } catch (err) {
                console.error(err)
                setError("Failed to fetch data. Please try again later.")
            } finally {
                setLoading(false)
            }
        }
        fetchData()

    }, [brandId, date, baseURL])



    const toggleMonth = (monthYear: string) => {
        setExpandedMonths(prev =>
            prev.includes(monthYear)
                ? prev.filter(m => m !== monthYear)
                : [...prev, monthYear]
        )
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
    }


    const formatPercentage = (value: number) => {
        return `${value.toFixed(2)}`
    }
    const processedData = useMemo(() => {
        return metricsData.map((monthData: MonthlyAggregate) => {
            const processedDailyMetrics = monthData.dailyMetrics.map(daily => ({
                ...daily,
                metaSales: daily.metaSpend * (daily.metaROAS || 0),
                googleSales: daily.googleSpend * (daily.googleROAS || 0),
            }));

            const metaSales = processedDailyMetrics.reduce((sum, daily) => sum + daily.metaSales, 0);
            const googleSales = processedDailyMetrics.reduce((sum, daily) => sum + daily.googleSales, 0);
            const totalSales = metaSales + googleSales;

            const safeDivide = (numerator: number, denominator: number) =>
                denominator ? numerator / denominator : 0;

            return {
                ...monthData,
                metaSales,
                googleSales,
                totalSales,
                metaROAS: safeDivide(metaSales, monthData.metaSpend),
                googleROAS: safeDivide(googleSales, monthData.googleSpend),
                grossROI: safeDivide(totalSales, monthData.totalSpend),
                netROI: safeDivide(monthData.shopifySales, monthData.totalSpend),
                dailyMetrics: processedDailyMetrics,
            };
        });
    }, [metricsData]);



    return (
        <div className="flex h-screen">
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-hidden bg-gray-100">
             
                <header className="sticky top-0 z-40 bg-white border-b px-6 py-3 transition-all duration-300 shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="rounded-lg bg-secondary p-2 transition-transform duration-300 ease-in-out hover:scale-110">
                                <CalendarRange className="h-6 w-6 text-secondary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-secondary-foreground to-primary">
                                Marketing Insights Tracker
                                </h1>
                            </div>
                        </div>

                        <div className="flex flex-row gap-3 transition-transform duration-300 ease-in-out hover:scale-105">
                            <DatePickerWithRange date={date} setDate={setDate} />
                            {date && (
                                <Button
                                    onClick={() => setDate(undefined)}
                                    className="px-3 py-2 bg-red-500 hover:bg-red-600 transition-colors"
                                >
                                    <SearchX className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </header>

                <Card className="m-6">
                    <CardContent>
                        <div className="flex flex-row items-center my-4 gap-4">
                        <h2 className="text-lg font-semibold text-gray-900 ">
                            Key Performance Metrics by Month with Daily Drill-Down
                        </h2>
                        <div className="flex flex-row gap-2">
                            <FacebookLogo width={20} height={20}/>
                            <GoogleLogo width={20} height={20}/>
                            <ShopifyLogo width={20} height={20}/>
                        </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-[calc(100vh-300px)]">
                                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-600"></div>
                            </div>
                        ) : error ? (
                            <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
                        ) : (
                            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
                                <div className="h-[calc(100vh-200px)] overflow-auto">
                                    <table className="w-full border-collapse">
                                        <thead className="sticky top-0 z-20 text-sm">
                                            <tr>
                                                <th className="w-3 bg-gray-100 border border-gray-300" rowSpan={2} />
                                                <TooltipHeader
                                                    title="Date"
                                                    tooltip="Date"
                                                    rowSpan={2}
                                                />
                                                <TooltipHeader
                                                    title="Meta"
                                                    tooltip="Meta Metrics"
                                                    colSpan={3}
                                                />
                                                <TooltipHeader
                                                    title="Google"
                                                    tooltip="Google Metrics"
                                                    colSpan={3}
                                                />
                                                <TooltipHeader
                                                    title="Total Spent"
                                                    tooltip="Total Spent = Meta Spent + Google Spent"
                                                    rowSpan={2}
                                                />
                                                <TooltipHeader
                                                    title="Gross ROI"
                                                    tooltip="Gross ROI = (MetaSales + GoogleSales)/ Total Spent"
                                                    rowSpan={2}
                                                />
                                                <TooltipHeader
                                                    title="Shopify Sales"
                                                    tooltip="Shopify Sales"
                                                    rowSpan={2}
                                                />
                                                <TooltipHeader
                                                    title="Net ROI"
                                                    tooltip="Net ROI = Shopify Sales / Total Spend"
                                                    rowSpan={2}
                                                />
                                            </tr>
                                            <tr>
                                                <TooltipHeader
                                                    title="Spent"
                                                    tooltip="Meta spent"
                                                    isSubHeader
                                                />
                                                <TooltipHeader
                                                    title="Sales"
                                                    tooltip="Meta Sales = Meta Spent * Meta ROAS"
                                                    isSubHeader
                                                />
                                                <TooltipHeader
                                                    title="ROAS"
                                                    tooltip="Meta ROAS"
                                                    isSubHeader
                                                />
                                                <TooltipHeader
                                                    title="Spent"
                                                    tooltip="Google Spent"
                                                    isSubHeader
                                                />
                                                <TooltipHeader
                                                    title="Sales"
                                                    tooltip="Google Sales = Google Spent * Google ROAS"
                                                    isSubHeader
                                                />
                                                <TooltipHeader
                                                    title="ROAS"
                                                    tooltip="Google ROAS"
                                                    isSubHeader
                                                />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {processedData.map((monthData: any) => {
                                                const monthYear = `${monthData.year}-${monthData.month.toString().padStart(2, '0')}`;
                                                const isExpanded = expandedMonths.includes(monthYear);
                                                return (
                                                    <React.Fragment key={monthYear}>
                                                        <tr
                                                            className={`
                                                        ${isExpanded ? 'bg-gray-100' : 'bg-white'} 
                                                        border-b border-gray-100 cursor-pointer 
                                                        transition-colors text-sm 
                                                    `}
                                                            onClick={() => toggleMonth(monthYear)}
                                                        >
                                                            <td className="w-3 px-4 py-2 text-blue-950">
                                                                {isExpanded ? (
                                                                    <ChevronDown className="h-4 w-4 " />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 " />
                                                                )}
                                                            </td>
                                                            <td className="py-3 font-medium text-gray-900">
                                                                {format(new Date(monthData.year, monthData.month - 1), 'MMMM yyyy')}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(monthData.metaSpend)}</td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(monthData.metaSales)}</td>
                                                            <td className="px-4 py-3 text-right">{formatPercentage(monthData.metaROAS)}</td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(monthData.googleSpend)}</td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(monthData.googleSales)}</td>
                                                            <td className="px-4 py-3 text-right">{formatPercentage(monthData.googleROAS)}</td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(monthData.totalSpend)}</td>
                                                            <td className="px-4 py-3 text-right">{formatPercentage(monthData.grossROI)}</td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(monthData.shopifySales)}</td>
                                                            <td className="px-4 py-3 text-right">{formatPercentage(monthData.netROI)}</td>
                                                        </tr>
                                                        {isExpanded && monthData.dailyMetrics.map((daily: any) => (
                                                            <tr
                                                                key={daily._id}
                                                                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                                            >
                                                                <td className="w-5 px-4 py-2" />
                                                                <td className="py-2 text-sm text-gray-600">
                                                                    {format(new Date(daily.date), 'dd/MM/yyyy')}
                                                                </td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatCurrency(daily.metaSpend)}</td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatCurrency(daily.metaSales)}</td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatPercentage(daily.metaROAS)}</td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatCurrency(daily.googleSpend)}</td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatCurrency(daily.googleSales)}</td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatPercentage(daily.googleROAS)}</td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatCurrency(daily.totalSpend)}</td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatPercentage(daily.grossROI)}</td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatCurrency(daily.shopifySales)}</td>
                                                                <td className="px-4 py-2 text-sm text-right">{formatPercentage(daily.netROI)}</td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


