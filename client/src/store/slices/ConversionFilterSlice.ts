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
    // Generic filter setter that works for any column
    setFilter: (
      state,
      action: PayloadAction<{
        componentId: string;
        column: string;
        filter: FilterValue | null;
      }>
    ) => {
      const { componentId, column, filter } = action.payload;
      
      // Initialize the component's filters if not exist
      if (!state[componentId]) {
        state[componentId] = {};
      }
      
      // Set the filter for the specific column
      state[componentId][column] = filter;
    },
    
    // Clear filters for a specific component
    clearFilters: (state, action: PayloadAction<string>) => {
      const componentId = action.payload;
      if (state[componentId]) {
        state[componentId] = {};
      }
    },
  },
});

export const { setFilter, clearFilters } = conversionFiltersSlice.actions;
export default conversionFiltersSlice.reducer;