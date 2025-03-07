import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '@/store';
import { setFirstTimeLogin, queueTutorials } from '@/store/slices/TutorialSlice';
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
  const completedTutorials = useSelector((state: RootState) => 
    state.tutorials.completedTutorials || {}
  );
  const isTutorialActive = useSelector((state: RootState) => state.tutorials.isTutorialActive);
  const tutorialQueue = useSelector((state: RootState) => state.tutorials.tutorialQueue);

  // Check if it's the user's first login based on login count
  useEffect(() => {
    if (user) {
      // Set isFirstTimeLogin to true if loginCount equals 1
      const isFirstLogin = user.loginCount === 1;
      dispatch(setFirstTimeLogin(isFirstLogin));
    }
  }, [user, dispatch]);

  // Start appropriate tutorials based on path when needed
  useEffect(() => {
    // Only start automatically for first time login and when no tutorial is currently active
    // and when there's no queued tutorials
    if (isFirstTimeLogin && user && !isTutorialActive && tutorialQueue.length === 0) {
      // Get all tutorials for this path in the correct order
      const allTutorials = getAllTutorialsForPath(currentPath);
      
      // Filter out completed tutorials
      const pendingTutorials = allTutorials
        .filter(tutorial => !completedTutorials[tutorial.id])
        .map(tutorial => tutorial.id);
      
      // Queue tutorials if there are any pending
      if (pendingTutorials.length > 0) {
        dispatch(queueTutorials(pendingTutorials));
      }
    }
  }, [isFirstTimeLogin, user, currentPath, completedTutorials, isTutorialActive, tutorialQueue, dispatch]);

  return <>{children}</>;
};

export default TutorialManager;