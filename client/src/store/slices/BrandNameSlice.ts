import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IBrandName } from "@/interfaces";

const initialState: IBrandName = {
  brandName: "",
};

const brandNameSlice = createSlice({
  name: "brandName",
  initialState,
  reducers: {
    setBrandNameFixed: (state, action: PayloadAction<string | null>) => {
      state.brandName = action.payload;
    },

    removeBrandName: (state, action: PayloadAction<boolean | null>) => {
      if (action.payload) {
        state.brandName = "";
      }
    },
  },
});

export const { setBrandNameFixed, removeBrandName } = brandNameSlice.actions;
export default brandNameSlice.reducer;
