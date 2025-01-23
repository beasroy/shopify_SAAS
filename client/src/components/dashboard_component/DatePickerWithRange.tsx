import { useState, useEffect } from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format, subDays, subMonths, subYears } from "date-fns"
import type { DateRange } from "react-day-picker"
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

export function DatePickerWithRange({ date, setDate, defaultDate, resetToFirstPage }: DatePickerWithRangeProps) {
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date || defaultDate)
  const [open, setOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const today = new Date()
  const daysSinceSunday = today.getDay()
  const startOfThisWeek = subDays(today, daysSinceSunday)
  const endOfThisWeek = addDays(startOfThisWeek, 6)
  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const startOfLastWeek = subDays(startOfThisWeek, 7)
  const endOfLastWeek = subDays(startOfThisWeek,1)

  useEffect(() => {
    if (!date && defaultDate) {
      setDate(defaultDate)
    }
  }, [date, defaultDate, setDate])

  const handleUpdate = () => {
    setDate(tempDate)
    if (resetToFirstPage) {
      resetToFirstPage()
    }
    setOpen(false)
  }

  const clearDateRange = () => {
    setTempDate(undefined)
    setSelectedPreset(null)
    setDate(undefined)
    if (resetToFirstPage) {
      resetToFirstPage()
    }
    setOpen(false)
  }

  const setPresetRange = (from: Date, to: Date) => {
    const newRange = { from, to }
    setTempDate(newRange)
  }

  const formatDateRange = (range: DateRange | undefined) => {
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
  }

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
              <h1 className="text-xs pb-2 px-2 font-medium  border-b">Custom</h1>
              {[
                { label: "Today", fn: () => setPresetRange(today, today) },
                { label: "Yesterday", fn: () => setPresetRange(subDays(today, 1), subDays(today, 1)) },
                { label: "This Week", fn: () => setPresetRange(startOfThisWeek, endOfThisWeek) },
                { label: "Last 7 Days", fn: () => setPresetRange(subDays(today, 6), today) },
                { label: "Last week", fn: () => setPresetRange(startOfLastWeek, endOfLastWeek) },
                { label: "Last 30 Days", fn: () => setPresetRange(subDays(today, 29), today) },
                { label: "This Month", fn: () => setPresetRange(startOfThisMonth, endOfThisMonth) },
                { label: "Last 3 Months", fn: () => setPresetRange(subMonths(today, 3), today) },
                { label: "Last 6 Months", fn: () => setPresetRange(subMonths(today, 6), today) },
                { label: "Last Year", fn: () => setPresetRange(subYears(today, 1), today) },
              ].map((preset) => (
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
              defaultMonth={tempDate?.from || defaultDate?.from || today}
              selected={tempDate}
              onSelect={(range) => {
                if (range?.from && !range.to) {
                  setTempDate({ from: range.from, to: range.from })
                } else if (range?.from && range?.to && range.from > range.to) {
                  setTempDate({ from: range.from, to: range.from })
                } else {
                  setTempDate(range)
                }
                setSelectedPreset(null)
              }}
              numberOfMonths={2}
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

