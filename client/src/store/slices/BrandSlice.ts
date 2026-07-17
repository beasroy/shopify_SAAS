import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { IBrand, IBrandState } from '@/interfaces';
import axios from 'axios';
import { baseURL } from '@/data/constant';

const initialState: IBrandState = {
  selectedBrandId: null,
  brands: [],
  earliestDate: null,
};

export const fetchBrandEarliestDate = createAsyncThunk(
  'brand/fetchEarliestDate',
  async (brandId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${baseURL}/api/brands/earliest-date/${brandId}`, { withCredentials: true });
      console.log('Earliest date fetched:', response.data.earliestDate);
      return response.data.earliestDate;
    } catch (error: any) {
      console.error('Earliest date fetch failed:', error.response?.data || error);
      return rejectWithValue(error.response?.data || 'Failed to fetch earliest date');
    }
  }
);

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
    resetBrand: (state) => {
      state.selectedBrandId = null;
      state.brands = [];
      state.earliestDate = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchBrandEarliestDate.fulfilled, (state, action) => {
      state.earliestDate = action.payload;
    });
    builder.addCase(fetchBrandEarliestDate.rejected, (state) => {
      state.earliestDate = '2000-01-01';
    });
  }
});

export const { setSelectedBrandId, setBrands, deleteBrand, resetBrand } = brandSlice.actions;
export default brandSlice.reducer;
