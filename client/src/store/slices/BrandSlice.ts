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
      if (state.selectedBrandId === action.payload) {
        state.selectedBrandId = null;
      }
    },
    updateBrandLabel: (state, action: PayloadAction<{ id: string; customLabel: string }>) => {
      const brand = state.brands.find(b => b._id === action.payload.id);
      if (brand) {
        brand.customLabel = action.payload.customLabel;
      }
    },
    resetBrand: (state) => {
      state.selectedBrandId = null;
      state.brands = [];
    },
  },
});

export const { setSelectedBrandId, setBrands, deleteBrand, resetBrand, updateBrandLabel } = brandSlice.actions;
export default brandSlice.reducer;
