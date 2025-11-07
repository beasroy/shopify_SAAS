import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  LogOut,
  User2Icon,
  Store,
  CalendarRange,
  LineChart,
  Plus,
  Home,
  BarChart3,Crown, Clapperboard, Calculator
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { setSelectedBrandId, setBrands, resetBrand } from "@/store/slices/BrandSlice.ts"
import axios from "axios"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Logo from "@/assets/messold-icon.png"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/store/index.ts"
import { clearUser } from "@/store/slices/UserSlice.ts"
import { baseURL } from "@/data/constant.ts"
import type { IBrand } from "@/interfaces"
import {  WhiteGoogleAdsLogo } from "@/data/logo.tsx"
import { FaMeta } from "react-icons/fa6"
import PricingModal from "../../pages/Pricing/Pricing.tsx"

interface DashboardItem {
  name: string;
  path: string;
  icon?: React.ReactNode;
  subItems?: Array<{
    name: string;
    path: string;
  }>;
}

interface SubItem {
  name: string;
  path: string;
  disabled?: boolean;
}

export default function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isPricingOpen, setIsPricingOpen] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const sidebarRef = useRef<HTMLDivElement>(null)

  const dispatch = useDispatch()
  const selectedBrandId = useSelector((state: RootState) => state.brand.selectedBrandId)
  const brands = useSelector((state: RootState) => state.brand.brands)
  const user = useSelector((state: RootState) => state.user.user)

  // Fetch brands
  const fetchBrands = useCallback(async () => {
    try {
      if (!user?.brands || user.brands.length === 0) {
        console.warn("No brand IDs found in user context.")
        return
      }

      const response = await axios.post(
        `${baseURL}/api/brands/filter`,
        { brandIds: user.brands },
        { withCredentials: true },
      )

      dispatch(setBrands(response.data))

      if (!selectedBrandId && response.data.length > 0) {
        dispatch(setSelectedBrandId(response.data[0]._id))
        // For first load after login, navigate to dashboard
        if (isInitialLoad) {
          navigate('/dashboard')
          setIsInitialLoad(false)
        }
      }
    } catch (error) {
      console.error("Error fetching brands:", error)
    }
  }, [user?.brands, dispatch, selectedBrandId, isInitialLoad, navigate])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  const toggleSidebar = () => setIsExpanded((prev) => !prev)

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${baseURL}/api/auth/logout`, {}, { withCredentials: true })
      if (response.status === 200) {
        dispatch(clearUser())
        dispatch(resetBrand())
        console.log("Logged out redirected to home page")
        navigate("/")
        setIsInitialLoad(true)
      }
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  useEffect(() => {
    const pathParts = location.pathname.split("/")
    if (pathParts[2]) {
      dispatch(setSelectedBrandId(pathParts[2]))
    }
  }, [location.pathname, dispatch])

  const getCurrentPathType = () => {
    const pathParts = location.pathname.split("/")
    if (pathParts.length >= 2) {
      return pathParts[1]
    }
    return 'dashboard'
  }

  const handleBrandChange = (brandId: string) => {
    dispatch(setSelectedBrandId(brandId))

    if (!isInitialLoad) {
      const currentPathType = getCurrentPathType()

      if (currentPathType === 'dashboard') {
        navigate('/dashboard')
        return
      }

      const pathParts = location.pathname.split("/")
      if (pathParts.length >= 3) {
        pathParts[2] = brandId
        navigate(pathParts.join('/'))
      } else {
        navigate(`/${currentPathType}/${brandId}`)
      }
    }
  }

  const handlePricing = () => {
    setIsPricingOpen(true);
  }

  const allDashboards = [
    { name: "Dashboard", path: `/dashboard`, icon: <Home size={20} /> },
    { name: "Marketing Insights", path: `/marketing-insights/${selectedBrandId}`, icon: <CalendarRange size={20} /> },
    { name: "D2C Calculator", path: `/d2c-calculator/${selectedBrandId}`, icon: <Calculator size={20} /> },
    { name: "Creatives Library", path: `/creatives-library/${selectedBrandId}`, icon: <Clapperboard size={20} /> },
    { name: "Ad Metrics", path: `/admetrics/${selectedBrandId}`, icon: <LineChart size={20} /> },
    {
      name: "Analytics",
      path: `#`,
      icon: <BarChart3 size={20} />,
      subItems: [
        { name: "E-Commerce Reports", path: `/ecommerce-reports/${selectedBrandId}` },
        { name: "Conversion Reports", path: `/conversion-reports/${selectedBrandId}` },
      ],
    },
    {
      name: "Meta Ads",
      path: `#`,
      icon: <FaMeta size={20} />,
      subItems: [
        { name: "Campaign Analysis", path: `/meta-campaigns/${selectedBrandId}` },
        { name: "Interest Reports", path: `/meta-interest/${selectedBrandId}` },
        { name: "Performance Reports", path: `/meta-reports/${selectedBrandId}` },
      ],
    },
    { name: "Google Ads", path: `/google-reports/${selectedBrandId}`, icon: <WhiteGoogleAdsLogo /> },
    //{ name: "Performance Metrics", path: `/performance-metrics`, icon: <Target size={20} /> },
  ]

  const isItemDisabled = (item: DashboardItem | SubItem): boolean => {
    if (!selectedBrandId) return true

    const currentBrand = brands.find((b: IBrand) => b._id === selectedBrandId)
    if (
      (item.name === "Analytics Dashboard" || item.name === "Campaign Metrics") &&
      !currentBrand?.fbAdAccounts &&
      !currentBrand?.googleAdAccount
    ) {
      return true
    }
    return false
  }

  return (
    <TooltipProvider>
      <div
        ref={sidebarRef}
        className={`bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl relative ${
          isExpanded ? "w-60" : "w-16"
        }`}
        style={{ height: "100vh" }}
      >

                {/* Header Section */}
        <div className="flex-shrink-0 p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center cursor-pointer group" 
              onClick={() => navigate("/dashboard")}
            >
              <div className="relative">
                <img src={Logo || "/placeholder.svg"} alt="Messold Logo" className="h-8 w-8 rounded-lg shadow-lg" />
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              {isExpanded && (
                <span className="ml-3 text-lg font-bold text-slate-200">
                  Parallels
                </span>
              )}
            </div>
            
            {/* Toggle button - only show when expanded */}
            {isExpanded && (
              <button
                onClick={toggleSidebar}
                className="p-0.5 rounded-md text-white hover:text-slate-50 border border-slate-200 hover:bg-slate-700/30 transition-all duration-200 opacity-60 hover:opacity-100"
                title="Collapse sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>
          
          {/* Toggle button for collapsed state - positioned above logo */}
          {!isExpanded && (
            <div className="flex justify-center mt-3">
              <button
                onClick={toggleSidebar}
                className="p-0.5 rounded-md text-white border border-slate-200 hover:text-slate-50 hover:bg-slate-700/30 transition-all duration-200 opacity-60 hover:opacity-100"
                title="Expand sidebar"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className={`h-full ${isExpanded ? "px-3" : "px-2"}`}>
            <nav className="space-y-2 py-4">
              {/* Brand Selector */}
              <div className="mb-6">
                                 <SidebarItem
                   icon={<Store size={20} className="text-slate-300" />}
                  text={
                    selectedBrandId
                      ? brands.find((b: IBrand) => b._id === selectedBrandId)?.name.replace(/_/g, " ") || "Select Brand"
                      : "Your Brands"
                  }
                  isExpanded={isExpanded}
                  openIcon={<ChevronUp size={16} />}
                  closeIcon={<ChevronDown size={16} />}
                  isSelected={!!selectedBrandId}
                  tooltipContent="Brand Management"
                  autoOpenOnSelect={false}
                >
                  {brands.map((brand: IBrand) => (
                    <SidebarChild
                      key={brand._id}
                      path={`#`}
                      text={brand.name.replace(/_/g, " ")}
                      onClick={() => handleBrandChange(brand._id)}
                      isSelected={selectedBrandId === brand._id}
                    />
                  ))}
                  <div className="mx-3 mt-2">
                    <button className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors duration-200 border border-dashed border-slate-600 rounded-lg hover:border-slate-400 hover:bg-slate-600/30">
                      <Plus size={14} />
                      <span>Add Brand</span>
                    </button>
                  </div>
                </SidebarItem>
              </div>

              {/* Main Navigation */}
              <div className="space-y-1">
                {allDashboards.map((item: DashboardItem, index: number) => {
                  const isAnySubItemSelected = item.subItems?.some((subItem) => location.pathname === subItem.path)
                  const isMainItemActive = (location.pathname.startsWith(item.path) && item.path !== "#") || isAnySubItemSelected

                  return (
                    <div key={index}>
                      <SidebarItem
                        icon={item.icon}
                        text={item.name}
                        isExpanded={isExpanded}
                        openIcon={<ChevronDown size={16} />}
                        closeIcon={<ChevronDown size={16} />}
                        isSelected={Boolean(isMainItemActive)}
                        tooltipContent={item.name}
                        onClick={() => {
                          if (!isItemDisabled(item) && item.path && item.path !== "#" && !item.subItems) {
                            navigate(item.path)
                          }
                        }}
                        disabled={isItemDisabled(item)}
                      >
                        {item.subItems?.map((subItem, subIndex) => {
                          const disabled = isItemDisabled(subItem) || false;
                          return (
                            <SidebarChild
                              key={subIndex}
                              path={subItem.path}
                              text={subItem.name}
                              isSelected={location.pathname === subItem.path}
                              disabled={disabled}
                            />
                          );
                        })}
                      </SidebarItem>
                    </div>
                  )
                })}
              </div>
            </nav>
          </ScrollArea>
        </div>

        {/* Footer Section */}
        <div className={`flex-shrink-0 border-t border-slate-700/50 space-y-1 ${isExpanded ? "p-3" : "p-2"}`}>
          <PricingButton isExpanded={isExpanded} handlePricing={handlePricing} />
          <UserProfile isExpanded={isExpanded} user={user} />
          <LogoutButton handleLogout={handleLogout} isExpanded={isExpanded} />
        </div>
      </div>
      <PricingModal open={isPricingOpen} onOpenChange={setIsPricingOpen} />
    </TooltipProvider>
  )
}

// Enhanced SidebarChild component
interface SidebarChildProps {
  path: string
  text: string
  onClick?: () => void
  disabled?: boolean
  isSelected?: boolean
  children?: React.ReactNode
}

function SidebarChild({
  path,
  text,
  onClick,
  disabled = false,
  isSelected = false,
  children,
}: SidebarChildProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = React.Children.count(children) > 0

  const handleToggle = () => {
    if (hasChildren) {
      setIsOpen((prev) => !prev)
    }
  }

  const isChildSelected = React.Children.toArray(children).some((child: any) => child?.props?.isSelected)
  const isActive = isSelected || isChildSelected

  useEffect(() => {
    if (isActive) {
      setIsOpen(true)
    }
  }, [isActive])

  const baseClasses = `flex items-center text-xs w-full px-4 py-3 rounded-lg transition-all duration-200 ${
    isActive 
      ? "text-white bg-slate-600/30  shadow-lg" 
      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
  } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`

  const content = (
    <>
      <div className="flex items-center justify-between w-full">
        <span className="font-medium capitalize">{text}</span>
        {hasChildren && <span className="ml-2">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>}
      </div>
    </>
  )

  const childItem = disabled ? (
    <div className={baseClasses}>{content}</div>
  ) : (
    <NavLink
      to={path}
      className={baseClasses}
      onClick={(e) => {
        if (path === "/#" || !path || path === "#") {
          e.preventDefault()
        }
        if (hasChildren) {
          handleToggle()
        }
        if (onClick) {
          onClick()
        }
      }}
    >
      {content}
    </NavLink>
  )

  return (
    <div>
      {childItem}
      {isOpen && hasChildren && (
        <div className="relative pl-4 mt-1">
          <div className="absolute top-0 left-4 w-px h-full bg-slate-600/50" />
          {children}
        </div>
      )}
    </div>
  )
}

// Enhanced SidebarItem component
interface SidebarItemProps {
  icon?: React.ReactNode
  text: string
  isExpanded: boolean
  openIcon?: React.ReactNode
  closeIcon?: React.ReactNode
  children?: React.ReactNode
  isSelected: boolean
  tooltipContent: string
  onClick?: () => void
  disabled?: boolean
  autoOpenOnSelect?: boolean
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
  onClick,
  disabled,
  autoOpenOnSelect = true,
}: SidebarItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = React.Children.count(children) > 0

  const handleToggle = () => {
    if (hasChildren) {
      setIsOpen((prev) => !prev)
    }
  }

  const isChildSelected = React.Children.toArray(children).some((child: any) => {
    if (child?.props?.isSelected) return true
    if (child?.props?.children) {
      return React.Children.toArray(child.props.children).some((grandchild: any) => grandchild?.props?.isSelected)
    }
    return false
  })

  const isActive = isSelected || isChildSelected

  useEffect(() => {
    if (autoOpenOnSelect && isActive) {
      setIsOpen(true)
    }
  }, [isActive, autoOpenOnSelect])

  const content = (
    <div
      onClick={() => {
        if (hasChildren) {
          handleToggle()
        }
        if (!disabled && onClick) {
          onClick()
        }
      }}
      className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group capitalize ${
        isActive 
          ? "text-white bg-slate-600/30 border-l-2 border-slate-400 shadow-lg" 
          : "text-slate-300 hover:text-white hover:bg-slate-700/50"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
             <span className={`mr-3 transition-colors duration-200 ${
         isActive ? "text-slate-300" : "text-slate-400 group-hover:text-slate-300"
       }`}>
        {icon}
      </span>
      {isExpanded && <span className="text-sm font-medium flex-1 capitalize">{text}</span>}
      {isExpanded && hasChildren && (
        <span className="text-slate-400 group-hover:text-white transition-colors">
          {isOpen ? openIcon : closeIcon}
        </span>
      )}
    </div>
  )

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 border-slate-700">
            <p className="font-medium">{tooltipContent}</p>
            {React.Children.map(children, (child) => (
              <div className="relative">{child}</div>
            ))}
          </TooltipContent>
        </Tooltip>
      ) : (
        content
      )}
      {isOpen && isExpanded && (
        <div className="relative pl-4 mt-1">
          <div className="absolute top-0 left-4 w-px h-full bg-slate-600/50" />
          {React.Children.map(children, (child) => (
            <div>{child}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// Enhanced UserProfile component
interface UserProfileProps {
  isExpanded: boolean
  user: any
}

function UserProfile({ isExpanded, user }: UserProfileProps) {
  const navigate = useNavigate()
  const userProfileContent = (
    <div
      onClick={() => navigate("/profile")}
      className={`flex items-center gap-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 cursor-pointer group ${isExpanded ? "px-3" : "px-2"}`}
    >
      <div className="p-1.5 rounded-lg bg-slate-700/50 group-hover:bg-blue-600/20 transition-colors duration-200">
        <User2Icon size={18} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
      </div>
      {isExpanded && (
        <div className="flex-1">
          <span className="text-sm font-medium">{user?.username || "User"}</span>
          <div className="text-xs text-slate-400">View Profile</div>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{userProfileContent}</TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 border-slate-700">
            <p className="font-medium">{user?.username || "User"}</p>
            <p className="text-sm text-slate-400">View Profile</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        userProfileContent
      )}
    </div>
  )
}

// Enhanced LogoutButton component
interface LogoutButtonProps {
  handleLogout: () => void
  isExpanded: boolean
}

function LogoutButton({ handleLogout, isExpanded }: LogoutButtonProps) {
  const logoutContent = (
    <div
      onClick={handleLogout}
      className={`flex items-center gap-3 py-2.5 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200 cursor-pointer group ${isExpanded ? "px-3" : "px-2"}`}
    >
      <div className="p-1.5 rounded-lg bg-slate-700/50 group-hover:bg-red-600/20 transition-colors duration-200">
        <LogOut size={18} className="text-slate-400 group-hover:text-red-400 transition-colors" />
      </div>
      {isExpanded && (
        <div className="flex-1">
          <span className="text-sm font-medium">Logout</span>
          <div className="text-xs text-slate-400">Sign out</div>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{logoutContent}</TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 border-slate-700">
            <p className="font-medium">Logout</p>
            <p className="text-sm text-slate-400">Sign out</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        logoutContent
      )}
    </div>
  )
}

// Enhanced PricingButton component
interface pricingButtonProps {
  handlePricing: () => void
  isExpanded: boolean
}

function PricingButton({ handlePricing, isExpanded }: pricingButtonProps) {
  const pricingContent = (
    <div
      onClick={handlePricing}
      className={`flex items-center gap-3 py-2.5 rounded-lg text-slate-300 hover:bg-yellow-600/20 hover:text-yellow-400 transition-all duration-200 cursor-pointer group ${isExpanded ? "px-3" : "px-2"}`}
    >
      <div className="p-1.5 rounded-lg bg-slate-700/50 group-hover:bg-yellow-600/20 transition-colors duration-200">
        <Crown size={18} className="text-slate-400 group-hover:text-yellow-400 transition-colors" />
      </div>
      {isExpanded && (
        <div className="flex-1">
          <span className="text-sm font-medium">Pricing</span>
          <div className="text-xs text-slate-400">View Plans</div>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{pricingContent}</TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 border-slate-700">
            <p className="font-medium">Pricing</p>
            <p className="text-sm text-slate-400">View Plans</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        pricingContent
      )}
    </div>
  )
}