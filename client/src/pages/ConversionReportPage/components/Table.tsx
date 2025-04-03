import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import { COLORS } from "@/data/constant"

export interface MonthlyData {
  Month: string
  [key: string]: number | string
}

export interface RowData {
  [key: string]: number | string | MonthlyData[]
}

interface ConversionTableProps {
  data: RowData[]
  primaryColumn: string
  secondaryColumns?: string[]
  monthlyDataKey: string
  monthlyMetrics: string[]
  isFullScreen: boolean
  rows?: number
  isAdsTable?: boolean
  locale: string
}

export default function ConversionTable({
  data,
  primaryColumn,
  secondaryColumns,
  monthlyDataKey,
  monthlyMetrics,
  isFullScreen,
  rows,
  isAdsTable, locale
}: ConversionTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [loadedRows, setLoadedRows] = useState<Array<{ dataIndex: number; metricIndex: number }>>([])
  const rowsPerPage = rows ? rows : 8
  const rowsPerChunk = 30

  const getTableHeight = () => {
    if (isFullScreen) {
      if (isAdsTable) {
        return "max-h-[calc(100vh-90px)]"
      }
      return "max-h-[calc(100vh-130px)]"
    }
    return "max-h-[450px]"
  }

  const months = useMemo(() => {
    if (!Array.isArray(data)) {
      console.error("Data is not an array:", data)
      return []
    }

    const getMonthName = (monthNumber: string): string => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return months[Number.parseInt(monthNumber) - 1]
    }

    const allMonths = new Set<string>()
    data.forEach((row) => {
      const monthlyData = row[monthlyDataKey] as MonthlyData[] | undefined
      if (Array.isArray(monthlyData)) {
        monthlyData.forEach((month) => {
          if (month?.Month) {
            const year = month.Month.slice(0, 4)
            const monthNum = month.Month.slice(4)
            allMonths.add(`${getMonthName(monthNum)}-${year}`)
          }
        })
      }
    })
    return Array.from(allMonths).reverse()
  }, [data, monthlyDataKey])

  const allRows = useMemo(() => {
    const rows: Array<{ dataIndex: number; metricIndex: number }> = []
    data.forEach((_, dataIndex) => {
      monthlyMetrics.forEach((_, metricIndex) => {
        rows.push({ dataIndex, metricIndex })
      })
    })
    return rows
  }, [data, monthlyMetrics])

  const loadMoreRows = () => {
    setLoadedRows((prevRows) => [...prevRows, ...allRows.slice(prevRows.length, prevRows.length + rowsPerChunk)])
  }

  useEffect(() => {
    if (isFullScreen) {
      setLoadedRows(allRows.slice(0, rowsPerChunk))
    }
  }, [isFullScreen, allRows])

  const handleScroll = (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadMoreRows()
    }
  }

  const displayRows = useMemo(() => {
    if (isFullScreen) {
      return loadedRows
    }
    return allRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  }, [isFullScreen, allRows, loadedRows, currentPage, rowsPerPage])

  const thresholds = useMemo(() => {
    let totalSessions = 0,
      totalConvRate = 0,
      sessionCount = 0
    let totalSpend = 0,
      totalPurchaseROAS = 0,
      spendCount = 0
    let totalCost = 0,
      totalConvValuePerCost = 0,
      costCount = 0

    data.forEach((row) => {
      if (typeof row["Total Sessions"] === "number" && typeof row["Avg Conv. Rate"] === "number") {
        totalSessions += Number(row["Total Sessions"])
        totalConvRate += Number(row["Avg Conv. Rate"])
        sessionCount++
      }

      if (typeof row["Total Spend"] === "number" && typeof row["Total Purchase ROAS"] === "number") {
        totalSpend += Number(row["Total Spend"])
        totalPurchaseROAS += Number(row["Total Purchase ROAS"])
        spendCount++
      }

      if (typeof row["Total Cost"] === "number" && typeof row["Conv. Value / Cost"] === "number") {
        totalCost += Number(row["Total Cost"])
        totalConvValuePerCost += Number(row["Conv. Value / Cost"])
        costCount++
      }
    })

    return {
      avgSessions: sessionCount > 0 ? totalSessions / sessionCount : 0,
      avgConvRate: sessionCount > 0 ? totalConvRate / sessionCount : 0,
      avgSpend: spendCount > 0 ? totalSpend / spendCount : 0,
      avgPurchaseROAS: spendCount > 0 ? totalPurchaseROAS / spendCount : 0,
      avgCost: costCount > 0 ? totalCost / costCount : 0,
      avgConvValuePerCost: costCount > 0 ? totalConvValuePerCost / costCount : 0,
    }
  }, [data])

  useEffect(() => {
    if (!isFullScreen) {
      setCurrentPage(1)
    }
  }, [isFullScreen])

  const getMetricColor = ({
    sessions,
    convRate,
    spend,
    purchaseROAS,
    cost,
    convValuePerCost,
  }: {
    sessions?: number
    convRate?: number
    spend?: number
    purchaseROAS?: number
    cost?: number
    convValuePerCost?: number
  }) => {
    const isHighSessions = sessions !== undefined && sessions >= thresholds.avgSessions
    const isGoodConversion = convRate !== undefined && convRate >= thresholds.avgConvRate
    const isHighSpent = spend !== undefined && spend >= thresholds.avgSpend
    const isGoodROAS = purchaseROAS !== undefined && purchaseROAS >= thresholds.avgPurchaseROAS
    const isHighCost = cost !== undefined && cost >= thresholds.avgCost
    const isGoodConvValuePerCost = convValuePerCost !== undefined && convValuePerCost >= thresholds.avgConvValuePerCost

    // Prioritizing Sessions & Conversion Rate
    if (isHighSessions && isGoodConversion)
      return {
        bg: COLORS.success.bg,
        text: COLORS.success.dark,
        indicator: "positive",
        sessionIndicator: "up",
        conversionIndicator: "up",
      }

    if (isHighSpent && isGoodROAS)
      return {
        bg: COLORS.success.bg,
        text: COLORS.success.dark,
        indicator: "positive",
        spendIndicator: "up",
        roasIndicator: "up",
      }

    if (isHighCost && isGoodConvValuePerCost)
      return {
        bg: COLORS.success.bg,
        text: COLORS.success.dark,
        indicator: "positive",
        costIndicator: "up",
        valueIndicator: "up",
      }

    // Mixed positive/negative - more up than down
    if (isHighSessions && !isGoodConversion)
      return {
        bg: COLORS.warning.bg,
        text: COLORS.warning.dark,
        indicator: "neutral-up",
        sessionIndicator: "up",
        conversionIndicator: "down",
      }

    if (isHighSpent && !isGoodROAS)
      return {
        bg: COLORS.warning.bg,
        text: COLORS.warning.dark,
        indicator: "neutral-up",
        spendIndicator: "up",
        roasIndicator: "down",
      }

    if (isHighCost && !isGoodConvValuePerCost)
      return {
        bg: COLORS.warning.bg,
        text: COLORS.warning.dark,
        indicator: "neutral-up",
        costIndicator: "up",
        valueIndicator: "down",
      }

    // Mixed positive/negative - more down than up
    if (!isHighSessions && isGoodConversion)
      return {
        bg: COLORS.neutral.bg,
        text: COLORS.neutral.dark,
        indicator: "neutral-down",
        sessionIndicator: "down",
        conversionIndicator: "up",
      }

    if (!isHighSpent && isGoodROAS)
      return {
        bg: COLORS.neutral.bg,
        text: COLORS.neutral.dark,
        indicator: "neutral-down",
        spendIndicator: "down",
        roasIndicator: "up",
      }

    if (!isHighCost && isGoodConvValuePerCost)
      return {
        bg: COLORS.neutral.bg,
        text: COLORS.neutral.dark,
        indicator: "neutral-down",
        costIndicator: "down",
        valueIndicator: "up",
      }

    // Default case - all negative
    return {
      bg: COLORS.danger.bg,
      text: COLORS.danger.dark,
      indicator: "negative",
      sessionIndicator: "down",
      conversionIndicator: "down",
      spendIndicator: "down",
      roasIndicator: "down",
      costIndicator: "down",
      valueIndicator: "down",
    }
  }

  const renderIndicator = (direction: string) => {
    switch (direction) {
      case "up":
        return <ArrowUp className="h-3 w-3" style={{ color: COLORS.success.main }} />
      case "down":
        return <ArrowDown className="h-3 w-3" style={{ color: COLORS.danger.main }} />
      default:
        return <Minus className="h-3 w-3" style={{ color: COLORS.text.muted }} />
    }
  }

  const renderCell = (value: number | string, type?: "spend" | "percentage" | "default" | "sessions") => {
    if (typeof value === "number") {
      switch (type) {
        case "spend":
          return Math.round(value).toLocaleString(locale)
        case "percentage":
          return `${Number.parseFloat(value.toLocaleString(locale)).toFixed(2)}%`
        case "sessions":
          return Math.round(value).toLocaleString(locale)
        default:
          return Number.parseFloat(value.toLocaleString(locale)).toFixed(2)
      }
    }
    return value
  }

  const renderMonthCell = (monthData: MonthlyData | undefined, metric: string) => {
    if (!monthData) {
      return (
        <td
          className="w-[100px] text-right whitespace-nowrap p-3 text-sm font-medium border-r border-b border-slate-300 bg-white"
          style={{ color: COLORS.text.muted }}
        >
          <span style={{ color: COLORS.text.muted }}>—</span>
        </td>
      )
    }

    const value = monthData[metric]
    let colorStyle = { bg: "white", text: COLORS.text.primary, indicator: "" }
    let directionIndicator = ""

    if (
      (metric === "Sessions" || metric === "Conv. Rate") &&
      typeof monthData["Sessions"] === "number" &&
      typeof monthData["Conv. Rate"] === "number"
    ) {
      const metricStyle = getMetricColor({
        sessions: Number(monthData["Sessions"]),
        convRate: Number(monthData["Conv. Rate"]),
      })
      colorStyle = metricStyle

      if (metric === "Sessions") {
        directionIndicator = metricStyle.sessionIndicator || ""
      } else if (metric === "Conv. Rate") {
        directionIndicator = metricStyle.conversionIndicator || ""
      }
    }

    if (
      (metric === "Spend" || metric === "Purchase ROAS") &&
      typeof monthData["Spend"] === "number" &&
      typeof monthData["Purchase ROAS"] === "number"
    ) {
      const metricStyle = getMetricColor({
        spend: Number(monthData["Spend"]),
        purchaseROAS: Number(monthData["Purchase ROAS"]),
      })
      colorStyle = metricStyle

      if (metric === "Spend") {
        directionIndicator = metricStyle.spendIndicator || ""
      } else if (metric === "Purchase ROAS") {
        directionIndicator = metricStyle.roasIndicator || ""
      }
    }

    if (
      (metric === "Cost" || metric === "Conv. Value/ Cost") &&
      typeof monthData["Cost"] === "number" &&
      typeof monthData["Conv. Value/ Cost"] === "number"
    ) {
      const metricStyle = getMetricColor({
        cost: Number(monthData["Cost"]),
        convValuePerCost: Number(monthData["Conv. Value/ Cost"]),
      })
      colorStyle = metricStyle

      if (metric === "Cost") {
        directionIndicator = metricStyle.costIndicator || ""
      } else if (metric === "Conv. Value/ Cost") {
        directionIndicator = metricStyle.valueIndicator || ""
      }
    }

    return (
      <td
        className="w-[100px] text-right whitespace-nowrap p-3 text-sm font-medium border-r border-b border-slate-300"
        style={{
          backgroundColor: colorStyle.bg,
          color: colorStyle.text,
          transition: "background-color 0.2s ease-in-out",
          lineHeight: "1.4",
        }}
      >
        <div className="flex items-center justify-end gap-1.5">
          {directionIndicator && renderIndicator(directionIndicator)}
          <span>
            {renderCell(
              value,
              metric === "Sessions"
                ? "sessions"
                : metric.toLowerCase().includes("rate")
                  ? "percentage"
                  : metric.toLowerCase().includes("spend") || metric.toLowerCase().includes("cost")
                    ? "spend"
                    : "default",
            )}
          </span>
        </div>
        {metric === "Conv. Rate" && monthData["Purchases"] !== undefined && (
          <div
            className="text-xs mt-1"
            style={{ color: COLORS.text.secondary }}
          >{`Purchases: ${monthData["Purchases"].toLocaleString(locale) ?? 0}`}</div>
        )}
        {metric === "Cost" && monthData["Clicks"] !== undefined && (
          <div
            className="text-xs mt-1"
            style={{ color: COLORS.text.secondary }}
          >{`clicks: ${monthData["Clicks"] ?? 0}`}</div>
        )}
        {metric === "Conv. Value/ Cost" && monthData["Conversion Rate"] !== undefined && (
          <div
            className="text-xs mt-1"
            style={{ color: COLORS.text.secondary }}
          >{`conv. rate: ${monthData["Conversion Rate"].toLocaleString(locale) ?? 0}%`}</div>
        )}
        {metric === "Purchase ROAS" && monthData["Purchase Conversion Value"] !== undefined && (
          <div
            className="text-xs mt-1"
            style={{ color: COLORS.text.secondary }}
          >{`PCV: ${monthData["Purchase Conversion Value"].toLocaleString(locale) ?? 0}`}</div>
        )}
      </td>
    )
  }


  const renderMetricValue = (row: RowData, column: string, currentMetric: string, columnIndex: number) => {
    const value = row[column]

    if (typeof value !== "number") {
      return (
        <td
          className="sticky top-0 min-w-[130px] p-3 text-sm font-medium border-r border-b border-slate-300 bg-white"
          style={{ left: `${130 + 100 + columnIndex * 130}px` }}
        >
          {""}
        </td>
      )
    }

    let colorStyle = { bg: "white", text: COLORS.text.primary, indicator: "" }
    let directionIndicator = ""

    // Check if the current metric and column match specific conditions for color
    if (currentMetric && column) {
      if (column.includes("Sessions") || column.includes("Rate")) {
        const sessions = row["Total Sessions"] as number
        const convRate = row["Avg Conv. Rate"] as number
        const metricStyle = getMetricColor({ sessions, convRate })
        colorStyle = metricStyle

        if (currentMetric.toLowerCase() === "sessions") {
          directionIndicator = metricStyle.sessionIndicator || ""
        } else if (currentMetric.toLowerCase() === "conv. rate") {
          directionIndicator = metricStyle.conversionIndicator || ""
        }
      }
    }

    if (currentMetric && column) {
      if (column.includes("Spend") || column.includes("ROAS")) {
        const spend = row["Total Spend"] as number
        const purchaseROAS = row["Total Purchase ROAS"] as number
        const metricStyle = getMetricColor({ spend, purchaseROAS })
        colorStyle = metricStyle

        if (currentMetric.toLowerCase() === "spend") {
          directionIndicator = metricStyle.spendIndicator || ""
        } else if (currentMetric.toLowerCase() === "purchase roas") {
          directionIndicator = metricStyle.roasIndicator || ""
        }
      }
    }

    if (currentMetric && column) {
      if (column.includes("Cost") || column.includes("Conv. Value / Cost")) {
        const cost = row["Total Cost"] as number
        const convValuePerCost = row["Conv. Value / Cost"] as number
        const metricStyle = getMetricColor({ cost, convValuePerCost })
        colorStyle = metricStyle

        if (currentMetric.toLowerCase() === "cost") {
          directionIndicator = metricStyle.costIndicator || ""
        } else if (currentMetric.toLowerCase() === "conv. value/ cost") {
          directionIndicator = metricStyle.valueIndicator || ""
        }
      }
    }

    const totalPurchases = typeof row["Total Purchases"] === "number" ? row["Total Purchases"].toLocaleString(locale) : null
    const totalConvValue = typeof row["Total Conv. Value"] === "number" ? row["Total Conv. Value"].toLocaleString(locale) : null
    const totalPCV = typeof row["Total PCV"] === "number" ? row["Total PCV"].toLocaleString(locale) : null

    return (
      <td
        className="sticky top-0 min-w-[130px] p-3 text-sm font-medium border-r border-b border-slate-200"
        style={{
          left: `${130 + 100 + columnIndex * 130}px`,
          backgroundColor: colorStyle.bg,
          color: colorStyle.text,
          transition: "background-color 0.2s ease-in-out",
        }}
      >
       {currentMetric.toLowerCase() === "cost" && column === "Total Cost" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              {directionIndicator && renderIndicator(directionIndicator)}
              <span>{renderCell(value, "spend")}</span>
            </div>
          </div>
        ) : currentMetric.toLowerCase() === "conv. value/ cost" && column === "Conv. Value / Cost" ? (
          <div className="flex flex-col border-b border-slate-300">
            <div className="flex items-center gap-1.5">
              {directionIndicator && renderIndicator(directionIndicator)}
              <span>{renderCell(value)}</span>
            </div>
            {totalConvValue && (
              <span className="text-xs mt-0.5" style={{ color: COLORS.text.muted }}>
                Total Conv. Value: {totalConvValue}
              </span>
            )}
          </div>
        ) : currentMetric.toLowerCase() === "sessions" && column.includes("Sessions") ? (
          <div className="flex items-center gap-1.5">
            {directionIndicator && renderIndicator(directionIndicator)}
            <span>{renderCell(value, "sessions")}</span>
          </div>
        ) : currentMetric.toLowerCase() === "conv. rate" && column.includes("Rate") ? (
          <div className="flex flex-col border-b border-slate-300">
            <div className="flex items-center gap-1.5">
              {directionIndicator && renderIndicator(directionIndicator)}
              <span>{renderCell(value, "percentage")}</span>
            </div>
            {totalPurchases && (
              <span className="text-xs mt-0.5" style={{ color: COLORS.text.muted }}>
                Total Purchases: {totalPurchases}
              </span>
            )}
          </div>
        ) : currentMetric.toLowerCase() === "spend" && column.includes("Total Spend") ? (
          <div className="flex items-center gap-1.5">
            {directionIndicator && renderIndicator(directionIndicator)}
            <span>{renderCell(value, "spend")}</span>
          </div>
        ) : currentMetric.toLowerCase() === "purchase roas" && column.includes("Total Purchase ROAS") ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              {directionIndicator && renderIndicator(directionIndicator)}
              <span>{renderCell(value)}</span>
            </div>
            {totalPCV && (
              <span className="text-xs mt-0.5" style={{ color: COLORS.text.muted }}>
                PCV: {totalPCV}
              </span>
            )}
          </div>
        ) : (
          ""
        )}
      </td>
    )
  }

  const renderMetricRow = (row: RowData, metricIndex: number) => {
    const metric = monthlyMetrics[metricIndex]

    // Determine the background color for both primary and metric columns
    let colorStyle = { bg: "white", text: COLORS.text.primary, indicator: "" }
    let directionIndicator = ""

    if (secondaryColumns) {
      const sessions = row["Total Sessions"] as number
      const convRate = row["Avg Conv. Rate"] as number
      const spend = row["Total Spend"] as number
      const purchaseROAS = row["Total Purchase ROAS"] as number
      const cost = row["Total Cost"] as number
      const convValuePerCost = row["Conv. Value / Cost"] as number

      if (metric === "Sessions" || metric === "Conv. Rate") {
        const metricStyle = getMetricColor({ sessions, convRate })
        colorStyle = metricStyle

        if (metric === "Sessions") {
          directionIndicator = metricStyle.sessionIndicator || ""
        } else if (metric === "Conv. Rate") {
          directionIndicator = metricStyle.conversionIndicator || ""
        }
      } else if (metric === "Spend" || metric === "Purchase ROAS") {
        const metricStyle = getMetricColor({ spend, purchaseROAS })
        colorStyle = metricStyle

        if (metric === "Spend") {
          directionIndicator = metricStyle.spendIndicator || ""
        } else if (metric === "Purchase ROAS") {
          directionIndicator = metricStyle.roasIndicator || ""
        }
      } else if (metric === "Cost" || metric === "Conv. Value/ Cost") {
        const metricStyle = getMetricColor({ cost, convValuePerCost })
        colorStyle = metricStyle

        if (metric === "Cost") {
          directionIndicator = metricStyle.costIndicator || ""
        } else if (metric === "Conv. Value/ Cost") {
          directionIndicator = metricStyle.valueIndicator || ""
        }
      }
    }

    return (
      <tr key={`${row[primaryColumn]}-${metric}`} className="hover:bg-slate-50 transition-colors duration-150 border-b border-slate-300">
        <td
          className="sticky left-0 min-w-[130px] max-w-[200px] p-3 text-sm font-medium border-r border-b border-slate-300"
          style={{
            backgroundColor: colorStyle.bg,
            color: colorStyle.text,
            transition: "background-color 0.2s ease-in-out",
            letterSpacing: "-0.01em",
          }}
        >
          {metricIndex === 0
            ? typeof row[primaryColumn] === "string" || typeof row[primaryColumn] === "number"
              ? renderCell(row[primaryColumn])
              : ""
            : null}
        </td>
        <td
          className="sticky left-[130px] min-w-[100px] whitespace-nowrap p-3 text-sm font-medium border-r border-b border-slate-300"
          style={{
            backgroundColor: colorStyle.bg,
            color: colorStyle.text,
            transition: "background-color 0.2s ease-in-out",
          }}
        >
          <div className="flex items-center gap-1.5">
            {directionIndicator && renderIndicator(directionIndicator)}
            <span>{metric}</span>
          </div>
        </td>
        {secondaryColumns?.map((column, index) => renderMetricValue(row, column, metric, index))}
        {months.map((month) => {
          const getMonthNumber = (monthName: string): number => {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            return months.indexOf(monthName) + 1
          }
          const [monthName, year] = month.split("-")
          const monthNum = getMonthNumber(monthName)
          const monthFormat = `${year}${monthNum.toString().padStart(2, "0")}`

          const monthData = (row[monthlyDataKey] as MonthlyData[]).find((m) => m.Month === monthFormat)
          return renderMonthCell(monthData, metric)
        })}
      </tr>
    )
  }

  const totalRows = allRows.length
  const totalPages = Math.ceil(totalRows / rowsPerPage)
  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }

  const renderColumnHeader = (column: string, index: number) => {
    let thresholdValue = ""
    if (column === "Total Sessions") {
      thresholdValue = `(avg: ${Math.round(thresholds.avgSessions).toLocaleString()})`
    } else if (column === "Avg Conv. Rate") {
      thresholdValue = `(avg: ${thresholds.avgConvRate.toFixed(2)}%)`
    } else if (column === "Total Spend") {
      thresholdValue = `(avg: ${Math.round(thresholds.avgSpend).toLocaleString()})`
    } else if (column === "Total Purchase ROAS") {
      thresholdValue = `(avg: ${thresholds.avgPurchaseROAS.toFixed(2)})`
    } else if (column === "Total Cost") {
      thresholdValue = `(avg: ${Math.round(thresholds.avgCost).toLocaleString()})`
    } else if (column === "Conv. Value / Cost") {
      thresholdValue = `(avg: ${thresholds.avgConvValuePerCost.toFixed(2)})`
    }

    return (
      <th
        key={column}
        className="sticky top-0 min-w-[130px] w-[150px] z-20 px-3 py-3 text-left text-base font-medium border-r border-b border-slate-300 shadow-sm"
        style={{
          left: `${130 + 100 + index * 130}px`,
          background: "linear-gradient(to bottom, #F8FAFC, #F3F4F6)",
          color: COLORS.text.primary,
          letterSpacing: "-0.01em",
          borderBottom: `2px solid ${COLORS.border.dark}`,
        }}
      >
        <div className="flex flex-col">
          <span>{column}</span>
          {thresholdValue && (
            <span className="text-xs font-normal mt-0.5" style={{ color: COLORS.text.secondary }}>
              {thresholdValue}
            </span>
          )}
        </div>
      </th>
    )
  }

  return (
    <div
      id="age-report-table"
      className="w-full rounded-xl overflow-hidden border border-slate-300 shadow-lg bg-white flex flex-col"
      style={{
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div
        className={`relative overflow-x-auto ${getTableHeight()} scrollbar-thin`}
        onScroll={isFullScreen ? handleScroll : undefined}
      >
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 min-w-[130px] w-[150px] z-20 px-3 py-3 text-left text-base font-medium border-r border-b border-slate-200 shadow-sm"
                style={{
                  background: COLORS.background.headerGradient,
                  color: COLORS.text.primary,
                  letterSpacing: "-0.01em",
                  borderBottom: `2px solid ${COLORS.border.dark}`,
                }}
              >
                {primaryColumn}
              </th>
              <th
                className="sticky left-[130px] top-0 min-w-[100px] w-[150px] z-20 px-3 py-3 text-left text-base font-medium border-r border-b border-slate-200 shadow-sm"
                style={{
                  background: COLORS.background.headerGradient,
                  color: COLORS.text.primary,
                  letterSpacing: "-0.01em",
                  borderBottom: `2px solid ${COLORS.border.dark}`,
                }}
              >
                Metric
              </th>
              {secondaryColumns?.map((column, index) => renderColumnHeader(column, index))}
              {months.map((month) => (
                <th
                  key={month}
                  className="sticky top-0 min-w-[100px] z-10 px-3 py-3 text-right text-base font-medium whitespace-nowrap border-r border-b border-slate-200 shadow-sm"
                  style={{
                    background: "linear-gradient(to bottom, #F8FAFC, #F3F4F6)",
                    color: COLORS.text.primary,
                    letterSpacing: "-0.01em",
                    borderBottom: `2px solid ${COLORS.border.dark}`,
                  }}
                >
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {displayRows.length > 0 ? (
              displayRows.map(({ dataIndex, metricIndex }) => {
                console.log(`Rendering row at index: dataIndex=${dataIndex}, metricIndex=${metricIndex}`)
                if (dataIndex < data.length && metricIndex < monthlyMetrics.length) {
                  return renderMetricRow(data[dataIndex], metricIndex)
                }
                console.warn(`Skipping invalid row: dataIndex=${dataIndex}, metricIndex=${metricIndex}`)
                return null
              })
            ) : (
              <tr>
                <td
                  colSpan={2 + (secondaryColumns?.length || 0) + months.length}
                  className="p-4 text-center text-gray-500"
                >
                  No data to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isFullScreen && (
        <div
          className="border-t border-slate-200 px-3 py-2.5 flex items-center justify-between"
          style={{ background: "linear-gradient(to bottom, white, #F4F4F4)" }}
        >
          <div className="text-sm font-medium" style={{ color: COLORS.text.secondary }}>
            Showing {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, totalRows)} of{" "}
            {totalRows} rows
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              style={{
                borderColor: COLORS.border.main,
                color: COLORS.primary.main,
                background: "white",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                borderRadius: "6px",
                transition: "all 0.15s ease",
              }}
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              style={{
                borderColor: COLORS.border.main,
                color: COLORS.primary.main,
                background: "white",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                borderRadius: "6px",
                transition: "all 0.15s ease",
              }}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div
              className="flex items-center justify-center text-sm font-medium px-2"
              style={{ color: COLORS.text.primary }}
            >
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              style={{
                borderColor: COLORS.border.main,
                color: COLORS.primary.main,
                background: "white",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                borderRadius: "6px",
                transition: "all 0.15s ease",
              }}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              style={{
                borderColor: COLORS.border.main,
                color: COLORS.primary.main,
                background: "white",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                borderRadius: "6px",
                transition: "all 0.15s ease",
              }}
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}