import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DateRange {
  from?: string; // Store as ISO string
  to?: string;
}

// Define the initial state with ISO strings
const initialState: DateRange = {
  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
  to: new Date().toISOString(),
};

// Create the Redux slice
const dateSlice = createSlice({
  name: "date",
  initialState,
  reducers: {
    setDate: (state, action: PayloadAction<{ from?: string; to?: string } | undefined>) => {
      if (action.payload) {
        state.from = action.payload.from;
        state.to = action.payload.to;
      } else {
        state.from = undefined;
        state.to = undefined;
      }
    },
    clearDate: (state) => {
      state.from = undefined;
      state.to = undefined;
    },
  },
});

// Export actions and reducer
export const { setDate, clearDate } = dateSlice.actions;
export default dateSlice.reducer;
