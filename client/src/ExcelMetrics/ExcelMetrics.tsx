

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { format } from "date-fns"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { useParams } from "react-router-dom"
import CollapsibleSidebar from "@/Dashboard/CollapsibleSidebar"
import { BriefcaseBusiness, ChevronDown, ChevronRight, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateRange } from "react-day-picker"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"


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
function TooltipHeader({ title, tooltip }: { title: string; tooltip: string }) {
    return (
      <TableHead className="font-bold text-primary-foreground text-center w-[120px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild >
              <span className="flex items-center justify-center gap-1 cursor-help">
                {title} 
              </span>
            </TooltipTrigger>
            <TooltipContent className="mb-3">
              <div className=" text-gray-500 bg-white p-1 rounded-md text-xs border">{tooltip}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableHead>
    )
  }


export const ExcelMetricsPage: React.FC<any> = () => {
    const [metricsData, setMetricsData] = useState<MonthlyAggregate[]>([])
    const [brandName, setBrandName] = useState<string>("")
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

                const brandResponse = await axios.get(`${baseURL}/api/brands/${brandId}`, { withCredentials: true })
                const brandName = brandResponse.data.name

                setMetricsData(metricsData)
                setBrandName(brandName)
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
                metaSales: daily.metaSpend * (daily.metaROAS),
                googleSales: daily.googleSpend * (daily.googleROAS)
            }))
    
            const metaSales = processedDailyMetrics.reduce((sum, daily) => sum + daily.metaSales, 0)
            const googleSales = processedDailyMetrics.reduce((sum, daily) => sum + daily.googleSales, 0)
    
            return {
                ...monthData,
                metaSales,
                googleSales,
                dailyMetrics: processedDailyMetrics
            }
        })
    }, [metricsData])
    
console.log(processedData);

    return (
        <div className="flex h-screen ">
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-hidden">
                <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-8">
                    <div className=" flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-2">
                            <BriefcaseBusiness className="h-6 w-6 text-gray-500" />
                            <h1 className="text-2xl font-bold">{brandName} Ad Metrics Overview</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center space-x-4">
                                <DatePickerWithRange date={date} setDate={setDate}
                                />
                            </div>
                            {date &&
                                <Button onClick={() => setDate(undefined)} className="px-4 py-2 text-white bg-red-500 hover:bg-red-600">
                                    <SearchX className="w-6 h-6" />
                                </Button>
                            }
                        </div>
                    </div>
                </header>

                <h1 className="text-lg font-semibold flex flex-col items-start space-x-3 m-6">

                    Key performance indicators for your Ad Accounts
                </h1>
                {loading ? (
                    <div className="flex items-baseline justify-center h-screen">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <p className="text-red-500">{error}</p>
                ) : (
                    <div className="border rounded-md overflow-auto m-6 lg:mt-3">
                        <div className="max-h-[90vh] overflow-auto">
                            <Table>
                                <TableHeader className="bg-cyan-900 sticky top-0 z-10">
                                    <TableRow className="hover:bg-cyan-900">
                                        <TableHead className="w-[30px]" />
                                        <TooltipHeader title="Date" tooltip="Date"/>
                                        <TooltipHeader title='Meta Spend'tooltip="Meta spend"/>
                                        <TooltipHeader title='Meta Sales'tooltip="Meta Sales = Meta Spend * Meta ROAS"/>
                                        <TooltipHeader title='Meta ROAS'tooltip="Meta ROAS"/>
                                        <TooltipHeader title='Google Spend'tooltip="Google Spend"/>
                                        <TooltipHeader title='Google Sales'tooltip="Google Sales = Google Spend * Google ROAS"/>
                                        <TooltipHeader title='Google ROAS'tooltip="Google ROAS"/>
                                        <TooltipHeader title='Total Spend'tooltip="Total Spend = Meta Spend + Google Spend"/>
                                        <TooltipHeader title='Gross ROI'tooltip="Gross ROI =(MetaSales + GoogleSales)/ Total Spend"/>
                                        <TooltipHeader title='Shopify Sales' tooltip='Shopify Sales'/> 
                                        <TooltipHeader title='Net ROI' tooltip='Net ROI = Shopify Sales / Total Spend'/>                                          
                                        {expandedMonths.length > 0 && <TableHead className="w-[15px]" />}
                                    </TableRow>
                                </TableHeader>
                                </Table>
                                <div className="max-h-[70vh] md:max-h-[calc(75vh-2.5rem)]  overflow-y-auto ">
                                    <Table>
                                <TableBody>
                                    {processedData.map((monthData: any,_) => {
                                        const monthYear = `${monthData.year}-${monthData.month.toString().padStart(2, '0')}`
                                        const isExpanded = expandedMonths.includes(monthYear)
                                        return (
                                            <>
                                                <TableRow
                                                    key={monthYear}
                                                    className="bg-muted/50 cursor-pointer hover:bg-muted"
                                                    onClick={() => toggleMonth(monthYear)}
                                                >
                                                    <TableCell className="w-[30px]">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-cyan-950  w-[120px]">{format(new Date(monthData.year, monthData.month - 1), 'MMMM yyyy')}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatCurrency(monthData.metaSpend)}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatCurrency(monthData.metaSales)}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatPercentage(monthData.metaROAS)}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatCurrency(monthData.googleSpend)}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatCurrency(monthData.googleSales)}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatPercentage(monthData.googleROAS)}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatCurrency(monthData.totalSpend)}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatPercentage(monthData.grossROI)}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatCurrency(monthData.shopifySales)}</TableCell>
                                                    <TableCell className=" w-[120px] text-center">{formatPercentage(monthData.netROI)}</TableCell>
                                                </TableRow>
                                                {isExpanded && monthData.dailyMetrics.map((daily: any) => (
                                                    <TableRow key={daily._id} className="bg-background">
                                                        <TableCell />
                                                        <TableCell className=" w-[120px] text-center">{format(new Date(daily.date), 'dd/MM/yyyy')}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatCurrency(daily.metaSpend)}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatCurrency(daily.metaSales)}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatPercentage(daily.metaROAS)}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatCurrency(daily.googleSpend)}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatCurrency(daily.googleSales)}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatPercentage(daily.googleROAS)}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatCurrency(daily.totalSpend)}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatPercentage(daily.grossROI)}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatCurrency(daily.shopifySales)}</TableCell>
                                                        <TableCell className=" w-[120px] text-center">{formatPercentage(daily.netROI)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </>
                                        )
                                    })}
                                </TableBody>
                                </Table>
                                </div>
                     
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

