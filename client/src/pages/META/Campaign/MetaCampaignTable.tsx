import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, ChevronDown, Maximize, Minimize } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RootState } from "@/store";
import {
  addLabelToCampaign,
  removeLabelFromCampaign,
  toggleAddingLabel
} from "@/store/slices/campaignLabelsSlice";
import { Badge } from "@/components/ui/badge";
import ColumnManagementSheet from "./ColumnManagementSheet";

const LABEL_COLORS = [
  'bg-red-100 text-red-800 hover:bg-red-200',
  'bg-blue-100 text-blue-800 hover:bg-blue-200',
  'bg-green-100 text-green-800 hover:bg-green-200',
  'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  'bg-purple-100 text-purple-800 hover:bg-purple-200',
  'bg-pink-100 text-pink-800 hover:bg-pink-200',
  'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  'bg-orange-100 text-orange-800 hover:bg-orange-200'
];

// Using a single fixed width for all columns except Campaign and Labels
const DEFAULT_COLUMN_WIDTH = "85px";

interface Campaign {
  Campaign: string;
  [key: string]: string | number;
}

interface MetaCampaignTableProps {
  data: {
    account_name: string;
    account_id: string;
    campaigns: Campaign[];
  },
  height: string;
}

const MetaCampaignTable: React.FC<MetaCampaignTableProps> = ({ data, height }) => {
  const dispatch = useDispatch();
  const [newLabel, setNewLabel] = useState("");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedCampaign, setDraggedCampaign] = useState<string | null>(null);
  const [dragOverCampaign, setDragOverCampaign] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [frozenColumns, setFrozenColumns] = useState<string[]>(['Campaign']);

  const tableRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({});

  const { labels, isAddingLabel } = useSelector((state: RootState) => state.campaignLabels);

  // Get account labels (safely)
  const accountLabels = labels[data.account_id] || {};

  // Check if any campaign in this account has labels
  const hasAnyLabels = Object.values(accountLabels).some(
    labelArray => labelArray && labelArray.length > 0
  );

  // Initialize column state
  useEffect(() => {
    if (data.campaigns.length > 0) {
      const columns = Object.keys(data.campaigns[0]);
      const initialColumns = columns.filter(col => col !== 'Labels');

      const shouldShowLabelsColumn = hasAnyLabels || isAddingLabel;
      const initialVisibleColumns = shouldShowLabelsColumn
        ? [...initialColumns, 'Labels']
        : initialColumns;

      setVisibleColumns(initialVisibleColumns);

      // Create column order with Campaign first, then Labels (if visible), then others
      const baseColumns = [...initialColumns].filter(col => col !== 'Campaign');
      const orderedColumns = ['Campaign'];

      if (shouldShowLabelsColumn) {
        orderedColumns.push('Labels');
      }

      orderedColumns.push(...baseColumns);
      setColumnOrder(orderedColumns);
    }
  }, [data.campaigns, hasAnyLabels, isAddingLabel]);

 

  const labelColorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    let colorIndex = 0;

    const allLabels = new Set<string>();
    Object.values(accountLabels).forEach(labelArray => {
      labelArray?.forEach(label => allLabels.add(label));
    });

    Array.from(allLabels).forEach(label => {
      map.set(label, LABEL_COLORS[colorIndex % LABEL_COLORS.length]);
      colorIndex++;
    });

    return map;
  }, [accountLabels]);

  // Calculate left position for frozen columns
  const getLeftPosition = (columnIndex: number): number => {
    let position = 0;

    // Get only the visible columns in the correct order
    const visibleOrderedColumns = columnOrder.filter(col => visibleColumns.includes(col));

    for (let i = 0; i < columnIndex; i++) {
      const column = visibleOrderedColumns[i];
      if (frozenColumns.includes(column)) {
        const columnElement = columnRefs.current[column];
        if (columnElement) {
          position += columnElement.offsetWidth;
        }
      }
    }

    return position;
  };

  const handleAddLabel = () => {
    if (newLabel && selectedCampaigns.length > 0) {
      selectedCampaigns.forEach(campaignId => {
        dispatch(addLabelToCampaign({
          accountId: data.account_id,
          campaignId,
          label: newLabel
        }));
      });
      setNewLabel("");
      setSelectedCampaigns([]);
      dispatch(toggleAddingLabel(false));

      // Ensure Labels column is visible after adding a label
      if (!visibleColumns.includes('Labels')) {
        setVisibleColumns([...visibleColumns, 'Labels']);

        // Also add Labels to column order if it's not there
        if (!columnOrder.includes('Labels')) {
          const campaignIndex = columnOrder.indexOf('Campaign');
          const newOrder = [...columnOrder];
          newOrder.splice(campaignIndex + 1, 0, 'Labels');
          setColumnOrder(newOrder);
        }
      }
    }
  };

  const handleRemoveLabel = (campaignId: string, label: string) => {
    dispatch(removeLabelFromCampaign({
      accountId: data.account_id,
      campaignId,
      label
    }));
  };

  const filteredCampaigns = data.campaigns.filter(campaign =>
    campaign.Campaign.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get column style based on column name
  const getColumnStyle = (column: string) => {
    if (column === 'Campaign') {
      return { width: 'auto', minWidth: '200px' };
    }
    if (column === 'Labels') {
      return { width: 'auto', minWidth: '100px' };
    }

    // All other columns get the fixed width
    return {
      width: DEFAULT_COLUMN_WIDTH,
      minWidth: DEFAULT_COLUMN_WIDTH
    };
  };

  // Campaign drag and drop handlers
  const handleDragStart = (campaignId: string) => {
    setDraggedCampaign(campaignId);
  };

  const handleDragOver = (e: React.DragEvent, campaignId: string) => {
    e.preventDefault();
    if (campaignId !== draggedCampaign) {
      setDragOverCampaign(campaignId);
    }
  };

  const handleDrop = (targetCampaignId: string) => {
    if (!draggedCampaign || draggedCampaign === targetCampaignId) return;

    // Reorder campaigns logic would go here
    // For now, just reset the state
    setDraggedCampaign(null);
    setDragOverCampaign(null);

    // Note: In a real implementation, you would dispatch an action to update the order in your Redux store
    console.log(`Dragged ${draggedCampaign} and dropped on ${targetCampaignId}`);
  };

  const handleDragEnd = () => {
    setDraggedCampaign(null);
    setDragOverCampaign(null);
  };

  // Column drag and drop handlers
  const handleColumnDragStart = (columnName: string) => {
    setDraggedColumn(columnName);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    if (columnName !== draggedColumn) {
      setDragOverColumn(columnName);
    }
  };

  const handleColumnDrop = (targetColumnName: string) => {
    if (!draggedColumn || draggedColumn === targetColumnName) return;

    // Reorder columns
    const draggedIndex = columnOrder.indexOf(draggedColumn);
    const targetIndex = columnOrder.indexOf(targetColumnName);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newColumnOrder = [...columnOrder];
      newColumnOrder.splice(draggedIndex, 1);
      newColumnOrder.splice(targetIndex, 0, draggedColumn);
      setColumnOrder(newColumnOrder);
    }

    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Toggle full screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const getTableHeight = () => {
    if (isFullScreen) {
      return "max-h-[calc(100vh-100px)]";
    }
    return height;
  };

  return (
    <Card className={`overflow-hidden ${isFullScreen ? "fixed inset-0 z-50" : ""}`}>
      <div className="flex items-center justify-between p-3 border-b">
        <div className="text-lg font-semibold">{data.account_name}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => dispatch(toggleAddingLabel(!isAddingLabel))}
            size="sm"
          >
            {isAddingLabel ? "Cancel" : "Add Label"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullScreen}
          >
            {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <ColumnManagementSheet
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            frozenColumns={frozenColumns}
            onVisibilityChange={setVisibleColumns}
            onOrderChange={setColumnOrder}
            onFrozenChange={setFrozenColumns}
          />
        </div>
      </div>

      <div className="p-3">
        {isAddingLabel && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Enter label name"
                className="max-w-xs"
              />
              <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-between text-xs" size="sm">
                    {selectedCampaigns.length === 0
                      ? "Select campaigns"
                      : `${selectedCampaigns.length} selected`}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0">
                  <div className="p-2">
                    <Input
                      placeholder="Search campaigns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2 text-xs"
                    />
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredCampaigns.map((campaign) => (
                        <div
                          key={campaign.Campaign}
                          className="flex items-center space-x-2 p-1 hover:bg-slate-100 rounded"
                        >
                          <Checkbox
                            checked={selectedCampaigns.includes(campaign.Campaign)}
                            onCheckedChange={(checked) => {
                              setSelectedCampaigns(
                                checked
                                  ? [...selectedCampaigns, campaign.Campaign]
                                  : selectedCampaigns.filter(id => id !== campaign.Campaign)
                              );
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
              >
                Add Label
              </Button>
            </div>
            {selectedCampaigns.length > 0 && (
              <div className="text-xs text-slate-500">
                {selectedCampaigns.length} campaign(s) selected
              </div>
            )}
          </div>
        )}

        <div
          ref={tableRef}
          className={`overflow-auto ${getTableHeight()} `}
        >
          <table className="w-full border-collapse text-xs relative">
            <thead className="bg-slate-50 sticky top-0 z-20">
              <tr>
                {columnOrder
                  .filter(column => visibleColumns.includes(column))
                  .map((column, index) => {
                    const isFrozen = frozenColumns.includes(column);
                    const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined;
                    const columnStyle = getColumnStyle(column);

                    return (
                      <th
                        key={column}
                        ref={(el) => columnRefs.current[column] = el}
                        className={`text-left p-2 font-medium text-slate-700 border-b border-r ${isFrozen ? 'sticky z-20 bg-slate-50' : ''
                          } ${dragOverColumn === column ? 'bg-blue-50' : ''
                          }`}
                        style={{
                          left: leftPos,
                          ...columnStyle
                        }}
                        draggable
                        onDragStart={() => handleColumnDragStart(column)}
                        onDragOver={(e) => handleColumnDragOver(e, column)}
                        onDrop={() => handleColumnDrop(column)}
                        onDragEnd={handleColumnDragEnd}
                      >
                        <div className="flex items-center justify-between">
                          <span>{column}</span>
                          <span className="opacity-30 cursor-grab">⋮⋮</span>
                        </div>
                      </th>
                    );
                  })}
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((campaign) => (
                <tr
                  key={campaign.Campaign}
                  className={`border-b hover:bg-slate-50 ${dragOverCampaign === campaign.Campaign ? 'bg-blue-50' : ''
                    }`}
                  draggable
                  onDragStart={() => handleDragStart(campaign.Campaign)}
                  onDragOver={(e) => handleDragOver(e, campaign.Campaign)}
                  onDrop={() => handleDrop(campaign.Campaign)}
                  onDragEnd={handleDragEnd}
                >
                  {columnOrder
                    .filter(column => visibleColumns.includes(column))
                    .map((column, index) => {
                      const isFrozen = frozenColumns.includes(column);
                      const leftPos = isFrozen ? `${getLeftPosition(index)}px` : undefined;
                      const columnStyle = getColumnStyle(column);

                      if (column === 'Campaign') {
                        return (
                          <td
                            key={column}
                            className={`p-2 border-r sticky z-10`}
                            style={{
                              left: leftPos,
                              backgroundColor: 'white',
                              ...columnStyle
                            }}
                          >
                            <div>{campaign.Campaign}</div>
                          </td>
                        );
                      }

                      if (column === 'Labels') {
                        return (
                          <td
                            key={column}
                            className={`p-2 border-r ${isFrozen ? 'sticky z-10' : ''
                              }`}
                            style={{
                              left: leftPos,
                              backgroundColor: isFrozen ? 'white' : undefined,
                              ...columnStyle
                            }}
                          >
                            <div className="flex flex-wrap gap-1">
                              {accountLabels[campaign.Campaign]?.map((label: string) => (
                                <Badge
                                  key={label}
                                  className={`${labelColorMap.get(label)} flex items-center gap-1 cursor-default text-xs py-0 px-1`}
                                >
                                  {label}
                                  <X
                                    className="h-2 w-2 cursor-pointer hover:opacity-75"
                                    onClick={() => handleRemoveLabel(campaign.Campaign, label)}
                                  />
                                </Badge>
                              ))}
                              {!accountLabels[campaign.Campaign]?.length && (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={column}
                          className={`p-2 border-r ${isFrozen ? 'sticky z-10' : ''
                            }`}
                          style={{
                            left: leftPos,
                            backgroundColor: isFrozen ? 'white' : undefined,
                            ...columnStyle
                          }}
                        >
                          <div>{campaign[column]}</div>
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default MetaCampaignTable;