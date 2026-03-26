
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  LogOut,
  User2Icon,
  Store,
  CalendarRange,
  Calendar,
  LineChart,
  Plus,
  Home,
  Crown,
  Clapperboard,
  Calculator,
  Target,
  ShoppingCart,
  Package,
  Eye,
  Gauge,
  ChartBarIncreasing,
  SquareDashedMousePointer,
  Menu,
  X,
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
import { WhiteGoogleAdsLogo } from "@/data/logo.tsx"
import { FaMeta } from "react-icons/fa6"
import PricingModal from "../../pages/Pricing/Pricing.tsx"

interface DashboardItem {
  name: string
  path: string
  icon?: React.ReactNode
  subItems?: Array<{
    name: string
    path: string
  }>
}

interface SubItem {
  name: string
  path: string
  disabled?: boolean
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < breakpoint
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    let raf = 0

    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setIsMobile(window.innerWidth < breakpoint)
      })
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [breakpoint])

  return isMobile
}

export default function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isPricingOpen, setIsPricingOpen] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(false)
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false)
  const [isMobileMoreMounted, setIsMobileMoreMounted] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const dispatch = useDispatch()
  const selectedBrandId = useSelector((state: RootState) => state.brand.selectedBrandId)
  const brands = useSelector((state: RootState) => state.brand.brands)
  const user = useSelector((state: RootState) => state.user.user)
  const sortedBrands = useMemo(
    () =>
      [...brands].sort((a: IBrand, b: IBrand) =>
        a.name.replace(/_/g, " ").localeCompare(b.name.replace(/_/g, " "), undefined, { sensitivity: "base" }),
      ),
    [brands],
  )

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

      const sortedResponseBrands = [...response.data].sort((a: IBrand, b: IBrand) =>
        a.name.replace(/_/g, " ").localeCompare(b.name.replace(/_/g, " "), undefined, { sensitivity: "base" }),
      )

      dispatch(setBrands(sortedResponseBrands))

      if (!selectedBrandId && sortedResponseBrands.length > 0) {
        dispatch(setSelectedBrandId(sortedResponseBrands[0]._id))
        if (isInitialLoad) {
          navigate("/dashboard")
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

  useEffect(() => {
    const pathParts = location.pathname.split("/")
    if (pathParts[2]) {
      dispatch(setSelectedBrandId(pathParts[2]))
    }
  }, [location.pathname, dispatch])

  useEffect(() => {
    setIsMobileMoreOpen(false)
  }, [location.pathname, isMobile])

  useEffect(() => {
    if (isMobileMoreOpen) {
      setIsMobileMoreMounted(true)
      return
    }

    const timer = window.setTimeout(() => {
      setIsMobileMoreMounted(false)
    }, 280)

    return () => window.clearTimeout(timer)
  }, [isMobileMoreOpen])

  useEffect(() => {
    if (!isMobileMoreMounted) return

    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction

    document.body.style.overflow = "hidden"
    document.body.style.touchAction = "none"

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [isMobileMoreMounted])

  const toggleSidebar = () => setIsExpanded((prev) => !prev)

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${baseURL}/api/auth/logout`, {}, { withCredentials: true })
      if (response.status === 200) {
        dispatch(clearUser())
        dispatch(resetBrand())
        navigate("/")
        setIsInitialLoad(true)
      }
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const getCurrentPathType = () => {
    const pathParts = location.pathname.split("/")
    if (pathParts.length >= 2) {
      return pathParts[1]
    }
    return "dashboard"
  }

  const handleBrandChange = (brandId: string) => {
    dispatch(setSelectedBrandId(brandId))

    if (!isInitialLoad) {
      const currentPathType = getCurrentPathType()

      if (currentPathType === "dashboard") {
        navigate("/dashboard")
        return
      }

      const pathParts = location.pathname.split("/")
      if (pathParts.length >= 3) {
        pathParts[2] = brandId
        navigate(pathParts.join("/"))
      } else {
        navigate(`/${currentPathType}/${brandId}`)
      }
    }
  }

  const handlePricing = () => {
    setIsPricingOpen(true)
  }

  const allDashboards: DashboardItem[] = useMemo(
    () => [
      { name: "Dashboard", path: `/dashboard`, icon: <Home size={20} /> },
      { name: "Marketing Insights", path: `/marketing-insights/${selectedBrandId}`, icon: <CalendarRange size={20} /> },
      { name: "Revenue Analytics", path: `/location-analytics/${selectedBrandId}`, icon: <ChartBarIncreasing size={20} /> },
      { name: "Festival Calendar", path: `/festival-calendar/${selectedBrandId}`, icon: <Calendar size={20} /> },
      { name: "Speed Insights", path: `/speed-insights`, icon: <Gauge size={20} /> },
      { name: "D2C Calculator", path: `/d2c-calculator/${selectedBrandId}`, icon: <Calculator size={20} /> },
      { name: "Creatives Library", path: `/creatives-library/${selectedBrandId}`, icon: <Clapperboard size={20} /> },
      { name: "Ad Market", path: `/followed-brands/${selectedBrandId}`, icon: <Eye size={20} /> },
      { name: "Ad Metrics", path: `/admetrics/${selectedBrandId}`, icon: <LineChart size={20} /> },
      { name: "E-Commerce Reports", path: `/ecommerce-reports/${selectedBrandId}`, icon: <ShoppingCart size={20} /> },
      { name: "Conversion Reports", path: `/conversion-reports/${selectedBrandId}`, icon: <Target size={20} /> },
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
      { name: "Page Analytics", path: `/page-analytics/${selectedBrandId}`, icon: <Package size={20} /> },
      { name: "Master Dashboard", path: `/master-dashboard/`, icon: <SquareDashedMousePointer size={20} /> },
    ],
    [selectedBrandId]
  )

  const isItemDisabled = (item: DashboardItem | SubItem): boolean => {
    const itemPath = "path" in item ? item.path : ""

    if (!selectedBrandId && itemPath !== "/dashboard" && itemPath !== "/speed-insights") {
      return true
    }

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

  const isItemActive = (item: DashboardItem) => {
    const isAnySubItemSelected = item.subItems?.some((subItem) => location.pathname === subItem.path)
    return (location.pathname.startsWith(item.path) && item.path !== "#") || isAnySubItemSelected
  }

  return (
    <TooltipProvider>
      <>
        {!isMobile && (
          <div
            ref={sidebarRef}
            className={`bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl relative ${isExpanded ? "w-60" : "w-16"
              }`}
            style={{ height: "100vh" }}
          >
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

            <div className="flex-1 overflow-hidden">
              <ScrollArea className={`h-full ${isExpanded ? "px-3" : "px-2"}`}>
                <nav className="space-y-2 py-4">
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
                      {sortedBrands.map((brand: IBrand) => (
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
                              const disabled = isItemDisabled(subItem) || false
                              return (
                                <SidebarChild
                                  key={subIndex}
                                  path={subItem.path}
                                  text={subItem.name}
                                  isSelected={location.pathname === subItem.path}
                                  disabled={disabled}
                                />
                              )
                            })}
                          </SidebarItem>
                        </div>
                      )
                    })}
                  </div>
                </nav>
              </ScrollArea>
            </div>

            <div className={`flex-shrink-0 border-t border-slate-700/50 space-y-1 ${isExpanded ? "p-3" : "p-2"}`}>
              <PricingButton isExpanded={isExpanded} handlePricing={handlePricing} />
              <UserProfile isExpanded={isExpanded} user={user} />
              <LogoutButton handleLogout={handleLogout} isExpanded={isExpanded} />
            </div>
          </div>
        )}

        {isMobile && (
          <>
            <div
              className="fixed bottom-0 left-0 right-0 border-t border-slate-700/80 bg-slate-900/95 backdrop-blur-xl shadow-2xl"
              style={{
                paddingBottom: "max(env(safe-area-inset-bottom), 6px)",
                zIndex: 9999,
              }}
            >
              <div className="relative flex items-stretch">
                <div className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-4 bg-gradient-to-r from-slate-900/95 to-transparent" />
                <div className="pointer-events-none absolute right-[76px] top-0 z-[1] h-full w-6 bg-gradient-to-l from-slate-900/95 to-transparent" />

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="overflow-x-auto whitespace-nowrap scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex min-w-max snap-x snap-mandatory items-center gap-1 px-2 py-2">
                      {allDashboards.map((item, index) => {
                        const active = isItemActive(item)
                        const disabled = isItemDisabled(item)

                        return (
                          <button
                            key={index}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return

                              if (item.subItems) {
                                setIsMobileMoreOpen(true)
                                return
                              }

                              if (item.path !== "#") {
                                navigate(item.path)
                              }
                            }}
                            className={`group relative shrink-0 snap-start rounded-xl p-3 transition-all duration-300 ease-out active:scale-95 ${active
                              ? "bg-slate-700 text-white shadow-lg shadow-black/20"
                              : "text-slate-300 hover:bg-slate-800/90"
                              } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                            aria-label={item.name}
                            title={item.name}
                          >
                            <span className="flex items-center justify-center transition-transform duration-300 group-active:scale-90">
                              {item.icon}
                            </span>

                            {active && (
                              <span className="absolute inset-x-2 -bottom-[1px] h-[2px] rounded-full bg-slate-200/90" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="relative shrink-0 border-l border-slate-700/70 bg-slate-900/95 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => setIsMobileMoreOpen(true)}
                    className={`group relative rounded-xl p-3 transition-all duration-[280ms] ease-out ${isMobileMoreOpen
                      ? "scale-95 bg-slate-700 text-white shadow-lg shadow-black/20"
                      : "text-slate-300 hover:bg-slate-800/90 active:scale-95"
                      }`}
                    aria-label="More options"
                    title="More options"
                  >
                    <span className="flex items-center justify-center transition-transform duration-300 group-active:scale-90">
                      <Menu size={20} />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {isMobileMoreMounted && (
              <>
                <div
                  className={`fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[1px] transition-opacity duration-[280ms] ease-out ${isMobileMoreOpen ? "opacity-100" : "opacity-0"
                    }`}
                  onClick={() => setIsMobileMoreOpen(false)}
                />

                <div
                  className={`fixed inset-x-0 bottom-0 z-[9999] rounded-t-3xl border-t border-slate-700 bg-slate-900 shadow-2xl transition-all duration-[280ms] ease-out will-change-transform ${isMobileMoreOpen
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-8 scale-[0.98] opacity-0"
                    }`}
                  style={{
                    height: "82vh",
                    paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
                    transformOrigin: "bottom right",
                  }}
                >
                  <div
                    className={`mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-600/80 transition-all duration-[280ms] ${isMobileMoreOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                      }`}
                  />

                  <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
                    <div
                      className={`text-sm font-semibold text-white transition-all duration-[280ms] ${isMobileMoreOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                        }`}
                    >
                      Menu
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMobileMoreOpen(false)}
                      className="rounded-md p-2 text-slate-300 transition-colors duration-200 hover:bg-slate-800 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <ScrollArea className="h-[calc(82vh-63px)]">
                    <div
                      className={`min-h-full space-y-4 p-4 transition-all duration-[280ms] ${isMobileMoreOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                        }`}
                    >
                      <div>
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                          Brands
                        </div>
                        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                          {sortedBrands.map((brand: IBrand) => (
                            <button
                              key={brand._id}
                              type="button"
                              onClick={() => {
                                handleBrandChange(brand._id)
                                setIsMobileMoreOpen(false)
                              }}
                              className={`w-full rounded-xl px-3 py-3 text-left text-sm transition-all duration-200 ${selectedBrandId === brand._id
                                ? "bg-slate-700 text-white shadow-lg shadow-black/10"
                                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                                }`}
                            >
                              {brand.name.replace(/_/g, " ")}
                            </button>
                          ))}

                          <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 px-3 py-3 text-sm text-slate-400 transition-all duration-200 hover:border-slate-400 hover:bg-slate-600/30 hover:text-slate-200">
                            <Plus size={14} />
                            <span>Add Brand</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                          Navigation
                        </div>

                        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                          {allDashboards.map((item: DashboardItem, index: number) => {
                            const isAnySubItemSelected = item.subItems?.some((subItem) => location.pathname === subItem.path)
                            const isMainItemActive =
                              (location.pathname.startsWith(item.path) && item.path !== "#") || isAnySubItemSelected

                            return (
                              <div key={index}>
                                <SidebarItem
                                  icon={item.icon}
                                  text={item.name}
                                  isExpanded={true}
                                  openIcon={<ChevronDown size={16} />}
                                  closeIcon={<ChevronDown size={16} />}
                                  isSelected={Boolean(isMainItemActive)}
                                  tooltipContent={item.name}
                                  onClick={() => {
                                    if (!isItemDisabled(item) && item.path && item.path !== "#" && !item.subItems) {
                                      navigate(item.path)
                                      setIsMobileMoreOpen(false)
                                    }
                                  }}
                                  disabled={isItemDisabled(item)}
                                >
                                  {item.subItems?.map((subItem, subIndex) => {
                                    const disabled = isItemDisabled(subItem) || false
                                    return (
                                      <SidebarChild
                                        key={subIndex}
                                        path={subItem.path}
                                        text={subItem.name}
                                        isSelected={location.pathname === subItem.path}
                                        disabled={disabled}
                                        onClick={() => setIsMobileMoreOpen(false)}
                                      />
                                    )
                                  })}
                                </SidebarItem>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                          Account
                        </div>
                        <div className="space-y-1 rounded-2xl bg-slate-800/40 p-2">
                          <PricingButton isExpanded={true} handlePricing={handlePricing} />
                          <UserProfile isExpanded={true} user={user} />
                          <LogoutButton handleLogout={handleLogout} isExpanded={true} />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </>
        )}

        <PricingModal open={isPricingOpen} onOpenChange={setIsPricingOpen} />
      </>
    </TooltipProvider>
  )
}

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

  const baseClasses = `flex items-center text-xs w-full px-4 py-3 rounded-lg transition-all duration-200 ${isActive
    ? "text-white bg-slate-600/30 shadow-lg"
    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
    } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`

  const content = (
    <div className="flex items-center justify-between w-full">
      <span className="font-medium capitalize">{text}</span>
      {hasChildren && <span className="ml-2">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>}
    </div>
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
        if (disabled) return
        if (hasChildren) {
          handleToggle()
        }
        if (onClick) {
          onClick()
        }
      }}
      className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group capitalize ${isActive
        ? "text-white bg-slate-600/30 border-l-2 border-slate-400 shadow-lg"
        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className={`mr-3 transition-colors duration-200 ${isActive ? "text-slate-300" : "text-slate-400 group-hover:text-slate-300"
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

interface PricingButtonProps {
  handlePricing: () => void
  isExpanded: boolean
}

function PricingButton({ handlePricing, isExpanded }: PricingButtonProps) {
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