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
import tokenReducer from "./slices/TokenSllice.ts"
import interestFilterReducer from './slices/interestFilterSlice';
import brandFormReducer from './slices/BrandFormSlice';
import notificationReducer from './slices/NotificationSlice';



const rootReducer = combineReducers({
  conversionFilters: conversionFiltersReducer,
  brand: brandReducer, 
  user: userReducer, 
  date: dateReducer,
  campaignGroups: campaignGroupsReducer,
  campaignLabels: campaignLabelsReducer,
  tutorials: tutorialsReducer,
  locale: localReducer,
  tokenError: tokenReducer,
  interestFilter: interestFilterReducer,
  brandForm: brandFormReducer,
  notifications: notificationReducer,
});


const persistConfig = {
  key: "root",
  storage,
  whitelist: ["tokenError", "conversionFilters", "brand", "user", "date" , "campaignGroups", "campaignLabels", "tutorials","locale","interestFilter", "brandForm"], // Don't persist notifications
};


const persistedReducer = persistReducer(persistConfig, rootReducer);


export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE", "persist/REGISTER"],
      },
    }),
});

export const persistor = persistStore(store);


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
