import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import conversionFiltersReducer from "./slices/ConversionFilterSlice";
import brandReducer from "./slices/BrandSlice.ts"
import userReducer from "./slices/UserSlice.ts"
import dateReducer from "./slices/DateSlice.ts"
import campaignGroupsReducer from './slices/CampaignGroupSlice.ts';
import campaignLabelsReducer from './slices/campaignLabelsSlice.ts';
import tutorialsReducer from "./slices/TutorialSlice.ts"
import localReducer from "./slices/LocalSlice.ts"

// Combine all reducers
const rootReducer = combineReducers({
  conversionFilters: conversionFiltersReducer,
  brand: brandReducer, 
  user: userReducer, 
  date: dateReducer,
  campaignGroups: campaignGroupsReducer,
  campaignLabels: campaignLabelsReducer,
  tutorials: tutorialsReducer,
  locale: localReducer,
});

// Persist config - specify which slices to persist
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["conversionFilters", "brand", "user", "date" , "campaignGroups", "campaignLabels", "tutorials","locale"], // Persist both conversionFilters & brand
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
