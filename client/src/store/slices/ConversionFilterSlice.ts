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
<<<<<<< HEAD
    setSessionsFilter: (
=======
    setFilter: (
>>>>>>> aff93dff9a21a444aa9af1ede2c68dd36ed4a108
      state,
      action: PayloadAction<{
        componentId: string;
        filter: FilterValue | null;
      }>
    ) => {
<<<<<<< HEAD
      const { componentId, filter } = action.payload;
=======
      const { componentId, column, filter } = action.payload;
      
      // Only create new reference if needed
>>>>>>> aff93dff9a21a444aa9af1ede2c68dd36ed4a108
      if (!state[componentId]) {
        state[componentId] = { sessionsFilter: null, convRateFilter: null };
      }
<<<<<<< HEAD
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
=======
      
      // Only update if value actually changed
      if (JSON.stringify(state[componentId][column]) !== JSON.stringify(filter)) {
        state[componentId][column] = filter;
      }
    },
    
    clearFilters: (state, action: PayloadAction<string>) => {
      const componentId = action.payload;
      // Only delete if filters exist
      if (Object.keys(state[componentId] || {}).length > 0) {
        state[componentId] = {};
>>>>>>> aff93dff9a21a444aa9af1ede2c68dd36ed4a108
      }
    },
  },
});

export const { setSessionsFilter, setConvRateFilter, clearFilters } = conversionFiltersSlice.actions;
export default conversionFiltersSlice.reducer;