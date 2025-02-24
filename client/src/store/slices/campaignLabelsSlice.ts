import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CampaignLabelsState {
  labels: {
    [accountId: string]: {
      [campaignId: string]: string[];
    }
  };
  isAddingLabel: boolean;
}

const initialState: CampaignLabelsState = {
  labels: {},
  isAddingLabel: false,
};

const campaignLabelsSlice = createSlice({
  name: 'campaignLabels',
  initialState,
  reducers: {
    addLabelToCampaign: (
      state, 
      action: PayloadAction<{ accountId: string; campaignId: string; label: string }>
    ) => {
      const { accountId, campaignId, label } = action.payload;
      
      // Initialize account if it doesn't exist
      if (!state.labels[accountId]) {
        state.labels[accountId] = {};
      }
      
      // Initialize campaign if it doesn't exist
      if (!state.labels[accountId][campaignId]) {
        state.labels[accountId][campaignId] = [];
      }
      
      // Add label if it doesn't already exist
      if (!state.labels[accountId][campaignId].includes(label)) {
        state.labels[accountId][campaignId].push(label);
      }
    },
    
    removeLabelFromCampaign: (
      state, 
      action: PayloadAction<{ accountId: string; campaignId: string; label: string }>
    ) => {
      const { accountId, campaignId, label } = action.payload;
      
      if (state.labels[accountId] && state.labels[accountId][campaignId]) {
        state.labels[accountId][campaignId] = state.labels[accountId][campaignId]
          .filter(l => l !== label);
      }
    },
    
    toggleAddingLabel: (state, action: PayloadAction<boolean>) => {
      state.isAddingLabel = action.payload;
    },
    
    // Optional: Add utility actions for account-level operations
    clearAccountLabels: (state, action: PayloadAction<string>) => {
      const accountId = action.payload;
      if (state.labels[accountId]) {
        state.labels[accountId] = {};
      }
    },
    
    // Optional: Copy labels between campaigns in the same account
    copyLabels: (
      state,
      action: PayloadAction<{ 
        accountId: string; 
        sourceCampaignId: string; 
        targetCampaignId: string 
      }>
    ) => {
      const { accountId, sourceCampaignId, targetCampaignId } = action.payload;
      
      if (state.labels[accountId] && 
          state.labels[accountId][sourceCampaignId]) {
        
        if (!state.labels[accountId][targetCampaignId]) {
          state.labels[accountId][targetCampaignId] = [];
        }
        
        // Copy labels from source to target (avoiding duplicates)
        state.labels[accountId][sourceCampaignId].forEach(label => {
          if (!state.labels[accountId][targetCampaignId].includes(label)) {
            state.labels[accountId][targetCampaignId].push(label);
          }
        });
      }
    }
  }
});

export const { 
  addLabelToCampaign, 
  removeLabelFromCampaign, 
  toggleAddingLabel,
  clearAccountLabels,
  copyLabels
} = campaignLabelsSlice.actions;

export default campaignLabelsSlice.reducer;