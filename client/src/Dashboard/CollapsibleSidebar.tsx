import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LogOut, User2Icon, Store } from 'lucide-react';
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

export default function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedBrandId, setSelectedBrandId, brands, setBrands } = useBrand();
  const navigate = useNavigate();

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
        const response = await axios.get(`${baseURL}/api/brands/all`, { withCredentials: true });
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
          <nav className="mt-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            <SidebarItem
              icon={<Logo />}
              text={"Messold"}
              isExpanded={isExpanded}
              isSelected={true}
              tooltipContent="Messold"
            />
            {brands.map(brand => (
              <SidebarItem
                key={brand._id}
                icon={<Store size={24} />}
                //icon={<img src={brand.logoUrl} alt={brand.name} className="w-6 h-6 rounded-full" />}  
                //uncomment this when adding logos from db
                text={brand.name.replace(/_/g, ' ')}
                isExpanded={isExpanded}
                isSelected={selectedBrandId === brand._id}
                tooltipContent={brand.name}
                onClick={() => {
                  setSelectedBrandId(brand._id);
                  navigate(`/business-dashboard/${brand._id}`);
                }}
              />
            ))}
          </nav>
        </div>
        <UserProfile isExpanded={isExpanded} />
      </div>
    </TooltipProvider>
  );
}

function SidebarItem({ icon, text, isExpanded, openIcon, closeIcon, children, isSelected, tooltipContent, onClick }: {
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


  const content = (
    <div
      onClick={onClick}
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
            <p>{tooltipContent}</p>
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