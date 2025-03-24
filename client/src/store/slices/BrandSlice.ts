import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IBrand, IBrandState } from '@/interfaces';

const initialState: IBrandState = {
  selectedBrandId: null,
  brands: [],
};

const brandSlice = createSlice({
  name: 'brand',
  initialState,
  reducers: {
    setSelectedBrandId: (state, action: PayloadAction<string | null>) => {
      state.selectedBrandId = action.payload;
    },
    setBrands: (state, action: PayloadAction<IBrand[]>) => {
      state.brands = action.payload;
    },
    resetBrand: (state) => {
      state.selectedBrandId = null;
      state.brands = [];
    },
  },
});

export const { setSelectedBrandId, setBrands, resetBrand } = brandSlice.actions;
export default brandSlice.reducer;
