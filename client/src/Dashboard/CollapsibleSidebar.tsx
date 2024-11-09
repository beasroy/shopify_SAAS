import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, LogOut, User2Icon, Store } from 'lucide-react';
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useBrand } from '@/context/BrandContext';
import axios from 'axios';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Logo from '@/components/dashboard_component/Logo';

const styles = `
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
    margin: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(75, 85, 99, 0.5);
    border-radius: 20px;
    transition: background-color 0.2s ease;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(107, 114, 128, 0.8);
  }
  
  .custom-scrollbar:hover::-webkit-scrollbar-thumb {
    background-color: rgba(107, 114, 128, 0.6);
  }
`;

export default function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedBrandId, setSelectedBrandId, brands, setBrands } = useBrand();
  const location = useLocation();
  const navigate = useNavigate();

  const baseURL = import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

  const toggleSidebar = () => {
    setIsExpanded(prev => !prev);
  };

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/brands/all`, { withCredentials: true });
        setBrands(response.data);
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };
    fetchBrands();
  }, [setBrands]);

  return (
    <>
      <style>{styles}</style>
      <TooltipProvider>
        <div className={`bg-gray-800 text-white transition-all duration-300 ease-in-out flex flex-col h-screen ${isExpanded ? 'w-64' : 'w-16'}`}>
          {/* Header Section */}
          <div className="flex-shrink-0">
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
                text="Messold"
                isExpanded={isExpanded}
                isSelected={false}
                tooltipContent="Messold"
              />
            </nav>
          </div>

          {/* Scrollable Menu Section with custom scrollbar */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <nav className="mt-3 px-2"> {/* Added padding for better scrollbar appearance */}
              {brands.map(brand => (
                <React.Fragment key={brand._id}>
                  <SidebarItem
                    icon={<Store size={24} />}
                    text={brand.name.replace(/_/g, ' ')}
                    isExpanded={isExpanded}
                    openIcon={<ChevronUp size={18} />}
                    closeIcon={<ChevronDown size={18} />}
                    isSelected={selectedBrandId === brand._id}
                    tooltipContent={brand.name.replace(/_/g, ' ')}
                    onClick={() => setSelectedBrandId(brand._id)}
                  >
                    <SidebarChild
                      path={`/business-dashboard/${brand._id}`}
                      text="Business Dashboard"
                      onClick={() => {
                        setSelectedBrandId(brand._id);
                        navigate(`/business-dashboard/${brand._id}`);
                      }}
                    />
                    <SidebarChild
                      path={`/analytics-dashboard/${brand._id}`}
                      text="Metrics Dashboard"
                      onClick={() => {
                        setSelectedBrandId(brand._id);
                        navigate(`/analytics-dashboard/${brand._id}`);
                      }}
                      disabled={!brand.fbAdAccounts?.length}
                    />
                  </SidebarItem>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Footer Section */}
          <div className="flex-shrink-0 mt-auto border-t border-gray-700">
            <UserProfile isExpanded={isExpanded} />
          </div>
        </div>
      </TooltipProvider>
    </>
  );
}

function SidebarItem({
  icon,
  text,
  isExpanded,
  openIcon,
  closeIcon,
  children,
  isSelected,
  tooltipContent,
  onClick
}: {
  icon?: React.ReactNode;
  text: string;
  isExpanded: boolean;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  children?: React.ReactNode;
  isSelected: boolean;
  tooltipContent: string;
  onClick?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (children && React.Children.toArray(children).some((child: any) => 
      location.pathname.includes(child.props.path)
    )) {
      setIsOpen(true);
    }
  }, [location.pathname, children]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
    if (onClick) {
      onClick();
    }
  };

  const content = (
    <div
      onClick={handleToggle}
      className={`flex items-center px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors
         duration-200 cursor-pointer rounded-lg ${isSelected ? 'text-white font-semibold bg-gray-700/50' : 'text-gray-100'}`}
    >
      <span className="mr-4">{icon}</span>
      {isExpanded && (
        <>
          <span className="text-sm flex-grow">{text}</span>
          {children && (
            <span 
              className="ml-auto transform transition-transform duration-200"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              {isOpen ? openIcon : closeIcon}
            </span>
          )}
        </>
      )}
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
            <p>{tooltipContent}</p>
            {isSelected && children && (
              <div className="mt-2">
                {React.Children.map(children, child => (
                  <div className="pl-4">{child}</div>
                ))}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      ) : (
        content
      )}
      {isExpanded && children && (
        <div 
          className="relative pl-8 overflow-hidden transition-all duration-200 ease-in-out"
          style={{ 
            maxHeight: isOpen ? '500px' : '0',
            opacity: isOpen ? 1 : 0
          }}
        >
          <div className="absolute top-0 left-4 w-[2px] h-full bg-gray-600 rounded-full" />
          {React.Children.map(children, child => (
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
  disabled,
}: {
  path: string;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const { pathname } = useLocation();
  const isSelected = pathname === path;

  const baseClasses = `flex items-center text-sm w-full p-3 transition-colors duration-200 rounded-lg
    ${isSelected ? 'text-white font-semibold bg-gray-700/50' : 'text-gray-100'}
    ${disabled ? 'cursor-not-allowed text-gray-400' : 'hover:bg-gray-700 hover:text-white'}`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={baseClasses}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      {text}
      {isSelected && <div className="absolute left-4 w-[2px] h-6 bg-white rounded-full" />}
    </div>
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
      {isExpanded && <span className="text-sm mr-2">{user?.username || 'user'}</span>}
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