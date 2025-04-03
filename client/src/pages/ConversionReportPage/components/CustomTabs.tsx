"use client"

import type React from "react"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TabProps {
  label: string
  value: string
  isActive: boolean
  onClick: (value: string) => void
}

const Tab: React.FC<TabProps> = ({ label, value, isActive, onClick }) => (
  <button
    className={cn(
      "px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 border-b-2",
      isActive
        ? "border-blue-500 text-blue-600"
        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300",
    )}
    onClick={() => onClick(value)}
    aria-selected={isActive}
    role="tab"
  >
    {label}
  </button>
)

interface FixedTabsWithMoreProps {
  tabs: { label: string; value: string }[]
  activeTab: string
  onTabChange: (value: string) => void
  visibleTabCount?: number
}

export const CustomTabs: React.FC<FixedTabsWithMoreProps> = ({
  tabs,
  activeTab,
  onTabChange,
  visibleTabCount = 7, // Default to showing 7 tabs
}) => {
  const visibleTabs = tabs.slice(0, visibleTabCount)
  const hiddenTabs = tabs.slice(visibleTabCount)

  const activeTabIndex = tabs.findIndex((tab) => tab.value === activeTab)
  if (activeTabIndex >= visibleTabCount && visibleTabs.length > 0) {
    const activeHiddenTab = hiddenTabs.find((tab) => tab.value === activeTab)

    if (activeHiddenTab) {
      // Modified logic: Remove from the first visible tab instead of the last
      const newHiddenTabs = hiddenTabs.filter((tab) => tab.value !== activeHiddenTab.value)
      // Add the first visible tab to the hidden tabs
      newHiddenTabs.unshift(visibleTabs[0])
      // Create new visible tabs by removing the first one and adding the active tab to the end
      const newVisibleTabs = [...visibleTabs.slice(1), activeHiddenTab]

      return (
        <div className="relative flex justify-center items-center border-b border-gray-200 w-full">
          <div className="flex justify-center items-center overflow-x-hidden">
            {newVisibleTabs.map((tab) => (
              <Tab
                key={tab.value}
                label={tab.label}
                value={tab.value}
                isActive={tab.value === activeTab}
                onClick={onTabChange}
              />
            ))}
          </div>

          {newHiddenTabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-2 ml-1">
                  <MoreHorizontal className="h-4 w-4 mr-1" />
                  <span className="text-xs font-medium">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {newHiddenTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.value}
                    className={cn("cursor-pointer", tab.value === activeTab && "bg-blue-50 text-blue-600")}
                    onClick={() => onTabChange(tab.value)}
                  >
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )
    }
  }

  // Default rendering when active tab is visible or no swapping needed
  return (
    <div className="relative flex justify-center items-center border-b border-gray-200 w-full">
      <div className="flex justify-center items-center overflow-x-hidden">
        {visibleTabs.map((tab) => (
          <Tab
            key={tab.value}
            label={tab.label}
            value={tab.value}
            isActive={tab.value === activeTab}
            onClick={onTabChange}
          />
        ))}
      </div>

      {hiddenTabs.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 px-2 ml-1">
              <MoreHorizontal className="h-4 w-4 mr-1" />
              <span className="text-xs font-medium">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {hiddenTabs.map((tab) => (
              <DropdownMenuItem
                key={tab.value}
                className={cn("cursor-pointer", tab.value === activeTab && "bg-blue-50 text-blue-600")}
                onClick={() => onTabChange(tab.value)}
              >
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

