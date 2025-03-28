import React, { useState, useEffect, useRef, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FacebookLogo } from "@/data/logo"
import {
  X,
  ChevronDown,
  Maximize,
  Minimize,
  ChevronRight,
  Tag,
  Filter,
  FolderOpen,
  Search,
  Plus,
  Info,
  LayoutGrid,
  SlidersHorizontal,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import type { RootState } from "@/store"
import { addLabelToCampaign, removeLabelFromCampaign, toggleAddingLabel } from "@/store/slices/campaignLabelsSlice"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import ColumnManagementSheet from "./ColumnManagementSheet"

// Enhanced label colors with better contrast and visual hierarchy
const LABEL_COLORS = [
  "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200",
  "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200",
  "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200",
  "bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200",
  "bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200",
  "bg-pink-100 text-pink-800 border border-pink-200 hover:bg-pink-200",
  "bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-200",
  "bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200",
]

// Using a single fixed width for all columns except Campaign and Labels
const DEFAULT_COLUMN_WIDTH = "85px"

interface Campaign {
  campaignName: string
  [key: string]: string | number
}

interface MetaCampaignTableProps {
  data: {
    account_name: string
    account_id: string
    campaigns: Campaign[]
  }
  height: string
}

// New interface for grouped campaigns
interface GroupedCampaign {
  label: string
  campaigns: Campaign[]
  isExpanded: boolean
}

const MetaCampaignTable: React.FC<MetaCampaignTableProps> = ({ data, height }) => {
  const dispatch = useDispatch()
  const [newLabel, setNewLabel] = useState("")
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [draggedCampaign, setDraggedCampaign] = useState<string | null>(null)
  const [dragOverCampaign, setDragOverCampaign] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [frozenColumns, setFrozenColumns] = useState<string[]>(["Campaign"])

  const [isGroupingEnabled, setIsGroupingEnabled] = useState(true)
  const [groupedCampaigns, setGroupedCampaigns] = useState<GroupedCampaign[]>([])
  const [ungroupedCampaigns, setUngroupedCampaigns] = useState<Campaign[]>([])

  const tableRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({})

  const { labels, isAddingLabel } = useSelector((state: RootState) => state.campaignLabels)

  const accountLabels = useMemo(() => {
    return labels[data.account_id] || {}
  }, [labels, data.account_id])

  const hasAnyLabels = useMemo(() => {
    return Object.values(accountLabels).some((labelArray) => labelArray && labelArray.length > 0)
  }, [accountLabels])

  // Initialize column state
  useEffect(() => {
    if (data.campaigns.length > 0) {
      const columns = Object.keys(data.campaigns[0])
      const initialColumns = columns.filter((col) => col !== "Labels")

      const shouldShowLabelsColumn = hasAnyLabels || isAddingLabel
      const initialVisibleColumns = shouldShowLabelsColumn ? [...initialColumns, "Labels"] : initialColumns

      setVisibleColumns(initialVisibleColumns)

      // Create column order with Campaign first, then Labels (if visible), then others
      const baseColumns = [...initialColumns].filter((col) => col !== "Campaign")
      const orderedColumns = ["Campaign"]

      if (shouldShowLabelsColumn) {
        orderedColumns.push("Labels")
      }

      orderedColumns.push(...baseColumns)
      setColumnOrder(orderedColumns)
    }
  }, [data.campaigns, hasAnyLabels, isAddingLabel])

  // Group campaigns by labels
  useEffect(() => {
    if (isGroupingEnabled && hasAnyLabels) {
      // Get all unique labels across all campaigns
      const allLabels = new Set<string>()

      Object.entries(accountLabels).forEach(([, labelArray]) => {
        labelArray?.forEach((label) => {
          allLabels.add(label)
        })
      })

      // Create a map to group campaigns by label
      const labelMap: { [key: string]: Campaign[] } = {}

      // Initialize each label with an empty array
      Array.from(allLabels).forEach((label) => {
        labelMap[label] = []
      })

      // Group campaigns by labels
      const unGrouped: Campaign[] = []

      data.campaigns.forEach((campaign) => {
        const campaignLabels = accountLabels[campaign.Campaign] || []

        if (campaignLabels.length > 0) {
          // Add campaign to each of its label groups
          campaignLabels.forEach((label) => {
            labelMap[label].push(campaign)
          })
        } else {
          // Add to ungrouped
          unGrouped.push(campaign)
        }
      })

      // Convert to array format with expanded state
      const grouped = Object.entries(labelMap).map(([label, campaigns]) => ({
        label,
        campaigns,
        isExpanded: true,
      }))
      setGroupedCampaigns(grouped)
      setUngroupedCampaigns(unGrouped)
    } else {
      setGroupedCampaigns([])
      setUngroupedCampaigns(data.campaigns)
    }
  }, [data.campaigns, accountLabels, isGroupingEnabled, hasAnyLabels])

  const labelColorMap = React.useMemo(() => {
    const map = new Map<string, string>()
    let colorIndex = 0

    const allLabels = new Set<string>()
    Object.values(accountLabels).forEach((labelArray) => {
      labelArray?.forEach((label) => allLabels.add(label))
    })

    Array.from(allLabels).forEach((label) => {
      map.set(label, LABEL_COLORS[colorIndex % LABEL_COLORS.length])
      colorIndex++
    })

    return map
  }, [accountLabels])

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

  const handleAddLabel = () => {
    if (newLabel && selectedCampaigns.length > 0) {
      selectedCampaigns.forEach((campaignId) => {
        dispatch(
          addLabelToCampaign({
            accountId: data.account_id,
            campaignId,
            label: newLabel,
          }),
        )
      })
      setNewLabel("")
      setSelectedCampaigns([])
      dispatch(toggleAddingLabel(false))

      // Ensure Labels column is visible after adding a label
      if (!visibleColumns.includes("Labels")) {
        setVisibleColumns([...visibleColumns, "Labels"])

        // Also add Labels to column order if it's not there
        if (!columnOrder.includes("Labels")) {
          const campaignIndex = columnOrder.indexOf("Campaign")
          const newOrder = [...columnOrder]
          newOrder.splice(campaignIndex + 1, 0, "Labels")
          setColumnOrder(newOrder)
        }
      }
    }
  }

  const handleRemoveLabel = (campaignId: string, label: string) => {
    dispatch(
      removeLabelFromCampaign({
        accountId: data.account_id,
        campaignId,
        label,
      }),
    )
  }

  const filteredCampaigns = data.campaigns.filter((campaign) =>
    campaign.campaignName.toString().toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Get column style based on column name
  const getColumnStyle = (column: string) => {
    if (column === "Campaign") {
      return { width: "auto", minWidth: "200px" }
    }
    if (column === "Labels") {
      return { width: "auto", minWidth: "120px" }
    }

    // All other columns get the fixed width
    return {
      width: DEFAULT_COLUMN_WIDTH,
      minWidth: DEFAULT_COLUMN_WIDTH,
    }
  }

  // Campaign drag and drop handlers
  const handleDragStart = (campaignId: string) => {
    setDraggedCampaign(campaignId)
  }

  const handleDragOver = (e: React.DragEvent, campaignId: string) => {
    e.preventDefault()
    if (campaignId !== draggedCampaign) {
      setDragOverCampaign(campaignId)
    }
  }

  const handleDrop = (targetCampaignId: string) => {
    if (!draggedCampaign || draggedCampaign === targetCampaignId) return

    // Reorder campaigns logic would go here
    // For now, just reset the state
    setDraggedCampaign(null)
    setDragOverCampaign(null)

    // Note: In a real implementation, you would dispatch an action to update the order in your Redux store
    console.log(`Dragged ${draggedCampaign} and dropped on ${targetCampaignId}`)
  }

  const handleDragEnd = () => {
    setDraggedCampaign(null)
    setDragOverCampaign(null)
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

  // Toggle group expansion
  const toggleGroupExpansion = (labelIndex: number) => {
    const updatedGroups = [...groupedCampaigns]
    updatedGroups[labelIndex].isExpanded = !updatedGroups[labelIndex].isExpanded
    setGroupedCampaigns(updatedGroups)
  }

  // Calculate summary values for a group
  const calculateGroupSummary = (campaigns: Campaign[]) => {
    const summary: { [key: string]: number | string } = {}

    // Get columns that should be visible in the summary
    const summaryColumns = columnOrder.filter(
      (col) => visibleColumns.includes(col) && col !== "Campaign" && col !== "Labels",
    )

    // Define different calculation methods for specific columns
    const calculationMethods: { [key: string]: (values: number[], campaigns: Campaign[]) => number } = {
      "Conversion Rate": (_, campaigns) => {
        const totalLinkClicks = campaigns.reduce((sum, campaign) => sum + Number(campaign["Link Click"] || 0), 0)
        const totalPurchases = campaigns.reduce((sum, campaign) => sum + Number(campaign["Purchases"] || 0), 0)
        if (totalLinkClicks === 0) return 0

        const conversionRate = (totalPurchases / totalLinkClicks) * 100
        return conversionRate
      },
      "CPM (Reach Based)": (_, campaigns) => {
        const totalreach = campaigns.reduce((sum, campaign) => sum + Number(campaign["Reach"] || 0), 0)
        const totalSpend = campaigns.reduce((sum, campaign) => sum + Number(campaign["Amount spend"] || 0), 0)

        const cpmReachBased = totalSpend / (totalreach / 1000)
        return cpmReachBased
      },
      "Audience Saturation Score": (_, campaigns) => {
        const totaloutboundctr = campaigns.reduce((sum, campaign) => sum + Number(campaign["Outbound CTR"] || 0), 0)
        const totalFrequency = campaigns.reduce((sum, campaign) => sum + Number(campaign["Frequency"] || 0), 0)
        if (totaloutboundctr === 0) return 0

        const audienceScore = (totalFrequency / totaloutboundctr) * 100
        return audienceScore
      },
      "Reach v/s Unique Click": (_, campaigns) => {
        const totalUniqueClicks = campaigns.reduce(
          (sum, campaign) => sum + Number(campaign["Unique Link Click"] || 0),
          0,
        )
        const totalreach = campaigns.reduce((sum, campaign) => sum + Number(campaign["Reach"] || 0), 0)
        if (totalUniqueClicks === 0) return 0

        const reachVsUniqueClick = totalreach / totalUniqueClicks
        return reachVsUniqueClick
      },
      "High-Intent Click Rate": (_, campaigns) => {
        const totalAddToCart = campaigns.reduce((sum, campaign) => sum + Number(campaign["Add To Cart (ATC)"] || 0), 0)
        const totalCheckoutInitiated = campaigns.reduce(
          (sum, campaign) => sum + Number(campaign["Checkout Initiate (CI)"] || 0),
          0,
        )
        const totalLandingPageView = campaigns.reduce(
          (sum, campaign) => sum + Number(campaign["Landing Page View"] || 0),
          0,
        )
        const totalLinkClicks = campaigns.reduce((sum, campaign) => sum + Number(campaign["Link Click"] || 0), 0)
        if (totalLinkClicks === 0) return 0

        const highIntentClickRate =
          ((totalAddToCart + totalCheckoutInitiated + totalLandingPageView) / totalLinkClicks) * 100
        return highIntentClickRate
      },
      HookRate: (_, campaigns) => {
        const threeSecondsView = campaigns.reduce(
          (sum, campaign) => sum + Number(campaign["Three Seconds View"] || 0),
          0,
        )
        const totalimpressions = campaigns.reduce((sum, campaign) => sum + Number(campaign["Impressions"] || 0), 0)
        if (totalimpressions === 0) return 0

        const hookrate = (threeSecondsView / totalimpressions) * 100
        return hookrate
      },
      DEFAULT: (values, _) => values.reduce((sum, val) => sum + val, 0),
    }

    // Then modify how you call these methods:
    summaryColumns.forEach((column) => {
      const values = campaigns.map((campaign) => Number(campaign[column] || 0)).filter((value) => !isNaN(value))

      const calculateMethod = calculationMethods[column] || calculationMethods["DEFAULT"]
      summary[column] = calculateMethod(values, campaigns).toFixed(2)
    })

    return summary
  }

  const getTableHeight = () => {
    if (isFullScreen) {
      return "max-h-[calc(100vh-100px)]"
    }
    return height
  }

  return (
    <TooltipProvider>
      <Card className={`overflow-hidden ${isFullScreen ? "fixed inset-0 z-50" : ""} border-slate-200 shadow-md`}>
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2">
            <FacebookLogo height={"1rem"} width={"1rem"} />
            <div className="text-base font-semibold text-slate-800">Campaign Performance <span>({data.account_name})</span></div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setIsGroupingEnabled(!isGroupingEnabled)}
                  size="sm"
                  className="gap-1 font-medium"
                >
                  {isGroupingEnabled ? (
                    <>
                      <LayoutGrid className="h-4 w-4 text-blue-600" />
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="h-4 w-4 text-slate-500" />
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isGroupingEnabled ? "Disable Grouping" : "Enable Grouping"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => dispatch(toggleAddingLabel(!isAddingLabel))}
                  size="sm"
                  className="gap-1 font-medium"
                >
                  {isAddingLabel ? (
                    <>
                      <X className="h-4 w-4 text-red-500" />
                      <span className="hidden sm:inline">Cancel</span>
                    </>
                  ) : (
                    <>
                      <Tag className="h-4 w-4 text-slate-500" />
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isAddingLabel ? "Cancel Adding Label" : "Add Label"}</TooltipContent>
            </Tooltip>

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
          {isAddingLabel && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-grow max-w-xs">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Enter label name"
                    className="pl-9"
                  />
                </div>
                <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-between text-xs gap-1" size="sm">
                      <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
                      {selectedCampaigns.length === 0 ? "Select campaigns" : `${selectedCampaigns.length} selected`}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0">
                    <div className="p-2">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Search campaigns..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 text-xs"
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredCampaigns.map((campaign) => (
                          <div
                            key={campaign.Campaign}
                            className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 rounded"
                          >
                            <Checkbox
                              checked={selectedCampaigns.includes(campaign.campaignName)}
                              onCheckedChange={(checked) => {
                                setSelectedCampaigns(
                                  checked
                                    ? [...selectedCampaigns, campaign.campaignName]
                                    : selectedCampaigns.filter((id) => id !== campaign.campaignName),
                                )
                              }}
                            />
                            <span className="text-xs">{campaign.Campaign}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  onClick={handleAddLabel}
                  disabled={!newLabel || selectedCampaigns.length === 0}
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Label
                </Button>
              </div>
              {selectedCampaigns.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Info className="h-3.5 w-3.5" />
                  {selectedCampaigns.length} campaign(s) selected
                </div>
              )}
            </div>
          )}

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
                {/* Render grouped campaigns */}
                {isGroupingEnabled &&
                  groupedCampaigns.map((group, groupIndex) => (
                    <React.Fragment key={`group-${group.label}`}>
                      {/* Label group header/summary row */}
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-50 font-medium hover:bg-slate-100 transition-colors">
                        {columnOrder
                          .filter((column) => visibleColumns.includes(column))
                          .map((column, index) => {
                            const isFrozen = frozenColumns.includes(column)
                            const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined
                            const columnStyle = getColumnStyle(column)
                            const summary = calculateGroupSummary(group.campaigns)

                            if (column === "Campaign") {
                              return (
                                <td
                                  key={column}
                                  className={`p-2 border-r sticky z-10 bg-gradient-to-r from-slate-100 to-slate-50`}
                                  style={{
                                    left: leftPos,
                                    ...columnStyle,
                                  }}
                                >
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => toggleGroupExpansion(groupIndex)}
                                      className="mr-2 focus:outline-none rounded-full p-0.5 hover:bg-slate-200 transition-colors"
                                    >
                                      {group.isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-slate-600" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-600" />
                                      )}
                                    </button>
                                    <span className="font-medium text-slate-700">
                                      Group: {group.campaigns.length} campaigns
                                    </span>
                                  </div>
                                </td>
                              )
                            }

                            if (column === "Labels") {
                              return (
                                <td
                                  key={column}
                                  className={`p-2 border-r ${
                                    isFrozen
                                      ? "sticky z-10 bg-gradient-to-r from-slate-100 to-slate-50"
                                      : "bg-gradient-to-r from-slate-100 to-slate-50"
                                  }`}
                                  style={{
                                    left: leftPos,
                                    ...columnStyle,
                                  }}
                                >
                                  <Badge
                                    className={`${labelColorMap.get(group.label)} w-fit flex items-center gap-1 cursor-default text-xs py-0.5 px-2 rounded-md`}
                                  >
                                    {group.label}
                                  </Badge>
                                </td>
                              )
                            }

                            return (
                              <td
                                key={column}
                                className={`p-2 border-r ${
                                  isFrozen
                                    ? "sticky z-10 bg-gradient-to-r from-slate-100 to-slate-50"
                                    : "bg-gradient-to-r from-slate-100 to-slate-50"
                                } font-semibold`}
                                style={{
                                  left: leftPos,
                                  ...columnStyle,
                                }}
                              >
                                <div>{summary[column]}</div>
                              </td>
                            )
                          })}
                      </tr>

                      {/* Individual campaigns in the group */}
                      {group.isExpanded &&
                        group.campaigns.map((campaign) => (
                          <tr
                            key={`${group.label}-${campaign.campaignName}`}
                            className={`border-b hover:bg-slate-50 transition-colors ${
                              dragOverCampaign === campaign.campaignName ? "bg-blue-50" : ""
                            }`}
                            draggable
                            onDragStart={() => handleDragStart(campaign.campaignName)}
                            onDragOver={(e) => handleDragOver(e, campaign.campaignName)}
                            onDrop={() => handleDrop(campaign.campaignName)}
                            onDragEnd={handleDragEnd}
                          >
                            {columnOrder
                              .filter((column) => visibleColumns.includes(column))
                              .map((column, index) => {
                                const isFrozen = frozenColumns.includes(column)
                                const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined
                                const columnStyle = getColumnStyle(column)

                                if (column === "Campaign") {
                                  return (
                                    <td
                                      key={column}
                                      className={`p-2 border-r sticky bg-white  z-10 `}
                                      style={{
                                        left: leftPos,
                                        paddingLeft: "30px", 
                                        ...columnStyle,
                                      }}
                                    >
                                      <div >{campaign.Campaign}</div>
                                    </td>
                                  )
                                }

                                if (column === "Labels") {
                                  return (
                                    <td
                                      key={column}
                                      className={`p-2 border-r ${isFrozen ? "sticky z-10 bg-white" : ""}`}
                                      style={{
                                        left: leftPos,
                                        ...columnStyle,
                                      }}
                                    >
                                      <div className="flex flex-wrap gap-1">
                                        {accountLabels[campaign.Campaign]?.map((label: string) => (
                                          <Badge
                                            key={label}
                                            className={`${labelColorMap.get(label)} flex items-center gap-1 cursor-default text-xs py-0 px-1.5 rounded-md`}
                                          >
                                            {label}
                                            <X
                                              className="h-2.5 w-2.5 cursor-pointer hover:opacity-75"
                                              onClick={() => handleRemoveLabel(campaign.campaignName, label)}
                                            />
                                          </Badge>
                                        ))}
                                      </div>
                                    </td>
                                  )
                                }

                                return (
                                  <td
                                    key={column}
                                    className={`p-2 border-r ${isFrozen ? "sticky z-10 bg-white" : ""}`}
                                    style={{
                                      left: leftPos,
                                      ...columnStyle,
                                    }}
                                  >
                                    <div>{campaign[column]}</div>
                                  </td>
                                )
                              })}
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}

                {/* Ungrouped campaigns section */}
                {isGroupingEnabled && ungroupedCampaigns.length > 0 && (
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-50 font-medium hover:bg-gray-100 transition-colors">
                    {columnOrder
                      .filter((column) => visibleColumns.includes(column))
                      .map((column, index) => {
                        const isFrozen = frozenColumns.includes(column)
                        const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined
                        const columnStyle = getColumnStyle(column)

                        if (column === "Campaign") {
                          return (
                            <td
                              key={column}
                              className={`p-2 border-r sticky z-10 bg-gradient-to-r from-gray-100 to-gray-50`}
                              style={{
                                left: leftPos,
                                ...columnStyle,
                              }}
                            >
                              <div className="font-medium text-slate-700 flex items-center">
                                <Filter className="h-4 w-4 mr-2 text-slate-500" />
                                Unlabeled: {ungroupedCampaigns.length} campaigns
                              </div>
                            </td>
                          )
                        }

                        if (column === "Labels") {
                          return (
                            <td
                              key={column}
                              className={`p-2 border-r ${
                                isFrozen
                                  ? "sticky z-10 bg-gradient-to-r from-gray-100 to-gray-50"
                                  : "bg-gradient-to-r from-gray-100 to-gray-50"
                              }`}
                              style={{
                                left: leftPos,
                                ...columnStyle,
                              }}
                            >
                              <span className="text-slate-400 italic">-</span>
                            </td>
                          )
                        }

                        // Calculate summary for ungrouped campaigns
                        const summary = calculateGroupSummary(ungroupedCampaigns)

                        return (
                          <td
                            key={column}
                            className={`p-2 border-r ${
                              isFrozen
                                ? "sticky z-10 bg-gradient-to-r from-gray-100 to-gray-50"
                                : "bg-gradient-to-r from-gray-100 to-gray-50"
                            } font-semibold`}
                            style={{
                              left: leftPos,
                              ...columnStyle,
                            }}
                          >
                            <div>{summary[column]}</div>
                          </td>
                        )
                      })}
                  </tr>
                )}

                {/* Render ungrouped campaigns or all campaigns when grouping is disabled */}
                {(isGroupingEnabled ? ungroupedCampaigns : data.campaigns).map((campaign) => (
                  <tr
                    key={campaign.Campaign}
                    className={`border-b hover:bg-slate-50 transition-colors ${
                      dragOverCampaign === campaign.campaignName ? "bg-blue-50" : ""
                    }`}
                    draggable
                    onDragStart={() => handleDragStart(campaign.campaignName)}
                    onDragOver={(e) => handleDragOver(e, campaign.campaignName)}
                    onDrop={() => handleDrop(campaign.campaignName)}
                    onDragEnd={handleDragEnd}
                  >
                    {columnOrder
                      .filter((column) => visibleColumns.includes(column))
                      .map((column, index) => {
                        const isFrozen = frozenColumns.includes(column)
                        const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined
                        const columnStyle = getColumnStyle(column)

                        if (column === "Campaign") {
                          return (
                            <td
                              key={column}
                              className={`p-2 border-r sticky z-10`}
                              style={{
                                left: leftPos,
                                backgroundColor: "white",
                                ...columnStyle,
                              }}
                            >
                              <div className="font-medium text-slate-700">{campaign.Campaign}</div>
                            </td>
                          )
                        }

                        if (column === "Labels") {
                          return (
                            <td
                              key={column}
                              className={`p-2 border-r ${isFrozen ? "sticky z-10" : ""}`}
                              style={{
                                left: leftPos,
                                backgroundColor: isFrozen ? "white" : undefined,
                                ...columnStyle,
                              }}
                            >
                              <div className="flex flex-wrap gap-1">
                                {accountLabels[campaign.Campaign]?.map((label: string) => (
                                  <Badge
                                    key={label}
                                    className={`${labelColorMap.get(label)} flex items-center gap-1 cursor-default text-xs py-0 px-1.5 rounded-md`}
                                  >
                                    {label}
                                    <X
                                      className="h-2.5 w-2.5 cursor-pointer hover:opacity-75"
                                      onClick={() => handleRemoveLabel(campaign.campaignName, label)}
                                    />
                                  </Badge>
                                ))}
                                {!accountLabels[campaign.Campaign]?.length && (
                                  <span className="text-slate-400 italic text-xs">-</span>
                                )}
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td
                            key={column}
                            className={`p-2 border-r ${isFrozen ? "sticky z-10" : ""}`}
                            style={{
                              left: leftPos,
                              backgroundColor: isFrozen ? "white" : undefined,
                              ...columnStyle,
                            }}
                          >
                            <div>{campaign[column]}</div>
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

export default MetaCampaignTable

