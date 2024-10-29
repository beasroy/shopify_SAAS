import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChartColumn, ChevronDown, ChevronUp, LogOut, User2Icon, Store } from 'lucide-react'
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '@/context/BrandContext'
import axios from 'axios'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Logo from '@/components/dashboard_component/Logo'

export default function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedBrandId, setSelectedBrandId, brands,setBrands } = useBrand();
  const location = useLocation();

  const baseURL =
    import.meta.env.PROD
      ? import.meta.env.VITE_API_URL
      : import.meta.env.VITE_LOCAL_API_URL;

  const toggleSidebar = () => {
    setIsExpanded(prev => !prev);
  }

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/brands/all`,{ withCredentials: true });
        setBrands(response.data);
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };
    fetchBrands();
  }, [setBrands]);


  return (
    <TooltipProvider>
      <div
        className={`bg-gray-800 text-white transition-all duration-300 ease-in-out flex flex-col justify-between ${isExpanded ? 'w-64' : 'w-16'}`}
      >
        <div>
          <div className="flex justify-end p-4">
            <button
              onClick={toggleSidebar}
              className="text-gray-300 hover:text-white focus:outline-none"
              aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isExpanded ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
            </button>
          </div>
          <nav className="mt-3">
            <SidebarItem
              icon={<Logo />}
              text={"Messold"}
              isExpanded={isExpanded}
              isSelected={true}
              tooltipContent="Messold"
            >
            </SidebarItem>
          </nav>
          <nav className="mt-3">
            <SidebarItem
              icon={<Store size={24} />}
              text={selectedBrandId ? brands.find(b => b._id === selectedBrandId)?.name.replace(/_/g, ' ') || "Unknown Brand" : "Your Brands"}
              isExpanded={isExpanded}
              openIcon={<ChevronUp />}
              closeIcon={<ChevronDown />}
              isSelected={!!selectedBrandId}
              tooltipContent="Your Brands"
            >
              {brands.map(brand => (
                <SidebarChild
                  key={brand._id}
                  path={`/${brand._id}`} // Update to proper path
                  text={brand.name.replace(/_/g, ' ')} 
                  onClick={() => setSelectedBrandId(brand._id)} 
                  selectedBrandId={selectedBrandId}
                />
              ))}
            </SidebarItem>
            <SidebarItem
              icon={<ChartColumn size={24} />}
              text="Analytics"
              isExpanded={isExpanded}
              openIcon={<ChevronUp />}
              closeIcon={<ChevronDown />}
              isSelected={location.pathname.includes("/business-dashboard") || location.pathname.includes("/analytics-dashboard")}
              tooltipContent="Analytics"
            >
              <SidebarChild path={`/business-dashboard/${selectedBrandId || ''}`} text="Business Dashboard" />
              <SidebarChild path={`/analytics-dashboard/${selectedBrandId || ''}`} text="Metrics Dashboard"
             disabled={
              !selectedBrandId || 
              !brands || 
              brands.length === 0 || 
              !brands.find(b => b._id === selectedBrandId)?.fbAdAccounts?.length
            } />
            </SidebarItem>
          </nav>
        </div>
        <UserProfile isExpanded={isExpanded} />
      </div>
    </TooltipProvider>
  );
}

function SidebarItem({ icon, text, isExpanded, openIcon, closeIcon, children, isSelected, tooltipContent }: {
  icon?: React.ReactNode;
  text: string;
  isExpanded: boolean;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  children?: React.ReactNode;
  isSelected: boolean;
  tooltipContent: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  const content = (
    <div
      onClick={handleToggle}
      className={`flex items-center px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors
         duration-200 cursor-pointer ${isSelected ? 'text-white font-semibold relative' : 'text-gray-100'}`}
    >
      <span className="mr-4">{icon}</span>
      {isExpanded && <span className="text-sm">{text}</span>}
      {isExpanded && <span className="ml-auto">{isOpen ? openIcon : closeIcon}</span>}
    </div>
  );

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right">
          <p className={React.Children.count(children) > 0 ? 'mb-4' : ''}>{tooltipContent}</p>
            {React.Children.map(children, (child) => (
              <div className="relative">
                <div className="absolute top-0 w-1 h-full bg-gray-500" />
                {child}
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      ) : (
        content
      )}
      {isOpen && isExpanded && (
        <div className="relative pl-8">
          <div className="absolute top-0 w-1 h-full bg-gray-500" />
          {React.Children.map(children, (child) => (
            <div>{child}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarChild({
  path,
  text,
  onClick,
  selectedBrandId,
  disabled,
}: {
  path: string;
  text: string;
  onClick?: () => void;
  selectedBrandId?: string | null;
  disabled?: boolean;
}) {
  const { pathname } = useLocation();
  const isSelected = pathname === path || (selectedBrandId === path.split('/').pop());

  // Apply styles conditionally based on whether the item is disabled or not
  const baseClasses = `flex items-center text-sm w-full p-3 transition-colors duration-200 ${
    isSelected ? 'text-white font-semibold relative' : 'text-gray-100'
  } ${disabled ? 'cursor-not-allowed text-gray-400' : 'hover:bg-gray-700'}`;

  return disabled ? (
    <div className={baseClasses}>
      {text}
      {isSelected && <div className="absolute left-0 w-1 h-full bg-white" />}
    </div>
  ) : (
    <NavLink
      to={path}
      className={baseClasses}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {text}
      {isSelected && <div className="absolute left-0 w-1 h-full bg-white" />}
    </NavLink>
  );
}


function UserProfile({ isExpanded }: { isExpanded: boolean }) {
  const { user, setUser } = useUser();
  const { resetBrand } = useBrand();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;

      await axios.post(`${baseURL}/api/auth/logout`, {}, {
        withCredentials: true
      });

      setUser(null);
      resetBrand();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const userProfileContent = (
    <div className={'flex items-center gap-4 px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer'}>
      <span className="text-gray-300 hover:text-white">
        <User2Icon size={24} />
      </span>
      {isExpanded && <span className="text-sm mr-2">{user?.username ||'user'}</span>}
    </div>
  );

  const logoutContent = (
    <div className={'flex items-center gap-4 px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer'}>
      <span className="text-gray-300 hover:text-white">
        <LogOut onClick={handleLogout} size={24} />
      </span>
      {isExpanded && <span className="hidden sm:inline">Logout</span>}
    </div>
  );

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {userProfileContent}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{user?.username || 'user'}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        userProfileContent
      )}
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {logoutContent}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Logout</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        logoutContent
      )}
    </div>
  );
}
