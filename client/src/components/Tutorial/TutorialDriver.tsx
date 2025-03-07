import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { driver as driverJS, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { RootState } from '@/store';
import { nextTutorial, stopTutorial, setTutorialStep } from '@/store/slices/TutorialSlice';
import {  getTutorialSteps, getRelatedTutorials } from './TutorialConfig';

const TutorialDriver: React.FC = () => {
  const dispatch = useDispatch();
  const driverInstanceRef = useRef<Driver | null>(null);
  
  const activeTutorial = useSelector((state: RootState) => state.tutorials.activeTutorial);
  const isTutorialActive = useSelector((state: RootState) => state.tutorials.isTutorialActive);
  const activeTutorialStep = useSelector((state: RootState) => state.tutorials.activeTutorialStep);
  
  // Create a new driver instance when tutorial changes
  useEffect(() => {
    if (activeTutorial && isTutorialActive) {
      const steps = getTutorialSteps(activeTutorial);
      
      if (steps && steps.length > 0) {
        
        // Clean up any existing driver instance
        if (driverInstanceRef.current) {
          driverInstanceRef.current.destroy();
        }
        
        // Start the driver with the steps for this tutorial
        setTimeout(() => {
          // Find all elements before creating driver to ensure they exist
          let allElementsExist = true;
          steps.forEach(step => {
            const element = document.querySelector(step.element);
            if (!element) {
              console.warn(`Element ${step.element} not found for tutorial ${activeTutorial}`);
              allElementsExist = false;
            }
          });
          
          if (!allElementsExist) {
            console.warn(`Not all elements for tutorial ${activeTutorial} exist on the page. Moving to next tutorial.`);
            dispatch(nextTutorial());
            return;
          }
          
          // Create a new driver instance with the steps
          const driverInstance = driverJS({
            showProgress: true,
            smoothScroll: true,
            animate: true,
            allowClose: true,
            stagePadding: 10,
            steps: steps,
            onHighlightStarted: (element) => {
              const currentStepIndex = steps.findIndex(step => step.element === element?.id);
              dispatch(setTutorialStep(currentStepIndex >= 0 ? currentStepIndex : 0));
            },
            onDestroyStarted: () => {
              // Handle when user tries to close the tutorial
              if (window.confirm('Are you sure you want to exit the tutorial?')) {
                dispatch(stopTutorial());
                return true;
              }
              return false;
            },
            onDestroyed: () => {
              // Check if there are related tutorials to queue
              const relatedTutorials = getRelatedTutorials(activeTutorial);
              
              if (relatedTutorials.length > 0) {
                // Add related tutorials to the queue
                dispatch(nextTutorial());
              } else {
                // No related tutorials, just move to the next in queue
                dispatch(nextTutorial());
              }
            }
          });
          
          // Start from the active step
          if (activeTutorialStep > 0 && activeTutorialStep < steps.length) {
            // Use proper API method to navigate to a specific step
            driverInstance.highlight(steps[activeTutorialStep]);
          } else {
            driverInstance.drive();
          }
          
          // Store the instance reference
          driverInstanceRef.current = driverInstance;
          
        }, 500); // Longer delay to ensure elements are rendered
      } else {
        console.error(`No steps defined for tutorial: ${activeTutorial}`);
        dispatch(nextTutorial());
      }
    }
    
    // Cleanup function
    return () => {
      if (driverInstanceRef.current) {
        driverInstanceRef.current.destroy();
        driverInstanceRef.current = null;
      }
    };
  }, [activeTutorial, isTutorialActive, activeTutorialStep, dispatch]);
  
  // This component doesn't render anything visible
  return null;
};

export default TutorialDriver;