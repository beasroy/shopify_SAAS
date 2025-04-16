import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DateRange {
  from?: string; // Primary date range start
  to?: string;  // Primary date range end
  compareFrom?: string; // Optional comparison date range start
  compareTo?: string;   // Optional comparison date range end
}

const initialState: DateRange = {
  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
  to: new Date().toISOString(),
};

// Create the Redux slice
const dateSlice = createSlice({
  name: "date",
  initialState,
  reducers: {
    setDate: (state, action: PayloadAction<{
      from?: string; 
      to?: string; 
      compareFrom?: string; 
      compareTo?: string;
    }>) => {
      // Update primary date range
      state.from = action.payload.from;
      state.to = action.payload.to;

      // Update comparison date range
      state.compareFrom = action.payload.compareFrom;
      state.compareTo = action.payload.compareTo;
    },
    clearDate: (state) => {
      // Reset to initial state
      state.from = undefined;
      state.to = undefined;
      state.compareFrom = undefined;
      state.compareTo = undefined;
    },
  },
});

// Export actions and reducer
export const { setDate, clearDate } = dateSlice.actions;
export default dateSlice.reducer;