import { useState, useEffect, useMemo, useCallback } from "react"
import { createSelector } from '@reduxjs/toolkit'
import { CalendarIcon } from "lucide-react"
import { addDays, endOfYear, format, startOfYear, subDays, subMonths, subYears } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useDispatch, useSelector } from 'react-redux'
import { setDate, clearDate } from "@/store/slices/DateSlice"
import { RootState } from '@/store'

type DatePickerWithRangeProps = {
  defaultDate?: DateRange
  resetToFirstPage?: () => void
}

// Memoized selector
const selectDateRange = createSelector(
  (state: RootState) => state.date.from,
  (state: RootState) => state.date.to,
  (from, to) => ({
    from,
    to
  })
);

export function DatePickerWithRange({ defaultDate, resetToFirstPage }: DatePickerWithRangeProps) {
  const dispatch = useDispatch()
  const dateRange = useSelector(selectDateRange)

  // Memoize the initial date
  const initialDate = useMemo(() => {
    if (dateRange) {
      return {
        from: dateRange.from ? new Date(dateRange.from) : undefined,
        to: dateRange.to ? new Date(dateRange.to) : undefined
      };
    }
    return defaultDate ? {
      from: defaultDate.from ? new Date(defaultDate.from) : undefined,
      to: defaultDate.to ? new Date(defaultDate.to) : undefined
    } : undefined;
  }, [dateRange, defaultDate]);
  const [tempDate, setTempDate] = useState<DateRange | undefined>(initialDate)
  const [open, setOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  // Memoize date calculations
  const dates = useMemo(() => {
    const today = new Date()
    const daysSinceSunday = today.getDay()
    const startOfThisWeek = subDays(today, daysSinceSunday)
    const endOfThisWeek = addDays(startOfThisWeek, 6)
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const startOfLastWeek = subDays(startOfThisWeek, 7)
    const endOfLastWeek = subDays(startOfThisWeek, 1)
    const quarter = Math.floor(today.getMonth() / 3); // Get current quarter (0-based)
    const startOfThisQuarter = new Date(today.getFullYear(), quarter * 3, 1)
    const endOfThisQuarter = new Date(today.getFullYear(),(quarter + 1)* 3, 0)

    const lastQuarter = Math.floor(today.getMonth() / 3) - 1; // Get last quarter
    const year = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear(); // Adjust year if needed
    const startOfLastQuarter = new Date(year, ((lastQuarter + 4) % 4) * 3, 1); // Start of last quarter
    const endOfLastQuarter = new Date(year, ((lastQuarter + 5) % 4) * 3, 0); // End of last quarter

    return {
      today,
      startOfThisWeek,
      endOfThisWeek,
      startOfThisMonth,
      endOfThisMonth,
      startOfLastWeek,
      endOfLastWeek,
      startOfThisQuarter,
      endOfThisQuarter,
      startOfLastQuarter,
      endOfLastQuarter
    }
  }, [])

  useEffect(() => {
    if (!dateRange.from && !dateRange.to && defaultDate) {
      dispatch(setDate({
        from: defaultDate.from ? defaultDate.from.toISOString() : undefined,
        to: defaultDate.to ? defaultDate.to.toISOString() : undefined
      }));
    }
  }, [dateRange, defaultDate, dispatch])

  const handleUpdate = useCallback(() => {
    if (tempDate) {
      dispatch(setDate({
        from: tempDate.from ? tempDate.from.toISOString() : undefined,
        to: tempDate.to ? tempDate.to.toISOString() : undefined
      }));
    }
    if (resetToFirstPage) {
      resetToFirstPage();
    }
    setOpen(false)
  }, [dispatch, resetToFirstPage, tempDate])

  const clearDateRange = useCallback(() => {
    setTempDate(undefined)
    setSelectedPreset(null)
    dispatch(clearDate())
    if (resetToFirstPage) {
      resetToFirstPage()
    }
    setOpen(false)
  }, [dispatch, resetToFirstPage])

  const setPresetRange = useCallback((from: Date, to: Date) => {
    const newRange = { from, to }
    setTempDate(newRange)
  }, [])

  const formatDateRange = useCallback((range: DateRange | undefined) => {
    if (!range) {
      return defaultDate && defaultDate.from && defaultDate.to
        ? `${format(defaultDate.from, "LLL dd, y")} - ${format(defaultDate.to, "LLL dd, y")}`
        : "Pick a date"
    }
    if (range.from) {
      if (range.to) {
        return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`
      }
      return format(range.from, "LLL dd, y")
    }
    return "Pick a date"
  }, [defaultDate])

  // Memoize presets array
  const presets = useMemo(() => [
    { label: "Today", fn: () => setPresetRange(dates.today, dates.today) },
    { label: "Yesterday", fn: () => setPresetRange(subDays(dates.today, 1), subDays(dates.today, 1)) },
    { label: "This Week", fn: () => setPresetRange(dates.startOfThisWeek, dates.endOfThisWeek) },
    { label: "Last 7 Days", fn: () => setPresetRange(subDays(dates.today, 6), dates.today) },
    { label: "Last week", fn: () => setPresetRange(dates.startOfLastWeek, dates.endOfLastWeek) },
    { label: "Last 30 Days", fn: () => setPresetRange(subDays(dates.today, 29), dates.today) },
    { label: "This Month", fn: () => setPresetRange(dates.startOfThisMonth, dates.endOfThisMonth) },
    { label: "Last 3 Months", fn: () => setPresetRange(subMonths(dates.today, 3), dates.today) },
    { label: "Last 6 Months", fn: () => setPresetRange(subMonths(dates.today, 6), dates.today) },
    { label: "This Quarter", fn: () => setPresetRange(dates.startOfThisQuarter , dates.endOfThisQuarter)},
    { label: "Last Quarter", fn: () => setPresetRange(dates.startOfLastQuarter , dates.endOfLastQuarter)},
    { label: "This Year", fn: () => setPresetRange(new Date(new Date().getFullYear(), 0, 1), new Date(new Date().getFullYear(), 11, 31))}, 
    { label: "Last 365 Days" , fn: () => setPresetRange(subDays(dates.today, 365), dates.today) },
    { label: "Last Year", fn: () => setPresetRange(subYears(startOfYear(new Date()), 1), subYears(endOfYear(new Date()), 1)) }
  ], [dates, setPresetRange])

  const handleCalendarSelect = useCallback((range: DateRange | undefined) => {
    if (range?.from && !range.to) {
      setTempDate({ from: range.from, to: range.from })
    } else if (range?.from && range?.to && range.from > range.to) {
      setTempDate({ from: range.from, to: range.from })
    } else {
      setTempDate(range)
    }
    setSelectedPreset(null)
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="outline"
          className={cn(
            "w-[250px] justify-start text-left font-normal text-sm",
            !tempDate && !defaultDate && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(tempDate)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-2 w-[140px] overflow-y-auto" style={{ maxHeight: "240px" }}>
            <div className="space-y-1">
              <h1 className="text-xs pb-2 px-2 font-medium border-b">Custom</h1>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-xs font-normal",
                    selectedPreset === preset.label && "bg-accent",
                  )}
                  onClick={() => {
                    preset.fn()
                    setSelectedPreset(preset.label)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-2">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDate?.from || defaultDate?.from || dates.today}
              selected={tempDate}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
            />
          </div>
        </div>
        <div className="border-t p-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={clearDateRange}>
            Clear
          </Button>
          <Button size="sm" onClick={handleUpdate}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}