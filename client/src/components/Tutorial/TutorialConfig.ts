export interface TutorialStep {
    element: string;
    popover: {
      title: string;
      description: string;
      position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
    };
  }
  
  export interface TutorialDefinition {
    id: string;
    title: string;
    description?: string;
    route: string | RegExp;  // The route where this tutorial is applicable
    componentId?: string; // Component identifier (optional)
    steps?: TutorialStep[]; // Steps can be defined here or in the steps map
    relatedTutorials?: string[]; // IDs of tutorials that should run after this one
    priority?: number; // Higher priority tutorials will run first (default: 0)
  }
  
  // List of all available tutorials
  export const availableTutorials: TutorialDefinition[] = [
    {
      id: 'age-conversion-report',
      title: 'Age Conversion Report',
      description: 'Understanding the age conversion report',
      route: /^\/conversion-reports\/[a-zA-Z0-9]+\/demographics$/,
      componentId: 'age-report', 
      priority: 10, // Higher priority - will run first
    },
   
    // Add more tutorial definitions here
  ];
  
  // Map tutorial steps by tutorial ID
  export const tutorialStepsMap: Record<string, TutorialStep[]> = {
    'age-conversion-report': [
        {
            element: '#age-report-table',
            popover: {
              title: 'Detailed Data',
              description: 'Review detailed conversion numbers for each age group here.',
              position: 'top'
            }
          },
      {
        element: '#age-report-performance',
        popover: {
          title: 'Key Performers',
          description: 'These metrics highlight your best and worst performing age segments.',
          position: 'left'
        }
      },
      {
        element: "#refresh",
        popover: {
          title: "Refresh for Updated Values",
          description: "Refresh to see the latest performance metrics for different age segments",
          position: 'bottom',
        },
      },
      {
        element: "#filters",
        popover: {
          title: "Filter Your Data",
          description:
            "Use filters to refine your data by selecting a metric, condition, and value. Click 'Add Filter' to apply.",
          position: "bottom",
        },
    }

    ],
    // Define more tutorial steps as needed
  };
  
  // Helper to get all tutorials for a given path
  export const getTutorialsForPath = (path: string): TutorialDefinition[] => {
    return availableTutorials
      .filter(tutorial => {
        if (typeof tutorial.route === 'string') {
          return tutorial.route === path;
        } else {
          return tutorial.route.test(path);
        }
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Sort by priority
  };
  
  // Helper to get tutorial steps by tutorial ID
  export const getTutorialSteps = (tutorialId: string): TutorialStep[] => {
    const tutorial = getTutorialById(tutorialId);
    
    // If tutorial has steps defined in its definition, use those
    if (tutorial?.steps && tutorial.steps.length > 0) {
      return tutorial.steps;
    }
    
    // Otherwise check the steps map
    return tutorialStepsMap[tutorialId] || [];
  };
  
  // Helper to get a specific tutorial by ID
  export const getTutorialById = (id: string): TutorialDefinition | undefined => {
    return availableTutorials.find(tutorial => tutorial.id === id);
  };
  
  // Helper to get related tutorials (tutorials that should run after this one)
  export const getRelatedTutorials = (tutorialId: string): string[] => {
    const tutorial = getTutorialById(tutorialId);
    return tutorial?.relatedTutorials || [];
  };
  
  // Helper to get component-specific tutorials for a path
  export const getComponentTutorials = (path: string, componentId: string): TutorialDefinition[] => {
    return availableTutorials
      .filter(tutorial => {
        const routeMatches = typeof tutorial.route === 'string'
          ? tutorial.route === path
          : tutorial.route.test(path);
  
        return routeMatches && tutorial.componentId === componentId;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Sort by priority
  };
  
  // Helper to get all tutorials for the current path in the correct order
  export const getAllTutorialsForPath = (path: string): TutorialDefinition[] => {
    const pageTutorials = getTutorialsForPath(path);
    
    // Process tutorials to include related tutorials in the correct order
    const processedTutorials: TutorialDefinition[] = [];
    const addedTutorialIds = new Set<string>();
    
    const processTutorial = (tutorialId: string) => {
      if (addedTutorialIds.has(tutorialId)) {
        return;
      }
      
      const tutorial = getTutorialById(tutorialId);
      if (!tutorial) {
        return;
      }
      
      // Check if the route matches
      const routeMatches = typeof tutorial.route === 'string'
        ? tutorial.route === path
        : tutorial.route.test(path);
        
      if (!routeMatches) {
        return;
      }
      
      processedTutorials.push(tutorial);
      addedTutorialIds.add(tutorialId);
      
      // Process related tutorials
      (tutorial.relatedTutorials || []).forEach(processTutorial);
    };
    
    // Process tutorials in priority order
    pageTutorials.forEach(tutorial => processTutorial(tutorial.id));
    
    return processedTutorials;
  };
  
  // Create a route map for quick lookup
  export const tutorialRouteMap: Record<string, string | RegExp> = {};
  availableTutorials.forEach(tutorial => {
    tutorialRouteMap[tutorial.id] = tutorial.route;
  });