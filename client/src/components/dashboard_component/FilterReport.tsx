import { useState, useEffect } from 'react'
import { Filter } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export interface FilterItem {
  column: string
  operator: '>' | '<' | '=' 
  value: string
}

interface FilterComponentProps {
  columns: string[],
  filters: FilterItem[];
  setFilters: (filters: FilterItem[]) => void;
  onFiltersChange: (filters: FilterItem[]) => void
}

export function FilterComponent({ columns, onFiltersChange,filters,setFilters }: FilterComponentProps) {
  const [filterColumn, setFilterColumn] = useState<string>('')
  const [filterOperator, setFilterOperator] = useState<FilterItem['operator']>('>')
  const [filterValue, setFilterValue] = useState<string>('')

  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const addFilter = () => {
    if (filterColumn && filterValue) {
      setFilters([...filters, { column: filterColumn, operator: filterOperator, value: filterValue }])
      setFilterColumn('')
      setFilterValue('')
    }
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Add Filter</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-4">
          <div className="flex flex-col gap-4">
            <Select value={filterColumn} onValueChange={(value) => {
              setFilterColumn(value)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column} value={column}>{column}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterOperator} onValueChange={(value) => setFilterOperator(value as FilterItem['operator'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>

                    <SelectItem value=">">Greater than</SelectItem>
                    <SelectItem value="<">Less than</SelectItem>
                    <SelectItem value="=">Equal to</SelectItem>
            
            
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Enter filter value"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
            <Button onClick={addFilter}>Add Filter</Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}