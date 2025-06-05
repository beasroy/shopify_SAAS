import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FilterCondition {
  column: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: string | number;
}

interface InterestFilterState {
  filters: {
    [tableId: string]: FilterCondition[];
  };
}

const initialState: InterestFilterState = {
  filters: {}
};

const interestFilterSlice = createSlice({
  name: 'interestFilter',
  initialState,
  reducers: {
    addFilter: (state, action: PayloadAction<{ tableId: string; filter: FilterCondition }>) => {
      const { tableId, filter } = action.payload;
      const currentFilters = state.filters[tableId] || [];
      state.filters = {
        ...state.filters,
        [tableId]: [...currentFilters, filter]
      };
    },
    removeFilter: (state, action: PayloadAction<{ tableId: string; index: number }>) => {
      const { tableId, index } = action.payload;
      const currentFilters = state.filters[tableId] || [];
      state.filters = {
        ...state.filters,
        [tableId]: currentFilters.filter((_, i) => i !== index)
      };
    },
    updateFilter: (state, action: PayloadAction<{ tableId: string; index: number; filter: FilterCondition }>) => {
      const { tableId, index, filter } = action.payload;
      const currentFilters = state.filters[tableId] || [];
      state.filters = {
        ...state.filters,
        [tableId]: currentFilters.map((f, i) => i === index ? filter : f)
      };
    },
    clearFilters: (state, action: PayloadAction<{ tableId: string }>) => {
      const { tableId } = action.payload;
      state.filters = {
        ...state.filters,
        [tableId]: []
      };
    },
  },
});

export const { addFilter, removeFilter, updateFilter, clearFilters } = interestFilterSlice.actions;
export default interestFilterSlice.reducer; 