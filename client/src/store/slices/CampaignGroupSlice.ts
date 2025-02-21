import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CampaignGroup {
  id: string;
  name: string;
  campaigns: string[];
  color: string;
}

interface AccountCampaignGroups {
  [accountId: string]: {
    groups: CampaignGroup[];
    selectedCampaigns: string[];
    editingGroupId: string | null;
    expandedGroups: string[];
    isCreatingGroup: boolean;
  };
}

interface CampaignGroupsState {
  accounts: AccountCampaignGroups;
}

const defaultAccountState = {
  groups: [],
  selectedCampaigns: [],
  editingGroupId: null,
  expandedGroups: [],
  isCreatingGroup: false
};

// Initialize account state if it doesn't exist
const initializeAccountState = (state: CampaignGroupsState, accountId: string) => {
  if (!state.accounts) {
    state.accounts = {};
  }
  if (!state.accounts[accountId]) {
    state.accounts[accountId] = { ...defaultAccountState };
  }
};

const campaignGroupsSlice = createSlice({
  name: 'campaignGroups',
  initialState: { accounts: {} } as CampaignGroupsState,
  reducers: {
    createGroup: (state, action: PayloadAction<{ accountId: string; name: string; campaigns: string[]; color: string }>) => {
      const { accountId, name, campaigns, color } = action.payload;
      initializeAccountState(state, accountId);
      
      const newGroup: CampaignGroup = {
        id: Date.now().toString(),
        name,
        campaigns,
        color
      };
      state.accounts[accountId].groups.push(newGroup);
      state.accounts[accountId].selectedCampaigns = [];
      state.accounts[accountId].isCreatingGroup = false;
    },
    deleteGroup: (state, action: PayloadAction<{ accountId: string; groupId: string }>) => {
      const { accountId, groupId } = action.payload;
      initializeAccountState(state, accountId);
      state.accounts[accountId].groups = state.accounts[accountId].groups.filter(group => group.id !== groupId);
      if (state.accounts[accountId].editingGroupId === groupId) {
        state.accounts[accountId].editingGroupId = null;
      }
    },
    addCampaignToGroup: (state, action: PayloadAction<{ accountId: string; groupId: string; campaignName: string }>) => {
      const { accountId, groupId, campaignName } = action.payload;
      initializeAccountState(state, accountId);
      const group = state.accounts[accountId].groups.find(g => g.id === groupId);
      if (group && !group.campaigns.includes(campaignName)) {
        group.campaigns.push(campaignName);
      }
    },
    removeCampaignFromGroup: (state, action: PayloadAction<{ accountId: string; groupId: string; campaignName: string }>) => {
      const { accountId, groupId, campaignName } = action.payload;
      initializeAccountState(state, accountId);
      const group = state.accounts[accountId].groups.find(g => g.id === groupId);
      if (group) {
        group.campaigns = group.campaigns.filter(c => c !== campaignName);
      }
    },
    setSelectedCampaigns: (state, action: PayloadAction<{ accountId: string; campaigns: string[] }>) => {
      const { accountId, campaigns } = action.payload;
      initializeAccountState(state, accountId);
      state.accounts[accountId].selectedCampaigns = campaigns;
    },
    toggleEditingGroup: (state, action: PayloadAction<{ accountId: string; groupId: string | null }>) => {
      const { accountId, groupId } = action.payload;
      initializeAccountState(state, accountId);
      state.accounts[accountId].editingGroupId = groupId;
    },
    toggleGroupExpansion: (state, action: PayloadAction<{ accountId: string; groupId: string }>) => {
      const { accountId, groupId } = action.payload;
      initializeAccountState(state, accountId);
      const expandedGroups = state.accounts[accountId].expandedGroups;
      if (expandedGroups.includes(groupId)) {
        state.accounts[accountId].expandedGroups = expandedGroups.filter(id => id !== groupId);
      } else {
        state.accounts[accountId].expandedGroups.push(groupId);
      }
    },
    setIsCreatingGroup: (state, action: PayloadAction<{ accountId: string; isCreating: boolean }>) => {
      const { accountId, isCreating } = action.payload;
      initializeAccountState(state, accountId);
      state.accounts[accountId].isCreatingGroup = isCreating;
      if (!isCreating) {
        state.accounts[accountId].selectedCampaigns = [];
      }
    }
  }
});

export const {
  createGroup,
  deleteGroup,
  addCampaignToGroup,
  removeCampaignFromGroup,
  setSelectedCampaigns,
  toggleEditingGroup,
  toggleGroupExpansion,
  setIsCreatingGroup
} = campaignGroupsSlice.actions;

export default campaignGroupsSlice.reducer;