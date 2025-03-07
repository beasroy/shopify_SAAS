import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TutorialState {
  isFirstTimeLogin: boolean;
  activeTutorial: string | null;
  isTutorialActive: boolean;
  activeTutorialStep: number;
  tutorialQueue: string[]; // Array of tutorial IDs to play in sequence
  completedTutorials: Record<string, boolean>;
}

const initialState: TutorialState = {
  isFirstTimeLogin: false,
  activeTutorial: null,
  isTutorialActive: false,
  activeTutorialStep: 0,
  tutorialQueue: [],
  completedTutorials: {}
};

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    // Set first-time login status
    setFirstTimeLogin: (state, action: PayloadAction<boolean>) => {
      state.isFirstTimeLogin = action.payload;
    },

    // Queue multiple tutorials to play in sequence
    queueTutorials: (state, action: PayloadAction<string[]>) => {
      state.tutorialQueue = [...action.payload];
      
      // If no tutorial is active, start the first one in queue
      if (!state.isTutorialActive && state.tutorialQueue.length > 0) {
        state.activeTutorial = state.tutorialQueue[0];
        state.tutorialQueue = state.tutorialQueue.slice(1);
        state.isTutorialActive = true;
        state.activeTutorialStep = 0;
      }
    },

    // Start a specific tutorial
    startTutorial: (state, action: PayloadAction<string>) => {
      state.activeTutorial = action.payload;
      state.isTutorialActive = true;
      state.activeTutorialStep = 0;
    },

    // Move to the next tutorial in queue
    nextTutorial: (state) => {
      // Mark current tutorial as completed
      if (state.activeTutorial) {
        state.completedTutorials[state.activeTutorial] = true;
      }
      
      // Check if there are more tutorials in queue
      if (state.tutorialQueue.length > 0) {
        state.activeTutorial = state.tutorialQueue[0];
        state.tutorialQueue = state.tutorialQueue.slice(1);
        state.activeTutorialStep = 0;
      } else {
        // No more tutorials, stop the tutorial mode
        state.activeTutorial = null;
        state.isTutorialActive = false;
      }
    },

    // Update current step in the active tutorial
    setTutorialStep: (state, action: PayloadAction<number>) => {
      state.activeTutorialStep = action.payload;
    },

    // Stop current tutorial and clear queue
    stopTutorial: (state) => {
      // Mark current tutorial as completed if there is one active
      if (state.activeTutorial) {
        state.completedTutorials[state.activeTutorial] = true;
      }
      
      state.isTutorialActive = false;
      state.activeTutorial = null;
      state.tutorialQueue = [];
      state.activeTutorialStep = 0;
    },

    // Complete first-time login
    completeFirstTimeLogin: (state) => {
      state.isFirstTimeLogin = false;
    },
    
    // Reset tutorial for a specific ID
    resetTutorial: (state, action: PayloadAction<string>) => {
      if (state.completedTutorials[action.payload]) {
        state.completedTutorials[action.payload] = false;
      }
    },
    
    // Reset all tutorials
    resetAllTutorials: (state) => {
      state.completedTutorials = {};
    }
  }
});

// Export actions
export const { 
  setFirstTimeLogin, 
  queueTutorials,
  startTutorial, 
  nextTutorial,
  setTutorialStep,
  stopTutorial, 
  completeFirstTimeLogin,
  resetTutorial,
  resetAllTutorials
} = tutorialSlice.actions;

export default tutorialSlice.reducer;