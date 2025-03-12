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
        id: 'business-performance',
        title: 'Business Performance',
        route: '/dashboard',
        description: 'Period wise Metrics Performance',
    },
    {
        id: 'report-tab',
        title: 'Report Tab',
        route: /^\/conversion-reports\/[a-zA-Z0-9]+\/demographics$/,
        description: 'Choose the Reports you want. Tap one any of the report and you will redirect to that report',
        priority: 2, // Higher priority - will run first,
        relatedTutorials:['age-conversion-report']
    },
    {
        id: 'age-conversion-report',
        title: 'Age Conversion Report',
        description: 'Understanding the age conversion report',
        route: /^\/conversion-reports\/[a-zA-Z0-9]+\/demographics$/,
        componentId: 'age-report',
        priority: 1, 
    },
    { 
        id: 'marketing-insights',
        title: 'Marketing Insights',
        description: 'Understanding the marketing insights iver different months',
        route: /^\/ad-metrics\/[a-zA-Z0-9]+$/,
    }
];

// Map tutorial steps by tutorial ID
export const tutorialStepsMap: Record<string, TutorialStep[]> = {
'business-performance': [
    {
        element: '#analytics-section',
        popover: {
            title: 'Analytics Overview',
            description: 'This section provides key business metrics such as Sessions, Cart Additions, Checkouts, and Purchases.',
            position: 'top'
        }
    },
    {
        element: '#sessions-metric',
        popover: {
            title: 'Sessions Overview',
            description: `This section shows the total number of sessions on your website:\n
            - Yesterday: Displays the total sessions for yesterday and its comparison to the previous day.\n
            - Last 7 Days: Aggregates data for the last 7 days and compares it with the previous 7-day period.\n
            - Last 30 Days: Shows trends over the last month, compared with the previous 30-day period.`,
            position: 'bottom'
        }
    }
]
,
    'report-tab':[
        {
            element: '#report-tab',
            popover: {
                title: 'Report Tab',
                description: 'Choose the Reports you want. Tap one any of the report and you will redirect to that report',
                position: 'bottom'
            }
        },
    ],
    'age-conversion-report': [
        {
            element: '#age-report',
            popover: {
                title: 'Age based Report',
                description: 'Review detailed monthly conversion numbers for each age group here.',
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
            element: '#age-report-table',
            popover: {
                title: 'Detailed Data',
                description: 'Analyze session counts, conversion rates, and purchase trends for different age groups over time.',
                position: 'top'
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
        },
        {
            element: "#download-button",
            popover: {
                title: "Download Your Excel Report",
                description: "Click to download the report as an Excel file for further analysis.",
                position: "bottom",
            }
        },
        {
            element: "#expand-button",
            popover: {
                title: "Expand the Table for a Better View",
                description: "Click to enlarge the table for easier data analysis and readability.",
                position: "bottom",
            }
        }
    ],
    'marketing-insights': [
        {
            element: '#metrics-table',
            popover: {
                title: 'Monthly Performance Overview',
                description: 'This table displays key performance metrics for each month over the last two years, including ad spend, sales, and ROAS for Meta, Google, and Shopify.',
                position: 'left'
            }
        },
        {
            element: '#expand-month',
            popover: {
                title: 'Expand to View Daily Breakdown',
                description: 'Click on a month to expand and see the daily breakdown of ad performance metrics.',
                position: 'top'
            }
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
    // Get tutorials that match the current path
    const pageTutorials = getTutorialsForPath(path);
    
    // Sort them by priority (higher priority first)
    const sortedTutorials = [...pageTutorials].sort((a, b) => 
        (b.priority || 0) - (a.priority || 0)
    );
    
    // Create a map to store unique tutorials
    const tutorialMap = new Map<string, TutorialDefinition>();
    
    // Process a tutorial and its related tutorials
    const processTutorial = (tutorial: TutorialDefinition) => {
        // Skip if already processed
        if (tutorialMap.has(tutorial.id)) {
            return;
        }
        
        // Add the tutorial to our map
        tutorialMap.set(tutorial.id, tutorial);
        
        // Process related tutorials
        if (tutorial.relatedTutorials && tutorial.relatedTutorials.length > 0) {
            for (const relatedId of tutorial.relatedTutorials) {
                const relatedTutorial = getTutorialById(relatedId);
                if (relatedTutorial) {
                    processTutorial(relatedTutorial);
                }
            }
        }
    };
    
    // Process all tutorials
    for (const tutorial of sortedTutorials) {
        processTutorial(tutorial);
    }
    
    // Convert map to array, preserving the original priority order
    const result = Array.from(tutorialMap.values());
    
    // Add debugging log
    console.log('Available tutorials:', result.map(t => t.id).join(', '));
    
    return result;
};

// Create a route map for quick lookup
export const tutorialRouteMap: Record<string, string | RegExp> = {};
availableTutorials.forEach(tutorial => {
    tutorialRouteMap[tutorial.id] = tutorial.route;
});