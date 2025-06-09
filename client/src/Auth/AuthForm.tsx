import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Eye, EyeOff, Mail, Lock, User, Store } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "../hooks/use-toast"
import { FcGoogle } from "react-icons/fc"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/store"
import { setUser } from "@/store/slices/UserSlice"
import { baseURL } from "@/data/constant"

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    }else if (user?.brands && user.brands.length === 0) {
      navigate("/first-time-brand-setup")
    }
  }, [user, navigate])

  const toggleForm = () => {
    setIsLogin(!isLogin)
    setIsShopifyLogin(false)
  }

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
          }else if (user?.brands && user.brands.length === 0) {
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

      const response = await axios.post(`${baseURL}/api/auth/shopify`, { shop })
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
    <div className="flex h-screen">
      <div
        className="hidden md:flex md:w-1/2 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2015&q=80')",
        }}
      >
        <div className="flex items-center justify-center w-full h-full bg-black bg-opacity-40">
          <div className="text-white text-center p-8">
            <h3 className="text-4xl font-bold mb-6">Unified Marketing Analytics</h3>
            <p className="text-xl">View your Shopify, Facebook, and Google Ads data all in one place.</p>
          </div>
        </div>
      </div>
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-8">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold mb-3">
            {isShopifyLogin ? "Connect Your Shopify Store" : isLogin ? "Welcome Back" : "Create an Account"}
          </h2>
          <p className="mb-8">
            {isShopifyLogin
              ? "Enter your Shopify store name to connect"
              : isLogin
                ? "Sign in to access your marketing dashboard"
                : "Join us to view all your marketing data in one place"}
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {isShopifyLogin ? (
              <div className="space-y-2">
                <Label htmlFor="shop">Shopify Store Name</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 h-5 w-5" />
                  <Input
                    id="shop"
                    type="text"
                    value={shop}
                    onChange={(e) => setShop(e.target.value)}
                    placeholder="your-store-name"
                    required
                    className="pl-10 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                {errors.shop && <p className="text-red-500 text-sm">{errors.shop}</p>}
                <p className="text-sm text-gray-500 mt-1">Enter only the store name without .myshopify.com</p>
              </div>
            ) : (
              <>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5" />
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required={!isLogin}
                        className="pl-10 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="pl-10 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="pl-10 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3"
                    >
                      {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                </div>
              </>
            )}
            <Button type="submit" className="w-full text-white">
              {isShopifyLogin ? "Connect Shopify Store" : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          {!isShopifyLogin && (
            <div className="flex flex-col md:flex-row gap-3 items-center justify-center mt-6 w-full ">
              <div>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center space-x-2"
                  onClick={handleGoogleLogin}
                >
                  <FcGoogle className="h-5 w-5" />
                  <span>Continue with Google</span>
                </Button>
              </div>
              <div>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center space-x-2"
                  onClick={toggleShopifyLogin}
                >
                  <Store className="h-5 w-5 text-[#95BF47]" />
                  <span>Continue with Shopify</span>
                </Button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm">
            {isShopifyLogin ? (
              <>
                <button onClick={toggleShopifyLogin} className="font-semibold hover:underline">
                  Back to {isLogin ? "Sign In" : "Sign Up"}
                </button>
              </>
            ) : (
              <>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={toggleForm} className="font-semibold hover:underline">
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
