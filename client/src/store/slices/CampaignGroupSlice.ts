import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CampaignGroup {
  id: string;
  name: string;
  campaigns: string[];
  color: string;
}

interface CampaignGroupsState {
  groups: CampaignGroup[];
  selectedCampaigns: string[];
  editingGroupId: string | null;
  expandedGroups: string[];
  isCreatingGroup: boolean;
}

// Load initial state from localStorage if available
const loadState = (): CampaignGroupsState => {
  try {
    const serializedState = localStorage.getItem('campaignGroups');
    if (serializedState === null) {
      return {
        groups: [],
        selectedCampaigns: [],
        editingGroupId: null,
        expandedGroups: [],
        isCreatingGroup: false
      };
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error('Error loading state:', err);
    return {
      groups: [],
      selectedCampaigns: [],
      editingGroupId: null,
      expandedGroups: [],
      isCreatingGroup: false
    };
  }
};

// Save state to localStorage
const saveState = (state: CampaignGroupsState) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('campaignGroups', serializedState);
  } catch (err) {
    console.error('Error saving state:', err);
  }
};

const campaignGroupsSlice = createSlice({
  name: 'campaignGroups',
  initialState: loadState(),
  reducers: {
    createGroup: (state, action: PayloadAction<{ name: string; campaigns: string[]; color: string }>) => {
      const newGroup: CampaignGroup = {
        id: Date.now().toString(),
        name: action.payload.name,
        campaigns: action.payload.campaigns,
        color: action.payload.color
      };
      state.groups.push(newGroup);
      state.selectedCampaigns = [];
      state.isCreatingGroup = false;
      saveState(state);
    },
    deleteGroup: (state, action: PayloadAction<string>) => {
      state.groups = state.groups.filter(group => group.id !== action.payload);
      if (state.editingGroupId === action.payload) {
        state.editingGroupId = null;
      }
      saveState(state);
    },
    addCampaignToGroup: (state, action: PayloadAction<{ groupId: string; campaignName: string }>) => {
      const group = state.groups.find(g => g.id === action.payload.groupId);
      if (group && !group.campaigns.includes(action.payload.campaignName)) {
        group.campaigns.push(action.payload.campaignName);
      }
      saveState(state);
    },
    removeCampaignFromGroup: (state, action: PayloadAction<{ groupId: string; campaignName: string }>) => {
      const group = state.groups.find(g => g.id === action.payload.groupId);
      if (group) {
        group.campaigns = group.campaigns.filter(c => c !== action.payload.campaignName);
      }
      saveState(state);
    },
    setSelectedCampaigns: (state, action: PayloadAction<string[]>) => {
      state.selectedCampaigns = action.payload;
      saveState(state);
    },
    toggleEditingGroup: (state, action: PayloadAction<string | null>) => {
      state.editingGroupId = action.payload;
      saveState(state);
    },
    toggleGroupExpansion: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      if (state.expandedGroups.includes(groupId)) {
        state.expandedGroups = state.expandedGroups.filter(id => id !== groupId);
      } else {
        state.expandedGroups.push(groupId);
      }
      saveState(state);
    },
    setIsCreatingGroup: (state, action: PayloadAction<boolean>) => {
      state.isCreatingGroup = action.payload;
      if (!action.payload) {
        state.selectedCampaigns = [];
      }
      saveState(state);
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