// import { CalendarIcon } from "lucide-react";
// import { format } from "date-fns";
// import { DateRange } from "react-day-picker";
// import { Button } from "@/components/ui/button";
// import { Calendar } from "@/components/ui/calendar";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { cn } from "@/lib/utils";

// type DatePickerWithRangeProps = {
//   date: DateRange | undefined;
//   setDate: (date: DateRange | undefined) => void;
//   defaultDate?: DateRange;
//   resetToFirstPage?: () => void; 
// };

// export const DatePickerWithRange: React.FC<DatePickerWithRangeProps> = ({
//   date,
//   setDate,
//   defaultDate,
//   resetToFirstPage
// }) => {
//   // Use defaultDate only if date is undefined
//   const effectiveDate = date && (date.from || date.to) ? date : defaultDate;

//   const handleDateChange = (newDate: DateRange | undefined) => {
//     setDate(newDate);
//     if (resetToFirstPage) {
//       resetToFirstPage(); 
//     }
//   };

//   return (
//     <div className="grid gap-2">
//       <Popover>
//         <PopoverTrigger asChild>
//           <Button
//             id="date"
//             variant={"outline"}
//             className={cn(
//               "w-[260px] justify-start text-left font-normal",
//               !effectiveDate && "text-muted-foreground"
//             )}
//           >
//             <CalendarIcon className="mr-2 h-4 w-4" />
//             {effectiveDate?.from ? (
//               effectiveDate.to ? (
//                 <>
//                   {format(effectiveDate.from, "LLL dd, y")} - {format(effectiveDate.to, "LLL dd, y")}
//                 </>
//               ) : (
//                 format(effectiveDate.from, "LLL dd, y")
//               )
//             ) : (
//               <span>Pick a date</span>
//             )}
//           </Button>
//         </PopoverTrigger>
//         <PopoverContent className="w-auto p-0" align="start">
//           <Calendar
//             initialFocus
//             mode="range"
//             defaultMonth={effectiveDate?.from}
//             selected={effectiveDate}
//             onSelect={handleDateChange}
//             numberOfMonths={2}
//           />
//         </PopoverContent>
//       </Popover>
//     </div>
//   );
// };



import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { format, subDays, subMonths } from "date-fns"
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

export function DatePickerWithRange({
  date,
  setDate,
  defaultDate,
  resetToFirstPage,
}: DatePickerWithRangeProps) {
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date || defaultDate)

  const handleDateChange = (newDate: DateRange | undefined) => {
    setTempDate(newDate)
  }

  const handleUpdate = () => {
    setDate(tempDate)
    if (resetToFirstPage) {
      resetToFirstPage()
    }
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
          <div className="flex flex-col space-y-4">
            <div className="flex flex-wrap gap-2">
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
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDate?.from || defaultDate?.from || new Date()}
              selected={tempDate}
              onSelect={handleDateChange}
              numberOfMonths={2}
            />
            <Button onClick={handleUpdate}>Update</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}