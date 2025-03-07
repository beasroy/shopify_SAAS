import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '@/store';
import { queueTutorials } from '@/store/slices/TutorialSlice';
import { getAllTutorialsForPath } from './TutorialConfig';

interface TutorialButtonProps {
  className?: string;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  componentId?: string;
  tutorialId?: string;
  position?: 'header' | 'inline'; // Position determines behavior
}

const TutorialButton: React.FC<TutorialButtonProps> = ({
  className = '',
  buttonText = 'Start Tutorial',
  variant = 'primary',
  componentId,
  tutorialId,
  position = 'inline',
}) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isTutorialActive = useSelector((state: RootState) => state.tutorials.isTutorialActive);

  const handleStartTutorial = () => {
    // If a specific tutorial ID is provided, queue just that tutorial
    if (tutorialId) {
      dispatch(queueTutorials([tutorialId]));
      return;
    }
    
    // For header button or general page tutorial button, 
    // get all tutorials for the current path
    const allTutorials = getAllTutorialsForPath(currentPath);
    const tutorialIds = allTutorials.map(tutorial => tutorial.id);
    
    // If we're in "header" mode, queue all tutorials
    if (position === 'header') {
      if (tutorialIds.length > 0) {
        dispatch(queueTutorials(tutorialIds));
      } else {
        console.warn(`No tutorials found for path ${currentPath}`);
      }
      return;
    }
    
    // For component-specific buttons, filter by componentId if provided
    if (componentId) {
      const componentTutorials = allTutorials
        .filter(tutorial => tutorial.componentId === componentId)
        .map(tutorial => tutorial.id);
      
      if (componentTutorials.length > 0) {
        dispatch(queueTutorials(componentTutorials));
      } else {
        console.warn(`No tutorials found for component ${componentId} on path ${currentPath}`);
      }
      return;
    }
    
    // Default: queue all tutorials for this path
    if (tutorialIds.length > 0) {
      dispatch(queueTutorials(tutorialIds));
    } else {
      console.warn(`No tutorials found for path ${currentPath}`);
    }
  };

  // Determine button styling based on variant
  const buttonStyles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
    outline: 'border border-blue-500 text-blue-500 hover:bg-blue-50'
  };

  return (
    <button
      onClick={handleStartTutorial}
      disabled={isTutorialActive}
      className={`px-4 py-2 rounded-md ${buttonStyles[variant]} ${className} ${isTutorialActive ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {buttonText}
    </button>
  );
};

export default TutorialButton;