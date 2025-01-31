import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import conversionFiltersReducer from './slices/ConversionFilterSlice';

// First combine your reducers
const rootReducer = combineReducers({
  conversionFilters: conversionFiltersReducer,
});

// Then create the persist config
const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['conversionFilters'], 
};

// Apply persist reducer to the root reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // It's better to explicitly ignore persist actions rather than disable completely
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER'],
        },
      }),
});
  
export const persistor = persistStore(store);
  
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;