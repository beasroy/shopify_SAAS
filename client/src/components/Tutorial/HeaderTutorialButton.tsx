import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '@/store';
import { getAllTutorialsForPath } from './TutorialConfig';
import TutorialButton from './TutorialButton';

const HeaderTutorialButton: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isTutorialActive = useSelector((state: RootState) => state.tutorials.isTutorialActive);
  const completedTutorials = useSelector((state: RootState) => state.tutorials.completedTutorials || {});
  
  // Check if there are any tutorials for the current path
  const availableTutorials = getAllTutorialsForPath(currentPath);
  const hasTutorials = availableTutorials.length > 0;
  
  // Check if all tutorials are completed
  const allCompleted = hasTutorials && 
    availableTutorials.every(tutorial => completedTutorials[tutorial.id]);
  
  // Don't show the button if there are no tutorials or if a tutorial is active
  if (!hasTutorials || isTutorialActive) {
    return null;
  }
  
  return (
    <TutorialButton
      buttonText={allCompleted ? "Replay Tutorial" : "Start Tutorial"}
      variant="outline"
      position="header"
      className="ml-2"
    />
  );
};

export default HeaderTutorialButton;