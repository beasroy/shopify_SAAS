import { useState,useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChartColumn, ChevronDown, ChevronUp, LogOut, User2Icon, Store } from 'lucide-react'
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext' 
import { useNavigate } from 'react-router-dom'
import { useBrand } from '@/context/BrandContext'
import axios from 'axios'

export default function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedBrandId, setSelectedBrandId } = useBrand();
  const [brands, setBrands] = useState<any[]>([]); // State to hold brands
  const location = useLocation();

  const baseURL =
  import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

  const toggleSidebar = () => {
    setIsExpanded(prev => !prev);
  }

  useEffect(()=>{
    const fetchBrands = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/brands/all`);
        setBrands(response.data);
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };
    fetchBrands();
  },[]);

  // Mock brands data - replace with actual data fetching logic
  console.log(brands)


  return (
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
            icon={<Store size={24} />} 
            text={selectedBrandId ? brands.find(b => b._id === selectedBrandId)?.name.replace(/_/g, ' ') : "Your Brands"}
            isExpanded={isExpanded} 
            openIcon={<ChevronUp />} 
            closeIcon={<ChevronDown />}
            isSelected={selectedBrandId?true:false}
          >
            {brands.map(brand => (
              <SidebarChild 
                key={brand._id} 
                path="#" // No direct path, only for selection
                text={brand.name.replace(/_/g, ' ')} // Replace underscores with spaces for display
                onClick={() => setSelectedBrandId(brand._id)} // Set the selected brand ID
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
          >
            <SidebarChild path={`/business-dashboard/${selectedBrandId || ''}`} text="Business Dashboard" />
            <SidebarChild path={`/analytics-dashboard/${selectedBrandId || ''}`} text="Metrics Dashboard" />
          </SidebarItem>
        </nav>
      </div>
      <UserProfile isExpanded={isExpanded} />
    </div>
  );
}

function SidebarItem({ icon, text, isExpanded, openIcon, closeIcon, children, isSelected }: { 
  icon?: React.ReactNode; 
  text: string; 
  isExpanded: boolean; 
  openIcon: React.ReactNode; 
  closeIcon: React.ReactNode; 
  children?: React.ReactNode;
  isSelected: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div>
      <div
        onClick={handleToggle}
        className={`flex items-center px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors
           duration-200 cursor-pointer ${isSelected ? 'text-white font-semibold relative' : 'text-gray-100'}`}
      >
        <span className="mr-4">{icon}</span>
        {isExpanded && <span className="text-sm">{text}</span>}
        {isExpanded && <span className="ml-auto">{isOpen ? openIcon : closeIcon}</span>}
      </div>
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

function SidebarChild({ path, text, onClick }: { path: string; text: string; onClick?: () => void }) {
  const { pathname } = useLocation();
  const isSelected = pathname === path;

  return (
    <NavLink
      to={path}
      className={`flex items-center text-sm w-full p-3 hover:bg-gray-700 transition-colors duration-200 ${
        isSelected ? 'text-white font-semibold relative' : 'text-gray-100'
      }`}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {text}
      {isSelected && (
        <div className="absolute left-0 w-1 h-full bg-white" /> 
      )}
    </NavLink>
  );
}

function UserProfile({isExpanded}:{isExpanded: boolean}){
  const { user, setUser } = useUser();
  const {resetBrand} = useBrand();
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
  return (
    <div>
      <div className={'flex items-center gap-4 px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer'}>
        <span className="text-gray-300 hover:text-white">
          <User2Icon size={24} />
        </span>
        {isExpanded && <span className="text-sm mr-2">{user?.username}</span>}
      </div>
      <div className={'flex items-center gap-4 px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer'}>
        <span className="text-gray-300 hover:text-white">
          <LogOut onClick={handleLogout} size={24} />
        </span>
        {isExpanded && <span className="hidden sm:inline">Logout</span>}
      </div>
    </div>
  );
}