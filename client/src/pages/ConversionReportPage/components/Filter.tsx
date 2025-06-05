import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { clearFilters, setFilter } from "@/store/slices/ConversionFilterSlice";
// Define all possible filterable columns
const FILTERABLE_COLUMNS = [
  "Total Sessions", 
  "Avg Conv Rate", 
  "Total Cost", 
  "Conv. Value / Cost"
] as const;

type FilterableColumn = typeof FILTERABLE_COLUMNS[number];

interface FilterValue {
  value: number;
  operator: string;
}

interface FilterConversionsProps {
  componentId: string;
  availableColumns?: readonly FilterableColumn[];
}

export default function FilterConversions({ 
  componentId, 
  availableColumns = FILTERABLE_COLUMNS 
}: FilterConversionsProps) {
  const dispatch = useDispatch();
  
  // Dynamic filter retrieval
  const filters = useSelector((state: RootState) => 
    state.conversionFilters[componentId] || {}
  );

  const [selectedColumn, setSelectedColumn] = useState<FilterableColumn>(availableColumns[0]);
  const [operator, setOperator] = useState<string>(">");
  const [value, setValue] = useState<number | undefined>(undefined);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const handleAddFilter = () => {
    if (value === undefined || isNaN(value)) {
      alert("Please enter a valid value");
      return;
    }

    const filterValue = { value, operator };

    // Dispatch a generic filter action
    dispatch(setFilter({ 
      componentId, 
      column: selectedColumn, 
      filter: filterValue 
    }));

    setDropdownOpen(false);
  };

  const handleClearFilters = () => {
    dispatch(clearFilters(componentId));
    setSelectedColumn(availableColumns[0]);
    setOperator(">");
    setValue(undefined);
    setDropdownOpen(false);
  };

  // Check if any filter is applied
  const isFilterApplied = Object.values(filters).some(filter => filter !== null);

  // Generate tooltip text for applied filters
  const filterTooltip = Object.entries(filters)
    .filter(([_, filter]) => filter !== null)
    .map(([column, filter]) => 
      `${column}: ${filter?.operator} ${filter?.value}`
    )
    .join(", ");

  return (
    <TooltipProvider>
      <Tooltip open={isFilterApplied}>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Filter className={`h-4 w-4 ${isFilterApplied ? 'text-blue-500' : ''}`} />
              {Object.values(filters).filter(Boolean).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-4 flex flex-col gap-4">
            <Select 
              onValueChange={(value) => setSelectedColumn(value as FilterableColumn)} 
              value={selectedColumn}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Column" />
              </SelectTrigger>
              <SelectContent id="metric-dropdown">
                {availableColumns.map(column => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={setOperator} value={operator}>
              <SelectTrigger>
                <SelectValue placeholder="Select Operator" />
              </SelectTrigger>
              <SelectContent  id="condition-dropdown">
                <SelectItem value=">">{'Greater Than ( > )'}</SelectItem>
                <SelectItem value=">=">{'Greater Than or Equal To ( >= )'}</SelectItem>
                <SelectItem value="<">{'Less Than ( < )'}</SelectItem>
                <SelectItem value="<=">{'Less Than or Equal To ( <= )'}</SelectItem>
                <SelectItem value="==">{'Equal To ( == )'}</SelectItem>
              </SelectContent>
            </Select>

            <Input
            id="value-input"
              type="number"
              placeholder="Enter Value"
              value={value === undefined ? "" : value}
              onChange={(e) => setValue(parseFloat(e.target.value))}
              className="w-full"
            />

            <div id="Apply the Filter" className="flex flex-row gap-2 items-center justify-center w-full">
              <Button onClick={handleAddFilter} className="w-full">
                Add Filter
              </Button>
              <Button id="clear-button" variant="destructive" className="w-full" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>

            {Object.entries(filters).filter(([_, filter]) => filter !== null).length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Active Filters:</h4>
                <div className="space-y-2">
                  {Object.entries(filters)
                    .filter(([_, filter]) => filter !== null)
                    .map(([column, filter]) => (
                      <div key={column} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded">
                        <span>{column}</span>
                        <span className="text-slate-600">{filter?.operator} {filter?.value}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipContent>
          {filterTooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Export the types for potential use in other components
export type { FilterableColumn, FilterValue };