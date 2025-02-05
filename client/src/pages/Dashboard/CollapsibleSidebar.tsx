import { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Compass, LogOut, User2Icon, Radar, Store, ChartNoAxesCombined, CalendarRange, LineChart } from 'lucide-react';
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { setSelectedBrandId, setBrands, resetBrand } from "@/store/slices/BrandSlice.ts";
import axios from 'axios';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Logo from "@/assets/messold-icon.png";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FaMeta } from "react-icons/fa6";
import { SiGoogleads } from "react-icons/si";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from "../../store/index.ts";
import { clearUser } from '@/store/slices/UserSlice.ts';


export interface Brand {
    _id: string;
    name: string;
    fbAdAccounts?: string[];
    googleAdAccount?: string;
    ga4Account?: { string: string };
}
export default function CollapsibleSidebar() {
    const [isExpanded, setIsExpanded] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;

    const dispatch = useDispatch();
    const selectedBrandId = useSelector((state: RootState) => state.brand.selectedBrandId);
    const brands = useSelector((state: RootState) => state.brand.brands);
    const user = useSelector((state: RootState) => state.user.user);
    // Fetch brands
    useEffect(() => {
        const fetchBrands = async () => {
            try {
                if (!user?.brands || user.brands.length === 0) {
                    console.warn('No brand IDs found in user context.');
                    return;
                }

                const response = await axios.post(
                    `${baseURL}/api/brands/filter`,
                    { brandIds: user.brands },
                    { withCredentials: true }
                );

                const fetchedBrands = response.data;
                dispatch(setBrands(fetchedBrands)); // Store brands in Redux

                // If no brand is selected, default to the first brand
                if (!selectedBrandId && fetchedBrands.length > 0) {
                    dispatch(setSelectedBrandId(fetchedBrands[0]._id));
                }
            } catch (error) {
                console.error('Error fetching brands:', error);
            }
        };

        fetchBrands();
    }, [user?.brands, setBrands, setSelectedBrandId, baseURL, selectedBrandId]);





    const toggleSidebar = () => setIsExpanded(prev => !prev);

    const handleLogout = async () => {
        try {
            const response = await axios.post(`${baseURL}/api/auth/logout`, {}, { withCredentials: true });
            if (response.status === 200) {
                dispatch(clearUser());
                dispatch(resetBrand());
                navigate('/');
            }
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    useEffect(() => {
        const pathParts = location.pathname.split('/');
        if (pathParts[2]) {
            setSelectedBrandId(pathParts[2]);
        }
    }, [location.pathname, setSelectedBrandId]);

    const dashboards = [
        { name: "AdMetrics Hub", path: `/analytics-dashboard/${selectedBrandId}`, icon: <LineChart size={20} /> },
        { name: "Segment Scope", path: `/segment-dashboard/${selectedBrandId}`, icon: <Compass size={20} /> },
        { name: "Marketing Insights Tracker", path: `/ad-metrics/${selectedBrandId}`, icon: <CalendarRange size={20} />, requiresAdsData: false },
        { name: "E-Commerce Insights", path: `/ecommerce-reports/${selectedBrandId}`, icon: <ChartNoAxesCombined size={20} /> },
        { name: "Meta Reports", path: `/meta-reports/${selectedBrandId}`,icon: <FaMeta size={18} />},
        { name: "Google Ads Reports", path: `/google-ads-hub/${selectedBrandId}`, icon: <SiGoogleads size={18} /> },
        
        {
            name: "Conversion Radar", path: `/#`, icon: <Radar size={20} />,
            subItems: [
                {
                    name: "Audience & Traffic Sources",
                    path: `/conversion-reports/${selectedBrandId}/demographics`
                },
                {
                    name: "Camapign and Website Performance",
                    path: `/conversion-reports/${selectedBrandId}/performance`
                }
            ]
        }
    ];


    const isItemDisabled = (item: any) => {
        if (!selectedBrandId) return true;

        const currentBrand = brands.find(b => b._id === selectedBrandId);
        if (
            (item.name === 'Analytics Dashboard' || item.name === 'Campaign Metrics') &&
            (!currentBrand?.fbAdAccounts && !currentBrand?.googleAdAccount)
        ) {
            return true;
        }
        return false;
    };


    return (
        <TooltipProvider>
            <div ref={sidebarRef} className={`bg-[rgb(4,16,33)] text-white transition-all duration-500 ease-in-out flex flex-col ${isExpanded ? 'w-64' : 'w-16'}`} style={{ height: '100vh' }}>
                <div className={`flex justify-between items-center p-4 relative`}>
                    <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <img src={Logo} alt="Messold Logo" className="h-8 w-8" />
                        {isExpanded ? <span className="text-sm ml-2">Messold</span> : null}
                    </div>
                    <span
                        className={`transition-all duration-300 ease-in-out bg-[rgb(4,16,33)] rounded-full flex items-center justify-center`}
                        style={{
                            width: '25px',
                            height: '25px',
                            position: 'absolute',
                            right: '-10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 50,
                        }}
                        onClick={toggleSidebar}
                    >
                        {isExpanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
                    </span>
                </div>

                <div className={`flex-1 overflow-y-auto ${isExpanded ? 'h-[calc(100vh-64px)]' : 'h-[calc(100vh-16px)]'}`}>
                    <ScrollArea className="h-full">
                        {brands && brands.length > 0 && <nav className="mt-3">
                            <SidebarItem
                                icon={<Store size={24} />}
                                text={selectedBrandId ? brands.find(b => b._id === selectedBrandId)?.name.replace(/_/g, ' ') || "Unknown Brand" : "Your Brands"}
                                isExpanded={isExpanded}
                                openIcon={<ChevronUp />}
                                closeIcon={<ChevronDown />}
                                isSelected={!!selectedBrandId}
                                tooltipContent="Your Brands"
                                autoOpenOnSelect= {false}
                            >
                                {brands.map(brand => (
                                    <SidebarChild
                                        key={brand._id}
                                        path={`/analytics-dashboard/${brand._id}`}
                                        text={brand.name.replace(/_/g, ' ')}
                                        onClick={() => {
                                            dispatch(setSelectedBrandId(brand._id));
                                            navigate(`/analytics-dashboard/${brand._id}`);
                                        }}
                                        isSelected={selectedBrandId === brand._id}
                                    />
                                ))}
                            </SidebarItem>

                            {dashboards.map((dashboard, index) => (
                                <SidebarItem
                                    key={index}
                                    icon={dashboard.icon}
                                    text={dashboard.name}
                                    isExpanded={isExpanded}
                                    isSelected={location.pathname.startsWith(dashboard.path)}
                                    tooltipContent={`${dashboard.name}${isItemDisabled(dashboard) ? ' (No Analytics data available)' : ''}`}
                                    onClick={dashboard.subItems ? undefined : () => {
                                        if (!isItemDisabled(dashboard)) {
                                            navigate(dashboard.path);
                                        }
                                    }}
                                    disabled={isItemDisabled(dashboard)}
                                    openIcon={dashboard.subItems ? <ChevronUp /> : undefined}
                                    closeIcon={dashboard.subItems ? <ChevronDown /> : undefined}
                                    
                                >
                                    {dashboard.subItems?.map((subItem, subIndex) => (
                                        <SidebarChild
                                            key={subIndex}
                                            path={subItem.path}
                                            text={subItem.name}
                                            onClick={() => navigate(subItem.path)}
                                            isSelected={location.pathname === subItem.path}
                                        />
                                    ))}
                                </SidebarItem>
                            ))}
                        </nav>}
                    </ScrollArea>
                </div>

                <div className="flex flex-col">
                    <UserProfile isExpanded={isExpanded} user={user} />
                    <LogoutButton handleLogout={handleLogout} isExpanded={isExpanded} />
                </div>
            </div>
        </TooltipProvider>
    );
}

function SidebarItem({ icon, text, isExpanded, openIcon, closeIcon, children, isSelected, tooltipContent, onClick, disabled, autoOpenOnSelect=true }: {
    icon?: React.ReactNode; text: string; isExpanded: boolean; openIcon?: React.ReactNode; closeIcon?: React.ReactNode; children?: React.ReactNode; isSelected: boolean; tooltipContent: string; onClick?: () => void; disabled?: boolean ; autoOpenOnSelect?: boolean;
}) {

    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
        setIsOpen(prev => !prev);
    };

    const isChildSelected = React.Children.toArray(children).some(
        (child: any) => child?.props?.isSelected
      );
    const isActive = isSelected || isChildSelected;

    useEffect(() => {
        if (autoOpenOnSelect && isActive) {
          setIsOpen(true);
        }
      }, [isActive, autoOpenOnSelect]);

      const content = (
        <div
          onClick={disabled ? undefined : onClick || handleToggle}
          className={`flex items-center px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${
            isActive ? 'text-white font-semibold relative' : 'text-gray-100'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <span className="mr-2">{icon}</span>
          {isExpanded && <span className="text-xs">{text}</span>}
          {isExpanded && <span className="ml-auto">{isOpen ? openIcon : closeIcon}</span>}
        </div>
      );

    return (
        <div>
          {!isExpanded ? (
            <Tooltip>
              <TooltipTrigger asChild>{content}</TooltipTrigger>
              <TooltipContent side="right">
                <p className={React.Children.count(children) > 0 ? 'mb-4' : ''}>
                  {tooltipContent}
                </p>
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
    };

function SidebarChild({ path, text, onClick, disabled = false, isSelected = false }: {
    path: string;
    text: string;
    onClick?: () => void;
    disabled?: boolean;
    isSelected?: boolean;
}): JSX.Element {
    const baseClasses = `flex items-center text-xs w-full p-2.5 transition-colors duration-200 ${isSelected ? 'text-white font-semibold relative bg-gray-700' : 'text-gray-100'} ${disabled ? 'cursor-not-allowed text-gray-400' : 'hover:bg-gray-700'}`;

    return disabled ? (
        <div className={baseClasses}>
            {text}
            {isSelected && <div className="absolute left-0 w-1 h-full bg-white" />}
        </div>
    ) : (
        <NavLink to={path} className={baseClasses} onClick={(e) => {
            if (onClick) {
                e.preventDefault();
                onClick();
            }
        }}>
            {text}
            {isSelected && <div className="absolute left-0 top-0 w-1 h-full bg-white" />}
        </NavLink>
    );
}

// UserProfile component
function UserProfile({ isExpanded, user }: { isExpanded: boolean; user: any }) {
    const userProfileContent = (
        <div className={'flex items-center gap-4 px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer'}>
            <span className="text-gray-300 hover:text-white">
                <User2Icon size={24} />
            </span>
            {isExpanded && <span className="text-sm mr-2">{user?.username || 'user'}</span>}
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
        </div>
    );
}

// LogoutButton component
function LogoutButton({ handleLogout, isExpanded }: { handleLogout: () => void; isExpanded: boolean }) {
    const logoutContent = (
        <div onClick={handleLogout} className={'flex items-center gap-4 px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer'}>
            <span className="text-gray-300 hover:text-white">
                <LogOut size={24} />
            </span>
            {isExpanded && <span className="hidden sm:inline">Logout</span>}
        </div>
    );

    return (
        <div>
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
