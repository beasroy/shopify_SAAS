import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { format, subDays, subMonths, subYears } from "date-fns"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerWithRangeProps = {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  defaultDate?: DateRange
  resetToFirstPage?: () => void
}

import { useEffect } from "react"
// (Rest of your imports remain the same)

export function DatePickerWithRange({
  date,
  setDate,
  defaultDate,
  resetToFirstPage,
}: DatePickerWithRangeProps) {
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date || defaultDate);

  // Propagate defaultDate to parent on mount if date is undefined
  useEffect(() => {
    if (!date && defaultDate) {
      setDate(defaultDate);
    }
  }, [date, defaultDate, setDate]);

  const handleDateChange = (newDate: DateRange | undefined) => {
    setTempDate(newDate);
  };

  const handleUpdate = () => {
    setDate(tempDate);
    if (resetToFirstPage) {
      resetToFirstPage();
    }
  };

  const setPresetRange = (from: Date, to: Date) => {
    const newRange = { from, to };
    setTempDate(newRange);
  };

  const clearDateRange = () => {
    setTempDate(undefined);
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range) {
      return defaultDate && defaultDate.from && defaultDate.to
        ? `${format(defaultDate.from, "LLL dd, y")} - ${format(defaultDate.to, "LLL dd, y")}`
        : "Pick a date";
    }
    if (range.from) {
      if (range.to) {
        return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`;
      }
      return format(range.from, "LLL dd, y");
    }
    return "Pick a date";
  };

  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !tempDate && !defaultDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(tempDate)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex space-x-4">
            {/* Preset Buttons */}
            <div className="flex flex-col space-y-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPresetRange(new Date(), new Date())}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPresetRange(subDays(new Date(), 6), new Date())}
              >
                Last 7 days
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPresetRange(subDays(new Date(), 29), new Date())}
              >
                Last 30 days
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPresetRange(subMonths(new Date(), 3), new Date())}
              >
                Last 3 months
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPresetRange(subYears(new Date(), 1), new Date())}
              >
                Last 1 year
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={clearDateRange}
              >
                Clear
              </Button>
            </div>
            {/* Calendar */}
            <div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDate?.from || defaultDate?.from || new Date()}
                selected={tempDate}
                onSelect={handleDateChange}
                numberOfMonths={2}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleUpdate} className="w-full">
              Update
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

