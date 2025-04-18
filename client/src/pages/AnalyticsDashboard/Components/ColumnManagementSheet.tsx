import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, Settings2, GripVertical, Pin, PinOff } from "lucide-react";

interface ColumnManagementSheetProps {
  visibleColumns: string[];
  columnOrder: string[];
  frozenColumns?: string[];
  onVisibilityChange: (columns: string[]) => void;
  onOrderChange: (order: string[]) => void;
  onFrozenChange?: (columns: string[]) => void;
}

const ColumnManagementSheet: React.FC<ColumnManagementSheetProps> = ({ 
  visibleColumns, 
  columnOrder,
  frozenColumns = [],
  onVisibilityChange,
  onOrderChange,
  onFrozenChange
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);

  const filteredColumns = columnOrder.filter(column =>
    column.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragStart = (column: string) => {
    setDraggedColumn(column);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    if (column !== draggedColumn) {
      setDropTargetColumn(column);
    }
  };

  const handleDrop = (targetColumn: string) => {
    if (!draggedColumn || draggedColumn === targetColumn) return;

    const newOrder = [...columnOrder];
    const draggedIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetColumn);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);

    onOrderChange(newOrder);
    setDraggedColumn(null);
    setDropTargetColumn(null);
  };

  const toggleColumnVisibility = (column: string) => {
    const newVisibleColumns = visibleColumns.includes(column)
      ? visibleColumns.filter(col => col !== column)
      : [...visibleColumns, column];
    onVisibilityChange(newVisibleColumns);
  };

  const toggleColumnFreeze = (column: string) => {
    if (!onFrozenChange || column === 'Campaign') return; // Campaign column is always frozen
    
    const newFrozenColumns = frozenColumns.includes(column)
      ? frozenColumns.filter(col => col !== column)
      : [...frozenColumns, column];
    onFrozenChange(newFrozenColumns);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Settings2 className="w-4 h-4 mr-2" />
          Manage Columns
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Column Management</SheetTitle>
          <SheetDescription>
            Select columns to display, drag to reorder, and pin columns to freeze them
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          <div className="flex items-center space-x-2 px-1">
            <Search className="w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>
          
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {filteredColumns.map(column => (
              <div
                key={column}
                draggable
                onDragStart={() => handleDragStart(column)}
                onDragOver={(e) => handleDragOver(e, column)}
                onDrop={() => handleDrop(column)}
                className={`flex items-center space-x-3 p-3 border-b border-slate-200 hover:bg-slate-50 cursor-move
                  ${dropTargetColumn === column ? 'bg-slate-100' : ''}`}
              >
                <GripVertical className="w-4 h-4 text-slate-400" />
                <Checkbox
                  id={`col-${column}`}
                  checked={visibleColumns.includes(column)}
                  onCheckedChange={() => toggleColumnVisibility(column)}
                />
                <label
                  htmlFor={`col-${column}`}
                  className="flex-1 text-sm font-medium leading-none cursor-pointer"
                >
                  {column}
                </label>
                {onFrozenChange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`px-2 ${column === 'Campaign' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => toggleColumnFreeze(column)}
                    disabled={column === 'Campaign'}
                  >
                    {frozenColumns.includes(column) || column === 'Campaign' ? (
                      <Pin className="w-4 h-4 text-blue-500" />
                    ) : (
                      <PinOff className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ColumnManagementSheet;
