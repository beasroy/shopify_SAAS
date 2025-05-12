import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '..';

interface TokenErrorState {
  fbToken: boolean;
  googleAnalyticsToken: boolean;
  googleAdsToken: boolean;
}

const initialState: TokenErrorState = {
  fbToken: false,
  googleAnalyticsToken: false,
  googleAdsToken: false,
};


const tokenErrorSlice = createSlice({
  name: 'tokenError',
  initialState,
  reducers: {
    setFbTokenError: (state, action: PayloadAction<boolean>) => {
      state.fbToken = action.payload;
    },
    
    setGoogleAnalyticsTokenError: (state, action: PayloadAction<boolean>) => {
      state.googleAnalyticsToken = action.payload;
    },
    
    setGoogleAdsTokenError: (state, action: PayloadAction<boolean>) => {
      state.googleAdsToken = action.payload;
    },
    
    resetAllTokenErrors: (state) => {
      state.fbToken = false;
      state.googleAnalyticsToken = false;
      state.googleAdsToken = false;
    },
  },
});


export const {
  setFbTokenError,
  setGoogleAnalyticsTokenError,
  setGoogleAdsTokenError,
  resetAllTokenErrors,
} = tokenErrorSlice.actions;


export const selectFbTokenError = (state: RootState) => state.tokenError.fbToken;
export const selectGoogleAnalyticsTokenError = (state: RootState) => state.tokenError.googleAnalyticsToken;
export const selectGoogleAdsTokenError = (state: RootState) => state.tokenError.googleAdsToken;
export const selectAnyTokenError = (state: RootState) => 
  state.tokenError.fbToken || 
  state.tokenError.googleAnalyticsToken || 
  state.tokenError.googleAdsToken;

export default tokenErrorSlice.reducer;