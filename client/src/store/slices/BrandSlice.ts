import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Brand {
  _id: string;
  name: string;
  brandId: string;
  fbAdAccounts?: [];
  googleAdAccount?: {[key: string]: string};
  ga4Account?: { [key: string]: string };
  shopifyAccount: {[key: string]: string };
}

interface BrandState {
  selectedBrandId: string | null;
  brands: Brand[];
}

const initialState: BrandState = {
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
    setBrands: (state, action: PayloadAction<Brand[]>) => {
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
