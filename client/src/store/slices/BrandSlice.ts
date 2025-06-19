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
    deleteBrand: (state, action: PayloadAction<string>) => {
      state.brands = state.brands.filter(brand => brand._id !== action.payload);
      // If the deleted brand was selected, clear the selection
      if (state.selectedBrandId === action.payload) {
        state.selectedBrandId = null;
      }
    },
    resetBrand: (state) => {
      state.selectedBrandId = null;
      state.brands = [];
    },
  },
});

export const { setSelectedBrandId, setBrands, deleteBrand, resetBrand } = brandSlice.actions;
export default brandSlice.reducer;
