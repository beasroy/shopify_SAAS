import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addFilter, removeFilter, clearFilters, FilterCondition } from '@/store/slices/interestFilterSlice';
import { RootState } from '@/store';
import { Filter, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InterestFilterProps {
  columns: string[];
  tableId: string;
}

const InterestFilter: React.FC<InterestFilterProps> = ({ columns, tableId }) => {
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.interestFilter.filters[tableId] || []);
  const [open, setOpen] = useState(false);
  const [newFilter, setNewFilter] = useState<Omit<FilterCondition, 'value'> & { value: string }>({
    column: columns[0],
    operator: '>',
    value: '',
  });

  const handleAddFilter = () => {
    if (newFilter.value) {
      dispatch(addFilter({
        tableId,
        filter: {
          ...newFilter,
          value: newFilter.column === 'Interest' ? newFilter.value : Number(newFilter.value)
        }
      }));
      setNewFilter({ ...newFilter, value: '' });
      setOpen(false);
    }
  };

  const handleRemoveFilter = (index: number) => {
    dispatch(removeFilter({ tableId, index }));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters({ tableId }));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Filter className="h-4 w-4" />
          {filters.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {filters.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col gap-4">
          <Select
            value={newFilter.column}
            onValueChange={(value) => setNewFilter({ ...newFilter, column: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={newFilter.operator}
            onValueChange={(value) => setNewFilter({ ...newFilter, operator: value as FilterCondition['operator'] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=">">{'>'}</SelectItem>
              <SelectItem value="<">{'<'}</SelectItem>
              <SelectItem value="=">{'='}</SelectItem>
              <SelectItem value=">=">{'>='}</SelectItem>
              <SelectItem value="<=">{'<='}</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type={newFilter.column === 'Interest' ? 'text' : 'number'}
            value={newFilter.value}
            onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
            placeholder="Enter value"
          />

          <div className="flex gap-2">
            <Button onClick={handleAddFilter} className="flex-1">Add Filter</Button>
            <Button variant="outline" onClick={handleClearFilters} className="flex-1">
              Clear All
            </Button>
          </div>

          {filters.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">Active Filters</div>
              {filters.map((filter: FilterCondition, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                  <div className="flex-1 text-sm">
                    {filter.column} {filter.operator} {filter.value}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFilter(index)}
                    className="h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InterestFilter; 