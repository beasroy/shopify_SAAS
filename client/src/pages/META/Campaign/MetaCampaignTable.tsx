import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Maximize2, Minimize2, ChevronDown, ChevronUp } from "lucide-react"
import type { AccountData } from "./CampaignDashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FacebookLogo } from "@/pages/AnalyticsDashboard/AdAccountsMetricsCard"

interface MetaReportTableProps {
  data: AccountData, height:string
}

const MetaCampaignTable: React.FC<MetaReportTableProps> = ({ data, height }) => {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [sortColumn, setSortColumn] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isScrolled, setIsScrolled] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
  }

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement
      setIsScrolled(target.scrollLeft > 0)
    }

    const tableContainer = tableRef.current
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll)
    }

    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const headers = data.campaigns.length > 0 ? Object.keys(data.campaigns[0]) : []

  const formatCellValue = (value: string | number, header: string) => {
    if (typeof value === "number") {
      if (header.toLowerCase().includes("cost") || header.toLowerCase().includes("amount") || header === "CPM") {
        return `₹${formatNumber(value)}`
      } else if (header.includes("Rate") || header === "ROAS") {
        return `₹${formatNumber(value)}`
      } else if (header === "Frequency") {
        return formatNumber(value)
      } else {
        return Math.round(value)
      }
    }
    return value
  }

  const sortedCampaigns = [...data.campaigns].sort((a, b) => {
    if (sortColumn) {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      } else {
        return sortDirection === "asc"
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue))
      }
    }
    return 0
  })

  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const stickyColumnClass = isScrolled ? 
  'after:absolute after:top-0 after:right-0 after:bottom-0 after:w-2 after:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.2)] after:-mr-0.5 border-r-2 border-r-slate-300' : ''
  
  const getTableHeight = () => {
    if (isFullScreen) {
      return "max-h-[calc(100vh-100px)]"
    }
    // If there's only one account, make the table taller
    return height;
  }

  return (
    <Card className={`overflow-hidden ${isFullScreen ? "fixed inset-0 z-50" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-200">
        <CardTitle className="flex flex-row gap-3 items-center"> 
        <div className="text-xl font-bold text-slate-800">
        {data.account_name}
        </div>
        <FacebookLogo width="1.3rem" height="1.3rem" />
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-sm font-medium">
            {data.campaigns.length} Active Campaigns
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullScreen}
            title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
      <div
          ref={tableRef}
          className={`overflow-auto ${getTableHeight()}`}
          style={{ position: "relative" }}
        >
          <table className="w-full border-collapse rounded-lg">
            <thead className="bg-slate-100 sticky top-0 z-30">
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={header}
                    className={`px-4 py-2 text-left text-sm font-bold text-slate-700 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap ${
                      index === 0 ? `sticky left-0 z-40 bg-slate-100 ${stickyColumnClass} border-r` : "border-r border-slate-200"
                    }`}
                    onClick={() => handleSort(header)}
                    style={{
                      minWidth: header === "Campaign" ? "190px" : "110px",
                      position: index === 0 ? "sticky" : "static",
                      left: index === 0 ? 0 : "auto",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{header}</span>
                      {sortColumn === header &&
                        (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCampaigns.map((campaign, rowIndex) => (
                <tr key={rowIndex} className="group hover:bg-slate-50 transition-colors">
                  {headers.map((header, colIndex) => (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      className={`px-4 py-2 text-xs border-b border-slate-200 whitespace-nowrap ${
                        colIndex === 0
                          ? `sticky left-0 z-20 bg-white group-hover:bg-slate-50 font-semibold group-hover:text-blue-600 border-r ${stickyColumnClass}`
                          : "border-r border-slate-200"
                      } ${rowIndex === sortedCampaigns.length - 1 ? "border-b-0" : ""}`}
                      style={{
                        position: colIndex === 0 ? "sticky" : "static",
                        left: colIndex === 0 ? 0 : "auto",
                      }}
                    >
                      {formatCellValue(campaign[header], header)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default MetaCampaignTable