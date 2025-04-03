import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LocaleType = "en-IN" | "en-US";


interface LocaleState {
  locale: LocaleType;
}


const initialState: LocaleState = {
  locale: "en-IN"
};

// Create the slice
const localeSlice = createSlice({
  name: 'locale',
  initialState,
  reducers: {
    setLocale: (state, action: PayloadAction<LocaleType>) => {
      state.locale = action.payload;
    }
  }
});

export const { setLocale } = localeSlice.actions;

export default localeSlice.reducer;