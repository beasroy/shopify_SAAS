import React, { useRef, useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FacebookLogo } from "@/pages/AnalyticsDashboard/AdAccountsMetricsCard"
import { Minimize2, Maximize2, ChevronUp, ChevronDown, Edit2, Save, X, Plus, Search } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  createGroup,
  deleteGroup,
  addCampaignToGroup,
  removeCampaignFromGroup,
  setSelectedCampaigns,
  toggleEditingGroup,
  toggleGroupExpansion,
  setIsCreatingGroup
} from "@/store/slices/CampaignGroupSlice"
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from "@/store"

interface Campaign {
  [key: string]: string | number
}

interface MetaReportTableProps {
  data: {
    account_name: string
    campaigns: Campaign[]
  }
  height?: string
}

const GROUP_COLORS = [
  "bg-purple-200",
  "bg-red-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-yellow-200",
  "bg-pink-50",
  "bg-indigo-50",
  "bg-orange-50",
  "bg-teal-50",
  "bg-cyan-50"
]

const MetaCampaignTable: React.FC<MetaReportTableProps> = ({ data, height = "max-h-[600px]" }) => {
  const dispatch = useDispatch()
  const {
    groups,
    selectedCampaigns,
    editingGroupId,
    expandedGroups,
    isCreatingGroup
  } = useSelector((state: RootState) => state.campaignGroups)

  const [isFullScreen, setIsFullScreen] = useState(false)
  const [sortColumn, setSortColumn] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isScrolled, setIsScrolled] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const tableRef = useRef<HTMLDivElement>(null)

  const handleCreateGroup = () => {
    if (newGroupName && selectedCampaigns.length > 0) {
      const color = GROUP_COLORS[groups.length % GROUP_COLORS.length]
      dispatch(createGroup({ name: newGroupName, campaigns: selectedCampaigns, color }))
      setNewGroupName("")
      dispatch(setSelectedCampaigns([]))
      dispatch(setIsCreatingGroup(false))
    }
  }

  const handleAddToGroup = (groupId: string, campaignName: string) => {
    dispatch(addCampaignToGroup({ groupId, campaignName }))
  }

  const handleRemoveFromGroup = (groupId: string, campaignName: string) => {
    dispatch(removeCampaignFromGroup({ groupId, campaignName }))
  }

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
      tableContainer.addEventListener("scroll", handleScroll)
    }

    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener("scroll", handleScroll)
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

  const filteredCampaigns = data.campaigns.filter(campaign => 
    (campaign.Campaign as string).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCellValue = (value: string | number, header: string) => {
    if (typeof value === "number") {
      if (header === "Amount spent" || header.toLowerCase().includes("cost") || header === "CPM") {
        return `₹${formatNumber(value)}`
      } else if (header.includes("Rate") || header === "ROAS") {
        return `${formatNumber(value)}%`
      } else if (header === "Frequency") {
        return formatNumber(value)
      } else {
        return Math.round(value).toLocaleString()
      }
    }
    return value
  }

  const calculateGroupMetrics = (campaigns: string[]) => {
    const metrics: { [key: string]: number } = {}
    const campaignData = data.campaigns.filter((c) => campaigns.includes(c.Campaign as string))

    headers.forEach((header) => {
      if (header !== "Campaign") {
        metrics[header] = campaignData.reduce((sum, campaign) => {
          const value = campaign[header]
          if (typeof value === "number") {
            if (header.includes("Rate") || header === "ROAS" || header === "Frequency") {
              return sum + value / campaignData.length
            } else {
              return sum + value
            }
          }
          return sum
        }, 0)
      }
    })

    return metrics
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

  const stickyColumnClass = isScrolled
    ? "after:absolute after:top-0 after:right-0 after:bottom-0 after:w-2 after:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.2)] after:-mr-0.5 border-r-2 border-r-slate-300"
    : ""

  const getTableHeight = () => {
    if (isFullScreen) {
      return "max-h-[calc(100vh-100px)]"
    }
    return height
  }

  const groupedCampaigns = groups.flatMap((group) => group.campaigns)
  const ungroupedCampaigns = sortedCampaigns.filter(
    (campaign) => !groupedCampaigns.includes(campaign.Campaign as string)
  )

  return (
    <Card className={`overflow-hidden ${isFullScreen ? "fixed inset-0 z-50" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-200">
        <CardTitle className="flex flex-row gap-3 items-center">
          <div className="text-xl font-bold text-slate-800">{data.account_name}</div>
          <FacebookLogo width="1.3rem" height="1.3rem" />
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => dispatch(setIsCreatingGroup(!isCreatingGroup))}
          >
            {isCreatingGroup ? "Cancel" : "Create Group"}
          </Button>
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
        {isCreatingGroup && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-4 mb-4">
              <Input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                className="px-3 py-2 border rounded-md"
              />
              <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    role="combobox"
                  >
                    {selectedCampaigns.length === 0 
                      ? "Select campaigns" 
                      : `${selectedCampaigns.length} campaign${selectedCampaigns.length === 1 ? '' : 's'} selected`
                    }
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="flex items-center space-x-2 p-3 border-b">
                    <Search className="h-4 w-4 opacity-50" />
                    <Input
                      placeholder="Search campaigns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredCampaigns.length === 0 ? (
                      <div className="text-sm text-center py-4 text-slate-500">
                        No campaigns found
                      </div>
                    ) : (
                      filteredCampaigns.map((campaign) => (
                        <div
                          key={campaign.Campaign as string}
                          className="flex items-center space-x-2 p-3 hover:bg-slate-100 cursor-pointer"
                          onClick={() => {
                            const campaignName = campaign.Campaign as string
                            const newSelected = selectedCampaigns.includes(campaignName)
                              ? selectedCampaigns.filter(c => c !== campaignName)
                              : [...selectedCampaigns, campaignName]
                            dispatch(setSelectedCampaigns(newSelected))
                          }}
                        >
                          <Checkbox
                            id={`campaign-${campaign.Campaign}`}
                            checked={selectedCampaigns.includes(campaign.Campaign as string)}
                            onCheckedChange={(checked) => {
                              const campaignName = campaign.Campaign as string
                              const newSelected = checked
                                ? [...selectedCampaigns, campaignName]
                                : selectedCampaigns.filter(c => c !== campaignName)
                              dispatch(setSelectedCampaigns(newSelected))
                            }}
                          />
                          <label
                            htmlFor={`campaign-${campaign.Campaign}`}
                            className="flex-1 text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {campaign.Campaign as string}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateGroup}
                disabled={!newGroupName || selectedCampaigns.length === 0}
              >
                Create Group
              </Button>
            </div>
            {selectedCampaigns.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-slate-600 mb-2">Selected campaigns:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedCampaigns.map(campaign => (
                    <Badge 
                      key={campaign}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {campaign}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                        onClick={() => dispatch(setSelectedCampaigns(
                          selectedCampaigns.filter(c => c !== campaign)
                        ))}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={tableRef} className={`overflow-auto ${getTableHeight()}`} style={{ position: "relative" }}>
          <table className="w-full border-collapse rounded-lg">
            <thead className="bg-slate-100 sticky top-0 z-30">
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={header}
                    className={`px-4 py-2 text-left text-sm font-bold text-slate-700 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap ${
                      index === 0
                        ? `sticky left-0 z-40 bg-slate-100 ${stickyColumnClass} border-r`
                        : "border-r border-slate-200"
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
              {groups.map((group) => {
                const isExpanded = expandedGroups.includes(group.id)
                const groupMetrics = calculateGroupMetrics(group.campaigns)

                return (
                  <React.Fragment key={group.id}>
                    <tr 
                      className={`group transition-colors ${group.color}`}
                      onClick={() => dispatch(toggleGroupExpansion(group.id))}
                      style={{ cursor: 'pointer' }}
                    >
                      <td colSpan={headers.length} className="px-4 py-2 text-sm font-semibold border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-slate-500" />
                            ) : (
                              <ChevronUp size={16} className="text-slate-500" />
                            )}
                            <span>{group.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              {group.campaigns.length} campaigns
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                dispatch(toggleEditingGroup(editingGroupId === group.id ? null : group.id))
                              }}
                            >
                              {editingGroupId === group.id ? <Save size={14} /> : <Edit2 size={14} />}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation()
                                dispatch(deleteGroup(group.id))
                              }}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Group Summary Row */}
                    <tr className={`bg-slate-50 ${isExpanded ? '' : 'hidden'}`}>
                      {headers.map((header, index) => (
                        <td
                          key={`summary-${header}`}
                          className={`px-4 py-2 text-xs font-semibold border-b border-slate-200 ${
                            index === 0 ? 'sticky left-0 bg-slate-50' : ''
                          }`}
                        >
                          {index === 0 ? (
                            'Group Summary'
                          ) : (
                            formatCellValue(groupMetrics[header] || 0, header)
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Individual Campaign Rows */}
                    {isExpanded && group.campaigns.map((campaignName) => {
                      const campaign = data.campaigns.find((c) => c.Campaign === campaignName)
                      return campaign ? (
                        <tr key={campaignName} className="group bg-slate-100 transition-colors">
                          {headers.map((header, colIndex) => (
                            <td
                              key={`${campaignName}-${colIndex}`}
                              className={`px-4 py-2 text-xs border-b border-slate-200 whitespace-nowrap ${
                                colIndex === 0
                                  ? `sticky left-0 z-20 bg-slate-100 font-semibold group-hover:text-blue-600 border-r ${stickyColumnClass}`
                                  : "border-r border-slate-200"
                              }`}
                              style={{
                                position: colIndex === 0 ? "sticky" : "static",
                                left: colIndex === 0 ? 0 : "auto",
                              }}
                            >
                              {formatCellValue(campaign[header], header)}
                            </td>
                          ))}
                        </tr>
                      ) : null
                    })}

                    {/* Edit Group Section */}
                    {editingGroupId === group.id && isExpanded && (
                      <tr>
                        <td colSpan={headers.length} className="px-4 py-2 border-b border-slate-200 bg-slate-50">
                          <div className="text-sm text-slate-600 mb-1">Add campaigns:</div>
                          <div className="flex flex-wrap gap-2">
                            {ungroupedCampaigns
                              .filter((c) => !group.campaigns.includes(c.Campaign as string))
                              .map((campaign) => (
                                <Badge
                                  key={campaign.Campaign as string}
                                  variant="outline"
                                  className="cursor-pointer"
                                  onClick={() => handleAddToGroup(group.id, campaign.Campaign as string)}
                                >
                                  <Plus size={12} className="mr-1" />
                                  {campaign.Campaign}
                                </Badge>
                              ))}
                          </div>
                          {group.campaigns.length > 0 && (
                            <>
                              <div className="text-sm text-slate-600 mt-4 mb-1">Remove campaigns:</div>
                              <div className="flex flex-wrap gap-2">
                                {group.campaigns.map((campaignName) => (
                                  <Badge
                                    key={campaignName}
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() => handleRemoveFromGroup(group.id, campaignName)}
                                  >
                                    <X size={12} className="mr-1" />
                                    {campaignName}
                                  </Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}

              {/* Ungrouped Campaigns */}
              {ungroupedCampaigns.map((campaign, rowIndex) => (
                <tr key={rowIndex} className="group hover:bg-slate-50 transition-colors">
                  {headers.map((header, colIndex) => (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      className={`px-4 py-2 text-xs border-b border-slate-200 whitespace-nowrap ${
                        colIndex === 0
                          ? `sticky left-0 z-20 bg-white group-hover:bg-slate-50 font-semibold group-hover:text-blue-600 border-r ${stickyColumnClass}`
                          : "border-r border-slate-200"
                      } ${rowIndex === ungroupedCampaigns.length - 1 ? "border-b-0" : ""}`}
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