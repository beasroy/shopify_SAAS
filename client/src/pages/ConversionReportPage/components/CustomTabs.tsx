import React from 'react';

interface TabProps {
  label: string;
  value: string;
  isActive: boolean;
  onClick: (value: string) => void;
}

const Tab: React.FC<TabProps> = ({ label, value, isActive, onClick }) => (
  <button
    className={`px-6 py-2 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? ' text-blue-500' 
        : 'text-gray-600 hover:text-gray-900'
    }`}
    onClick={() => onClick(value)}
  >
    {label}
  </button>
);

interface CustomTabsProps {
  tabs: { label: string; value: string }[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const CustomTabs: React.FC<CustomTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex justify-center items-center border-b border-gray-200">
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          label={tab.label}
          value={tab.value}
          isActive={activeTab === tab.value}
          onClick={onTabChange}
        />
      ))}
    </div>
  );
};

