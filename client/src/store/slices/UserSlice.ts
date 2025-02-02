import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  username: string;
  email: string;
  brands: string[];
  hasSeenLandingSlides?: boolean;
}

interface UserState {
  user: User | null;
  showLandingPopup: boolean;
}

const initialState: UserState = {
  user: null,
  showLandingPopup: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      
      // Determine whether to show the landing popup
      state.showLandingPopup =
        !!action.payload &&
        !action.payload.hasSeenLandingSlides &&
        (!action.payload.brands || action.payload.brands.length === 0);
    },

    setShowLandingPopup: (state, action: PayloadAction<boolean>) => {
      state.showLandingPopup = action.payload;
    },

    clearUser: (state) => {
      state.user = null;
      state.showLandingPopup = false;
    },
  },
});

export const { setUser, setShowLandingPopup, clearUser } = userSlice.actions;
export default userSlice.reducer;
