import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerWithRangeProps = {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  defaultDate?: DateRange;
  resetToFirstPage?: () => void; 
};

export const DatePickerWithRange: React.FC<DatePickerWithRangeProps> = ({
  date,
  setDate,
  defaultDate,
  resetToFirstPage
}) => {
  // Use defaultDate only if date is undefined
  const effectiveDate = date && (date.from || date.to) ? date : defaultDate;

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if (resetToFirstPage) {
      resetToFirstPage(); 
    }
  };

  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !effectiveDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {effectiveDate?.from ? (
              effectiveDate.to ? (
                <>
                  {format(effectiveDate.from, "LLL dd, y")} - {format(effectiveDate.to, "LLL dd, y")}
                </>
              ) : (
                format(effectiveDate.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={effectiveDate?.from}
            selected={effectiveDate}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};