import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, X, BarChart3 } from "lucide-react"

interface SideTabProps {
  tabs: {
    label: string
    value: string
    icon?: React.ReactNode
  }[]
  activeTab: string
  onTabChange: (value: string) => void
  className?: string
  collapsible?: boolean
  mobileBreakpoint?: number
}

export function SideTab({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className,
  collapsible = true,
  mobileBreakpoint = 768
}: SideTabProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint)
      if (window.innerWidth < mobileBreakpoint) {
        setIsCollapsed(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [mobileBreakpoint])

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen)
  }

  const handleTabClick = (value: string) => {
    onTabChange(value)
    if (isMobile) {
      setIsMobileOpen(false)
    }
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile Toggle Button */}
        <button
          onClick={toggleMobile}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-lg hover:bg-blue-700 transition-colors"
        >
          <BarChart3 className="w-5 h-5" />
        </button>

        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleMobile} />
        )}

        {/* Mobile Sidebar */}
        <div className={cn(
          "lg:hidden fixed left-0 top-0 h-full bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Reports</h3>
            <button
              onClick={toggleMobile}
              className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto w-64">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabClick(tab.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-all duration-200 border-l-4 hover:bg-gray-50",
                  tab.value === activeTab
                    ? "bg-blue-50 border-blue-500 text-blue-700 font-medium shadow-sm"
                    : "border-transparent text-gray-700 hover:text-gray-900"
                )}
              >
                {tab.icon && (
                  <span className={cn(
                    "flex-shrink-0",
                    tab.value === activeTab ? "text-blue-600" : "text-gray-500"
                  )}>
                    {tab.icon}
                  </span>
                )}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={cn(
      "hidden lg:flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-48",
      className
    )}>
      <div className={cn(
        "p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50",
        isCollapsed && "justify-center"
      )}>
        {!isCollapsed && <h3 className="text-sm font-medium text-gray-900">Reports</h3>}
        {collapsible && (
          <button
            onClick={toggleCollapse}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-all duration-200 border-l-4 hover:bg-gray-50 group",
              tab.value === activeTab
                ? "bg-blue-50 border-blue-500 text-blue-700 font-medium shadow-sm"
                : "border-transparent text-gray-700 hover:text-gray-900"
            )}
            title={isCollapsed ? tab.label : undefined}
          >
            {tab.icon && (
              <span className={cn(
                "flex-shrink-0 transition-colors duration-200",
                isCollapsed && "mx-auto",
                tab.value === activeTab ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
              )}>
                {tab.icon}
              </span>
            )}
            {!isCollapsed && (
              <span className="truncate">{tab.label}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
} 