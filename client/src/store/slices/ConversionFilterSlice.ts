import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FilterValue {
  value: number;
  operator: string;
}

interface ConversionFiltersState {
  [componentId: string]: {
    sessionsFilter: FilterValue | null;
    convRateFilter: FilterValue | null;
  };
}

const initialState: ConversionFiltersState = {};

const conversionFiltersSlice = createSlice({
  name: 'conversionFilters',
  initialState,
  reducers: {
    setSessionsFilter: (
      state,
      action: PayloadAction<{
        componentId: string;
        filter: FilterValue | null;
      }>
    ) => {
      const { componentId, filter } = action.payload;
      if (!state[componentId]) {
        state[componentId] = { sessionsFilter: null, convRateFilter: null };
      }
      state[componentId].sessionsFilter = filter;
    },
    setConvRateFilter: (
      state,
      action: PayloadAction<{
        componentId: string;
        filter: FilterValue | null;
      }>
    ) => {
      const { componentId, filter } = action.payload;
      if (!state[componentId]) {
        state[componentId] = { sessionsFilter: null, convRateFilter: null };
      }
      state[componentId].convRateFilter = filter;
    },
    clearFilters: (state, action: PayloadAction<string>) => {
      const componentId = action.payload;
      if (state[componentId]) {
        state[componentId] = { sessionsFilter: null, convRateFilter: null };
      }
    },
  },
});

export const { setSessionsFilter, setConvRateFilter, clearFilters } = conversionFiltersSlice.actions;
export default conversionFiltersSlice.reducer;