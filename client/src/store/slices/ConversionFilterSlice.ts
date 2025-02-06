import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FilterValue {
  value: number;
  operator: string;
}

interface ConversionFiltersState {
  [componentId: string]: {
    [key: string]: FilterValue | null;
  };
}

const initialState: ConversionFiltersState = {};

const conversionFiltersSlice = createSlice({
  name: 'conversionFilters',
  initialState,
  reducers: {
    setFilter: (
      state,
      action: PayloadAction<{
        componentId: string;
        column: string;
        filter: FilterValue | null;
      }>
    ) => {
      const { componentId, column, filter } = action.payload;
      
      // Only create new reference if needed
      if (!state[componentId]) {
        state[componentId] = {};
      }
      
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
      }
    },
  },
});

export const { setFilter, clearFilters } = conversionFiltersSlice.actions;
export default conversionFiltersSlice.reducer;