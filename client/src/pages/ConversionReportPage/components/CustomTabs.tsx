"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Search, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface HorizontalTabsProps {
  tabs: {
    label: string
    value: string
  }[]
  activeTab: string
  onTabChange: (value: string) => void
}

export function CustomTabs({ tabs, activeTab, onTabChange }: HorizontalTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const filteredTabs = tabs.filter((tab) => tab.label.toLowerCase().includes(searchQuery.toLowerCase()))


  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setShowLeftArrow(scrollLeft > 0)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5) 
  }


  useEffect(() => {
    if (!scrollContainerRef.current) return

    const activeTabElement = scrollContainerRef.current.querySelector(`[data-value="${activeTab}"]`) as HTMLElement
    if (activeTabElement) {
      const container = scrollContainerRef.current
      const containerRect = container.getBoundingClientRect()
      const tabRect = activeTabElement.getBoundingClientRect()

      const scrollLeft =
        tabRect.left - containerRect.left - containerRect.width / 2 + tabRect.width / 2 + container.scrollLeft

      container.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      })
    }

    checkScrollPosition()
  }, [activeTab])


  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener("scroll", checkScrollPosition)
 
      checkScrollPosition()

      return () => {
        container.removeEventListener("scroll", checkScrollPosition)
      }
    }
  }, [])


  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const scrollAmount = container.clientWidth * 0.8

    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "flex-shrink-0 rounded-full h-8 w-8 bg-white shadow-sm transition-opacity",
            showLeftArrow ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onClick={() => handleScroll("left")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Scroll left</span>
        </Button>


        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex items-center justify-center gap-1 p-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                data-value={tab.value}
                className={cn(
                  "px-4 py-2 text-sm rounded-md whitespace-nowrap transition-colors",
                  tab.value === activeTab ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100",
                )}
                onClick={() => onTabChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right scroll button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "flex-shrink-0 rounded-full h-8 w-8 bg-white shadow-sm transition-opacity",
            showRightArrow ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onClick={() => handleScroll("right")}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Scroll right</span>
        </Button>

        {/* Search popover */}
        <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="ml-2 flex-shrink-0">
              <Search className="h-4 w-4" />
              <span className="sr-only">Search tabs</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tabs..."
                  className="pl-9 pr-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear search</span>
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto border-t">
              {filteredTabs.length > 0 ? (
                filteredTabs.map((tab) => (
                  <button
                    key={tab.value}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors",
                      tab.value === activeTab ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-gray-50",
                    )}
                    onClick={() => {
                      onTabChange(tab.value)
                      setIsSearchOpen(false)
                      setSearchQuery("")
                    }}
                  >
                    {tab.label}
                  </button>
                ))
              ) : (
                <div className="py-4 px-2 text-center text-sm text-gray-500">No tabs match your search</div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Dropdown for all tabs */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="ml-2 flex-shrink-0">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">All tabs</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
            {tabs.map((tab) => (
              <DropdownMenuItem
                key={tab.value}
                className={cn(tab.value === activeTab && "bg-blue-50 text-blue-600 font-medium")}
                onClick={() => onTabChange(tab.value)}
              >
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
