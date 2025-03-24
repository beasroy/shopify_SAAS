import React, { useState, useRef} from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FacebookLogo } from "@/pages/AnalyticsDashboard/AdAccountsMetricsCard"
import {
  Maximize,
  Minimize,
  SlidersHorizontal,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import ColumnManagementSheet from "./ColumnManagementSheet"
import { Interest , InterestTableProps } from "@/interfaces"


const DEFAULT_COLUMN_WIDTH = "85px"




const InterestTable: React.FC<InterestTableProps> = ({ data, height }) => {

  const [draggedInterest, setDraggedInterest] = useState<string | null>(null)
  const [dragOverInterest, setDragOverInterest] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(["Interest", "Spend", "Revenue", "Roas"])
  const [columnOrder, setColumnOrder] = useState<string[]>(["Interest", "Spend", "Revenue", "Roas"])
  const [frozenColumns, setFrozenColumns] = useState<string[]>(["Interest"])


  const tableRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({})

  // Calculate left position for frozen columns
  const getLeftPosition = (columnIndex: number): number => {
    let position = 0

    // Get only the visible columns in the correct order
    const visibleOrderedColumns = columnOrder.filter((col) => visibleColumns.includes(col))

    for (let i = 0; i < columnIndex; i++) {
      const column = visibleOrderedColumns[i]
      if (frozenColumns.includes(column)) {
        const columnElement = columnRefs.current[column]
        if (columnElement) {
          position += columnElement.offsetWidth
        }
      }
    }

    return position
  }

  // Get column style based on column name
  const getColumnStyle = (column: string) => {
    if (column === "Interest") {
      return { width: "auto", minWidth: "200px" }
    }
    return {
      width: DEFAULT_COLUMN_WIDTH,
      minWidth: DEFAULT_COLUMN_WIDTH,
    }
  }

  // Campaign drag and drop handlers
  const handleDragStart = (interestId: string) => {
    setDraggedInterest(interestId)
  }

  const handleDragOver = (e: React.DragEvent, interestId: string) => {
    e.preventDefault()
    if (interestId !== draggedInterest) {
      setDragOverInterest(interestId)
    }
  }

  const handleDrop = (targetInterestId: string) => {
    if (!draggedInterest || draggedInterest === targetInterestId) return 

    // Reorder campaigns logic would go here
    // For now, just reset the state
    setDraggedInterest(null)
    setDragOverInterest(null)

    // Note: In a real implementation, you would dispatch an action to update the order in your Redux store
    console.log(`Dragged ${draggedInterest} and dropped on ${targetInterestId}`)
  }

  const handleDragEnd = () => {
    setDraggedInterest(null)
    setDragOverInterest(null)
  }

  // Column drag and drop handlers
  const handleColumnDragStart = (columnName: string) => {
    setDraggedColumn(columnName)
  }

  const handleColumnDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault()
    if (columnName !== draggedColumn) {
      setDragOverColumn(columnName)
    }
  }

  const handleColumnDrop = (targetColumnName: string) => {
    if (!draggedColumn || draggedColumn === targetColumnName) return

    // Reorder columns
    const draggedIndex = columnOrder.indexOf(draggedColumn)
    const targetIndex = columnOrder.indexOf(targetColumnName)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newColumnOrder = [...columnOrder]
      newColumnOrder.splice(draggedIndex, 1)
      newColumnOrder.splice(targetIndex, 0, draggedColumn)
      setColumnOrder(newColumnOrder)
    }

    setDraggedColumn(null)
    setDragOverColumn(null)
  }

  const handleColumnDragEnd = () => {
    setDraggedColumn(null)
    setDragOverColumn(null)
  }

  // Toggle full screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
  }

  const getTableHeight = () => {
    if (isFullScreen) {
      return "max-h-[calc(100vh-100px)]"
    }
    return height
  }

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  }

  // Format ROAS values
  const formatRoas = (value: number) => {
    return value.toFixed(2) + 'x';
  }

  return (
    <TooltipProvider>
      <Card className={`overflow-hidden ${isFullScreen ? "fixed inset-0 z-50" : ""} border-slate-200 shadow-md`}>
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2">
            <FacebookLogo height={"1rem"} width={"1rem"} />
            <div className="text-base font-semibold text-slate-800">Interest Performance <span>({data.account_name})</span></div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={toggleFullScreen} className="font-medium">
                  {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ColumnManagementSheet
                    visibleColumns={visibleColumns}
                    columnOrder={columnOrder}
                    frozenColumns={frozenColumns}
                    onVisibilityChange={setVisibleColumns}
                    onOrderChange={setColumnOrder}
                    onFrozenChange={setFrozenColumns}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Manage Columns</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="p-3">
          <div
            ref={tableRef}
            className={`overflow-auto ${getTableHeight()} bg-white rounded-lg border border-slate-200 shadow-sm`}
          >
            <table className="w-full border-collapse text-xs relative">
              <thead className="bg-slate-50 sticky top-0 z-20">
                <tr>
                  {columnOrder
                    .filter((column) => visibleColumns.includes(column))
                    .map((column, index) => {
                      const isFrozen = frozenColumns.includes(column)
                      const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined
                      const columnStyle = getColumnStyle(column)

                      return (
                        <th
                          key={column}
                          ref={(el) => (columnRefs.current[column] = el)}
                          className={`text-left p-2 font-medium text-slate-700 border-b border-r ${
                            isFrozen ? "sticky z-20 bg-slate-50" : ""
                          } ${dragOverColumn === column ? "bg-blue-50" : ""}`}
                          style={{
                            left: leftPos,
                            ...columnStyle,
                          }}
                          draggable
                          onDragStart={() => handleColumnDragStart(column)}
                          onDragOver={(e) => handleColumnDragOver(e, column)}
                          onDrop={() => handleColumnDrop(column)}
                          onDragEnd={handleColumnDragEnd}
                        >
                          <div className="flex items-center justify-between">
                            <span>{column}</span>
                            <SlidersHorizontal className="h-3 w-3 text-slate-400 cursor-grab" />
                          </div>
                        </th>
                      )
                    })}
                </tr>
              </thead>
              <tbody>
                {data.interest.map((interest, _) => (
                  <tr 
                    key={interest.InterestId.toString()} 
                    className={`border-b hover:bg-slate-50 transition-colors ${
                        dragOverInterest === interest.Interest ? "bg-blue-50" : ""
                      }`}
                    draggable
                    onDragStart={() => handleDragStart(interest.InterestId.toString())}
                    onDragOver={(e) => handleDragOver(e, interest.InterestId.toString())}
                    onDrop={() => handleDrop(interest.InterestId.toString())}
                    onDragEnd={handleDragEnd}
                  >
                    {columnOrder
                      .filter((column) => visibleColumns.includes(column))
                      .map((column, colIndex) => {
                        const isFrozen = frozenColumns.includes(column)
                        const leftPos = isFrozen ? `${getLeftPosition(colIndex)}px` : undefined
                        const columnStyle = getColumnStyle(column)
                        
                        let cellContent: React.ReactNode = interest[column]
                        
                        // Format values based on column type
                        if (column === "Spend" || column === "Revenue") {
                          cellContent = formatCurrency(Number(interest[column]))
                        } else if (column === "Roas") {
                          cellContent = formatRoas(Number(interest[column]))
                        }
                        
                        return (
                          <td
                            key={`${interest.InterestId}-${column}`}
                            className={`p-2 border-b border-r text-slate-700 ${
                              isFrozen ? "sticky z-10 bg-inherit" : ""
                            }`}
                            style={{
                              left: leftPos,
                              ...columnStyle,
                            }}
                          >
                            {cellContent}
                          </td>
                        )
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  )
}

export default InterestTable;