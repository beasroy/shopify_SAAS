import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import conversionFiltersReducer from "./slices/ConversionFilterSlice";
import brandReducer from "./slices/BrandSlice.ts"
import userReducer from "./slices/UserSlice.ts"

// Combine all reducers
const rootReducer = combineReducers({
  conversionFilters: conversionFiltersReducer,
  brand: brandReducer, 
  user: userReducer, 
});

// Persist config - specify which slices to persist
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["conversionFilters", "brand", "user"], // Persist both conversionFilters & brand
};

// Apply persistReducer to the rootReducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure Redux store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Explicitly ignore Redux Persist actions to avoid warnings
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE", "persist/REGISTER"],
      },
    }),
});

export const persistor = persistStore(store);

// Define types for Redux state & dispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
