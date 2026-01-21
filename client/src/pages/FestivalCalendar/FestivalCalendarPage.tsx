import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isPast,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import createAxiosInstance from '../ConversionReportPage/components/axiosInstance';
import CollapsibleSidebar from '@/components/dashboard_component/CollapsibleSidebar';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FestivalDate {
  _id: string;
  date: string;
  festivalName: string;
  description?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
}

interface SalesData {
  date: string;
  totalSales: number;
  codOrderCount: number;
  prepaidOrderCount: number;
}

interface CalendarSalesData {
  sales: Record<string, SalesData>;
  festivals: Record<string, { festivalName: string; description?: string }>;
}

interface PublicHoliday {
  date: Date;
  name: string;
  isPublicHoliday: boolean;
}

// Indian Public Holidays (Fixed dates - you can expand this or use an API for variable dates)
const getPublicHolidays = (year: number): PublicHoliday[] => {
  const holidays: PublicHoliday[] = [
    { date: new Date(year, 0, 1), name: 'New Year\'s Day', isPublicHoliday: true },
    { date: new Date(year, 0, 26), name: 'Republic Day', isPublicHoliday: true },
    { date: new Date(year, 3, 14), name: 'Ambedkar Jayanti', isPublicHoliday: true },
    { date: new Date(year, 4, 1), name: 'Labour Day', isPublicHoliday: true },
    { date: new Date(year, 7, 15), name: 'Independence Day', isPublicHoliday: true },
    { date: new Date(year, 9, 2), name: 'Gandhi Jayanti', isPublicHoliday: true },
    { date: new Date(year, 11, 25), name: 'Christmas', isPublicHoliday: true },
  ];

  
  return holidays;
};

export default function FestivalCalendarPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const axiosInstance = createAxiosInstance();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [festivalDates, setFestivalDates] = useState<FestivalDate[]>([]);
  const [salesData, setSalesData] = useState<CalendarSalesData>({ sales: {}, festivals: {} });
  const [loading, setLoading] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Track the date range of loaded sales data
  const [loadedDateRange, setLoadedDateRange] = useState<{ start: Date; end: Date } | null>(null);
  // Track which months have loaded festival dates
  const [loadedFestivalMonths, setLoadedFestivalMonths] = useState<Set<string>>(new Set());
  // Track previous brandId to detect changes
  const previousBrandIdRef = useRef<string | undefined>(brandId);
  
  // Form state
  const [festivalName, setFestivalName] = useState('');
  const [festivalDescription, setFestivalDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string>('');

  // Check if festival dates for a month are already loaded
  const isFestivalMonthLoaded = useCallback((month: Date): boolean => {
    const monthKey = format(month, 'yyyy-MM');
    return loadedFestivalMonths.has(monthKey);
  }, [loadedFestivalMonths]);

  // Fetch festival dates for a specific month
  const fetchFestivalDates = useCallback(async (targetMonth?: Date) => {
    if (!brandId) return;
    
    const monthToUse = targetMonth || currentMonth;
    const monthKey = format(monthToUse, 'yyyy-MM');
    
    // Check if already loaded
    if (isFestivalMonthLoaded(monthToUse)) {
      return; // Already loaded, no need to fetch
    }
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/festival-dates/${brandId}`, {
        params: {
          month: monthKey // Pass month in YYYY-MM format
        },
        withCredentials: true
      });
      
      if (response.data.success) {
        // Merge with existing festival dates (avoid duplicates)
        setFestivalDates(prev => {
          const existingIds = new Set(prev.map(f => f._id));
          const newFestivals = response.data.data.filter((f: FestivalDate) => !existingIds.has(f._id));
          return [...prev, ...newFestivals];
        });
        
        // Mark this month as loaded
        setLoadedFestivalMonths(prev => new Set([...prev, monthKey]));
      }
    } catch (error) {
      console.error('Error fetching festival dates:', error);
    } finally {
      setLoading(false);
    }
  }, [brandId, axiosInstance, currentMonth, isFestivalMonthLoaded]);

  // Check if current month is within loaded date range
  const isMonthLoaded = useCallback((month: Date): boolean => {
    if (!loadedDateRange) return false;
    
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    return monthStart >= loadedDateRange.start && monthEnd <= loadedDateRange.end;
  }, [loadedDateRange]);

  // Fetch sales data for last 3 months from a given month
  const fetchSalesData = useCallback(async (targetMonth?: Date) => {
    if (!brandId) return;
    
    // Use targetMonth or currentMonth
    const monthToUse = targetMonth || currentMonth;
    
    // Check if data for this month is already loaded
    if (isMonthLoaded(monthToUse)) {
      return; // Data already loaded, no need to fetch
    }
    
    try {
      setSalesLoading(true);
      // Fetch last 3 months of sales data from the target month
      const response = await axiosInstance.get(
        `/api/festival-dates/sales/${brandId}`,
        {
          params: {
            targetMonth: monthToUse.toISOString()
          },
          withCredentials: true
        }
      );
      
      if (response.data.success) {
        // Merge with existing sales data
        setSalesData(prev => ({
          sales: { ...prev.sales, ...response.data.data.sales },
          festivals: { ...prev.festivals, ...response.data.data.festivals }
        }));
        
        // Update loaded date range (3 months: 1 before, target, 1 after)
        const monthStart = startOfMonth(monthToUse);
        const rangeStart = subMonths(monthStart, 1); // 1 month before
        const rangeEnd = addMonths(monthStart, 2); // 1 month after target
        const rangeEndLastDay = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() + 1, 0);
        rangeEndLastDay.setHours(23, 59, 59, 999);
        
        setLoadedDateRange({
          start: rangeStart,
          end: rangeEndLastDay
        });
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setSalesLoading(false);
    }
  }, [brandId, axiosInstance, currentMonth, isMonthLoaded]);

  // Reset all cached data when brandId changes
  useEffect(() => {
    if (!brandId) return;
    
    // Check if brand actually changed
    if (previousBrandIdRef.current === brandId) {
      return; // Same brand, no need to reset
    }
    
    // Brand changed - reset all state
    setFestivalDates([]);
    setSalesData({ sales: {}, festivals: {} });
    setLoadedDateRange(null);
    setLoadedFestivalMonths(new Set());
    setCurrentMonth(new Date()); // Reset to current month
    
    // Update ref
    previousBrandIdRef.current = brandId;
  }, [brandId]); // Run when brandId changes

  // Fetch festival dates and sales data when month changes
  useEffect(() => {
    if (!brandId) return;
    
    // Fetch data for the current month
    // The fetch functions will check if data is already loaded
    fetchFestivalDates(currentMonth);
    fetchSalesData(currentMonth);
  }, [currentMonth, brandId, fetchFestivalDates, fetchSalesData]); // Run when month or brandId changes

  // Handle date click - open modal to add festival
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  // Handle add festival
  const handleAddFestival = async () => {
    if (!selectedDate || !festivalName.trim()) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `/api/festival-dates/${brandId}`,
        {
          date: selectedDate.toISOString(),
          festivalName: festivalName.trim(),
          description: festivalDescription.trim() || undefined,
          isRecurring: isRecurring,
          recurrencePattern: isRecurring && recurrencePattern ? recurrencePattern : undefined,
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        // Refresh festival dates for the current month
        const monthKey = format(currentMonth, 'yyyy-MM');
        setLoadedFestivalMonths(prev => {
          const newSet = new Set(prev);
          newSet.delete(monthKey); // Remove from cache to force refresh
          return newSet;
        });
        await fetchFestivalDates(currentMonth);
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error: any) {
      console.error('Error adding festival date:', error);
      alert(error.response?.data?.message || 'Failed to add festival date');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFestivalName('');
    setFestivalDescription('');
    setSelectedDate(undefined);
    setIsRecurring(false);
    setRecurrencePattern('');
  };

  // Get sales data for a date
  const getSalesForDate = (date: Date): SalesData | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return salesData.sales[dateStr] || null;
  };

  // Get festival info for a date (including recurring festivals)
  const getFestivalInfo = (date: Date): FestivalDate | undefined => {
    return festivalDates.find(festival => {
      const festivalDate = new Date(festival.date);
      
      // Exact date match
      if (isSameDay(festivalDate, date)) {
        return true;
      }
      
      // Check recurring festivals
      if (festival.isRecurring && festival.recurrencePattern) {
        const festivalMonth = festivalDate.getMonth(); // 0-11
        const festivalDay = festivalDate.getDate(); // 1-31
        const festivalDayOfWeek = festivalDate.getDay(); // 0-6
        const dateMonth = date.getMonth();
        const dateDay = date.getDate();
        const dateDayOfWeek = date.getDay();
        
        if (festival.recurrencePattern === 'annually') {
          // Match same month and day (e.g., Feb 14 every year)
          return festivalMonth === dateMonth && festivalDay === dateDay;
        } else if (festival.recurrencePattern === 'monthly') {
          // Match same day of month (e.g., 14th of every month)
          return festivalDay === dateDay;
        } else if (festival.recurrencePattern === 'weekly') {
          // Match same day of week (e.g., every Monday)
          return festivalDayOfWeek === dateDayOfWeek;
        }
      }
      
      return false;
    });
  };

  // Get public holiday for a date
  const getPublicHoliday = (date: Date): PublicHoliday | undefined => {
    const year = date.getFullYear();
    const holidays = getPublicHolidays(year);
    return holidays.find(holiday => isSameDay(holiday.date, date));
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Navigation
  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    // fetchSalesData will be called by useEffect when currentMonth changes
  };

  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    // fetchSalesData will be called by useEffect when currentMonth changes
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Navigate to specific month and year
  const goToMonthYear = (month: number, year: number) => {
    setCurrentMonth(new Date(year, month, 1));
  };

  // Generate month and year options for select
  const monthOptions = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  // Combined month-year value for select
  const monthYearValue = `${currentMonth.getMonth()}-${currentMonth.getFullYear()}`;

  // Handle month-year select change
  const handleMonthYearChange = (value: string) => {
    const [month, year] = value.split('-').map(Number);
    goToMonthYear(month, year);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex h-screen bg-slate-50">
      <CollapsibleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Festival Calendar</h1>
              <p className="text-sm text-slate-500 mt-1">
                Click on any date to add a festival. Hover over past dates to see sales data.
              </p>
            </div>
            <Button onClick={goToToday} variant="outline" size="sm">
              Today
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6 h-full flex flex-col">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-9 w-9"
                  disabled={salesLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select
                  value={monthYearValue}
                  onValueChange={handleMonthYearChange}
                  disabled={salesLoading}
                >
                  <SelectTrigger className="h-9 px-4 font-semibold text-slate-800 min-w-[220px] border-slate-300 hover:bg-slate-50 [&_svg]:hidden">
                    <SelectValue>
                      {format(currentMonth, 'MMMM yyyy')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {yearOptions.map((year) => (
                      <SelectGroup key={year}>
                        <div className="px-2 py-1.5">
                          <div className="text-sm text-center font-semibold text-slate-500 uppercase tracking-wide mb-1 px-2">
                            {year}
                          </div>
                          {monthOptions.map((month) => {
                            const value = `${month.value}-${year}`;
                            const isSelected = currentMonth.getMonth() === Number.parseInt(month.value, 10) && 
                                              currentMonth.getFullYear() === year;
                            return (
                              <SelectItem
                                key={value}
                                value={value}
                                className={isSelected ? "bg-blue-50 font-semibold" : ""}
                              >
                                {month.label} {year}
                              </SelectItem>
                            );
                          })}
                        </div>
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {salesLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  className="h-9 w-9"
                  disabled={salesLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 gap-px border border-slate-200 rounded-lg overflow-hidden bg-slate-200" style={{ gridTemplateRows: 'auto repeat(5, 1fr)' }}>
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-slate-700 py-2 bg-white"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              <TooltipProvider delayDuration={200}>
                {calendarDays.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  const isPastDate = isPast(day) || isTodayDate;
                  const sales = getSalesForDate(day);
                  const festival = getFestivalInfo(day);
                  const publicHoliday = getPublicHoliday(day);
                  const hasSalesData = sales && isPastDate;

                  const dayContent = (
                    <button
                      type="button"
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "relative h-full w-full p-1.5 transition-all text-sm bg-white",
                        "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10",
                        !isCurrentMonth && "text-slate-400 bg-slate-50",
                        isCurrentMonth && "text-slate-900 font-medium",
                        isTodayDate && "bg-blue-50 font-bold text-blue-900",
                        festival && "bg-orange-50 text-orange-900 font-semibold hover:bg-orange-100",
                        publicHoliday && !festival && "bg-purple-50 text-purple-700 hover:bg-purple-100",
                      )}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-sm font-semibold">{format(day, 'd')}</span>
                        {(festival || publicHoliday) && (
                          <div className="mt-0.5 flex gap-0.5">
                            {festival && (
                              <div className="h-1.5 w-1.5 rounded-full bg-orange-500" title={festival.festivalName} />
                            )}
                            {publicHoliday && !festival && (
                              <div className="h-1.5 w-1.5 rounded-full bg-purple-500" title={publicHoliday.name} />
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );

                  // Check if we're loading data for this month
                  const isDateInCurrentMonth = isSameMonth(day, currentMonth);
                  const isLoadingForThisDate = salesLoading && isDateInCurrentMonth && isPastDate && !hasSalesData;

                  if (hasSalesData || isLoadingForThisDate) {
                    return (
                      <Tooltip key={format(day, 'yyyy-MM-dd')}>
                        <TooltipTrigger asChild>
                          {dayContent}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-slate-900 text-white">
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold">{format(day, 'MMM dd, yyyy')}</p>
                            {festival && (
                              <p className="text-orange-400">{festival.festivalName}</p>
                            )}
                            {publicHoliday && !festival && (
                              <p className="text-purple-300">{publicHoliday.name}</p>
                            )}
                            {(() => {
                              if (isLoadingForThisDate) {
                                return (
                                  <div className="border-t border-slate-700 pt-1 mt-1 flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <p className="text-slate-300">Loading sales data...</p>
                                  </div>
                                );
                              }
                              if (hasSalesData && sales) {
                                return (
                                  <div className="border-t border-slate-700 pt-1 mt-1">
                                    <p>Total Sales: ₹{sales.totalSales.toLocaleString('en-IN')}</p>
                                    <p>COD Orders: {sales.codOrderCount}</p>
                                    <p>Prepaid Orders: {sales.prepaidOrderCount}</p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  if (festival || publicHoliday) {
                    return (
                      <Tooltip key={format(day, 'yyyy-MM-dd')}>
                        <TooltipTrigger asChild>
                          {dayContent}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-slate-900 text-white">
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold">{format(day, 'MMM dd, yyyy')}</p>
                            {festival && (
                              <>
                                <p className="text-orange-400">{festival.festivalName}</p>
                                {festival.description && (
                                  <p className="text-slate-300">{festival.description}</p>
                                )}
                              </>
                            )}
                            {publicHoliday && !festival && (
                              <p className="text-purple-300">{publicHoliday.name} (Public Holiday)</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={format(day, 'yyyy-MM-dd')}>{dayContent}</div>;
                })}
              </TooltipProvider>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-slate-200 flex items-center gap-8 text-sm">
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded bg-orange-50 border-2 border-orange-300" />
                <span className="text-slate-700 font-medium">Brand Festival</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded bg-purple-50 border-2 border-purple-300" />
                <span className="text-slate-700 font-medium">Public Holiday</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded bg-blue-50 border-2 border-blue-300" />
                <span className="text-slate-700 font-medium">Today</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Festival Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Festival Date</DialogTitle>
            <DialogDescription>
              Add a special festival date for your brand.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    }
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="festivalName">Festival Name *</Label>
              <Input
                id="festivalName"
                placeholder="e.g., Diwali, Christmas, New Year Sale"
                value={festivalName}
                onChange={(e) => setFestivalName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional details about this festival"
                value={festivalDescription}
                onChange={(e) => setFestivalDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => {
                    setIsRecurring(checked as boolean);
                    if (!checked) {
                      setRecurrencePattern('');
                    }
                  }}
                />
                <Label
                  htmlFor="isRecurring"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  This is a recurring holiday/festival
                </Label>
              </div>
              {isRecurring && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="recurrencePattern">Recurrence Type *</Label>
                  <Select
                    value={recurrencePattern}
                    onValueChange={setRecurrencePattern}
                  >
                    <SelectTrigger id="recurrencePattern">
                      <SelectValue placeholder="Select recurrence type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annually">Annually (Every Year)</SelectItem>
                      <SelectItem value="monthly">Monthly (Every Month)</SelectItem>
                      <SelectItem value="weekly">Weekly (Every Week)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddFestival} 
              disabled={
                !festivalName.trim() || 
                loading || 
                (isRecurring && !recurrencePattern)
              }
            >
              {loading ? 'Adding...' : 'Add Festival'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
