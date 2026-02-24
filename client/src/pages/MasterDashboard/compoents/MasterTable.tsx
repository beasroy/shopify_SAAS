import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'



export type MetricsRow = {
  // [key: string]: string | number | undefined
  // brandId: string;
  // brandName: string;
  // fbLiveSpend: number | string;
  // fbPurchases: number | string;
  // fbRevenue: number | string;
  // googleSpend: number | string;
  // metaSpend: number | string;
  // month?: number | string;
  // refundAmount: number | string;
  // totalSales: number | string;
  // totalSpend: number | string;
  // year?: number | string;

  brandId: string;
  brandName: string;

  totalSales: String | number;
  refundAmount: String | number;
  netSales: String | number;

  metaSpend: String | number;
  metaRevenue: String | number;
  googleSpend: String | number;
  totalSpend: String | number;

  metaROAS: String | number;
  overallROAS: String | number;

}

type ColumnDef = {
  key: keyof MetricsRow
  header: string
  width: number
  minWidth?: number
  align?: "left" | "right" | "center"
}

export default function MasterTable({
  brands,
  primaryColumn = "Brand Name",
  initialPageSize = "50",
}: {
  brands: MetricsRow[]
  primaryColumn?: "Brand Name" | "Brands"
  initialPageSize?: "25" | "50" | "100" | "200" | "all"
}) {
  const columns = React.useMemo(() => {
    const baseColumns: ColumnDef[] = [
      { key: "brandName", header: primaryColumn, width: 300, minWidth: 150, align: "left" },
      { key: "totalSales", header: "Total Sales", width: 140, minWidth: 130, align: "right" },
      { key: "refundAmount", header: "Refund Amount", width: 140, minWidth: 130, align: "right" },
      { key: "netSales", header: "Net Sales", width: 140, minWidth: 130, align: "right" },
      { key: "metaSpend", header: "Meta Spend", width: 140, minWidth: 130, align: "right" },
      { key: "metaRevenue", header: "Meta Revenue", width: 140, minWidth: 130, align: "right" },
      { key: "googleSpend", header: "Google Spend", width: 140, minWidth: 130, align: "right" },
      { key: "totalSpend", header: "Total Spend", width: 140, minWidth: 130, align: "right" },
      { key: "metaROAS", header: "Meta ROAS", width: 140, minWidth: 130, align: "right" },
      { key: "overallROAS", header: "Overall ROAS", width: 140, minWidth: 130, align: "right" },
    ]
    return baseColumns
  }, [primaryColumn])

  const [widths, setWidths] = React.useState<number[]>([])
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = React.useState<number>(0)
  const columnsKeyRef = React.useRef<string>('')
  const hasInitializedRef = React.useRef<boolean>(false)


  // Measure container width
  React.useEffect(() => {
    const measureContainer = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }

    measureContainer()
    window.addEventListener('resize', measureContainer)
    return () => window.removeEventListener('resize', measureContainer)
  }, [])

  // Calculate widths to fill container width
  React.useEffect(() => {
    if (columns.length === 0 || containerWidth === 0) return

    const currentColumnsKey = columns.map(c => c.key).join(',')

    if (currentColumnsKey !== columnsKeyRef.current) {
      columnsKeyRef.current = currentColumnsKey
      hasInitializedRef.current = false
    }

    const defaultWidths = columns.map((c) => c.width)
    const minWidths = columns.map((c) => c.minWidth || 80)
    const totalDefaultWidth = defaultWidths.reduce((sum, w) => sum + w, 0)
    const totalMinWidth = minWidths.reduce((sum, w) => sum + w, 0)

    if (totalDefaultWidth > 0) {
      if (totalMinWidth > containerWidth) {
        const scale = containerWidth / totalMinWidth
        setWidths(minWidths.map(w => w * scale))
      } else {
        const scale = containerWidth / totalDefaultWidth
        setWidths(defaultWidths.map(w => w * scale))
      }
      hasInitializedRef.current = true
    }
  }, [columns, containerWidth])

  const [rowsPerPage, setRowsPerPage] = React.useState<number>(
    initialPageSize === "all" ? brands.length : Number.parseInt(initialPageSize, 10)
  )
  const [currentPage, setCurrentPage] = React.useState(1)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [rowsPerPage])

  const totalPages = Math.ceil(brands.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = initialPageSize === "all" ? brands.length : startIndex + rowsPerPage
  const currentRows = brands.slice(startIndex, endIndex)

  const renderCell = (row: MetricsRow, key: keyof MetricsRow) => {
    const value = row[key]

    if (key === "brandName") {
      return (
        <span className="font-medium text-gray-900">
          {String(value)}
        </span>
      )
    }

    if (typeof value === "number") {
      if (key.includes("Rate")) {
        return `${value.toFixed(2)}%`
      }
      return value.toLocaleString('en-US')
    }

    return String(value ?? '')
  }


  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-100px)] flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-30">
            <tr>
              {columns.map((col, idx) => {
                const width = widths[idx] ?? col.width
                const isFirst = idx === 0
                const alignClass =
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                      ? "text-center"
                      : "text-left"

                return (
                  <th
                    key={String(col.key)}
                    style={{ width: `${width}px`, minWidth: `${width}px` }}
                    className={cn(
                      "px-3 py-3 text-xs font-semibold text-blue-900 uppercase tracking-wider",
                      "border-b border-l last:border-r border-gray-200",
                      alignClass,
                      isFirst && "sticky left-0 z-40 bg-gray-50 shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]"
                    )}
                  >
                    <div className="flex justify-center items-center text-center gap-2">
                      {/* <Ga4Logo width="1rem" height="1rem" /> */}
                      <span>{col.header}</span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="text-gray-700">
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              currentRows.map((row, rIdx) => (
                <tr key={rIdx} className={cn(rIdx % 2 === 1 && "bg-gray-50/60", "hover:bg-blue-50 transition-colors duration-150 group text-sm")}>
                  {columns.map((col, cIdx) => {
                    const isFirst = cIdx === 0
                    const alignClass =
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                    return (
                      <td
                        key={String(col.key)}
                        className={cn(
                          "px-3 py-2 tabular-nums",
                          "border-b border-l last:border-r",
                          "align-middle",
                          "border-gray-200",
                          alignClass,
                          isFirst &&
                          "sticky left-0 z-40 bg-white group-hover:bg-blue-50 shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]"
                        )}
                        title={
                          typeof row[col.key] === "string"
                            ? (row[col.key] as string)
                            : undefined
                        }
                      >
                        {renderCell(row, col.key)}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: rows per page + pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Rows per page:</span>
          <Select
            value={initialPageSize === "all" ? "all" : String(rowsPerPage)}
            onValueChange={(value) => {
              if (value === "all") {
                setRowsPerPage(brands.length)
              } else {
                setRowsPerPage(Number.parseInt(value, 10))
              }
            }}
          >
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            {startIndex + 1}-{Math.min(endIndex, brands.length)} of {brands.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
