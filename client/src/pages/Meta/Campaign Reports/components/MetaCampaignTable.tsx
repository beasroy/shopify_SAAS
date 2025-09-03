import React, { useState, useEffect, useRef, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  ChevronRight,
  Tag,
  Filter,
  Plus,
  LayoutGrid,
  SlidersHorizontal,
  Check,
  Maximize,
  Minimize,
  Edit,
  X,
} from "lucide-react"
import type { RootState } from "@/store"
import { addLabelToCampaign, removeLabelFromCampaign } from "@/store/slices/campaignLabelsSlice"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import ColumnManagementSheet from "@/pages/AnalyticsDashboard/Components/ColumnManagementSheet"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange"

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
  campaignId: string
  [key: string]: string | number
}

interface MetaCampaignTableProps {
  data: {
    account_name: string
    account_id: string
    campaigns: Campaign[]
  }[]
  blendedSummary?: Campaign[] // Add blended summary data
}

// New interface for grouped campaigns
interface GroupedCampaign {
  label: string
  campaigns: Campaign[]
  isExpanded: boolean
}

const MetaCampaignTable: React.FC<MetaCampaignTableProps> = ({ data, blendedSummary }) => {
  const dispatch = useDispatch()
  const [draggedCampaign, setDraggedCampaign] = useState<string | null>(null)
  const [dragOverCampaign, setDragOverCampaign] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editLabelValue, setEditLabelValue] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("")

  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [frozenColumns, setFrozenColumns] = useState<string[]>(["Campaign", "Labels"])

  const [scrollLeft, setScrollLeft] = useState(0)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ensure Campaign and Labels are always frozen in correct order
  useEffect(() => {
    setFrozenColumns((prev) => {
      const newFrozen = prev.filter((col) => col !== "Campaign" && col !== "Labels")
      return ["Campaign", "Labels", ...newFrozen]
    })
  }, [])

  // Set active tab to "All" if blended summary is available, otherwise first account
  useEffect(() => {
    if (data.length > 0 && !activeTab) {
      if (blendedSummary && blendedSummary.length > 0) {
        setActiveTab("all")
      } else {
        setActiveTab(data[0].account_id)
      }
    }
  }, [data, activeTab, blendedSummary])

  const [isGroupingEnabled, setIsGroupingEnabled] = useState(true)
  const [groupedCampaigns, setGroupedCampaigns] = useState<GroupedCampaign[]>([])
  const [ungroupedCampaigns, setUngroupedCampaigns] = useState<Campaign[]>([])
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all")

  const tableRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({})
  const newLabelInputRef = useRef<HTMLInputElement>(null)

  const { labels } = useSelector((state: RootState) => state.campaignLabels)

  // Get current active account data or blended summary
  const currentAccountData = useMemo(() => {
    if (activeTab === "all" && blendedSummary) {
      return {
        account_name: "All Accounts",
        account_id: "all",
        campaigns: blendedSummary
      }
    }
    return data.find(account => account.account_id === activeTab) || data[0]
  }, [data, activeTab, blendedSummary])

  const accountLabels = useMemo(() => {
    return currentAccountData?.account_id ? labels[currentAccountData.account_id] || {} : {}
  }, [labels, currentAccountData?.account_id])

  const PREDEFINED_LABELS = ["TOFU", "MOFU", "BOFU", "TOFU+MOFU"]

  // Get all unique labels across all campaigns
  const allUniqueLabels = useMemo(() => {
    const uniqueLabels = new Set<string>()
    Object.values(accountLabels).forEach((labelArray) => {
      labelArray?.forEach((label) => {
        uniqueLabels.add(label)
      })
    })
    return Array.from(uniqueLabels)
  }, [accountLabels])

  const hasAnyLabels = useMemo(() => {
    return allUniqueLabels.length > 0
  }, [allUniqueLabels])

  // Filter campaigns by status
  const filterCampaignsByStatus = (campaigns: Campaign[]) => {
    if (statusFilter === "all") return campaigns
    return campaigns.filter((campaign) => {
      // Check all possible status property names and formats
      const statusValue = campaign.status || campaign.Status || ""
      const status = String(statusValue).toLowerCase()

      return statusFilter === "active" ? status === "active" : status === "paused"
    })
  }

  // Filter campaigns before processing
  const filteredCampaigns = useMemo(() => {
    return filterCampaignsByStatus(currentAccountData?.campaigns || [])
  }, [currentAccountData?.campaigns, statusFilter])

  // Initialize column state only once when data first loads
  useEffect(() => {
    if (data.length > 0 && columnOrder.length === 0) {
      // Use the first account's data to determine columns
      const firstAccount = data[0]
      if (firstAccount?.campaigns.length > 0) {
        const columns = Object.keys(firstAccount.campaigns[0])
        // Always include Labels column
        const initialColumns = columns.filter(
          (col) => col !== "Labels" && col !== "campaignId" && col !== "accountId" && col !== "accountName",
        )
        const initialVisibleColumns = [...initialColumns, "Labels"]
        setVisibleColumns(initialVisibleColumns)

        // Create column order with Campaign first, then Labels, then others
        const baseColumns = [...initialColumns].filter(
          (col) => col !== "Campaign" && col !== "campaignName" && col !== "Labels",
        )
        const orderedColumns = ["Campaign", "Labels", ...baseColumns]
        setColumnOrder(orderedColumns)
      }
    }
  }, [data, columnOrder.length]) // Only run when data changes and columnOrder is empty

  // Group campaigns by labels
  useEffect(() => {
    if (isGroupingEnabled && hasAnyLabels) {
      // Create a map to group campaigns by label
      const labelMap: { [key: string]: Campaign[] } = {}

      // Initialize each label with an empty array
      allUniqueLabels.forEach((label) => {
        labelMap[label] = []
      })

      // Group campaigns by labels
      const unGrouped: Campaign[] = []

      filteredCampaigns.forEach((campaign) => {
        const currentCampaignLabels = accountLabels[campaign.campaignId] || []

        if (currentCampaignLabels.length > 0) {
          // Add campaign to each of its label groups
          currentCampaignLabels.forEach((label) => {
            labelMap[label].push(campaign)
          })
        } else {
          // Add to ungrouped
          unGrouped.push(campaign)
        }
      })

      // Convert to array format with expanded state
      const grouped = Object.entries(labelMap)
        .filter(([, campaigns]) => campaigns.length > 0) // Only include groups with campaigns
        .map(([label, campaigns]) => ({
          label,
          campaigns,
          isExpanded: true,
        }))

      setGroupedCampaigns(grouped)
      setUngroupedCampaigns(unGrouped)
    } else {
      setGroupedCampaigns([])
      setUngroupedCampaigns(filteredCampaigns)
    }
  }, [filteredCampaigns, accountLabels, isGroupingEnabled, hasAnyLabels, allUniqueLabels])

  const labelColorMap = React.useMemo(() => {
    const map = new Map<string, string>()
    let colorIndex = 0

    allUniqueLabels.forEach((label) => {
      map.set(label, LABEL_COLORS[colorIndex % LABEL_COLORS.length])
      colorIndex++
    })

    return map
  }, [allUniqueLabels])


  // Static positioning approach - no DOM measurements needed
  const getLeftPosition = (columnIndex: number): number => {
    // Get only the visible columns in the correct order
    const visibleOrderedColumns = columnOrder.filter((col) => visibleColumns.includes(col))
    const currentColumn = visibleOrderedColumns[columnIndex]
    
    // Only calculate position for frozen columns
    if (!frozenColumns.includes(currentColumn)) {
      return 0
    }

    // Static positioning based on column order
    let position = 0
    
    for (let i = 0; i < columnIndex; i++) {
      const column = visibleOrderedColumns[i]
      if (frozenColumns.includes(column)) {
        // Use fixed widths that match the CSS
        if (column === "Campaign") {
          position += 250 // Campaign column width
        } else if (column === "Labels") {
          position += 150 // Labels column width  
        } else {
          position += 85 // Default column width
        }
      }
    }

    return position
  }

  const shouldShowSeparator = (column: string): boolean => {
    if (scrollLeft <= 0) return false;

    const visibleOrderedColumns = columnOrder.filter((col) => visibleColumns.includes(col));
    const frozenVisibleColumns = visibleOrderedColumns.filter((col) => frozenColumns.includes(col));

    if (frozenVisibleColumns.length === 0) return false;

    const lastFrozenColumn = frozenVisibleColumns[frozenVisibleColumns.length - 1];
    return column === lastFrozenColumn;
  };

  // Add a function to get the separator class
  const getSeparatorClass = (column: string) => {
    if (!shouldShowSeparator(column)) return "";
    return "relative after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[3px] after:bg-gradient-to-r after:from-slate-400 after:to-transparent after:shadow-lg before:content-[''] before:absolute before:right-0 before:top-0 before:bottom-0 before:w-[1px] before:bg-slate-300";
  };

  const handleAddLabel = (campaignId: string, label: string) => {
    if (label && currentAccountData) {
      dispatch(
        addLabelToCampaign({
          accountId: currentAccountData.account_id,
          campaignId: campaignId,
          label,
        }),
      )
    }
  }

  const handleRemoveLabel = (campaignId: string, label: string) => {
    if (currentAccountData) {
      dispatch(
        removeLabelFromCampaign({
          accountId: currentAccountData.account_id,
          campaignId: campaignId,
          label,
        }),
      )
    }
  }

  const handleCreateNewLabel = (campaignId: string) => {
    if (editLabelValue) {
      handleAddLabel(campaignId, editLabelValue)
      setEditLabelValue("")
      setEditingLabel(null)
    }
  }

  // Get column style based on column name
  const getColumnStyle = (column: string) => {
    if (column === "Campaign") {
      return { width: "auto", minWidth: "250px" }
    }
    if (column === "Labels") {
      return { width: "auto", minWidth: "150px" }
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

    setDraggedCampaign(null)
    setDragOverCampaign(null)
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
    return "h-[calc(100vh-120px)]"
  }

  const renderLabelDropdown = (campaign: Campaign) => {
    const campaignLabels = accountLabels[campaign.campaignId] || []

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 w-full justify-between">
            <div className="flex items-center gap-1 overflow-hidden">
              <Tag className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="truncate">
                {campaignLabels.length > 0
                  ? `${campaignLabels.length} label${campaignLabels.length > 1 ? "s" : ""}`
                  : "Add label"}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <div className="p-2">
            <div className="text-xs font-medium text-slate-500 mb-2">Predefined labels</div>
            {PREDEFINED_LABELS.map((label) => {
              const isSelected = campaignLabels.includes(label)
              return (
                <DropdownMenuItem
                  key={label}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    if (isSelected) {
                      handleRemoveLabel(campaign.campaignId, label)
                    } else {
                      handleAddLabel(campaign.campaignId, label)
                    }
                  }}
                >
                  <Badge
                    className={`bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 text-xs py-0.5 px-2 w-full`}
                  >
                    {label}
                  </Badge>
                </DropdownMenuItem>
              )
            })}

            {allUniqueLabels.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="text-xs font-medium text-slate-500 my-2">Custom labels</div>
                {allUniqueLabels
                  .filter((label) => !PREDEFINED_LABELS.includes(label))
                  .map((label) => {
                    const isSelected = campaignLabels.includes(label)
                    return (
                      <DropdownMenuItem
                        key={label}
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => {
                          if (isSelected) {
                            handleRemoveLabel(campaign.campaignId, label)
                          } else {
                            handleAddLabel(campaign.campaignId, label)
                          }
                        }}
                      >
                        <Badge className={`${labelColorMap.get(label)} text-xs py-0.5 px-2`}>{label}</Badge>
                      </DropdownMenuItem>
                    )
                  })}
              </>
            )}

            <DropdownMenuSeparator />

            {editingLabel === campaign.campaignId ? (
              <div className="flex items-center gap-1 px-2 py-1">
                <Input
                  ref={newLabelInputRef}
                  value={editLabelValue}
                  onChange={(e) => setEditLabelValue(e.target.value)}
                  placeholder="New label name"
                  className="h-7 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateNewLabel(campaign.campaignId)
                    } else if (e.key === "Escape") {
                      setEditingLabel(null)
                      setEditLabelValue("")
                    }
                  }}
                />
                <Button size="sm" className="h-7 px-2" onClick={() => handleCreateNewLabel(campaign.campaignId)}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault()
                  setEditingLabel(campaign.campaignId)
                  setEditLabelValue("")
                  setTimeout(() => {
                    newLabelInputRef.current?.focus()
                  }, 0)
                }}
              >
                <Plus className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-sm">Create new label</span>
              </DropdownMenuItem>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <TooltipProvider>
      <Card className={`overflow-hidden ${isFullScreen ? "fixed inset-0 z-50" : ""} border-slate-200 shadow-md`}>
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl">
              {/* Add All tab if blended summary is available */}
              {blendedSummary && blendedSummary.length > 0 && (
                <button
                  key="all"
                  onClick={() => setActiveTab("all")}
                  className={`px-6 py-1 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    activeTab === "all"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  All
                </button>
              )}
              
              {/* Individual account tabs */}
              {data.map((account) => (
                <button
                  key={account.account_id}
                  onClick={() => setActiveTab(account.account_id)}
                  className={`px-6 py-1 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    activeTab === account.account_id
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {account.account_name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
              {/* Date Picker */}
              <DatePickerWithRange /> 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`gap-1 font-medium ${statusFilter !== "all" ? "bg-blue-50 text-blue-600 border-blue-200" : ""}`}
                >
                  <Filter className={`h-4 w-4 ${statusFilter !== "all" ? "text-blue-600" : "text-slate-500"}`} />
                  {statusFilter === "all" ? "All Status" : statusFilter === "active" ? "Active" : "Paused"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem
                  onClick={() => setStatusFilter("all")}
                  className={statusFilter === "all" ? "bg-blue-50" : ""}
                >
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("active")}
                  className={statusFilter === "active" ? "bg-blue-50" : ""}
                >
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("paused")}
                  className={statusFilter === "paused" ? "bg-blue-50" : ""}
                >
                  Paused
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setIsEditMode(!isEditMode)}
                  size="sm"
                  className={`gap-1 font-medium ${isEditMode ? "bg-blue-50 text-blue-600 border-blue-200" : ""}`}
                  disabled={!isGroupingEnabled}
                >
                  <Edit className={`h-4 w-4 ${isEditMode ? "text-blue-600" : "text-slate-500"}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isEditMode ? "Exit Edit Mode" : "Edit Labels"}</TooltipContent>
            </Tooltip>
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={toggleFullScreen} className="font-medium">
                  {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="p-3">
          {/* Campaign Table */}
          {data.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No campaign data available
            </div>
          ) : (
            <div
              key={currentAccountData?.account_id}
              className="block"
            >
                <div
                  ref={tableRef}
                  className={`overflow-auto ${getTableHeight()} bg-white rounded-lg border border-slate-200 shadow-sm`}
                  onScroll={(e) => {
                    const target = e.target as HTMLDivElement
                    const currentScrollLeft = target.scrollLeft

                    setScrollLeft(currentScrollLeft)
                    if (scrollTimeoutRef.current) {
                      clearTimeout(scrollTimeoutRef.current)
                    }
                  }}
                >
                  <table className="w-full border-collapse text-xs relative">
                    <thead className="bg-slate-50 sticky top-0 z-20">
                      <tr>
                        {columnOrder
                          .filter((column) => visibleColumns.includes(column))
                          .filter((column) => !isGroupingEnabled || column !== "campaignName")
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
                                } ${dragOverColumn === column ? "bg-blue-50" : ""} ${getSeparatorClass(column)}`}
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
                                .filter((column) => !isGroupingEnabled || column !== "campaignName")
                                .map((column, index) => {
                                  const isFrozen = frozenColumns.includes(column)
                                  const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined
                                  const columnStyle = getColumnStyle(column)
                                  const summary = calculateGroupSummary(group.campaigns)

                                  if (column === "Campaign") {
                                    return (
                                      <td
                                        key={column}
                                        className={`p-2 border-r sticky z-10 bg-gradient-to-r from-slate-100 to-slate-50 ${getSeparatorClass(column)}`}
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
                                        } ${getSeparatorClass(column)}`}
                                        style={{
                                          left: leftPos,
                                          ...columnStyle,
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Badge
                                            className={`${labelColorMap.get(group.label)} w-fit flex items-center gap-1 cursor-default text-xs py-0.5 px-2 rounded-md`}
                                          >
                                            {group.label}
                                          </Badge>
                                          {isEditMode && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 rounded-full hover:bg-red-50"
                                              onClick={() => {
                                                // Remove this label from all campaigns in this group
                                                group.campaigns.forEach((campaign) => {
                                                  handleRemoveLabel(campaign.campaignId, group.label)
                                                })
                                              }}
                                            >
                                              <X className="h-3.5 w-3.5 text-red-500" />
                                            </Button>
                                          )}
                                        </div>
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
                              group.campaigns.map((campaign, index) => (
                                <tr
                                  key={`group-${group.label}-campaign-${campaign.campaignId}-${index}`}
                                  className={`group border-b border-2 hover:bg-slate-50 transition-colors ${
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
                                    .filter((column) => !isGroupingEnabled || column !== "campaignName")
                                    .map((column, index) => {
                                      const isFrozen = frozenColumns.includes(column)
                                      const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined
                                      const columnStyle = getColumnStyle(column)

                                      if (column === "Campaign") {
                                        return (
                                          <td
                                            key={column}
                                            className={`p-2 border-r sticky bg-white z-10 group-hover:bg-slate-50 transition-colors ${getSeparatorClass(column)}`}
                                            style={{
                                              left: leftPos,
                                              paddingLeft: "30px",
                                              ...columnStyle,
                                            }}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="font-medium">{campaign.campaignName}</span>
                                              { campaign.accountName && (
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                                                  {campaign.accountName}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        )
                                      }

                                      if (column === "Labels") {
                                        return (
                                          <td
                                            key={column}
                                            className={`p-2 border-r ${isFrozen ? "sticky z-10 bg-white group-hover:bg-slate-50 transition-colors" : ""} ${getSeparatorClass(column)}`}
                                            style={{
                                              left: leftPos,
                                              ...columnStyle,
                                            }}
                                          >
                                            {isEditMode && isGroupingEnabled ? (
                                              <div className="flex items-center gap-2">
                                                <Badge
                                                  className={`${labelColorMap.get(group.label)} w-fit flex items-center gap-1 text-xs py-0.5 px-2 rounded-md`}
                                                >
                                                  {group.label}
                                                </Badge>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 p-0 rounded-full hover:bg-red-50"
                                                  onClick={() => handleRemoveLabel(campaign.campaignId, group.label)}
                                                >
                                                  <X className="h-3.5 w-3.5 text-red-500" />
                                                </Button>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-7">
                                                      Change
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="start" className="w-56">
                                                    <div className="p-2">
                                                      {allUniqueLabels
                                                        .filter((label) => label !== group.label)
                                                        .map((label) => (
                                                          <DropdownMenuItem
                                                            key={label}
                                                            className="flex items-center gap-2 cursor-pointer"
                                                            onClick={() => {
                                                              handleRemoveLabel(campaign.campaignId, group.label)
                                                              handleAddLabel(campaign.campaignId, label)
                                                            }}
                                                          >
                                                            <Badge
                                                              className={`${labelColorMap.get(label)} text-xs py-0.5 px-2`}
                                                            >
                                                              {label}
                                                            </Badge>
                                                          </DropdownMenuItem>
                                                        ))}
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem
                                                        className="flex items-center gap-2 cursor-pointer"
                                                        onClick={(e) => {
                                                          e.preventDefault()
                                                          setEditingLabel(campaign.campaignId)
                                                          setEditLabelValue("")
                                                          setTimeout(() => {
                                                            newLabelInputRef.current?.focus()
                                                          }, 0)
                                                        }}
                                                      >
                                                        <Plus className="h-3.5 w-3.5 text-slate-500" />
                                                        <span className="text-sm">Create new label</span>
                                                      </DropdownMenuItem>
                                                      {editingLabel === campaign.campaignName && (
                                                        <div className="flex items-center gap-1 px-2 py-1 mt-2">
                                                          <Input
                                                            ref={newLabelInputRef}
                                                            value={editLabelValue}
                                                            onChange={(e) => setEditLabelValue(e.target.value)}
                                                            placeholder="New label name"
                                                            className="h-7 text-xs"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                              if (e.key === "Enter") {
                                                                handleCreateNewLabel(campaign.campaignId)
                                                                handleRemoveLabel(campaign.campaignId, group.label)
                                                              } else if (e.key === "Escape") {
                                                                setEditingLabel(null)
                                                                setEditLabelValue("")
                                                              }
                                                            }}
                                                          />
                                                          <Button
                                                            size="sm"
                                                            className="h-7 px-2"
                                                            onClick={() => {
                                                              handleCreateNewLabel(campaign.campaignId)
                                                              handleRemoveLabel(campaign.campaignId, group.label)
                                                            }}
                                                          >
                                                            <Check className="h-3.5 w-3.5" />
                                                          </Button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </div>
                                            ) : (
                                              renderLabelDropdown(campaign)
                                            )}
                                          </td>
                                        )
                                      }

                                      return (
                                        <td
                                          key={column}
                                          className={`p-2 border-r ${isFrozen ? "sticky z-10 bg-white group-hover:bg-slate-50 transition-colors" : ""} ${getSeparatorClass(column)}`}
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
                            .filter((column) => !isGroupingEnabled || column !== "campaignName")
                            .map((column, index) => {
                              const isFrozen = frozenColumns.includes(column)
                              const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined
                              const columnStyle = getColumnStyle(column)

                              if (column === "Campaign") {
                                return (
                                  <td
                                    key={column}
                                    className={`p-2 border-r sticky z-10 bg-gradient-to-r from-gray-100 to-gray-50 ${getSeparatorClass(column)}`}
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
                                    className={`p-2 border-r ${isFrozen ? "sticky z-10 bg-gradient-to-r from-slate-100 to-slate-50" : ""} ${getSeparatorClass(column)}`}
                                    style={{
                                      left: leftPos,
                                      ...columnStyle,
                                    }}
                                  >
                                    -
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
                      {(isGroupingEnabled ? ungroupedCampaigns : filteredCampaigns).map((campaign, index) => (
                        <tr
                          key={`${isGroupingEnabled ? "ungrouped" : "all"}-${campaign.campaignName}-${index}`}
                          className={`group border-b border-2 hover:bg-slate-50 transition-colors ${
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
                            .filter((column) => !isGroupingEnabled || column !== "campaignName")
                            .map((column, index) => {
                              const isFrozen = frozenColumns.includes(column)
                              const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined
                              const columnStyle = getColumnStyle(column)
                              if (column === "Campaign") {
                                return (
                                  <td
                                    key={column}
                                    className={`p-2 border-r sticky z-10 bg-white group-hover:bg-slate-50 transition-colors ${getSeparatorClass(column)}`}
                                    style={{
                                      left: leftPos,
                                      ...columnStyle,
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium">{campaign.campaignName}</span>
                                      { campaign.accountName && (
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                                          {campaign.accountName}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )
                              }

                              if (column === "Labels") {
                                return (
                                  <td
                                    key={column}
                                    className={`p-2 border-r ${isFrozen ? "sticky z-10 bg-white group-hover:bg-slate-50 transition-colors" : ""} ${getSeparatorClass(column)}`}
                                    style={{
                                      left: leftPos,
                                      ...columnStyle,
                                    }}
                                  >
                                    {renderLabelDropdown(campaign)}
                                  </td>
                                )
                              }

                              return (
                                <td
                                  key={column}
                                  className={`p-2 border-r ${isFrozen ? "sticky z-10 bg-white group-hover:bg-slate-50 transition-colors" : ""} ${getSeparatorClass(column)}`}
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
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </Card>
    </TooltipProvider>
  )
}

export default MetaCampaignTable
