import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FullPageContextType {
    fullPageComponent: string | null;
    toggleFullPage: (componentName: string) => void;
}

const FullPageContext = createContext<FullPageContextType | undefined>(undefined);

export const FullPageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [fullPageComponent, setFullPageComponent] = useState<string | null>(null);

    const toggleFullPage = (componentName: string) => {
        setFullPageComponent(prev => (prev === componentName ? null : componentName));
    };

    return (
        <FullPageContext.Provider value={{ fullPageComponent, toggleFullPage }}>
            {children}
        </FullPageContext.Provider>
    );
};

export const useFullPage = (): FullPageContextType => {
    const context = useContext(FullPageContext);
    if (!context) {
        throw new Error('useFullPage must be used within a FullPageProvider');
    }
    return context;
};