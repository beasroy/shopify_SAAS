import React from "react"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
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
    if (!Array.isArray(filteredData)) {
      console.error("Data is not an array:", filteredData)
      return []
    }

    const getMonthName = (monthNumber: string): string => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return months[Number.parseInt(monthNumber) - 1]
    }

    const allMonths = new Set<string>()
    filteredData.forEach((row) => {
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
  }, [filteredData, monthlyDataKey])

  const thresholds = useMemo(() => {
    let totalSessions = 0,
      totalConvRate = 0,
      totalMonths = 0

    data.forEach((row) => {
      const monthlyData = row[monthlyDataKey] as MonthlyData[] | undefined

      if (Array.isArray(monthlyData)) {
        monthlyData.forEach((month) => {
          if (typeof month["Sessions"] === "number" && typeof month["Conv. Rate"] === "number") {
            totalSessions += Number(month["Sessions"])
            totalConvRate += Number(month["Conv. Rate"])
            totalMonths++
          }
        })
      }
    })

    return {
      avgSessions: totalMonths > 0 ? totalSessions / totalMonths : 0,
      avgConvRate: totalMonths > 0 ? totalConvRate / totalMonths : 0,
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
          return Number.parseFloat(value.toLocaleString(locale)).toFixed(2)
      }
    }
    return value
  }

  const renderMonthCell = (monthData: MonthlyData | undefined) => {
    if (!monthData) {
      return (
        <td className="w-[120px] text-right whitespace-nowrap p-3 text-sm border-r border-b border-gray-200">
          <div>—</div>
          <div>—</div>
        </td>
      )
    }

    const sessions = monthData["Sessions"]
    const convRate = monthData["Conv. Rate"]
    const purchases = monthData["Purchases"]

    return (
      <td className="w-[120px] text-right whitespace-nowrap p-3 text-sm border-r border-b border-gray-200">
        <div className="space-y-1">
          <div className="font-medium">{renderCell(sessions, "sessions")}</div>
          <div>{renderCell(convRate, "percentage")}</div>
          {purchases !== undefined && <div className="text-xs">Purchases: {purchases.toLocaleString(locale)}</div>}
        </div>
      </td>
    )
  }

  const renderSummaryCell = (row: RowData, column: string, columnIndex: number) => {
    const value = row[column]

    if (typeof value !== "number") {
      return (
        <td
          className={`min-w-[130px] p-3 text-sm border-r border-b border-gray-200 bg-white ${
            columnIndex < 2 ? `sticky z-10 ${columnIndex === 0 ? "left-[130px]" : "left-[260px] "}` : ""
          }`}
        >
          {""}
        </td>
      )
    }

    const totalPurchases =
      typeof row["Total Purchases"] === "number" ? row["Total Purchases"].toLocaleString(locale) : null

    if (column.includes("Sessions")) {
      return (
        <td
          className={`min-w-[130px] p-3 text-sm border-r border-b border-gray-200 bg-white ${
            columnIndex < 2 ? `sticky z-10 ${columnIndex === 0 ? "left-[130px]" : "left-[260px]"}` : ""
          } ${columnIndex === 1 ? "shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]" : ""}`}
        >
          <div className="text-right">
            <div className="font-medium">{renderCell(value, "sessions")}</div>
          </div>
        </td>
      )
    }

    if (column.includes("Rate")) {
      return (
        <td
          className={`min-w-[130px] p-3 text-sm border-r border-b border-gray-200 bg-white ${
            columnIndex < 2 ? `sticky z-10 ${columnIndex === 0 ? "left-[130px]" : "left-[260px]"}` : ""
          } ${columnIndex === 1 ? "shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]" : ""}`}
        >
          <div className="text-right">
            <div className="font-medium">{renderCell(value, "percentage")}</div>
            {totalPurchases && <div className="text-xs mt-1">Total Purchases: {totalPurchases}</div>}
          </div>
        </td>
      )
    }

    return (
              <td
          className={`min-w-[130px] p-3 text-sm border-r border-b border-gray-200 bg-white ${
            columnIndex < 2 ? `sticky z-10 ${columnIndex === 0 ? "left-[130px]" : "left-[260px]"}` : ""
          } ${columnIndex === 1 ? "shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]" : ""}`}
        >
          <div className="text-right font-medium">{renderCell(value)}</div>
        </td>
    )
  }

  const renderDataRow = (row: RowData, index: number) => {
    return (
      <tr key={`${row[primaryColumn]}-${index}`}>
        <td className="sticky left-0 min-w-[130px] max-w-[200px] p-3 text-sm font-medium z-10 bg-white border-r border-b border-gray-200 ">
          {typeof row[primaryColumn] === "string" || typeof row[primaryColumn] === "number"
            ? renderCell(row[primaryColumn])
            : ""}
        </td>
        {secondaryColumns?.map((column, columnIndex) => (
          <React.Fragment key={column}>{renderSummaryCell(row, column, columnIndex)}</React.Fragment>
        ))}
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
    }

    return (
      <th
        key={column}
        className={`sticky top-0 min-w-[130px] z-10 px-3 py-3 text-right text-sm font-medium bg-gray-100 border-r border-b border-gray-200 ${
          columnIndex < 2 ? `${columnIndex === 0 ? "left-[130px] z-20" : "left-[260px] z-20 shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]"}` : ""
        }`}
      >
        <div className="flex flex-col">
          <span>{column}</span>
          {thresholdValue && <span className="text-xs font-normal mt-0.5">{thresholdValue}</span>}
        </div>
      </th>
    )
  }

  return (
    <div className="w-full overflow-hidden flex flex-col">
      <div className={`relative overflow-x-auto ${
        isFullScreen ? 'max-h-[calc(100vh-80px)]' : ''
      } max-h-[100vh]`}>
        <table className="w-full table-auto border border-gray-200">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 min-w-[130px] z-30 px-3 py-3 text-left text-sm font-medium bg-gray-100 border-r border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span>{primaryColumn}</span>
                  {filter && filter.length > 0 && <span className="text-xs px-2 py-1 rounded">Filtered</span>}
                </div>
              </th>
              {secondaryColumns?.map((column, columnIndex) => renderColumnHeader(column, columnIndex))}
              {months.map((month) => (
                <th
                  key={month}
                  className="sticky top-0 min-w-[120px] z-10 px-3 py-3 text-right text-sm font-medium whitespace-nowrap bg-gray-100 border-r border-b border-gray-200"
                >
                  <div>{month}</div>
                  <div className="text-xs mt-1">Sessions / Conv Rate</div>
                </th>
              ))}
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
