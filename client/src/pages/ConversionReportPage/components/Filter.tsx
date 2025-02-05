// src/components/FilterConversions.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDispatch, useSelector } from 'react-redux';
import { setSessionsFilter, setConvRateFilter, clearFilters } from "@/store/slices/ConversionFilterSlice";
import { RootState } from '@/store';

interface FilterConversionsProps {
  componentId: string; // Add this prop to identify the component instance
}

export default function FilterConversions({ componentId }: FilterConversionsProps) {
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => 
    state.conversionFilters[componentId] || { sessionsFilter: null, convRateFilter: null }
  );

  const [selectedColumn, setSelectedColumn] = useState<string>("Total Sessions");
  const [operator, setOperator] = useState<string>(">");
  const [value, setValue] = useState<number | undefined>(undefined);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const handleAddFilter = () => {
    if (value === undefined || isNaN(value)) {
      alert("Please enter a valid value");
      return;
    }

    const filterValue = { value, operator };

    if (selectedColumn === "Total Sessions") {
      dispatch(setSessionsFilter({ componentId, filter: filterValue }));
    } else if (selectedColumn === "Avg Conv Rate") {
      dispatch(setConvRateFilter({ componentId, filter: filterValue }));
    }

    setDropdownOpen(false);
  };

  const handleClearFilters = () => {
    dispatch(clearFilters(componentId));
    setSelectedColumn("Total Sessions");
    setOperator(">");
    setValue(undefined);
    setDropdownOpen(false);
  };

  const isFilterApplied = filters.sessionsFilter !== null || filters.convRateFilter !== null;

  const filterTooltip = filters.sessionsFilter
    ? `Sessions: ${filters.sessionsFilter.operator} ${filters.sessionsFilter.value}`
    : filters.convRateFilter
    ? `Avg Conv Rate: ${filters.convRateFilter.operator} ${filters.convRateFilter.value}`
    : "";

  return (
    <TooltipProvider>
      <div>
        <Tooltip>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <TooltipTrigger>
                <Button variant="outline" size="icon">
                  <Filter className={`h-4 w-4 ${isFilterApplied ? 'text-blue-500' : ''}`} />
                </Button>
              </TooltipTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-4 flex flex-col gap-4">
              {/* Rest of the dropdown content remains the same */}
              <Select onValueChange={setSelectedColumn} value={selectedColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Total Sessions">Total Sessions</SelectItem>
                  <SelectItem value="Avg Conv Rate">Avg Conv Rate</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={setOperator} value={operator}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">{'Greater Than ( > )'}</SelectItem>
                  <SelectItem value=">=">{'Greater Than or Equal To ( >= )'}</SelectItem>
                  <SelectItem value="<">{'Less Than ( < )'}</SelectItem>
                  <SelectItem value="<=">{'Less Than or Equal To ( <= )'}</SelectItem>
                  <SelectItem value="==">{'Equal To ( == )'}</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Enter Value"
                value={value === undefined ? "" : value}
                onChange={(e) => setValue(parseFloat(e.target.value))}
                className="w-full"
              />

              <div className="flex flex-row gap-2 items-center justify-center w-full">
                <Button onClick={handleAddFilter} className="w-full">
                  Add Filter
                </Button>
                <Button variant="destructive" className="w-full" onClick={handleClearFilters}>
                  Clear
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {isFilterApplied && (
            <TooltipContent>
              {filterTooltip}
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}