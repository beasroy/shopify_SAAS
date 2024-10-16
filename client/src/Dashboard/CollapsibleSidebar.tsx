

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Home, Settings, User } from 'lucide-react'

export default function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(true)

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
          <SidebarItem icon={<Home size={24} />} text="Home" isExpanded={isExpanded} />
          <SidebarItem icon={<User size={24} />} text="Profile" isExpanded={isExpanded} />
          <SidebarItem icon={<Settings size={24} />} text="Settings" isExpanded={isExpanded} />
        </nav>
      </div>
  
  )
}

function SidebarItem({ icon, text, isExpanded }: { icon: React.ReactNode; text: string; isExpanded: boolean }) {
  return (
    <a
      href="#"
      className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200"
    >
      <span className="mr-4">{icon}</span>
      {isExpanded && <span className="text-sm">{text}</span>}
    </a>
  )
}