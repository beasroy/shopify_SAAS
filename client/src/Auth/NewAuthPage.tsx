
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Logo from "@/assets/messold-icon.png";
import {
    Loader2, Shield, CreditCard, Percent,
    DollarSign,
    TrendingUp
} from "lucide-react"
import "./authPage.css"
import { Link } from "react-router-dom"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { BarChart3 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "../hooks/use-toast"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/store"
import { setUser } from "@/store/slices/UserSlice"
import { baseURL } from "@/data/constant"

type StatCardProps = {
    icon: React.ReactNode
    label: string
    value: string
    change: string
    positive?: boolean
    color?: string
}

const colorMap = {
    'chart-1': 'text-chart-1 bg-chart-1/20',
    'chart-2': 'text-chart-2 bg-chart-2/20',
    'chart-3': 'text-chart-3 bg-chart-3/20',
    'chart-4': 'text-chart-4 bg-chart-4/20',
} as const

type AuthFormProps = {
    toggleShopifyLogin: () => void
    handleGoogleLogin: () => Promise<void>
    handleSubmit: (e: React.FormEvent) => Promise<void>

    isLoading: boolean
    email: string
    setEmail: (email: string) => void
    password: string
    setPassword: (password: string) => void
    username?: string
    setUsername?: (username: string) => void
    setIsLogin?: (isLogin: boolean) => void
    errors: { username: string, email: string, password: string, shop: string }
}

type OAuthButtonsProps = {
    toggleShopifyLogin: () => void
    handleGoogleLogin: () => Promise<void>
    isLoading: boolean
}


export default function AuthPage() {
    const [activeTab, setActiveTab] = useState("login")

    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const [shop, setShop] = useState("")
    const [isShopifyLogin, setIsShopifyLogin] = useState(false)
    const { toast } = useToast()
    const navigate = useNavigate()
    const [errors, setErrors] = useState({ username: "", email: "", password: "", shop: "" })
    const user = useSelector((state: RootState) => state.user.user)
    const dispatch = useDispatch()

    useEffect(() => {
        if (user?.brands && user.brands.length > 0) {
            navigate("/dashboard")
        } else if (user?.brands && user.brands.length === 0) {
            navigate("/first-time-brand-setup")
        }
    }, [user, navigate])

    useEffect(() => {
        if (activeTab === "login") {
            setIsLogin(true)
        } else {
            setIsLogin(false)
        }
    }, [activeTab])


    const toggleShopifyLogin = () => {
        setIsShopifyLogin(!isShopifyLogin)
    }

    const validateForm = () => {
        const newErrors = { username: "", email: "", password: "", shop: "" }
        let isValid = true

        if (isShopifyLogin) {
            if (!shop.trim()) {
                newErrors.shop = "Shop name is required"
                isValid = false
            }
            return isValid
        }

        if (!isLogin && !username.trim()) {
            newErrors.username = "Username is required"
            isValid = false
        }

        if (!email.trim()) {
            newErrors.email = "Email is required"
            isValid = false
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Email is invalid"
            isValid = false
        }

        if (!password) {
            newErrors.password = "Password is required"
            isValid = false
        } else if (password.length < 8) {
            newErrors.password = "Password must be at least 8 characters"
            isValid = false
        }

        setErrors(newErrors)
        return isValid
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }
        setIsLoading(true)
        if (isShopifyLogin) {
            handleShopifyLogin()
            return
        }

        try {
            let response

            if (isLogin) {
                response = await axios.post(`${baseURL}/api/auth/login/normal`, { email, password }, { withCredentials: true })

                if (response.data.success) {
                    // Set the user in the context with hasSeenLandingSlides flag
                    const userData = {
                        ...response.data.user,
                    }
                    dispatch(setUser(userData))

                    toast({
                        title: "Login successful!",
                        description: "Welcome! Redirecting to your dashboard.",
                        variant: "default",
                    })
                    console.log(user)
                    if (user?.brands && user.brands.length > 0) {
                        navigate("/dashboard")
                    } else if (user?.brands && user.brands.length === 0) {
                        navigate("/first-time-brand-setup")
                    }
                }
            } else {
                response = await axios.post(
                    `${baseURL}/api/auth/signup`,
                    { username, email, password },
                    { withCredentials: true },
                )

                if (response.data.success) {
                    toast({
                        title: "Registration successful!",
                        description: "Please log in with your new account.",
                        variant: "default",
                    })
                    setIsLogin(true)
                }
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                toast({
                    title: "Error",
                    description: error.response.data.message || "An error occurred",
                    variant: "destructive",
                })
            } else {
                toast({
                    title: "Unexpected Error",
                    description: "An unexpected error occurred",
                    variant: "destructive",
                })
            }
        }
        finally {
            setIsLoading(false)
            setUsername("")
            setEmail("")
            setPassword("")

        }
    }

    const handleGoogleLogin = async () => {
        try {
            const response = await axios.get(`${baseURL}/api/auth/google?context=userLogin`)
            const { authUrl } = response.data

            window.location.href = authUrl
        } catch (error) {
            console.error("Error getting Google Auth URL:", error)
        }
    }

    const handleShopifyLogin = async () => {
        try {
            if (!shop.trim()) {
                setErrors((prev) => ({ ...prev, shop: "Shop name is required" }))
                return
            }

            const response = await axios.post(`${baseURL}/api/auth/shopify`, { shop, flowType: "login" })
            const { authUrl } = response.data
            window.location.href = authUrl
        } catch (error) {
            console.error("Error getting Shopify Auth URL:", error)
            toast({
                title: "Error",
                description: "Failed to connect to Shopify",
                variant: "destructive",
            })
        }
    }

    return (
        <div className="auth-theme min-h-screen flex flex-col lg:flex-row">
            {/* Left side - Image with Dashboard Preview */}

            {/* Left side - Dashboard preview (desktop only) */}
            <div className="hidden lg:flex flex-1 bg-muted/50 items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />

                <div className="relative w-full max-w-lg">
                    {/* Main dashboard card */}
                    <div className="bg-card rounded-2xl shadow-xl border p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Dashboard Overview</h3>
                            {/* <span className="text-xs text-muted-foreground">Last 30 days</span> */}
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard
                                icon={<DollarSign className="size-4" />}
                                label="Revenue"
                                value="$124,892"
                                change="+12.5%"
                                positive
                            />
                            <StatCard
                                icon={<TrendingUp className="size-4" />}
                                label="ROAS"
                                value="4.2x"
                                change="+0.8x"
                                positive
                            />
                            <StatCard
                                icon={<BarChart3 className="size-4" />}
                                label="Orders"
                                value="2,847"
                                change="+8.3%"
                                positive
                            />
                            <StatCard
                                icon={<Percent className="size-4" />}
                                label="Conv. Rate"
                                value="3.42%"
                                change="+0.24%"
                                positive
                            />
                        </div>

                        {/* Mini chart */}
                        <div className="h-32 bg-muted/50 rounded-lg flex items-end justify-around px-4 pb-4 gap-2">
                            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((height, i) => (
                                <div
                                    key={i}
                                    className="w-full bg-primary/20 rounded-t transition-all duration-300 hover:bg-primary/40"
                                    style={{ height: `${height}%` }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Floating cards */}
                    <div className="animate-bounce-slow absolute -top-4 -right-4 bg-card rounded-xl shadow-lg border p-4 animate-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-3 ">
                            <div className="size-10 rounded-full bg-chart-2/20 flex items-center justify-center">
                                <TrendingUp className="size-5 text-chart-2" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Sales Trend</p>
                                <p className="font-semibold text-foreground">+23.5%</p>
                            </div>
                        </div>
                    </div>

                    <div className="animate-bounce-slow absolute -bottom-4 -left-4 bg-card rounded-xl shadow-lg border p-4 animate-in slide-in-from-bottom-2 duration-500 delay-200">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-chart-1/20 flex items-center justify-center">
                                <DollarSign className="size-5 text-chart-1" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Avg. Order</p>
                                <p className="font-semibold text-foreground">$43.87</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* left side - Form */}
            <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
                {/* Mobile header */}
                <header className="lg:hidden px-6 py-4 border-b border-border">
                    <Link to="/">
                        <div className="flex items-center gap-2 font-bold text-xl">
                            <img src={Logo} alt="Messold Logo" className="h-8 w-8" />
                            <span>Parallels</span>
                        </div>
                    </Link>
                </header>

                {/* Form container */}
                <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-10 xl:px-16">
                    <div className="w-full max-w-[400px]">
                        {/* Header */}
                        <div className="mb-8 text-center lg:text-left">
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
                                Welcome to Parallels
                            </h1>
                            <p className="mt-2 text-muted-foreground text-balance">
                                Track your sales, revenue, and marketing performance in one place.
                            </p>
                        </div>

                        {/* Tabs */}
                        {isShopifyLogin ? (
                            <div>

                                <div className="space-y-2">
                                    <Label htmlFor="shop" className="text-sm font-medium text-muted-foreground">Shopify Store Name</Label>
                                    <Input
                                        id="shop"
                                        type="text"
                                        placeholder="your-store-name"
                                        disabled={isLoading}
                                        value={shop}
                                        onChange={(e) => setShop(e.target.value)}
                                        required
                                        autoComplete="shop"
                                        className="h-11  focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    {errors.shop && <p className="text-red-500 text-sm">{errors.shop}</p>}
                                </div>
                                <Button
                                    onClick={handleShopifyLogin}
                                    type="submit"
                                    className="w-full h-11 mt-4"
                                >
                                    Connect Shopify Store
                                </Button>

                                <div className=" inline-block w-full flex items-center justify-center">
                                    <p className="text-center mt-4 text-sm text-muted-foreground cursor-pointer hover:underline transition-colors duration-300" onClick={() => toggleShopifyLogin()}>Back</p>
                                </div>
                            </div>
                        ) : (
                            (<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="w-full grid grid-cols-2 h-11 mb-6">
                                    <TabsTrigger value="login" className="text-sm">
                                        Log in
                                    </TabsTrigger>
                                    <TabsTrigger value="signup" className="text-sm">
                                        Sign up
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="login" className="mt-0">
                                    <LoginForm
                                        toggleShopifyLogin={toggleShopifyLogin}
                                        handleGoogleLogin={handleGoogleLogin}
                                        handleSubmit={handleSubmit}
                                        errors={errors}
                                        isLoading={isLoading}
                                        email={email}
                                        setEmail={setEmail}
                                        password={password}
                                        setPassword={setPassword}
                                    />
                                </TabsContent>

                                <TabsContent value="signup" className="mt-0">
                                    <SignupForm
                                        toggleShopifyLogin={handleShopifyLogin}
                                        handleGoogleLogin={handleGoogleLogin}
                                        errors={errors}
                                        isLoading={isLoading}
                                        handleSubmit={handleSubmit}
                                        email={email}
                                        setEmail={setEmail}
                                        password={password}
                                        setPassword={setPassword}
                                        username={username}
                                        setUsername={setUsername}
                                        setIsLogin={setIsLogin}
                                    />
                                </TabsContent>
                            </Tabs>)
                        )
                        }
                    </div>
                </div>

                {/* Footer */}
                <footer className="px-6 py-4 text-center text-xs text-muted-foreground border-t border-border lg:border-0">
                    <p>
                        By continuing, you agree to our{" "}
                        <a href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                            Privacy Policy
                        </a>
                    </p>
                </footer>
            </div>
        </div >
    )
}

function LoginForm({ toggleShopifyLogin, handleGoogleLogin, handleSubmit, isLoading, email, setEmail, password, setPassword, errors }: AuthFormProps) {

    return (
        <div className="space-y-6">
            <form className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                        id="login-email"
                        type="email"
                        placeholder="you@company.com"
                        disabled={isLoading}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="h-11"
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                    </div>
                    <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                        className="h-11"
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                </div>

                <Button onClick={handleSubmit} type="submit" className="w-full h-11" >
                    {isLoading ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Logging in...
                        </>
                    ) : (
                        "Log in"
                    )}
                </Button>
            </form>

            <Divider />
            <OAuthButtons toggleShopifyLogin={toggleShopifyLogin} handleGoogleLogin={handleGoogleLogin} isLoading={isLoading} />
        </div>
    )
}

function SignupForm({ toggleShopifyLogin, handleGoogleLogin, handleSubmit, isLoading, email, setEmail, password, setPassword, username, setUsername, errors }: AuthFormProps) {


    return (
        <div className="space-y-6">

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Username</Label>
                    <Input
                        id="signup-fullname"
                        type="text"
                        placeholder="John Smith"
                        value={username}
                        onChange={(e) => setUsername?.(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="name"
                        className="h-11"
                    />
                    {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="signup-email">Work email</Label>
                    <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="email"
                        className="h-11"
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                        minLength={8}
                        className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                </div>

                <Button disabled={isLoading} type="submit" className="w-full h-11" >
                    {isLoading ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Creating account...
                        </>
                    ) : (
                        "Create free account"
                    )}
                </Button>
            </form>
            <Divider />
            <OAuthButtons toggleShopifyLogin={toggleShopifyLogin} handleGoogleLogin={handleGoogleLogin} isLoading={isLoading} />

            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <CreditCard className="size-3.5" />
                    <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Shield className="size-3.5" />
                    <span>Secure data</span>
                </div>
            </div>
        </div>
    )
}

function OAuthButtons({ toggleShopifyLogin, handleGoogleLogin, isLoading }: OAuthButtonsProps) {


    return (
        <div className="flex flex-col gap-3">
            <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-transparent"
                onClick={() => handleGoogleLogin()}
                disabled={isLoading}
            >

                <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>

                Continue with Google
            </Button>

            <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-transparent"
                onClick={() => toggleShopifyLogin()}
                disabled={isLoading}
            >

                <svg className="size-5" viewBox="0 0 24 24" fill="#96BF48" aria-hidden="true">
                    <path d="M15.337 3.415c-.022-.165-.18-.247-.3-.261-.12-.014-2.547-.19-2.547-.19s-1.685-1.684-1.876-1.876c-.19-.19-.561-.134-.705-.09-.02.006-.38.117-.97.3-.58-1.674-1.6-3.213-3.396-3.213-.05 0-.1.002-.15.005C5.051-.365 4.598.003 4.2.435c-1.186 1.283-1.68 3.202-1.865 4.831-.943.292-1.6.494-1.682.52-.522.164-.538.18-.606.673-.052.368-1.411 10.872-1.411 10.872L13.56 19.5l6.44-1.61s-4.64-14.31-4.663-14.475zM9.87 2.9l-.79.244c.004-.26.002-.53-.01-.796.492.095.847.39 1.015.815-.073.023-.144.045-.215.067zm-1.47.455l-1.685.52c.163-.63.474-1.257.9-1.676.158-.156.378-.328.634-.427.248.53.286 1.18.15 1.583zm-1.1-2.153c.207 0 .384.04.54.114-.24.117-.47.3-.688.55-.574.655-.998 1.674-1.17 2.656l-1.4.432c.313-1.416 1.514-3.72 2.718-3.752z" />
                    <path d="M15.037 3.154c-.12-.014-2.547-.19-2.547-.19s-1.685-1.684-1.876-1.876c-.072-.072-.167-.106-.263-.12l-.91 18.532 6.44-1.61s-4.64-14.31-4.663-14.475c-.022-.165-.18-.247-.3-.261zm-5.2 4.92l-.668 2.48s-.738-.395-1.64-.395c-1.326 0-1.392.832-1.392 1.04 0 1.143 2.978 1.58 2.978 4.255 0 2.105-1.334 3.46-3.133 3.46-2.16 0-3.265-1.344-3.265-1.344l.58-1.912s1.135.974 2.094.974c.625 0 .88-.493.88-.853 0-1.49-2.444-1.556-2.444-4.006 0-2.06 1.478-4.056 4.466-4.056 1.152 0 1.723.33 1.723.33l-.58 1.527z" />
                </svg>

                Continue with Shopify
            </Button>
        </div>
    )
}

function Divider() {
    return (
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">or</span>
            </div>
        </div>
    )
}


function StatCard({
    icon,
    label,
    value,
    change,
    positive,
    color,
}: StatCardProps) {
    return (
        <div className="bg-muted/50 rounded-lg p-4">
            <div className={`flex items-center gap-2 text-muted-foreground mb-2 ${colorMap[color as keyof typeof colorMap]}`}>
                {icon}
                <span className="text-xs">{label}</span>
            </div>
            <p className="text-xl font-semibold text-foreground">{value}</p>
            <p className={`text-xs mt-1 ${positive ? "text-chart-2" : "text-destructive"}`}>
                {change}
            </p>
        </div>
    )
}