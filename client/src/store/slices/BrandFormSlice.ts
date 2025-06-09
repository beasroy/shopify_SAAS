import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BrandFormState {
  brandName: string;
  connectedAccounts: Record<string, string[]>;
  googleAdsConnections: {
    clientId: string;
    managerId?: string;
  }[];
  ga4Id: string;
  fbAdId: string[];
  shop: string;
  shopifyAccessToken: string;
}

const initialState: BrandFormState = {
  brandName: '',
  connectedAccounts: {},
  googleAdsConnections: [],
  ga4Id: '',
  fbAdId: [],
  shop: '',
  shopifyAccessToken: ''
};

const brandFormSlice = createSlice({
  name: 'brandForm',
  initialState,
  reducers: {
    setBrandFormData: (state, action: PayloadAction<BrandFormState>) => {
      return { ...state, ...action.payload };
    },
    clearBrandFormData: () => {
      return initialState;
    }
  }
});

export const { setBrandFormData, clearBrandFormData } = brandFormSlice.actions;
export default brandFormSlice.reducer; 