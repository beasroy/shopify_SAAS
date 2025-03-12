import React,{ useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '@/store';
import { setFirstTimeLogin, queueTutorials, completeFirstTimeLogin } from '@/store/slices/TutorialSlice';
import { getAllTutorialsForPath } from './TutorialConfig';

interface TutorialManagerProps {
  children: React.ReactNode;
}

const TutorialManager: React.FC<TutorialManagerProps> = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isFirstTimeLogin = useSelector((state: RootState) => state.tutorials.isFirstTimeLogin);
  const user = useSelector((state: RootState) => state.user.user);
  
  const isTutorialActive = useSelector((state: RootState) => state.tutorials.isTutorialActive);
  const tutorialQueue = useSelector((state: RootState) => state.tutorials.tutorialQueue);
  const activeTutorial = useSelector((state: RootState) => state.tutorials.activeTutorial);

  // Track if we've already started tutorials in this session to prevent restart
  const hasStartedTutorialsRef = React.useRef(false);

  // Check if it's the user's first login based on login count
  useEffect(() => {
    if (user && !hasStartedTutorialsRef.current) {
      // Set isFirstTimeLogin to true if loginCount equals 1
      const isFirstLogin = user.loginCount === 1;
      
      console.log('User login status:', { 
        loginCount: user.loginCount, 
        isFirstLogin 
      });
      
      dispatch(setFirstTimeLogin(isFirstLogin));
    }
  }, [user, dispatch]);

  useEffect(() => {
    // Log queue changes
    console.log('Tutorial queue updated:', {
      active: activeTutorial,
      queueLength: tutorialQueue.length,
      queue: tutorialQueue
    });
  }, [activeTutorial, tutorialQueue]);

  // Monitor when tutorials are stopped/completed
  useEffect(() => {
    // If we had a tutorial active and now we don't, mark first-time login as complete
    if (hasStartedTutorialsRef.current && activeTutorial === null && !isTutorialActive) {
      console.log('Tutorial session ended, marking first-time login as complete');
      dispatch(completeFirstTimeLogin());
    }
  }, [activeTutorial, isTutorialActive, dispatch]);

  // Start appropriate tutorials based on path when needed
  useEffect(() => {
    // Only queue tutorials once per session to prevent restart
    if (hasStartedTutorialsRef.current) {
      return;
    }
    
    // Check if we have what we need to start tutorials
    const shouldQueueTutorials = isFirstTimeLogin && 
                               user && 
                               !isTutorialActive && 
                               tutorialQueue.length === 0;
    
    console.log('Tutorial conditions:', {
      isFirstTimeLogin,
      hasUser: !!user,
      isTutorialActive,
      queueLength: tutorialQueue.length,
      shouldQueueTutorials
    });
    
    if (shouldQueueTutorials) {
      // Add a delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        // Get all tutorials for this path in the correct order
        const allTutorials = getAllTutorialsForPath(currentPath);
        
        console.log('Available tutorials for path:', {
          path: currentPath,
          allTutorials
        });
        
        if (allTutorials.length > 0) {
          // Get all tutorial IDs for this path
          const tutorialIds = allTutorials.map(tutorial => tutorial.id);
          
          console.log('Queueing tutorials:', tutorialIds);
          dispatch(queueTutorials(tutorialIds));
          
          // Mark that we've started tutorials in this session
          hasStartedTutorialsRef.current = true;
        } else {
          console.log('No tutorials available for this path');
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeLogin, user, currentPath, isTutorialActive, tutorialQueue, dispatch]);

  return <>{children}</>;
};

export default TutorialManager;