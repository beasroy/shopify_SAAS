import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Link2, ChevronDown, ChevronUp, LogOut, User2Icon, Store, BarChart,ChartNetwork, CalendarRange, ShoppingCart, MapPin, PanelsTopLeft, LineChart } from 'lucide-react';
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useBrand } from '@/context/BrandContext';
import axios from 'axios';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Logo from "../assets/messold-icon.png";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CollapsibleSidebar() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [brandMetricsData, setBrandMetricsData] = useState<{ [key: string]: boolean }>({});
    const { selectedBrandId, setSelectedBrandId, brands, setBrands } = useBrand();
    const { user, setUser } = useUser();  
    const location = useLocation();
    const navigate = useNavigate();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;

    // Fetch campaign data when a brand is selected
    useEffect(() => {
        const checkBrandMetrics = async () => {
            if (!selectedBrandId) return;

            try {
                const [googleResponse, facebookResponse] = await Promise.all([
                    axios.post(
                        `${baseURL}/api/metrics/googleCampaign/${selectedBrandId}`,
                        { 
                            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            endDate: new Date().toISOString().split('T')[0]
                        },
                        { withCredentials: true }
                    ),
                    axios.post(
                        `${baseURL}/api/metrics/fbCampaign/${selectedBrandId}`,
                        {
                            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            endDate: new Date().toISOString().split('T')[0]
                        },
                        { withCredentials: true }
                    )
                ]);

                // Check if either Google or Facebook data exists and has campaign metrics
                const hasGoogleData = googleResponse.data.data && 
                    Object.keys(googleResponse.data.data).length > 0 &&
                    googleResponse.data.data.campaignData?.some((campaign: any) => 
                        campaign.spend || campaign.roas
                    );

                const hasFacebookData = facebookResponse.data.data && 
                    facebookResponse.data.data.length > 0 &&
                    facebookResponse.data.data.some((campaign: any) => 
                        campaign.spend || campaign.roas
                    );

                setBrandMetricsData(prev => ({
                    ...prev,
                    [selectedBrandId]: hasGoogleData || hasFacebookData
                }));
            } catch (error) {
                console.error('Error checking brand metrics:', error);
                setBrandMetricsData(prev => ({
                    ...prev,
                    [selectedBrandId]: false
                }));
            }
        };

        checkBrandMetrics();
    }, [selectedBrandId, baseURL]);

    // Fetch brands
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
    }, [setBrands, baseURL]);

    const toggleSidebar = () => setIsExpanded(prev => !prev);
    
    const handleLogout = async () => {
        try {
            const response = await axios.post(`${baseURL}/api/auth/logout`, {}, { withCredentials: true });
            if (response.status === 200) {
                setUser(null);
                setSelectedBrandId(null);
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

    const reports = [
        { name: "Monthly Ad Metrics Reports", path: `/ad-metrics/${selectedBrandId}`, icon: <CalendarRange size={24} />, requiresAdsData: false },
        { name: "Daily E-Commerce Metrics Reports", path: `/ecommerce-metrics/${selectedBrandId}`, icon: <ShoppingCart size={24} /> },
        { name: "City based Reports", path: `/city-metrics/${selectedBrandId}`, icon: <MapPin size={24} /> },
        { name: "Landing Page based Reports", path: `/page-metrics/${selectedBrandId}`, icon: <PanelsTopLeft size={24} /> },
        { name: "Referring Channel based Reports", path: `/channel-metrics/${selectedBrandId}`, icon: <Link2 size={24} /> },
        { name: "Campaign Metrics", path: `/campaign-metrics/${selectedBrandId}`, icon: <ChartNetwork size={24} />, requiresAdsData: true }
    ];

    const dashboards = [
        { name: "Business Dashboard", path: `/business-dashboard/${selectedBrandId}`, icon: <BarChart size={24} /> },
        { name: "Analytics Dashboard", path: `/analytics-dashboard/${selectedBrandId}`, icon: <LineChart size={24} />, requiresAdsData: true }
    ];

    const isItemDisabled = (item: any) => {
        if (!selectedBrandId) return true;
        if (item.requiresAdsData && !brandMetricsData[selectedBrandId]) return true;
        return false;
    };

    return (
        <TooltipProvider>
            <div ref={sidebarRef} className={`bg-gray-800 text-white transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'w-64' : 'w-16'}`} style={{ height: '100vh' }}>
                <div className={`flex-1 overflow-y-auto ${isExpanded ? 'h-[calc(100vh-64px)]' : 'h-[calc(100vh-16px)]'}`}>
                    <ScrollArea className="h-full">
                        <div className="flex justify-end p-4">
                            <button onClick={toggleSidebar} className="text-gray-300 hover:text-white focus:outline-none">
                                {isExpanded ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
                            </button>
                        </div>

                        <nav className="mt-3">
                            <SidebarItem 
                                icon={<div className="flex items-center justify-center h-8 w-auto flex-shrink-0">
                                    <img src={Logo} alt="Messold Logo" className="h-full w-auto max-w-none" />
                                </div>} 
                                text="Messold" 
                                isExpanded={isExpanded} 
                                isSelected={true} 
                                tooltipContent="Messold" 
                                onClick={() => navigate('/dashboard')} 
                            />
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
                                        path={`/business-dashboard/${brand._id}`} 
                                        text={brand.name.replace(/_/g, ' ')} 
                                        onClick={() => {
                                            setSelectedBrandId(brand._id);
                                            navigate(`/business-dashboard/${brand._id}`);
                                        }} 
                                        isSelected={selectedBrandId === brand._id}
                                        hasAdsData={brandMetricsData[brand._id]}
                                    />
                                ))}
                            </SidebarItem>

                            {dashboards.map((dashboard, index) => (
                                <SidebarItem 
                                    key={index}
                                    icon={dashboard.icon}
                                    text={dashboard.name}
                                    isExpanded={isExpanded}
                                    isSelected={location.pathname === dashboard.path}
                                    tooltipContent={`${dashboard.name}${isItemDisabled(dashboard) ? ' (No Analytics data available)' : ''}`}
                                    onClick={() => {
                                        if (!isItemDisabled(dashboard)) {
                                            navigate(dashboard.path);
                                        }
                                    }} 
                                    disabled={isItemDisabled(dashboard)}
                                />
                            ))}

                            {reports.map((report, index) => (
                                <SidebarItem 
                                    key={index}
                                    icon={report.icon}
                                    text={report.name}
                                    isExpanded={isExpanded}
                                    isSelected={location.pathname === report.path}
                                    tooltipContent={`${report.name}${isItemDisabled(report) ? ' (No campaign data available)' : ''}`}
                                    onClick={() => {
                                        if (!isItemDisabled(report)) {
                                            navigate(report.path);
                                        }
                                    }} 
                                    disabled={isItemDisabled(report)}
                                />
                            ))}
                        </nav>
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

function SidebarItem({ icon, text, isExpanded, openIcon, closeIcon, children, isSelected, tooltipContent, onClick, disabled }: {
    icon?: React.ReactNode; text: string; isExpanded: boolean; openIcon?: React.ReactNode; closeIcon?: React.ReactNode; children?: React.ReactNode; isSelected: boolean; tooltipContent: string; onClick?: () => void; disabled?: boolean }) {

    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
        setIsOpen(prev => !prev);
    };

    const content = (
        <div onClick={disabled ? undefined : onClick || handleToggle} className={`flex items-center px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${isSelected ? 'text-white font-semibold relative' : 'text-gray-100'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
            <span className="mr-4">{icon}</span> 
            {isExpanded && <span className="text-sm">{text}</span>} 
            {isExpanded && <span className="ml-auto">{isOpen ? openIcon : closeIcon}</span>}
        </div>
    );

    return (
        <div>
            {!isExpanded ? (
                <Tooltip>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
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
function SidebarChild({ path, text, onClick, disabled = false, isSelected = false }: {
    path: string; 
    text: string; 
    onClick?: () => void; 
    disabled?: boolean; 
    isSelected?: boolean;
    hasAdsData?: boolean;  // Add hasAdsData here
}): JSX.Element {
    const baseClasses = `flex items-center text-sm w-full p-3 transition-colors duration-200 ${isSelected ? 'text-white font-semibold relative bg-gray-700' : 'text-gray-100'} ${disabled ? 'cursor-not-allowed text-gray-400' : 'hover:bg-gray-700'}`;

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
        <div  onClick={handleLogout} className={'flex items-center gap-4 px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer'}>
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
