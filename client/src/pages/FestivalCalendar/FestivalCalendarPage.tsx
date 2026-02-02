import { useState, useEffect, useCallback, useMemo } from 'react';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CalendarIcon, Loader2, Search, Plus, Trash2, Sparkles } from 'lucide-react';
import { format, getMonth, parseISO } from 'date-fns';
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
  type?: 'global' | 'brand';
  scope?: 'national' | 'state' | 'regional';
  state?: string;
  country?: string;
}

const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
];

const MONTHS = [
  'All Months',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FestivalCalendarPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const axiosInstance = createAxiosInstance();
  
  const [festivalDates, setFestivalDates] = useState<FestivalDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'global' | 'brand'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('All Months');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'national' | 'state' | 'regional'>('all');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'name-asc' | 'name-desc'>('date-asc');
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [festivalName, setFestivalName] = useState('');
  const [festivalDescription, setFestivalDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string>('');
  const [scope, setScope] = useState<'national' | 'state' | 'regional'>('national');
  const [state, setState] = useState('');

  // Fetch festival dates
  const fetchFestivalDates = useCallback(async () => {
    if (!brandId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/festival-dates/${brandId}`, {
        params: {
          country: selectedCountry
        },
        withCredentials: true
      });
      
      if (response.data.success) {
        setFestivalDates(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching festival dates:', error);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedCountry]);

  // Generate holidays with GPT
  const handleGenerateHolidays = useCallback(async () => {
    if (!brandId) return;
    
    try {
      setGenerating(true);
      const currentYear = new Date().getFullYear();
      const response = await axiosInstance.post(
        '/api/festival-dates/generate',
        {
          country: selectedCountry,
          year: currentYear
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        alert(response.data.message || 'Holidays generated successfully!');
        await fetchFestivalDates();
      }
    } catch (error: any) {
      console.error('Error generating holidays:', error);
      alert(error.response?.data?.message || 'Failed to generate holidays');
    } finally {
      setGenerating(false);
    }
  }, [brandId, selectedCountry]);

  // Add festival
  const handleAddFestival = async () => {
    if (!selectedDate || !festivalName.trim() || !brandId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `/api/festival-dates/${brandId}`,
        {
          date: selectedDate,
          festivalName: festivalName.trim(),
          description: festivalDescription.trim() || undefined,
          isRecurring: isRecurring,
          recurrencePattern: isRecurring && recurrencePattern ? recurrencePattern : undefined,
          country: selectedCountry,
          scope: scope,
          state: scope === 'state' ? state : undefined,
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        await fetchFestivalDates();
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

  // Delete festival
  const handleDeleteFestival = async (festivalId: string) => {
    if (!brandId || !confirm('Are you sure you want to delete this holiday?')) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.delete(
        `/api/festival-dates/${festivalId}`,
        {
          params: { brandId },
          withCredentials: true }
      );
      
      if (response.data.success) {
        await fetchFestivalDates();
      }
    } catch (error: any) {
      console.error('Error deleting festival date:', error);
      alert(error.response?.data?.message || 'Failed to delete festival date');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedDate('');
    setFestivalName('');
    setFestivalDescription('');
    setIsRecurring(false);
    setRecurrencePattern('');
    setScope('national');
    setState('');
  };

  // Filter and sort holidays
  const filteredAndSortedHolidays = useMemo(() => {
    let filtered = [...festivalDates];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(holiday =>
        holiday.festivalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        holiday.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(holiday => holiday.type === typeFilter);
    }

    // Month filter
    if (monthFilter !== 'All Months') {
      const monthIndex = MONTHS.indexOf(monthFilter) - 1;
      filtered = filtered.filter(holiday => {
        const date = parseISO(holiday.date);
        return getMonth(date) === monthIndex;
      });
    }

    // Scope filter
    if (scopeFilter !== 'all') {
      filtered = filtered.filter(holiday => holiday.scope === scopeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);

      if (sortBy === 'date-asc') {
        return dateA.getTime() - dateB.getTime();
      } else if (sortBy === 'date-desc') {
        return dateB.getTime() - dateA.getTime();
      } else if (sortBy === 'name-asc') {
        return a.festivalName.localeCompare(b.festivalName);
      } else {
        return b.festivalName.localeCompare(a.festivalName);
      }
    });

    return filtered;
  }, [festivalDates, searchQuery, typeFilter, monthFilter, scopeFilter, sortBy]);

  // Group holidays by month only if month filter is selected
  const groupedHolidays = useMemo(() => {
    if (monthFilter === 'All Months') {
      // Return as a single group with no month label
      return { '': filteredAndSortedHolidays };
    }
    
    const groups: Record<string, FestivalDate[]> = {};
    filteredAndSortedHolidays.forEach(holiday => {
      const date = parseISO(holiday.date);
      const monthKey = format(date, 'MMMM yyyy');
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(holiday);
    });
    return groups;
  }, [filteredAndSortedHolidays, monthFilter]);

  useEffect(() => {
    if (brandId && !loading) {
      fetchFestivalDates();
    }
  }, [brandId, selectedCountry]);

  return (
    <div className="flex h-screen bg-slate-50">
      <CollapsibleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Festival Calendar</h1>
              <p className="text-sm text-slate-500 mt-1">
                View and manage holidays and festivals for your brand
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Holiday
            </Button>
          </div>

          {/* Filters and Controls */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {/* Country Selector */}
            <div className="flex items-center gap-2">
              <Label htmlFor="country" className="text-sm font-medium">Country:</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger id="country" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Holidays Button */}
            <Button
              variant="outline"
              onClick={handleGenerateHolidays}
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Holidays
                </>
              )}
            </Button>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search holidays..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="brand">Brand</SelectItem>
              </SelectContent>
            </Select>

            {/* Month Filter */}
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Scope Filter */}
            <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as typeof scopeFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="national">National</SelectItem>
                <SelectItem value="state">State</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-asc">Date (Ascending)</SelectItem>
                <SelectItem value="date-desc">Date (Descending)</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {loading && festivalDates.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredAndSortedHolidays.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CalendarIcon className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No holidays found</h3>
              <p className="text-sm text-slate-500 mb-4">
                {searchQuery || typeFilter !== 'all' || monthFilter !== 'All Months' || scopeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Generate holidays or add your own'}
              </p>
              {!searchQuery && typeFilter === 'all' && monthFilter === 'All Months' && scopeFilter === 'all' && (
                <Button onClick={handleGenerateHolidays} variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Holidays
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedHolidays).map(([month, holidays]) => (
                <div key={month}>
                  {month && (
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">{month}</h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {holidays.map(holiday => {
                      const date = parseISO(holiday.date);
                      const isBrandHoliday = holiday.type === 'brand';
                      const dayOfMonth = format(date, 'd');
                      const monthAbbr = format(date, 'MMM');
                      const dayName = format(date, 'EEE');
                      
                      return (
                        <Card
                          key={holiday._id}
                          className={cn(
                            "relative overflow-hidden transition-all duration-200 hover:shadow-md border-0",
                            "group",
                            isBrandHoliday 
                              ? "bg-gradient-to-br from-orange-50 via-amber-50/50 to-yellow-50" 
                              : "bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50"
                          )}
                        >
                          {/* Decorative effect in right corner */}
                          <div className={cn(
                            "absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-2xl",
                            isBrandHoliday ? "bg-orange-400" : "bg-blue-400"
                          )} />
                          
                          <CardHeader className="pb-3 relative z-10">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* Blue date square */}
                                <div className={cn(
                                  "flex flex-col items-center justify-center w-16 h-16 rounded-lg shrink-0",
                                  isBrandHoliday ? "bg-orange-500" : "bg-blue-500"
                                )}>
                                  <span className="text-[10px] font-semibold text-white uppercase leading-tight">{dayName}</span>
                                  <span className="text-xl font-bold text-white leading-none my-0.5">{dayOfMonth}</span>
                                  <span className="text-[10px] font-medium text-white uppercase leading-tight">{monthAbbr}</span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  {/* Holiday name */}
                                  <CardTitle className="text-base font-semibold text-slate-800 leading-tight mb-1 line-clamp-2">
                                    {holiday.festivalName}
                                  </CardTitle>
                                  
                                  {/* Full date */}
                                  <CardDescription className="text-xs text-slate-600">
                                    {format(date, 'EEEE, MMMM d, yyyy')}
                                  </CardDescription>
                                </div>
                              </div>
                              
                              {isBrandHoliday && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteFestival(holiday._id)}
                                  disabled={loading}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          
                          <CardContent className="pt-0 pb-4 relative z-10">
                            {holiday.description && (
                              <p className="text-sm text-slate-700 leading-relaxed mb-2 line-clamp-3">
                                {holiday.description}
                              </p>
                            )}
                            {holiday.state && (
                              <div className="inline-flex items-center gap-1 text-xs text-slate-600 mt-1">
                                <span className="text-red-500">📍</span>
                                <span>{holiday.state}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Festival Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
            <DialogDescription>
              Add a brand-specific holiday or festival
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="festivalName">Holiday Name *</Label>
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
                placeholder="Add any additional details about this holiday"
                value={festivalDescription}
                onChange={(e) => setFestivalDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">Scope *</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === 'state' && (
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="Enter state name"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            )}
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
                !selectedDate ||
                loading || 
                (isRecurring && !recurrencePattern) ||
                (scope === 'state' && !state.trim())
              }
            >
              {loading ? 'Adding...' : 'Add Holiday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
