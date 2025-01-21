import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Using ShadCN Tooltip

interface FilterConversionsProps {
    setSessionsFilter: React.Dispatch<React.SetStateAction<{ value: number; operator: string } | null>>;
    setConvRateFilter: React.Dispatch<React.SetStateAction<{ value: number; operator: string } | null>>;
    sessionFilter: { value: number; operator: string } | null;
    convRateFilter: { value: number; operator: string } | null;
}

export default function FilterConversions({
    setSessionsFilter,
    setConvRateFilter,
    sessionFilter,
    convRateFilter,
}: FilterConversionsProps) {
    const [selectedColumn, setSelectedColumn] = useState<string>("Total Sessions");
    const [operator, setOperator] = useState<string>(">");
    const [value, setValue] = useState<number | undefined>(undefined);
    const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

    const handleAddFilter = () => {
        if (value === undefined || isNaN(value)) {
            alert("Please enter a valid value");
            return;
        }

        if (selectedColumn === "Total Sessions") {
            setSessionsFilter({ value, operator });
        } else if (selectedColumn === "Avg Conv Rate") {
            setConvRateFilter({ value, operator });
        }

        setDropdownOpen(false);
    };

    const handleClearFilters = () => {
        setSessionsFilter(null);
        setConvRateFilter(null);

        setSelectedColumn("Total Sessions");
        setOperator(">");
        setValue(undefined);

        setDropdownOpen(false);
    };


    const isFilterApplied = sessionFilter !== null || convRateFilter !== null;

   
    const filterTooltip = sessionFilter
        ? `Sessions: ${sessionFilter.operator} ${sessionFilter.value}`
        : convRateFilter
        ? `Avg Conv Rate: ${convRateFilter.operator} ${convRateFilter.value}`
        : "";

    return (
        <TooltipProvider>
            <div>
            <Tooltip>
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          
                    <DropdownMenuTrigger asChild>
                     
                        <TooltipTrigger>
                            <Button variant="outline" size="icon">
                                <Filter
                                    className={`h-4 w-4 ${isFilterApplied ? 'text-blue-500' : ''}`}
                                />
                            </Button>
                        </TooltipTrigger>
                       
                    </DropdownMenuTrigger>
               
                    <DropdownMenuContent className="w-80 p-4 flex flex-col gap-4">
                        {/* Column Selector */}
                        <Select onValueChange={setSelectedColumn} value={selectedColumn}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Column" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Total Sessions">Total Sessions</SelectItem>
                                <SelectItem value="Avg Conv Rate">Avg Conv Rate</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Operator Selector */}
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

                        {/* Value Input */}
                        <Input
                            type="number"
                            placeholder="Enter Value"
                            value={value === undefined ? "" : value}
                            onChange={(e) => setValue(parseFloat(e.target.value))}
                            className="w-full"
                        />

                        {/* Buttons */}
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

                {/* Tooltip content with applied filter */}
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
