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
import tokenErrorReducer from './slices/TokenSllice';
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
  tokenError: tokenErrorReducer,
  interestFilter: interestFilterReducer,
  brandForm: brandFormReducer,
  notifications: notificationReducer,
});


const persistConfig = {
  key: "root",
  storage,
  whitelist: ["tokenError", "conversionFilters", "brand", "user", "date" , "campaignGroups", "campaignLabels", "tutorials","locale","interestFilter", "brandForm", "notifications"], // Added notifications to persist
  transforms: [
    // Custom transform for notifications to limit storage size
    {
      in: (state: any) => {
        if (state.notifications && state.notifications.notifications) {
          // Keep only last 50 notifications and filter out old ones (older than 7 days)
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const filteredNotifications = state.notifications.notifications
            .filter((notification: any) => new Date(notification.timestamp) > oneWeekAgo)
            .slice(0, 50);
          
          return {
            ...state,
            notifications: {
              ...state.notifications,
              notifications: filteredNotifications,
              unreadCount: filteredNotifications.filter((n: any) => !n.isRead).length
            }
          };
        }
        return state;
      },
      out: (state: any) => state
    }
  ]
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


// Use the non-persisted reducer type so selectors can access all slices
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
