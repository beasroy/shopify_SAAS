import { createContext, Dispatch, SetStateAction } from 'react';
import { DateRange } from 'react-day-picker';

export interface ReportsDateContextType {
  dateRange: DateRange | undefined;
  setDateRange: Dispatch<SetStateAction<DateRange | undefined>>;
}

export const ReportsDateContext = createContext<ReportsDateContextType | undefined>(undefined); 