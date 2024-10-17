import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChartColumn, ChevronDown, ChevronUp } from 'lucide-react'
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

export default function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleSidebar = () => {
    setIsExpanded(prev => !prev)
  }

  return (
      <div
        className={`bg-gray-800 text-white transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
      >
        <div className="flex justify-end p-4">
          <button
            onClick={toggleSidebar}
            className="text-gray-300 hover:text-white focus:outline-none"
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isExpanded ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </button>
        </div>
        <nav className="mt-8">
          <SidebarItem icon={<ChartColumn size={24} />} text="Analytics" isExpanded={isExpanded} openIcon={<ChevronUp/>} closeIcon={<ChevronDown />}>
            <SidebarChild path="/dashboard" text="Business Dashboard" />
            <SidebarChild path="/analytics-dashboard" text="Metrics Dashboard" />
          </SidebarItem>
        </nav>
      </div>
  )
}

function SidebarItem({ icon, text, isExpanded, openIcon, closeIcon, children }: { 
  icon?: React.ReactNode; 
  text: string; 
  isExpanded: boolean; 
  openIcon: React.ReactNode; 
  closeIcon: React.ReactNode; 
  children?: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div>
      <div
        onClick={handleToggle} // Toggle accordion on click
        className="flex items-center px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer"
      >
        <span className="mr-4">{icon}</span>
        {isExpanded && <span className="text-sm">{text}</span> }
        {isExpanded &&<span className="ml-auto">{isOpen ? openIcon : closeIcon}</span>} {/* Show open/close icon */}
      </div>
      {isOpen && isExpanded && ( // Render children if open and expanded
        <div className="relative pl-8">
          <div className="absolute top-0 w-1 h-full bg-gray-500" /> {/* Continuous line */}
            {React.Children.map(children, (child) => (
              <div> {/* Added padding for child items */}
                {child}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function SidebarChild({ path, text }: { path: string; text: string }) {
  const { pathname } = useLocation();
  const isSelected = pathname === path;

  return (
    <NavLink
      to={path}
      className={`flex items-center text-sm w-full p-3 hover:bg-gray-700 transition-colors duration-200 ${
        isSelected ? 'text-white font-semibold relative' : 'text-gray-100'
      }`}
    >
      {text}
      {isSelected && (
        <div className="absolute left-0 w-1 h-full bg-white" /> 
      )}
    </NavLink>
  );
}
