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
      // Filter out tutorials that are already in the queue or are the active tutorial
      const newTutorials = action.payload.filter(id => 
        !state.tutorialQueue.includes(id) && id !== state.activeTutorial
      );
      
      if (newTutorials.length === 0) {
        console.log('No new tutorials to queue');
        return;
      }
      
      // Add new tutorials to the beginning of the queue
      state.tutorialQueue = [...newTutorials, ...state.tutorialQueue];
      console.log(`Queued tutorials: ${newTutorials.join(', ')}, Queue is now: ${state.tutorialQueue.join(', ')}`);
      
      // If no tutorial is active, start the first one in queue
      if (!state.isTutorialActive && state.tutorialQueue.length > 0) {
        state.activeTutorial = state.tutorialQueue[0];
        state.tutorialQueue = state.tutorialQueue.slice(1);
        state.isTutorialActive = true;
        state.activeTutorialStep = 0;
        console.log(`Auto-starting tutorial: ${state.activeTutorial}`);
      }
    },

    // Start a specific tutorial
    startTutorial: (state, action: PayloadAction<string>) => {
      state.activeTutorial = action.payload;
      state.isTutorialActive = true;
      state.activeTutorialStep = 0;
      console.log(`Manually starting tutorial: ${action.payload}`);
    },

    // Move to the next tutorial in queue
    nextTutorial: (state) => {
      // Mark current tutorial as completed if one is active
      if (state.activeTutorial) {
        state.completedTutorials[state.activeTutorial] = true;
        console.log(`Completed tutorial: ${state.activeTutorial}`);
      }
      
      console.log(`nextTutorial called, queue length: ${state.tutorialQueue.length}, queue: [${state.tutorialQueue.join(', ')}]`);
      
      // Check if there are more tutorials in queue
      if (state.tutorialQueue.length > 0) {
        state.activeTutorial = state.tutorialQueue[0];
        state.tutorialQueue = state.tutorialQueue.slice(1);
        state.activeTutorialStep = 0;
        state.isTutorialActive = true;
        
        console.log(`Starting next tutorial: ${state.activeTutorial}, remaining queue: [${state.tutorialQueue.join(', ')}]`);
      } else {
        // No more tutorials, stop the tutorial mode
        state.activeTutorial = null;
        state.isTutorialActive = false;
        
        console.log('No more tutorials in queue, stopping tutorial mode');
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
        console.log(`Tutorial stopped, marking ${state.activeTutorial} as completed`);
      }
      
      state.isTutorialActive = false;
      state.activeTutorial = null;
      state.tutorialQueue = [];
      state.activeTutorialStep = 0;
      
      console.log('Tutorial stopped, queue cleared');
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