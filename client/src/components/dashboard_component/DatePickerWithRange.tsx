import { useState, useMemo, useCallback } from "react"
import { createSelector } from "@reduxjs/toolkit"
import { CalendarIcon } from "lucide-react"
import { addDays,startOfMonth, endOfMonth, endOfYear, format, startOfYear, subDays, subMonths, subYears, parse } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useDispatch, useSelector } from "react-redux"
import { setDate, clearDate } from "@/store/slices/DateSlice"
import type { RootState } from "@/store"

type DatePickerWithRangeProps = {
  defaultDate?: DateRange
  resetToFirstPage?: () => void
}

// Memoized selector
const selectDateRange = createSelector(
  (state: RootState) => state.date?.from,
  (state: RootState) => state.date?.to,
  (from, to) => ({
    from,
    to,
  }),
)

export function DatePickerWithRange({ defaultDate, resetToFirstPage }: DatePickerWithRangeProps) {
  const dispatch = useDispatch()
  const dateRange = useSelector(selectDateRange)

  // Memoize the initial date
  const initialDate = useMemo(() => {
    if (dateRange) {
      return {
        from: dateRange.from ? new Date(dateRange.from) : undefined,
        to: dateRange.to ? new Date(dateRange.to) : undefined,
      }
    }
    return defaultDate
      ? {
          from: defaultDate.from ? new Date(defaultDate.from) : undefined,
          to: defaultDate.to ? new Date(defaultDate.to) : undefined,
        }
      : undefined
  }, [dateRange, defaultDate])

  const [tempDate, setTempDate] = useState<DateRange | undefined>(initialDate)
  const [compareDate, setCompareDate] = useState<DateRange | undefined>()
  const [open, setOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [isCompareEnabled, setIsCompareEnabled] = useState(false)
  const [calendarMode, setCalendarMode] = useState<'primary' | 'comparison'>('primary')

  // Manual date input states
  const [manualFromDate, setManualFromDate] = useState(
    tempDate?.from ? format(tempDate.from, "yyyy-MM-dd") : ""
  )
  const [manualToDate, setManualToDate] = useState(
    tempDate?.to ? format(tempDate.to, "yyyy-MM-dd") : ""
  )
  const [manualCompareFromDate, setManualCompareFromDate] = useState("")
  const [manualCompareToDate, setManualCompareToDate] = useState("")

  // Dates calculation
  const dates = useMemo(() => {
    const today = new Date()
    const daysSinceSunday = today.getDay()
    const startOfThisWeek = subDays(today, daysSinceSunday)
    const endOfThisWeek = addDays(startOfThisWeek, 6)
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const startOfLastWeek = subDays(startOfThisWeek, 7)
    const endOfLastWeek = subDays(startOfThisWeek, 1)
    const quarter = Math.floor(today.getMonth() / 3)
    const startOfThisQuarter = new Date(today.getFullYear(), quarter * 3, 1)
    const endOfThisQuarter = new Date(today.getFullYear(), (quarter + 1) * 3, 0)

    const lastQuarter = today.getMonth() < 3 ? 3 : Math.floor((today.getMonth() - 3) / 3)
    const lastQuarterYear = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear()
    const startOfLastQuarter = new Date(lastQuarterYear, lastQuarter * 3, 1)
    const endOfLastQuarter = new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0)

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
      endOfLastQuarter,
    }
  }, [])

  // Date parsing utility
  const parseManualDate = useCallback((dateString: string): Date | undefined => {
    try {
      const parsedDate = parse(dateString, "yyyy-MM-dd", new Date())
      return !isNaN(parsedDate.getTime()) ? parsedDate : undefined
    } catch {
      return undefined
    }
  }, [])

  // Handle manual date input for primary range
  const handleManualDateInput = useCallback(() => {
    const fromDate = parseManualDate(manualFromDate)
    const toDate = parseManualDate(manualToDate)

    if (fromDate && toDate) {
      setTempDate({ from: fromDate, to: toDate })
      setSelectedPreset(null)
    }
  }, [manualFromDate, manualToDate, parseManualDate])

  // Handle manual date input for compare range
  const handleManualCompareDateInput = useCallback(() => {
    const fromDate = parseManualDate(manualCompareFromDate)
    const toDate = parseManualDate(manualCompareToDate)

    if (fromDate && toDate) {
      setCompareDate({ from: fromDate, to: toDate })
    }
  }, [manualCompareFromDate, manualCompareToDate, parseManualDate])


  // Preset range setter
  const setPresetRange = useCallback((from: Date, to: Date) => {
    if (calendarMode === 'primary') {
      const newRange = { from, to }
      setTempDate(newRange)
      
      // Update manual date inputs 
      setManualFromDate(format(from, "yyyy-MM-dd"))
      setManualToDate(format(to, "yyyy-MM-dd"))
    } else if (calendarMode === 'comparison') {
      const newCompareRange = { from, to }
      setCompareDate(newCompareRange)
      
      // Update comparison manual date inputs
      setManualCompareFromDate(format(from, "yyyy-MM-dd"))
      setManualCompareToDate(format(to, "yyyy-MM-dd"))
    }
    
    setSelectedPreset(null)
  }, [calendarMode])

  // Presets
  const presets = useMemo(
    () => [
      { label: "Today", fn: () => setPresetRange(dates.today, dates.today) },
      { label: "Yesterday", fn: () => setPresetRange(subDays(dates.today, 1), subDays(dates.today, 1)) },
      { label: "This Week", fn: () => setPresetRange(dates.startOfThisWeek, dates.endOfThisWeek) },
      { label: "Last 7 Days", fn: () => setPresetRange(subDays(dates.today, 6), dates.today) },
      { label: "Last week", fn: () => setPresetRange(dates.startOfLastWeek, dates.endOfLastWeek) },
      { label: "Last 30 Days", fn: () => setPresetRange(subDays(dates.today, 29), dates.today) },
      { label: "This Month", fn: () => setPresetRange(dates.startOfThisMonth, dates.today) },
      { label: "Last Month", fn: () => setPresetRange(startOfMonth(subMonths(dates.today, 1)), endOfMonth(subMonths(dates.today, 1))) },
      { label: "Last 3 Months", fn: () => setPresetRange(subMonths(dates.today, 3), dates.today) },
      { label: "Last 6 Months", fn: () => setPresetRange(subMonths(dates.today, 6), dates.today) },
      { label: "This Quarter", fn: () => setPresetRange(dates.startOfThisQuarter, dates.endOfThisQuarter) },
      { label: "Last Quarter", fn: () => setPresetRange(dates.startOfLastQuarter, dates.endOfLastQuarter) },
      { label: "This Year", fn: () => setPresetRange(new Date(new Date().getFullYear(), 0, 1), dates.today) },
      { label: "Last 365 Days", fn: () => setPresetRange(subDays(dates.today, 365), dates.today) },
      {
        label: "Last Year",
        fn: () => setPresetRange(subYears(startOfYear(new Date()), 1), subYears(endOfYear(new Date()), 1)),
      },
    ],
    [dates, setPresetRange],
  )

  // Calendar select handler
  const handleCalendarSelect = useCallback((range: DateRange | undefined) => {
    if (calendarMode === 'primary') {
      if (range?.from && !range.to) {
        setTempDate({ from: range.from, to: range.from })
        // Update manual input for single date
        setManualFromDate(format(range.from, "yyyy-MM-dd"))
        setManualToDate(format(range.from, "yyyy-MM-dd"))
      } else if (range?.from && range?.to && range.from > range.to) {
        setTempDate({ from: range.from, to: range.from })
        // Update manual input for single date
        setManualFromDate(format(range.from, "yyyy-MM-dd"))
        setManualToDate(format(range.from, "yyyy-MM-dd"))
      } else if (range?.from && range?.to) {
        setTempDate(range)
        // Update manual inputs for range
        setManualFromDate(format(range.from, "yyyy-MM-dd"))
        setManualToDate(format(range.to, "yyyy-MM-dd"))
      } else {
        setTempDate(undefined)
        // Clear manual inputs
        setManualFromDate("")
        setManualToDate("")
      }
      setSelectedPreset(null)
    } else {
      // Comparison date range handling
      if (range?.from && !range.to) {
        setCompareDate({ from: range.from, to: range.from })
        // Update manual input for single date
        setManualCompareFromDate(format(range.from, "yyyy-MM-dd"))
        setManualCompareToDate(format(range.from, "yyyy-MM-dd"))
      } else if (range?.from && range?.to && range.from > range.to) {
        setCompareDate({ from: range.from, to: range.from })
        // Update manual input for single date
        setManualCompareFromDate(format(range.from, "yyyy-MM-dd"))
        setManualCompareToDate(format(range.from, "yyyy-MM-dd"))
      } else if (range?.from && range?.to) {
        setCompareDate(range)
        // Update manual inputs for range
        setManualCompareFromDate(format(range.from, "yyyy-MM-dd"))
        setManualCompareToDate(format(range.to, "yyyy-MM-dd"))
      } else {
        setCompareDate(undefined)
        // Clear manual inputs
        setManualCompareFromDate("")
        setManualCompareToDate("")
      }
    }
  }, [calendarMode])

  // Date range formatter
  const formatDateRange = useCallback(
    (range: DateRange | undefined) => {
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
    },
    [defaultDate],
  )

  // Clear date range
  const clearDateRange = useCallback(() => {
    setTempDate(undefined)
    setCompareDate(undefined)
    setSelectedPreset(null)
    setIsCompareEnabled(false)
    setManualFromDate("")
    setManualToDate("")
    setManualCompareFromDate("")
    setManualCompareToDate("")
    dispatch(clearDate())
    if (resetToFirstPage) {
      resetToFirstPage()
    }
    setOpen(false)
  }, [dispatch, resetToFirstPage])

  // Update handler
  const handleUpdate = useCallback(() => {
    if (tempDate) {
      dispatch(
        setDate({
          from: tempDate.from ? tempDate.from.toISOString() : undefined,
          to: tempDate.to ? tempDate.to.toISOString() : undefined,
          compareFrom: isCompareEnabled && compareDate?.from ? compareDate.from.toISOString() : undefined,
          compareTo: isCompareEnabled && compareDate?.to ? compareDate.to.toISOString() : undefined,
        }),
      )
    }
    if (resetToFirstPage) {
      resetToFirstPage()
    }
    setOpen(false)
  }, [dispatch, resetToFirstPage, tempDate, compareDate, isCompareEnabled])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[250px] justify-start text-left font-normal",
            !tempDate && !defaultDate && "text-muted-foreground",
            "hover:bg-muted/50 transition-colors rounded-lg border-muted-foreground/20"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {formatDateRange(tempDate)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 max-w-[650px]" align="start">
        <div className="flex flex-col md:flex-row">
          {/* Preset selection column */}
          <div className="border-r p-3 w-full md:w-[150px] overflow-y-auto bg-gradient-to-b from-muted/50 to-muted/10" style={{ maxHeight: "400px" }}>
            <div className="space-y-1.5">
              <h1 className="text-sm pb-2 font-semibold border-b border-border/50 text-black">Quick Select</h1>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-1">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    size="sm"
                    variant={selectedPreset === preset.label ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start text-xs font-normal h-8 rounded-md",
                      selectedPreset === preset.label 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted text-muted-foreground hover:text-foreground",
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
          </div>
          
          {/* Calendar and input section */}
          <div className="p-3 flex-grow">
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox 
                id="compare-toggle"
                checked={isCompareEnabled}
                onCheckedChange={() => setIsCompareEnabled(!isCompareEnabled)}
                className="text-primary"
              />
              <label htmlFor="compare-toggle" className="text-sm font-medium">Compare with another period</label>
            </div>

            {/* Date Range Inputs */}
            <div className="grid gap-3 mb-3">
              <div className="space-y-2">
                <h2 className="text-xs font-medium text-muted-foreground">Primary Range</h2>
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="YYYY-MM-DD" 
                      value={manualFromDate}
                      onChange={(e) => setManualFromDate(e.target.value)}
                      onBlur={handleManualDateInput}
                      onClick={() => {
                        setCalendarMode('primary')
                      }}
                      className="h-8 pl-10 text-xs rounded-md"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">From</span>
                  </div>
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="YYYY-MM-DD" 
                      value={manualToDate}
                      onChange={(e) => setManualToDate(e.target.value)}
                      onBlur={handleManualDateInput}
                      onClick={() => {
                        setCalendarMode('primary')
                      }}
                      className="h-8 pl-10 text-xs rounded-md"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">To</span>
                  </div>
                </div>
              </div>

              {/* Compare Date Range Inputs */}
              {isCompareEnabled && (
                <div className="space-y-2">
                  <h2 className="text-xs font-medium text-muted-foreground">Comparison Range</h2>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Input 
                        placeholder="YYYY-MM-DD" 
                        value={manualCompareFromDate}
                        onChange={(e) => setManualCompareFromDate(e.target.value)}
                        onBlur={handleManualCompareDateInput}
                        onClick={() => {
                          setCalendarMode('comparison')
                        }}
                        className="h-8 pl-10 text-xs rounded-md"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">From</span>
                    </div>
                    <div className="flex-1 relative">
                      <Input 
                        placeholder="YYYY-MM-DD" 
                        value={manualCompareToDate}
                        onChange={(e) => setManualCompareToDate(e.target.value)}
                        onBlur={handleManualCompareDateInput}
                        onClick={() => {
                          setCalendarMode('comparison')
                        }}
                        className="h-8 pl-10 text-xs rounded-md"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">To</span>
                    </div>
                  </div>
                </div>
              )}
            </div>


            {/* Calendar */}
            <div className="border rounded-lg p-2 bg-background/80 shadow-sm">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={
                  calendarMode === 'primary' 
                    ? (tempDate?.from || defaultDate?.from || dates.today)
                    : (compareDate?.from || dates.today)
                }
                selected={calendarMode === 'primary' ? tempDate : compareDate}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                disabled={(date) =>
                  date > new Date() || date < new Date("2023-01-01")
                }
                className="rounded-md"
              />
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="border-t p-2 flex justify-end gap-2 bg-muted/10">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearDateRange}
            className="rounded-md h-8 text-xs"
          >
            Clear
          </Button>
          <Button 
            size="sm" 
            onClick={handleUpdate}
            className="rounded-md h-8 text-xs bg-primary hover:bg-primary/90"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

