
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ShopifyLogo, Ga4Logo } from "@/data/logo"

export type FunnelRow = {
  id: string
  day?: string
  month?: string
  date?: string
  sessions: number
  addToCart: number
  addToCartRate: string
  checkouts: number
  checkoutRate: string
  purchases: number
  purchaseRate: string
  aov?: number
  averageItemsPerOrder?: number
  codOrderCount?: number
  prepaidOrderCount?: number
}

type ColumnDef<T extends keyof FunnelRow = keyof FunnelRow> = {
  key: T
  header: string
  width: number
  minWidth?: number
  maxWidth?: number
  align?: "left" | "right" | "center"
}

const allColumns: ColumnDef[] = [
  { key: "day", header: "Day", width: 140, minWidth: 120 },
  { key: "month", header: "Month", width: 140, minWidth: 120 },
  { key: "date", header: "Date", width: 140, minWidth: 120 },
  { key: "sessions", header: "Sessions", width: 120, minWidth: 110, align: "right" },
  { key: "addToCart", header: "Add To Cart", width: 140, minWidth: 120, align: "right" },
  { key: "addToCartRate", header: "Add To Cart Rate", width: 160, minWidth: 140, align: "right" },
  { key: "checkouts", header: "Checkouts", width: 130, minWidth: 110, align: "right" },
  { key: "checkoutRate", header: "Checkout Rate", width: 150, minWidth: 130, align: "right" },
  { key: "purchases", header: "Purchases", width: 130, minWidth: 110, align: "right" },
  { key: "purchaseRate", header: "Purchase Rate", width: 150, minWidth: 130, align: "right" },
  { key: "aov", header: "AOV", width: 120, minWidth: 110, align: "right" },
  { key: "averageItemsPerOrder", header: "Avg Items/Order", width: 150, minWidth: 130, align: "right" },
  { key: "codOrderCount", header: "COD Orders", width: 130, minWidth: 110, align: "right" },
  { key: "prepaidOrderCount", header: "Prepaid Orders", width: 150, minWidth: 130, align: "right" },
]

function clamp(n: number, min: number, max?: number) {
  if (max != null) return Math.min(Math.max(n, min), max)
  return Math.max(n, min)
}

// Helper function to get logo for a column
function getColumnLogo(key: keyof FunnelRow): React.ReactNode | null {
  // Shopify logo for AOV, Avg Items/Order, COD Orders, and Prepaid Orders
  if (key === 'aov' || key === 'averageItemsPerOrder' || key === 'codOrderCount' || key === 'prepaidOrderCount') {
    return <ShopifyLogo width="1rem" height="1rem" />
  }
  
  // Analytics logo for other columns except month/day/date
  if (key !== 'month' && key !== 'day' && key !== 'date') {
    return <Ga4Logo width="1rem" height="1rem" />
  }
  
  // No logo for month/day/date columns
  return null
}

type DragState = {
  index: number
  startX: number
  startWidth: number
}

export default function ReportTable({
  rows,
  initialPageSize = "50",
  visibleColumns,
  columnOrder,
}: {
  rows: FunnelRow[]
  initialPageSize?: "50" | "100" | "200" | "all"
  visibleColumns?: string[]
  columnOrder?: string[]
}) {

  // Use column management props if provided, otherwise use all columns
  const columns = React.useMemo(() => {
    if (!visibleColumns || !columnOrder) {
      console.log('No column management props, using all columns');
      return allColumns;
    }
    
    console.log('Column management props:', { visibleColumns, columnOrder });
    
    // Create a mapping from display names to column keys
    const columnNameToKey: Record<string, keyof FunnelRow> = {
      'Day': 'day',
      'Month': 'month',
      'Date': 'date',
      'Sessions': 'sessions',
      'Add To Cart': 'addToCart',
      'Add To Cart Rate': 'addToCartRate',
      'Checkouts': 'checkouts',
      'Checkout Rate': 'checkoutRate',
      'Purchases': 'purchases',
      'Purchase Rate': 'purchaseRate',
      'AOV': 'aov',
      'Avg Items/Order': 'averageItemsPerOrder',
      'COD Orders': 'codOrderCount',
      'Prepaid Orders': 'prepaidOrderCount'
    };
    
    // Filter and reorder columns based on column management
    const filteredColumns = columnOrder
      .filter((col: string) => visibleColumns.includes(col))
      .map((col: string) => {
        const columnKey = columnNameToKey[col];
        const foundColumn = allColumns.find((c: ColumnDef) => c.key === columnKey);
        console.log(`Mapping column "${col}" to key "${columnKey}", found:`, foundColumn);
        return foundColumn;
      })
      .filter((col): col is ColumnDef => col !== undefined);

  
  // If no valid columns found, return all columns as fallback
  const finalColumns = filteredColumns.length > 0 ? filteredColumns : allColumns;
  
  // Ensure we always have valid columns
  if (finalColumns.some(col => !col || !col.key)) {
    console.error('Invalid columns detected, falling back to all columns:', finalColumns);
    return allColumns;
  }
  
  return finalColumns;
}, [visibleColumns, columnOrder]);

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

  // Calculate widths to fill container width - recalculate on resize
  React.useEffect(() => {
    if (columns.length === 0 || containerWidth === 0) return
    
    const currentColumnsKey = columns.map(c => c.key).join(',')
    
    // If columns changed, reset to allow recalculation
    if (currentColumnsKey !== columnsKeyRef.current) {
      columnsKeyRef.current = currentColumnsKey
      hasInitializedRef.current = false
    }
    
    // Always recalculate when container width changes (including resize)
    const defaultWidths = columns.map((c) => c.width)
    const minWidths = columns.map((c) => c.minWidth || 80)
    const totalDefaultWidth = defaultWidths.reduce((sum, w) => sum + w, 0)
    const totalMinWidth = minWidths.reduce((sum, w) => sum + w, 0)
    
    // Distribute columns proportionally to fill container width
    if (totalDefaultWidth > 0) {
      // If minimum widths exceed container, scale them down
      if (totalMinWidth > containerWidth) {
        const scaleFactor = containerWidth / totalMinWidth
        const scaledWidths = minWidths.map((w) => w * scaleFactor)
        setWidths(scaledWidths)
      } else {
        // Scale default widths to fill container width
        const scaleFactor = containerWidth / totalDefaultWidth
        let scaledWidths = defaultWidths.map((w, index) => {
          const scaled = w * scaleFactor
          const minWidth = minWidths[index]
          return Math.max(scaled, minWidth)
        })
        
        // Adjust if total exceeds container due to minWidth constraints
        let totalScaled = scaledWidths.reduce((sum, w) => sum + w, 0)
        if (totalScaled > containerWidth) {
          // Redistribute excess from flexible columns
          const excess = totalScaled - containerWidth
          const flexibleIndices: number[] = []
          let flexibleTotal = 0
          
          for (let i = 0; i < scaledWidths.length; i++) {
            const w = scaledWidths[i]
            if (w > minWidths[i]) {
              flexibleIndices.push(i)
              flexibleTotal += w
            }
          }
          
          if (flexibleTotal > 0 && flexibleIndices.length > 0) {
            scaledWidths = scaledWidths.map((w, i) => {
              if (flexibleIndices.includes(i)) {
                return w - (excess * (w / flexibleTotal))
              }
              return w
            })
          }
        } else if (totalScaled < containerWidth) {
          // If total is less than container, distribute the remaining space
          const remaining = containerWidth - totalScaled
          const flexibleIndices: number[] = []
          let flexibleTotal = 0
          
          for (let i = 0; i < scaledWidths.length; i++) {
            const w = scaledWidths[i]
            if (w > minWidths[i]) {
              flexibleIndices.push(i)
              flexibleTotal += w
            }
          }
          
          // If no flexible columns, add to all columns proportionally
          if (flexibleIndices.length === 0) {
            const perColumn = remaining / scaledWidths.length
            scaledWidths = scaledWidths.map(w => w + perColumn)
          } else if (flexibleTotal > 0) {
            // Distribute remaining to flexible columns proportionally
            scaledWidths = scaledWidths.map((w, i) => {
              if (flexibleIndices.includes(i)) {
                return w + (remaining * (w / flexibleTotal))
              }
              return w
            })
          }
        }
        
        // Final normalization to ensure exact sum equals containerWidth
        const finalTotal = scaledWidths.reduce((sum, w) => sum + w, 0)
        if (Math.abs(finalTotal - containerWidth) > 0.1) {
          const adjustment = (containerWidth - finalTotal) / scaledWidths.length
          scaledWidths = scaledWidths.map(w => w + adjustment)
        }
        
        setWidths(scaledWidths)
      }
    } else {
      setWidths(defaultWidths)
    }
    
    hasInitializedRef.current = true
  }, [columns, containerWidth])
  
  // Ensure widths array matches columns array length
  const safeWidths = React.useMemo(() => {
    return columns.map((col, index) => widths[index] || col.width);
  }, [columns, widths]);
  
  // Calculate total table width - should match container width after normalization
  const totalTableWidth = React.useMemo(() => {
    return safeWidths.reduce((sum, width) => sum + width, 0);
  }, [safeWidths]);
  
  const dragRef = React.useRef<DragState | null>(null)
  const [resizingIndex, setResizingIndex] = React.useState<number | null>(null)

  const [pageSize, setPageSize] = React.useState<"50" | "100" | "200" | "all">(
    initialPageSize
  )
  const [page, setPage] = React.useState(1)

  const totalRows = rows.length
  const perPage = pageSize === "all" ? totalRows : Number(pageSize)
  const totalPages = Math.max(1, Math.ceil((totalRows || 1) / (perPage || 1)))

  React.useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages))
  }, [totalPages])

  const start = pageSize === "all" ? 0 : (page - 1) * perPage
  const end = pageSize === "all" ? totalRows : Math.min(start + perPage, totalRows)
  const currentRows = rows.slice(start, end)

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const delta = e.clientX - drag.startX
      const def = columns[drag.index]
      // Functional update fixes the "columns revert" bug
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
  }, [])

  const startDrag = (e: React.PointerEvent, index: number) => {
    dragRef.current = { index, startX: e.clientX, startWidth: widths[index] }
    setResizingIndex(index)
    document.body.style.cursor = "col-resize"
    document.body.classList.add("select-none")
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const renderCell = (row: FunnelRow, key: keyof FunnelRow): React.ReactNode => {
    // Handle COD and Prepaid Order Count - show percentage instead of count
    if (key === 'codOrderCount' || key === 'prepaidOrderCount') {
      const codCount = row.codOrderCount ?? 0
      const prepaidCount = row.prepaidOrderCount ?? 0
      const total = codCount + prepaidCount
      
      // If both are undefined or total is 0, show "-" or "0%"
      if (row.codOrderCount === undefined && row.prepaidOrderCount === undefined) {
        return "-"
      }
      
      if (total === 0) {
        return "0%"
      }
      
      let percentage: number
      let count: number
      let label: string
      
      if (key === 'codOrderCount') {
        percentage = (codCount / total) * 100
        count = codCount
        label = 'COD Orders'
      } else {
        percentage = (prepaidCount / total) * 100
        count = prepaidCount
        label = 'Prepaid Orders'
      }
      
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">{percentage.toFixed(1)}%</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {label}: {count.toLocaleString()}
            </p>
          </TooltipContent>
        </Tooltip>
      )
    }
    
    // Handle other columns normally
    const v = row[key]
    if (v === undefined) return "-"
    if (typeof v === "number") return v.toLocaleString()
    return v as string
  }

  // Safety check - ensure we have valid columns
  if (!columns || columns.length === 0) {
    console.error('No valid columns available, rendering empty table');
    return <div>No columns available</div>;
  }

  return (
    <TooltipProvider>
      <div className="w-full space-y-2">
        <div className="w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div 
            ref={containerRef}
            className="overflow-x-auto overflow-y-auto" 
            style={{ height: '90vh', width: '100%' }}
          >
            <table 
              className="table-fixed border-collapse text-sm w-full" 
              style={{ 
                minWidth: `${totalTableWidth}px`
              }}
            >
              <colgroup>
                {safeWidths.map((w, i) => (
                  <col key={String(columns[i]?.key || `col-${i}`)} style={{ width: w }} />
                ))}
              </colgroup>

              <thead className="bg-gray-100 sticky top-0 z-50">
                <tr className="text-gray-600">
                  {columns.map((col, idx) => {
                    if (!col || !col.key) {
                      console.error('Invalid column at index', idx, col);
                      return null;
                    }
                    
                    const isFirst = idx === 0
                    const active = resizingIndex === idx
                    const columnLogo = getColumnLogo(col.key)
                    
                    return (
                      <th
                        key={String(col.key)}
                        scope="col"
                        className={cn(
                          "relative h-11 align-middle border-b border-l last:border-r",
                          active ? "border-blue-500" : "border-gray-200",
                          "px-3 text-left font-medium bg-gray-100",
                          col.align === "right" && "text-right",
                          isFirst &&
                            "sticky left-0 z-50 bg-gray-100 shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {columnLogo && (
                            <span className="flex-shrink-0">
                              {columnLogo}
                            </span>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate cursor-help">{col.header}</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>{col.header}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                      {/* Resize handle with blue active state */}
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${col.header} column`}
                        onPointerDown={(e) => startDrag(e, idx)}
                        className={cn(
                          "absolute inset-y-0 right-0 w-3 cursor-col-resize",
                          active
                            ? "bg-blue-500/15"
                            : "hover:bg-gray-200/30 active:bg-gray-200/50"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute right-0 top-0 h-full w-px",
                            active ? "bg-blue-500" : "bg-gray-200"
                          )}
                        />
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {currentRows.map((row, rIdx) => (
                <tr key={row.id} className={cn(rIdx % 2 === 1 && "bg-gray-50/60", "hover:bg-blue-50 transition-colors duration-150")}>
                  {columns.map((col, cIdx) => {
                    if (!col || !col.key) {
                      console.error('Invalid column at index', cIdx, col);
                      return null;
                    }
                    
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
                          "px-3 py-2 truncate tabular-nums",
                          "border-b border-l last:border-r",
                          "align-middle",
                          "border-gray-200",
                          alignClass,
                          isFirst &&
                            "sticky left-0 z-40 bg-transparent shadow-[4px_0_5px_0_rgba(0,0,0,0.09)]"
                        )}
                        title={
                          typeof (row as any)[col.key] === "string"
                            ? ((row as any)[col.key] as string)
                            : undefined
                        }
                      >
                        {renderCell(row, col.key)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer: rows per page + pagination - Inside scrollable area */}
          <div 
            className="flex flex-col items-start justify-between gap-3 border-t border-gray-200 bg-gray-50 p-3 text-sm md:flex-row md:items-center mt-4 w-full"
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Rows per page:</span>
              <Select
                value={pageSize}
                onValueChange={(v) => {
                  setPageSize(v as "50" | "100" | "200" | "all")
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" className="w-[140px]">
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="text-gray-600">
                {totalRows === 0 ? "0 of 0" : <>{start + 1}&ndash;{end} of {totalRows}</>}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || pageSize === "all"}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[4rem] text-center text-gray-700">
                  {pageSize === "all" ? "1 / 1" : `${page} / ${totalPages}`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || pageSize === "all"}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </TooltipProvider>
  )
}
