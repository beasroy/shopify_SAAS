import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  username: string;
  email: string;
  brands: string[];
  isClient: boolean;
  isAdmin: boolean;
  metgod: string;
  loginCount: number;
}

interface UserState {
  user: User | null;
}

const initialState: UserState = {
  user: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },

    clearUser: (state) => {
      state.user = null;
    },

    removeBrandFromUser: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.brands = state.user.brands.filter(brandId => brandId !== action.payload);
      }
    },

    addBrandToUser: (state, action: PayloadAction<string>) => {
      if (state.user && !state.user.brands.includes(action.payload)) {
        state.user.brands.push(action.payload);
      }
    },
  },
});

export const { setUser, clearUser, removeBrandFromUser, addBrandToUser } = userSlice.actions;
export default userSlice.reducer;
