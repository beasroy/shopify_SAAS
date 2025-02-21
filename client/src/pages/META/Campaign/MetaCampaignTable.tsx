import React, { useRef, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FacebookLogo } from "@/pages/AnalyticsDashboard/AdAccountsMetricsCard";
import { MdOutlineCampaign } from "react-icons/md";
import {
  Minimize2,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Edit2,
  Save,
  X,
  Search,
  MinusCircle,
  GripHorizontal,
  Plus,
  Trash,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from "@/store";
import {
  createGroup,
  deleteGroup,
  addCampaignToGroup,
  removeCampaignFromGroup,
  setSelectedCampaigns,
  toggleEditingGroup,
  toggleGroupExpansion,
  setIsCreatingGroup
} from "@/store/slices/CampaignGroupSlice";

import ColumnManagementSheet from "./ColumnManagementSheet";

interface Campaign {
  [key: string]: string | number;
}

interface MetaReportTableProps {
  data: {
    account_name: string;
    account_id: string;
    campaigns: Campaign[];
  };
  height?: string;
}

const GROUP_COLORS = [
  "bg-red-100",
  "bg-emerald-100",
  "bg-orange-100",
  "bg-indigo-100",
  "bg-lime-100",
  "bg-pink-100",
  "bg-purple-100",
  "bg-teal-100",
  "bg-fuchsia-100",
  "bg-cyan-100"
];

const GROUP_DEEP_COLORS: Record<string, string> = {
  "bg-red-100": "bg-red-600",
  "bg-emerald-100": "bg-emerald-600",
  "bg-orange-100": "bg-orange-600",
  "bg-indigo-100": "bg-indigo-600",
  "bg-lime-100": "bg-lime-600",
  "bg-pink-100": "bg-pink-600",
  "bg-purple-100": "bg-purple-600",
  "bg-teal-100": "bg-teal-600",
  "bg-fuchsia-100": "bg-fuchsia-600",
  "bg-cyan-100": "bg-cyan-600"
};

const MetaCampaignTable: React.FC<MetaReportTableProps> = ({ data, height = "max-h-[600px]" }) => {
  const dispatch = useDispatch();
  const campaignGroupState = useSelector((state: RootState) => {
    if (!state.campaignGroups?.accounts) {
      return {
        groups: [],
        selectedCampaigns: [],
        editingGroupId: null,
        expandedGroups: [],
        isCreatingGroup: false
      };
    }
    return state.campaignGroups.accounts[data.account_id] ?? {
      groups: [],
      selectedCampaigns: [],
      editingGroupId: null,
      expandedGroups: [],
      isCreatingGroup: false
    };
  });

  const {
    groups,
    selectedCampaigns,
    editingGroupId,
    expandedGroups,
    isCreatingGroup
  } = campaignGroupState;

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isScrolled, setIsScrolled] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  const headers = data.campaigns.length > 0 ? Object.keys(data.campaigns[0]) : [];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(headers);
  const [columnOrder, setColumnOrder] = useState<string[]>(headers);
  const [frozenColumns, setFrozenColumns] = useState<string[]>(["Campaign"]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);

  useEffect(() => {
    if (data.account_id) {
      dispatch(setSelectedCampaigns({
        accountId: data.account_id,
        campaigns: []
      }));
    }
  }, [data.account_id, dispatch]);

  const handleDragStart = (column: string) => {
    setDraggedColumn(column);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    setDropTargetColumn(column);
  };

  const handleDrop = (targetColumn: string) => {
    if (!draggedColumn) return;

    const newOrder = [...columnOrder];
    const draggedIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetColumn);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);

    setColumnOrder(newOrder);
    setDraggedColumn(null);
    setDropTargetColumn(null);
  };

  const getColumnLeftPosition = (columnIndex: number): number => {
    let position = 0;
    for (let i = 0; i < columnIndex; i++) {
      const column = columnOrder[i];
      if (frozenColumns.includes(column) && visibleColumns.includes(column)) {
        position += column === "Campaign" ? 210 : 110;
      }
    }
    return position;
  };

  const handleCreateGroup = () => {
    if (newGroupName && selectedCampaigns.length > 0) {
      const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
      dispatch(createGroup({
        accountId: data.account_id,
        name: newGroupName,
        campaigns: selectedCampaigns,
        color
      }));
      setNewGroupName("");
      dispatch(setSelectedCampaigns({ accountId: data.account_id, campaigns: [] }));
      dispatch(setIsCreatingGroup({ accountId: data.account_id, isCreating: false }));
    }
  };

  const handleAddToGroup = (groupId: string, campaignName: string) => {
    dispatch(addCampaignToGroup({ accountId: data.account_id, groupId, campaignName }));
  };

  const handleRemoveFromGroup = (groupId: string, campaignName: string) => {
    dispatch(removeCampaignFromGroup({ accountId: data.account_id, groupId, campaignName }));
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      setIsScrolled(target.scrollLeft > 0);
    };

    const tableContainer = tableRef.current;
    if (tableContainer) {
      tableContainer.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatCellValue = (value: string | number, header: string) => {
    if (typeof value === "number") {
      if (header === "Amount spent" || header.toLowerCase().includes("cost") || header === "CPM") {
        return `₹${formatNumber(value)}`;
      } else if (header.includes("Rate") || header === "ROAS") {
        return `${formatNumber(value)}%`;
      } else if (header === "Frequency") {
        return formatNumber(value);
      } else {
        return Math.round(value).toLocaleString();
      }
    }
    return value;
  };

  const calculateGroupMetrics = (campaigns: string[]) => {
    const metrics: { [key: string]: string | number } = {};
    const campaignData = data.campaigns.filter((c) => campaigns.includes(c.Campaign as string));

    headers.forEach((header) => {
      if (header !== "Campaign") {
        metrics[header] = campaignData.reduce((sum, campaign) => {
          const value = campaign[header];
          if (typeof value === "number") {
            if (header.includes("Rate") || header === "ROAS" || header === "Frequency") {
              return sum + value / campaignData.length;
            } else {
              return sum + value;
            }
          }
          return sum;
        }, 0);
      }
      if (header === "Status") {
        metrics["Status"] = "-";
      }
    });

    return metrics;
  };

  const filteredCampaigns = data.campaigns.filter(campaign =>
    (campaign.Campaign as string).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    if (sortColumn) {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      } else {
        return sortDirection === "asc"
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      }
    }
    return 0;
  });

  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const stickyColumnClass = isScrolled
    ? "after:absolute after:top-0 after:right-0 after:bottom-0 after:w-2 after:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.2)] after:-mr-0.5 border-r-2 border-r-slate-300"
    : "";

  const getTableHeight = () => {
    if (isFullScreen) {
      return "max-h-[calc(100vh-100px)]";
    }
    return height;
  };

  const groupedCampaigns = groups.flatMap((group) => group.campaigns);
  const ungroupedCampaigns = sortedCampaigns.filter(
    (campaign) => !groupedCampaigns.includes(campaign.Campaign as string)
  );

  const renderTableHeader = () => (
    <thead className="bg-slate-100 sticky top-0 z-30">
      <tr>
        {columnOrder
          .filter(header => visibleColumns.includes(header))
          .map((header, _) => {
            const isFrozen = frozenColumns.includes(header);
            const leftPosition = isFrozen ? getColumnLeftPosition(columnOrder.indexOf(header)) : 'auto';
            
            return (
              <th
                key={header}
                className={`px-4 py-2 text-left text-sm font-bold text-slate-700 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors sticky z-40 bg-slate-100 ${stickyColumnClass} border-r`}
                onClick={() => handleSort(header)}
                draggable
                onDragStart={() => handleDragStart(header)}
                onDragOver={(e) => handleDragOver(e, header)}
                onDrop={() => handleDrop(header)}
                style={{
                  minWidth: header === "Campaign" ? "210px" : "110px",
                  position: isFrozen ? "sticky" : "static",
                  left: leftPosition,
                  background: dropTargetColumn === header ? "rgb(226 232 240)" : "",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <GripHorizontal className="w-4 h-4 mr-2 text-slate-400" />
                    <span>{header}</span>
                  </div>
                  {sortColumn === header && (
                    sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
            );
          })}
      </tr>
    </thead>
  );

  const renderTableCell = (value: any, header: string, isGroupRow: boolean = false) => {
    const isFrozen = frozenColumns.includes(header);
    const leftPosition = isFrozen ? getColumnLeftPosition(columnOrder.indexOf(header)) : 'auto';
    
    return (
      <td
        key={`${value}-${header}`}
        className={`px-4 py-2 text-xs border-b sticky z-20 border-r border-slate-200 ${isGroupRow ? 'bg-inherit' : 'bg-white group-hover:bg-slate-50'} ${stickyColumnClass}
        }`}
        style={{
          position: isFrozen ? "sticky" : "static",
          left: leftPosition,
        }}
      >
        {formatCellValue(value, header)}
      </td>
    );
  };

  return (
    <Card className={`overflow-hidden ${isFullScreen ? "fixed inset-0 z-50" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-200">
        <CardTitle className="flex flex-row gap-3 items-center">
          <div className="text-xl font-bold text-slate-800">{data.account_name}</div>
          <FacebookLogo width="1.3rem" height="1.3rem" />
        </CardTitle>
        <div className="flex items-center space-x-2">
          <ColumnManagementSheet
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            frozenColumns={frozenColumns}
            onVisibilityChange={setVisibleColumns}
            onOrderChange={setColumnOrder}
            onFrozenChange={setFrozenColumns}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(setIsCreatingGroup({ accountId: data.account_id, isCreating: !isCreatingGroup }))}
          >
            {isCreatingGroup ? "Cancel" : "Create Group"}
          </Button>
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
                            const campaignName = campaign.Campaign as string;
                            const newSelected = selectedCampaigns.includes(campaignName)
                              ? selectedCampaigns.filter(c => c !== campaignName)
                              : [...selectedCampaigns, campaignName];
                            dispatch(setSelectedCampaigns({
                              accountId: data.account_id,
                              campaigns: newSelected
                            }));
                          }}
                        >
                          <Checkbox
                            id={`campaign-${campaign.Campaign}`}
                            checked={selectedCampaigns.includes(campaign.Campaign as string)}
                            onCheckedChange={(checked) => {
                              const campaignName = campaign.Campaign as string;
                              const newSelected = checked
                                ? [...selectedCampaigns, campaignName]
                                : selectedCampaigns.filter(c => c !== campaignName);
                              dispatch(setSelectedCampaigns({
                                accountId: data.account_id,
                                campaigns: newSelected
                              }));
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
                        onClick={() => dispatch(setSelectedCampaigns({
                          accountId: data.account_id,
                          campaigns: selectedCampaigns.filter(c => c !== campaign)
                        }))}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={tableRef} className={`overflow-auto ${getTableHeight()}`}>
          <table className="w-full border-collapse rounded-lg">
            {renderTableHeader()}
            <tbody>
              {groups.map((group) => {
                const isExpanded = expandedGroups.includes(group.id);
                const groupMetrics = calculateGroupMetrics(group.campaigns);
                const deepColor = GROUP_DEEP_COLORS[group.color] || group.color;

                return (
                  <React.Fragment key={group.id}>
                    <tr
                      onClick={() => dispatch(toggleGroupExpansion({ accountId: data.account_id, groupId: group.id }))}
                      className={`group transition-colors cursor-pointer ${group.color} ${isExpanded ? 'border-2 border-gray-400' : ''}`}
                    >
                      {columnOrder
                        .filter(header => visibleColumns.includes(header))
                        .map((header) => {
                          if (header === "Campaign") {
                            return (
                              <td
                                key={header}
                                className={` px-4 py-2 text-xs border-b border-slate-200 sticky left-0 z-20 bg-inherit ${stickyColumnClass}`}
                              >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${deepColor}`} />
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className="flex items-center gap-2 cursor-pointer pl-3"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(toggleGroupExpansion({ accountId: data.account_id, groupId: group.id }));
                                      }}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown size={16} className="text-slate-500" />
                                      ) : (
                                        <ChevronUp size={16} className="text-slate-500" />
                                      )}
                                      <span className="font-semibold text-sm">{group.name}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="secondary" className="text-xs">
                                      <span className="flex flex-row items-center gap-2">
                                        {group.campaigns.length} <MdOutlineCampaign className="h-4 w-4" />
                                      </span>
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(toggleEditingGroup({
                                          accountId: data.account_id,
                                          groupId: editingGroupId === group.id ? null : group.id
                                        }));
                                      }}
                                    >
                                      {editingGroupId === group.id ? <Save size={12} /> : <Edit2 size={12} />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(deleteGroup({ accountId: data.account_id, groupId: group.id }));
                                      }}
                                    >
                                      <Trash size={12} />
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            );
                          }
                          return renderTableCell(groupMetrics[header], header, true);
                        })}
                    </tr>

                    {isExpanded && group.campaigns.map((campaignName) => {
                      const campaign = data.campaigns.find((c) => c.Campaign === campaignName);
                      if (!campaign) return null;

                      return (
                        <tr key={campaignName} className="group bg-zinc-100 transition-colors">
                          {columnOrder
                            .filter(header => visibleColumns.includes(header))
                            .map((header) => {
                              if (header === "Campaign") {
                                return (
                                  <td
                                    key={header}
                                    className={`px-4 py-2 text-xs border-b border-slate-200 sticky left-0 z-20 bg-zinc-100 group-hover:bg-slate-50 font-semibold ${stickyColumnClass}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>{campaign[header]}</span>
                                      {editingGroupId === group.id && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2"
                                          onClick={() => handleRemoveFromGroup(group.id, campaignName)}
                                        >
                                          <MinusCircle size={14} className="text-red-500" />
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                );
                              }
                              return renderTableCell(campaign[header], header);
                            })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {ungroupedCampaigns.map((campaign) => (
                <tr key={campaign.Campaign as string} className="group hover:bg-slate-50 transition-colors">
                  {columnOrder
                    .filter(header => visibleColumns.includes(header))
                    .map((header) => {
                      if (header === "Campaign") {
                        return (
                          <td
                            key={header}
                            className={`px-4 py-2 text-xs border-b border-slate-200 sticky left-0 z-20 bg-white group-hover:bg-slate-50 font-semibold ${stickyColumnClass}`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{campaign[header]}</span>
                              {editingGroupId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => handleAddToGroup(editingGroupId, campaign.Campaign as string)}
                                >
                                  <Plus size={14} className="text-green-500" />
                                </Button>
                              )}
                            </div>
                          </td>
                        );
                      }
                      return renderTableCell(campaign[header], header);
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetaCampaignTable;