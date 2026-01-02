import React from "react"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useMemo, useState, useEffect, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface MonthlyData {
  Month: string
  [key: string]: number | string
}

export interface RowData {
  [key: string]: number | string | MonthlyData[]
}

interface SimpleConversionTableProps {
  data: RowData[]
  primaryColumn: string
  secondaryColumns?: string[]
  monthlyDataKey: string
  isFullScreen: boolean
  locale: string
  filter?: string[]
}

// Column definition interface for resizing
interface ColumnDef {
  key: string
  header: string
  width: number
  minWidth?: number
  maxWidth?: number
  align?: "left" | "right" | "center"
}

// Drag state interface
type DragState = {
  index: number
  startX: number
  startWidth: number
}

// Utility function to clamp values
function clamp(n: number, min: number, max?: number) {
  if (max != null) return Math.min(Math.max(n, min), max)
  return Math.max(n, min)
}

export default function NewConversionTable({
  data,
  primaryColumn,
  secondaryColumns,
  monthlyDataKey,
  isFullScreen,
  locale,
  filter,
}: SimpleConversionTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  // Column resizing state
  const [widths, setWidths] = useState<number[]>([])
  const dragRef = useRef<DragState | null>(null)
  const [resizingIndex, setResizingIndex] = useState<number | null>(null)

  // Get months helper function - moved before it's used
  const getMonths = () => {
    if (!Array.isArray(data)) {
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

    // Sort months in reverse chronological order (newest first)
    return Array.from(allMonths).sort((a, b) => {
      const [monthA, yearA] = a.split('-')
      const [monthB, yearB] = b.split('-')

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const monthIndexA = months.indexOf(monthA)
      const monthIndexB = months.indexOf(monthB)

      // First compare years
      if (yearA !== yearB) {
        return parseInt(yearB) - parseInt(yearA) // Reverse order (newest year first)
      }

      return monthIndexB - monthIndexA // Reverse order (newest month first)
    })
  }

  // Define columns with their widths and constraints
  const columns = useMemo((): ColumnDef[] => {
    const cols: ColumnDef[] = [
      { key: primaryColumn, header: primaryColumn, width: 130, minWidth: 100, maxWidth: 300, align: "left" }
    ]

    if (secondaryColumns) {
      secondaryColumns.forEach((col) => {
        cols.push({
          key: col,
          header: col,
          width: 130,
          minWidth: 100,
          maxWidth: 200,
          align: "right"
        })
      })
    }

    // Add monthly columns
    const months = getMonths()
    months.forEach((month) => {
      cols.push({
        key: month,
        header: month,
        width: 120,
        minWidth: 100,
        maxWidth: 150,
        align: "right"
      })
    })

    return cols
  }, [primaryColumn, secondaryColumns, monthlyDataKey, data])

  // Update widths when columns change
  useEffect(() => {
    setWidths(columns.map((c) => c.width))
  }, [columns])

  // Ensure widths array matches columns array length
  const safeWidths = useMemo(() => {
    return columns.map((col, index) => widths[index] || col.width)
  }, [columns, widths])

  // Column resize event handlers
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const delta = e.clientX - drag.startX
      const def = columns[drag.index]
      setWidths((prev) => {
        const next = [...prev]
        next[drag.index] = clamp(
          drag.startWidth + delta,
          def.minWidth ?? 80,
          def.maxWidth
        )
        return next
      })
    }

    const onUp = () => {
      dragRef.current = null
      setResizingIndex(null)
      document.body.style.cursor = ""
      document.body.classList.remove("select-none")
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [columns])

  const startDrag = (e: React.PointerEvent, index: number) => {
    dragRef.current = { index, startX: e.clientX, startWidth: widths[index] }
    setResizingIndex(index)
    document.body.style.cursor = "col-resize"
    document.body.classList.add("select-none")
      ; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const filteredData = useMemo(() => {
    // If no filter is applied (undefined), show all data
    if (filter === undefined) {
      return data
    }

    // If filter is applied but empty array, show no results
    if (filter.length === 0) {
      return []
    }

    // If filter has items, apply the filter
    return data.filter((row) => {
      const primaryValue = String(row[primaryColumn])
      return filter.includes(primaryValue)
    })
  }, [data, filter, primaryColumn])

  const months = useMemo(() => {
    return getMonths()
  }, [data, monthlyDataKey])

  const thresholds = useMemo(() => {
    let totalSessions = 0,
      totalConvRate = 0,
      totalMonths = 0,
      totalCostG = 0,
      totalConvValueCostG = 0

    data.forEach((row) => {
      const monthlyData = row[monthlyDataKey] as MonthlyData[] | undefined

      if (Array.isArray(monthlyData)) {
        monthlyData.forEach((month) => {
          if (typeof month["Sessions"] === "number" && typeof month["Conv. Rate"] === "number") {
            totalSessions += Number(month["Sessions"])
            totalConvRate += Number(month["Conv. Rate"])
            totalMonths++
          }

          if (typeof month["Cost"] === "number" && typeof month["Conv. Value/ Cost"] === "number") {
            totalCostG += Number(month["Cost"])
            totalConvValueCostG += Number(month["Conv. Value/ Cost"])
            totalMonths++
          }
        })
      }
    })

    return {
      avgSessions: totalMonths > 0 ? totalSessions / totalMonths : 0,
      avgConvRate: totalMonths > 0 ? totalConvRate / totalMonths : 0,
      totalCostG: totalMonths > 0 ? totalCostG / totalMonths : 0,
      totalConvValueCostG: totalMonths > 0 ? totalConvValueCostG / totalMonths : 0,
    }
  }, [data, monthlyDataKey])

  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  // Reset to page 1 when rows per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [rowsPerPage])

  const handleRowsPerPageChange = (value: string) => {
    const newRowsPerPage = value === "all" ? filteredData.length : parseInt(value)
    setRowsPerPage(newRowsPerPage)
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
        // return Number.parseFloat(value.toLocaleString(locale)).toFixed(2)
          return value.toLocaleString(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
      }
    }
    return value
  }

  const renderMonthCell = (monthData: MonthlyData | undefined) => {
    if (!monthData) {
      return (
        <td className="text-right whitespace-nowrap p-3 text-sm border-r border-b border-gray-200 bg-transparent">
          <div className="truncate">—</div>
          <div className="truncate">—</div>
        </td>
      )
    }

    const sessions = monthData["Sessions"]
    const convRate = monthData["Conv. Rate"]
    const purchases = monthData["Purchases"]
    const cost = monthData["Cost"]
    const clicks = monthData["Clicks"]
    const ConvValueCost = monthData["Conv. Value/ Cost"]

    return (
      <td className="text-right whitespace-nowrap p-3 text-sm border-r border-b border-gray-200 bg-transparent">
        <div className="space-y-1">
          <div className="font-medium truncate">{renderCell(sessions, "sessions")}</div>
          {cost !== undefined && <div className="text-xs truncate">{Math.round(+(cost))}</div>}
          {clicks !== undefined && <div className="text-xs truncate">Clicks: {clicks}</div>}
          {ConvValueCost !== undefined && <div className="text-xs truncate">Conv.rate: {ConvValueCost.toLocaleString(locale)}</div>}
          {ConvValueCost !== undefined && <div className="text-xs truncate"> {renderCell(convRate, "percentage")}</div>}
          <div className="text-xs truncate">{renderCell(convRate, "percentage")}</div>
          {purchases !== undefined && <div className="text-xs truncate">Purchases: {purchases.toLocaleString(locale)}</div>}
        </div>
      </td>
    )
  }

  const renderSummaryCell = (row: RowData, column: string, columnIndex: number) => {
    console.log(
      "column====> =", column,
      row[column],
    )
    const value = row[column]
    // Calculate dynamic left position based on actual column widths
    const getLeftPosition = (index: number) => {
      if (index === 0) return 0
      if (index === 1) return safeWidths[0]
      if (index === 2) return safeWidths[0] + safeWidths[1]
      return 0
    }

    if (typeof value !== "number") {
      return (
        <td
          className={`p-3 text-sm border-r border-b border-gray-200 ${columnIndex < 3 ? "sticky z-10 bg-white group-hover:bg-blue-50" : "bg-transparent"
            }`}
          style={columnIndex < 3 ? { left: `${getLeftPosition(columnIndex)}px` } : {}}
        >
          {""}
        </td>
      )
    }

    const totalPurchases =
      typeof row["Total Purchases"] === "number" ? row["Total Purchases"].toLocaleString(locale) : null
    const conversionValue = typeof row["Total Conv. Value"] === "number" ? row["Total Conv. Value"].toLocaleString(locale) : null

    if (column.includes("Sessions")) {
      return (
        <td
          className={`p-3 text-sm border-r border-b border-gray-200 ${columnIndex < 3 ? "sticky z-10 bg-white group-hover:bg-blue-50" : "bg-transparent"
            } ${columnIndex === 2 ? "shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]" : ""}`}
          style={columnIndex < 3 ? { left: `${getLeftPosition(columnIndex)}px` } : {}}
        >
          <div className="text-right">
            <div className="font-medium truncate">{renderCell(value, "sessions")}</div>
          </div>
        </td>
      )
    }

    if (column.includes("Rate") || column.includes("Value")) {
      return (
        <td
          className={`p-3 text-sm border-r border-b border-gray-200 ${columnIndex < 3 ? "sticky z-10 bg-white group-hover:bg-blue-50" : "bg-transparent"
            } ${columnIndex === 2 ? "shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]" : ""}`}
          style={columnIndex < 3 ? { left: `${getLeftPosition(columnIndex)}px` } : {}}
        >
          <div className="text-right">
            <div className="font-medium truncate">{renderCell(value, "percentage")}</div>
            {totalPurchases && <div className="text-xs mt-1 truncate">Total Purchases: {totalPurchases}</div>}
            {conversionValue && <div className="text-xs mt-1 truncate">Total Conv Value: {conversionValue}</div>}
          </div>
        </td>
      )
    }

    return (
      <td
        className={`p-3 text-sm border-r border-b border-gray-200 ${columnIndex < 3 ? "sticky z-10 bg-white group-hover:bg-blue-50" : "bg-transparent"
          } ${columnIndex === 2 ? "shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]" : ""}`}
        style={columnIndex < 3 ? { left: `${getLeftPosition(columnIndex)}px` } : {}}
      >
        <div className="text-right font-medium truncate">{renderCell(value)}</div>
      </td>
    )
  }

  const renderDataRow = (row: RowData, index: number) => {
    return (
      <tr key={`${row[primaryColumn]}-${index}`} className="hover:bg-blue-50 transition-colors duration-150 group">
        <td className="sticky left-0 min-w-[130px] max-w-[200px] p-3 text-sm font-medium z-10 bg-white group-hover:bg-blue-50 border-r border-b border-gray-200">
          <div className="truncate">
            {typeof row[primaryColumn] === "string" || typeof row[primaryColumn] === "number"
              ? renderCell(row[primaryColumn])
              : ""}
          </div>
        </td>
        {secondaryColumns?.map((column, columnIndex) => {
          // Add 1 to account for the primary column
          const absoluteIndex = columnIndex + 1
          return <React.Fragment key={column}>{renderSummaryCell(row, column, absoluteIndex)}</React.Fragment>
        })}
        {months.map((month) => {
          const getMonthNumber = (monthName: string): number => {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            return months.indexOf(monthName) + 1
          }
          const [monthName, year] = month.split("-")
          const monthNum = getMonthNumber(monthName)
          const monthFormat = `${year}${monthNum.toString().padStart(2, "0")}`

          const monthData = (row[monthlyDataKey] as MonthlyData[]).find((m) => m.Month === monthFormat)
          return <React.Fragment key={month}>{renderMonthCell(monthData)}</React.Fragment>
        })}
      </tr>
    )
  }

  const displayData = useMemo(() => {
    if (isFullScreen) {
      return filteredData
    }
    return filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  }, [isFullScreen, filteredData, currentPage, rowsPerPage])

  const totalRows = filteredData.length
  const totalPages = Math.ceil(totalRows / rowsPerPage)
  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }

  const renderColumnHeader = (column: string, columnIndex: number) => {
    let thresholdValue = ""
    if (column === "Total Sessions") {
      thresholdValue = `(avg: ${Math.round(thresholds.avgSessions).toLocaleString()})`
    } else if (column === "Avg Conv. Rate") {
      thresholdValue = `(avg: ${thresholds.avgConvRate.toFixed(2)}%)`
    } else if (column === "Total Cost") {
      thresholdValue = `(avg: ${Math.round(thresholds.totalCostG).toLocaleString()})`
    } else if (column === "Conv. Value / Cost") {
      thresholdValue = `(avg: ${thresholds.totalConvValueCostG.toFixed(2)})`
    }

    const isFirst = columnIndex < 3
    const active = resizingIndex === columnIndex

    // Calculate dynamic left position based on actual column widths
    const getLeftPosition = (index: number) => {
      if (index === 0) return 0
      if (index === 1) return safeWidths[0]
      if (index === 2) return safeWidths[0] + safeWidths[1]
      return 0
    }

    return (
      <th
        key={column}
        className={`sticky top-0 z-10 px-3 py-3 text-right text-sm font-medium bg-gray-100 border-r border-b border-gray-200 ${isFirst ? `z-20 ${columnIndex === 2 ? "shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]" : ""}` : ""
          } ${active ? "border-blue-500" : ""}`}
        style={isFirst ? { left: `${getLeftPosition(columnIndex)}px` } : {}}
      >
        <div className="flex flex-col">
          <span className="truncate">{column}</span>
          {thresholdValue && <span className="text-xs font-normal mt-0.5 truncate">{thresholdValue}</span>}
        </div>

        {/* Resize handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${column} column`}
          onPointerDown={(e) => startDrag(e, columnIndex)}
          className={`absolute inset-y-0 right-0 w-3 cursor-col-resize ${active
            ? "bg-blue-500/15"
            : "hover:bg-gray-200/30 active:bg-gray-200/50"
            }`}
        >
          <div
            className={`absolute right-0 top-0 h-full w-px ${active ? "bg-blue-500" : "bg-gray-200"
              }`}
          />
        </div>
      </th>
    )
  }

  return (
    <div className="w-full overflow-hidden flex flex-col">
      <div className={`relative overflow-x-auto ${isFullScreen ? 'max-h-[calc(100vh-80px)]' : ''
        } max-h-[100vh]`}>
        <table className="w-full table-fixed border border-gray-200">
          <colgroup>
            {safeWidths.map((w, i) => (
              <col key={String(columns[i]?.key || `col-${i}`)} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 min-w-[130px] z-30 px-3 py-3 text-left text-sm font-medium bg-gray-100 border-r border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="truncate">{primaryColumn}</span>
                  {filter && filter.length > 0 && <span className="text-xs px-2 py-1 rounded">Filtered</span>}
                </div>

                {/* Resize handle for primary column */}
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${primaryColumn} column`}
                  onPointerDown={(e) => startDrag(e, 0)}
                  className={`absolute inset-y-0 right-0 w-3 cursor-col-resize ${resizingIndex === 0
                    ? "bg-blue-500/15"
                    : "hover:bg-gray-200/30 active:bg-gray-200/50"
                    }`}
                >
                  <div
                    className={`absolute right-0 top-0 h-full w-px ${resizingIndex === 0 ? "bg-blue-500" : "bg-gray-200"
                      }`}
                  />
                </div>
              </th>
              {secondaryColumns?.map((column, columnIndex) => {
                // Add 1 to account for the primary column
                const absoluteIndex = columnIndex + 1
                return renderColumnHeader(column, absoluteIndex)
              })}
              {months.map((month, monthIndex) => {
                // Add 1 for primary column + secondary columns length
                const columnIndex = 1 + (secondaryColumns?.length || 0) + monthIndex
                const active = resizingIndex === columnIndex

                return (
                  <th
                    key={month}
                    className={`sticky top-0 min-w-[120px] z-10 px-3 py-3 text-right text-sm font-medium whitespace-nowrap bg-gray-100 border-r border-b border-gray-200 ${active ? "border-blue-500" : ""
                      }`}
                  >
                    <div className="truncate">{month}</div>
                    <div className="text-xs mt-1 truncate">Sessions / Conv Rate</div>

                    {/* Resize handle for monthly columns */}
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${month} column`}
                      onPointerDown={(e) => startDrag(e, columnIndex)}
                      className={`absolute inset-y-0 right-0 w-3 cursor-col-resize ${active
                        ? "bg-blue-500/15"
                        : "hover:bg-gray-200/30 active:bg-gray-200/50"
                        }`}
                    >
                      <div
                        className={`absolute right-0 top-0 h-full w-px ${active ? "bg-blue-500" : "bg-gray-200"
                          }`}
                      />
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displayData.length > 0 ? (
              displayData.map((row, index) => renderDataRow(row, index))
            ) : (
              <tr>
                <td
                  colSpan={1 + (secondaryColumns?.length || 0) + months.length}
                  className="p-4 text-center border-b border-gray-200"
                >
                  {filter !== undefined && filteredData.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-lg font-medium text-gray-700">Oops! No data available for this category</span>

                    </div>
                  ) : (
                    "No data to display"
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isFullScreen && (
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              {totalRows > 0 ? (
                <>
                  Showing {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, totalRows)} of{" "}
                  {totalRows} rows
                  {filter !== undefined ? (
                    <span className="ml-2 text-xs">(Filtered from {data.length} total rows)</span>
                  ) : null}
                </>
              ) : (
                <>
                  No rows to display
                  {filter !== undefined ? (
                    <span className="ml-2 text-xs">
                      (Filter: {filter?.join(", ") || "Unknown"}) | Total rows: {data.length}
                    </span>
                  ) : null}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <Select value={rowsPerPage === filteredData.length ? "all" : rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex bg-transparent"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 bg-transparent"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-center text-sm font-medium px-2">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 bg-transparent"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex bg-transparent"
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
