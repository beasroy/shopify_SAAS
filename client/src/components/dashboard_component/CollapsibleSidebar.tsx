import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Blend,
  LogOut,
  User2Icon,
  Store,
  CalendarRange,
  LineChart,
  Target,
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { setSelectedBrandId, setBrands, resetBrand } from "@/store/slices/BrandSlice.ts"
import axios from "axios"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Logo from "@/assets/messold-icon.png"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "../../store/index.ts"
import { clearUser } from "@/store/slices/UserSlice.ts"
import { baseURL } from "@/data/constant.ts"
import type { IBrand } from "@/interfaces"
import { WhiteGa4Logo, WhiteGoogleAdsLogo } from "@/data/logo.tsx"
import { FaMeta } from "react-icons/fa6"
import { Crown } from 'lucide-react';
import PricingModal from "../../pages/Pricing/Pricing.tsx"

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
  }, [fetchBrands]) // Will only run when dependencies change

  const toggleSidebar = () => setIsExpanded((prev) => !prev)

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${baseURL}/api/auth/logout`, {}, { withCredentials: true })
      if (response.status === 200) {
        dispatch(clearUser())
        dispatch(resetBrand())
        navigate("/")
        // Reset initial load state for next login
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

  // Helper function to get current path type
  const getCurrentPathType = () => {
    const pathParts = location.pathname.split("/")
    if (pathParts.length >= 2) {
      return pathParts[1] // Returns the path type (e.g., 'ad-metrics', 'analytics-dashboard', etc.)
    }
    return 'dashboard' // Default
  }

  // Function to handle brand change navigation
  const handleBrandChange = (brandId: string) => {
    dispatch(setSelectedBrandId(brandId))

    // If it's initial load, we'll navigate to dashboard (this is handled in fetchBrands)
    // For subsequent brand changes, stay on current dashboard type but with new brand ID
    if (!isInitialLoad) {
      const currentPathType = getCurrentPathType()

      // Special case for main dashboard that doesn't have brandId in URL
      if (currentPathType === 'dashboard') {
        navigate('/dashboard')
        return
      }

      // For pages with brand ID in URL path, replace the old brand ID with the new one
      const pathParts = location.pathname.split("/")
      if (pathParts.length >= 3) {
        pathParts[2] = brandId
        navigate(pathParts.join('/'))
      } else {
        // Fallback - navigate to the same dashboard type with new brandId
        navigate(`/${currentPathType}/${brandId}`)
      }
    }
  }

  const handlePricing = () => {
    setIsPricingOpen(true);
  }

  // Define base dashboards that all users can see
  const allDashboards = [
    { name: "Business Overview", path: `/dashboard`, icon: <Blend size={20} /> },
    { name: "Marketing Insights Tracker", path: `/marketing-insights/${selectedBrandId}`, icon: <CalendarRange size={20} /> },
    { name: "Ad Metrics Hub", path: `/admetrics/${selectedBrandId}`, icon: <LineChart size={20} /> },
    {
      name: "GA4 Analytics",
      path: `#`,
      icon: <WhiteGa4Logo />,
      subItems: [
        { name: "E-Commerce Insights", path: `/ecommerce-reports/${selectedBrandId}` },
        { name: "Conversion Lens", path: `/conversion-reports/${selectedBrandId}` },
      ],
    },
    {
      name: "Meta",
      path: `#`,
      icon: <FaMeta />,
      subItems: [
        { name: "Campaign Analysis", path: `/meta-campaigns/${selectedBrandId}` },
        { name: "Interest 360", path: `/meta-interest/${selectedBrandId}` },
        { name: "Meta Reports", path: `/meta-reports/${selectedBrandId}` },
      ],
    },

    { name: "Google Reports", path: `/google-reports/${selectedBrandId}`, icon: <WhiteGoogleAdsLogo /> },

    { name: "Brands Targets", path: `/performance-metrics`, icon: <Target size={20} /> },
  ]

  const isItemDisabled = (item: any) => {
    if (!selectedBrandId) return true

    const currentBrand = brands.find((b) => b._id === selectedBrandId)
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
        className={`bg-[rgb(4,16,33)] text-white transition-all duration-500 ease-in-out flex flex-col ${isExpanded ? "w-56" : "w-16"}`}
        style={{ height: "100vh" }}
      >
        <div className={`flex justify-between items-center p-4 relative`}>
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/dashboard")}>
            <img src={Logo || "/placeholder.svg"} alt="Messold Logo" className="h-8 w-8" />
            {isExpanded ? <span className="text-sm ml-2">Messold</span> : null}
          </div>
          <span
            className={`transition-all duration-300 ease-in-out bg-[rgb(4,16,33)] rounded-full flex items-center justify-center`}
            style={{
              width: "25px",
              height: "25px",
              position: "absolute",
              right: "-10px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 50,
            }}
            onClick={toggleSidebar}
          >
            {isExpanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </span>
        </div>

        <div className={`flex-1 overflow-y-auto ${isExpanded ? "h-[calc(100vh-64px)]" : "h-[calc(100vh-16px)]"}`}>
          <ScrollArea className="h-full">
            <nav className="mt-3">
              {/* Brand selector - Modified to use handleBrandChange */}
              <SidebarItem
                icon={<Store size={24} />}
                text={
                  selectedBrandId
                    ? brands.find((b) => b._id === selectedBrandId)?.name.replace(/_/g, " ") || "Unknown Brand"
                    : "Your Brands"
                }
                isExpanded={isExpanded}
                openIcon={<ChevronUp />}
                closeIcon={<ChevronDown />}
                isSelected={!!selectedBrandId}
                tooltipContent="Your Brands"
                autoOpenOnSelect={false}
              >
                {brands.map((brand: IBrand) => (
                  <SidebarChild
                    key={brand._id}
                    path={`#`} // Changed to # to prevent default navigation
                    text={brand.name.replace(/_/g, " ")}
                    onClick={() => handleBrandChange(brand._id)} // Use our new handler
                    isSelected={selectedBrandId === brand._id}
                  />
                ))}
              </SidebarItem>

              {/* Dashboard items - all open by default */}
              {allDashboards.map((item, index) => {
                const isAnySubItemSelected = item.subItems?.some((subItem) => location.pathname === subItem.path)

                const isMainItemActive =
                  (location.pathname.startsWith(item.path) && item.path !== "#") || isAnySubItemSelected

                // Main heading with tooltip when collapsed
                const dashboardItemContent = (
                  <div
                    className={`flex items-center px-4 py-1.5 mb-1 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 ${item.subItems ? "cursor-auto" : "cursor-pointer"}
                      ${isMainItemActive ? "text-white font-semibold relative" : "text-gray-100"
                      } ${isItemDisabled(item) ? "cursor-not-allowed opacity-50" : ""}`}
                    onClick={() => {
                      if (!isItemDisabled(item) && item.path && item.path !== "#" && !item.subItems) {
                        navigate(item.path)
                      }
                    }}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {isExpanded && <span className="text-xs">{item.name}</span>}
                    {isExpanded && item.subItems && <span className="ml-auto"></span>}
                  </div>
                )

                return (
                  <div key={index}>
                    {/* Main heading with tooltip when collapsed */}
                    {!isExpanded ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{dashboardItemContent}</TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.name}</p>
                          {item.subItems && (
                            <>
                              <div className="h-[1px] w-full my-2 bg-gray-400" />
                              <div className="mt-1">
                                {item.subItems.map((subItem, subIndex) => {
                                  const disabled = isItemDisabled(subItem);
                                  return (
                                    <div
                                      key={subIndex}
                                      className={`text-xs py-1.5 px-1 rounded transition-colors ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-gray-700 cursor-pointer"
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!disabled) navigate(subItem.path);
                                      }}
                                    >
                                      {subItem.name}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      dashboardItemContent
                    )}

                    {/* Subheadings with divider */}
                    {isExpanded && item.subItems && (
                      <div className="pl-8 mb-2">
                        <div className="h-[1px] w-2/3 my-2 bg-gray-400" />
                        {item.subItems.map((subItem, subIndex) => {
                          const disabled = isItemDisabled(subItem);
                          return (
                            <div
                              key={subIndex}
                              className={`flex items-center text-xs w-full p-2 transition-colors duration-200 ${disabled
                                  ? "opacity-50"
                                  : "cursor-pointer hover:bg-gray-700"
                                } ${location.pathname === subItem.path && !disabled
                                  ? "text-white font-semibold relative bg-gray-800"
                                  : "text-gray-100"
                                }`}
                              onClick={() => {
                                if (!disabled) navigate(subItem.path);
                              }}
                            >
                              <span>{subItem.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </ScrollArea>
        </div>

        <div className="flex flex-col">
          <PricingButton isExpanded={isExpanded} handlePricing={handlePricing} />
          <UserProfile isExpanded={isExpanded} user={user} />
          <LogoutButton handleLogout={handleLogout} isExpanded={isExpanded} />
        </div>
      </div>
      <PricingModal open={isPricingOpen} onOpenChange={setIsPricingOpen} />
    </TooltipProvider>
  )
}

// Keep these components for the brand section which should remain the same
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

  const baseClasses = `flex items-center text-xs w-full p-2 transition-colors duration-200 
      ${isActive ? "text-white font-semibold relative bg-gray-800" : "text-gray-100"} 
      ${disabled ? "cursor-not-allowed text-gray-400" : "hover:bg-gray-700"}`

  const content = (
    <>
      <div className="flex items-center justify-between w-full">
        <span>{text}</span>
        {hasChildren && <span className="ml-2">{isOpen ? <ChevronUp /> : <ChevronDown />}</span>}
      </div>
      {isActive && <div className="absolute left-0 top-0 w-1 h-full bg-white" />}
    </>
  )

  const childItem = disabled ? (
    <div className={baseClasses}>{content}</div>
  ) : (
    <NavLink
      to={path}
      className={baseClasses}
      onClick={(e) => {
        // Stop default navigation for items that are just containers
        if (path === "/#" || !path || path === "#") {
          e.preventDefault()
        }

        // Always toggle if there are children
        if (hasChildren) {
          handleToggle()
        }

        // External onClick handler
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
        <div className="relative pl-4">
          <div className="absolute top-0 left-4 w-1 h-full bg-gray-500" />
          {children}
        </div>
      )}
    </div>
  )
}

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

  // Enhanced recursive check for nested selections
  const isChildSelected = React.Children.toArray(children).some((child: any) => {
    if (child?.props?.isSelected) return true
    // Check if any of this child's children are selected
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
        // Always toggle if it has children
        if (hasChildren) {
          handleToggle()
        }

        // Then handle navigation via onClick if provided
        if (!disabled && onClick) {
          onClick()
        }
      }}
      className={`flex items-center px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${isActive ? "text-white font-semibold relative" : "text-gray-100"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className="mr-2">{icon}</span>
      {isExpanded && <span className="text-xs">{text}</span>}
      {isExpanded && <span className="ml-auto">{isOpen ? openIcon : closeIcon}</span>}
    </div>
  )

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">
            <p className={React.Children.count(children) > 0 ? "mb-4" : ""}>{tooltipContent}</p>
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
  )
}

interface UserProfileProps {
  isExpanded: boolean
  user: any
}

function UserProfile({ isExpanded, user }: UserProfileProps) {
  const navigate = useNavigate()
  const userProfileContent = (
    <div
      onClick={() => navigate("/profile")}
      className={
        "flex items-center gap-3 px-3 py-1.5 mb-1 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer"
      }
    >
      <span className="text-gray-300 hover:text-white">
        <User2Icon size={24} />
      </span>
      {isExpanded && <span className="text-sm mr-2">{user?.username || "user"}</span>}
    </div>
  )

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{userProfileContent}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{user?.username || "user"}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        userProfileContent
      )}
    </div>
  )
}

interface LogoutButtonProps {
  handleLogout: () => void
  isExpanded: boolean
}

function LogoutButton({ handleLogout, isExpanded }: LogoutButtonProps) {
  const logoutContent = (
    <div
      onClick={handleLogout}
      className={
        "flex items-center gap-3 px-3 py-1.5 mb-1 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer"
      }
    >
      <span className="text-gray-300 hover:text-white">
        <LogOut size={24} />
      </span>
      {isExpanded && <span className="hidden sm:inline">Logout</span>}
    </div>
  )

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{logoutContent}</TooltipTrigger>
          <TooltipContent side="right">
            <p>Logout</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        logoutContent
      )}
    </div>
  )
}

interface pricingButtonProps {
  handlePricing: () => void
  isExpanded: boolean
}

function PricingButton({ handlePricing, isExpanded }: pricingButtonProps) {
  const pricingContent = (
    <div
      onClick={handlePricing}
      className={
        "flex items-center gap-3 px-3 py-1.5 mb-1 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer"
      }
    >
      <span className="text-gray-300 hover:text-white">
        <Crown size={24} />
      </span>
      {isExpanded && <span className="hidden sm:inline">Pricing</span>}
    </div>
  )

  return (
    <div>
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{pricingContent}</TooltipTrigger>
          <TooltipContent side="right">
            <p>Pricing</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        pricingContent
      )}
    </div>
  )
}