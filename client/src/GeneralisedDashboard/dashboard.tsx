import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Settings, Briefcase, RefreshCw, FileSpreadsheet, Target, ArrowRight, BarChart3, PieChart, TrendingUp, Activity} from "lucide-react"
import { Link } from "react-router-dom"
import { useUser } from "@/context/UserContext"
import { useBrand } from "@/context/BrandContext"

export default function LandingPage() {
  const { user } = useUser();
  const { brands } = useBrand();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-full mx-auto space-y-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username.split(' ')[0] || 'user'}!</h1>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card className="bg-white shadow-lg border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="text-blue-700 flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Performance & Targets
              </CardTitle>
              <CardDescription>Overview of your brand performance and targets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-blue-700">Active Targets</p>
                    <p className="text-2xl font-bold text-blue-900">{brands.length}</p>
                  </div>
                </div>
                <BarChart3 className="h-12 w-12 text-blue-300" />
              </div>
              <Button asChild className="w-full justify-between bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/performance-metrics">
                  <span>View Performance Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="text-blue-700 flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Getting Started
              </CardTitle>
              <CardDescription>Follow these steps to set up your analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li className="text-blue-700">Select a brand from "Your Brands" section</li>
                <li className="text-blue-700">Connect your brand's Shopify store</li>
                <li className="text-blue-700">Set up Google Analytics 4 property</li>
                <li className="text-blue-700">Link Facebook Ads account</li>
                <li className="text-blue-700">Configure Google Ads integration</li>
                <li className="text-blue-700">Explore your unified brand analytics</li>
              </ol>
            </CardContent>
          </Card>
        </div>
<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="bg-white shadow-lg border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="text-blue-700 flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Dashboard Overview
            </CardTitle>
            <CardDescription>Key insights and analytics for your brands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <Link key={brand._id} to={`/business-dashboard/${brand._id}`}>
                  <div className="border border-[#071952] p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                    <h3 className="text-base font-semibold text-[#071952]">{brand.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-t-4 border-t-blue-600">
          <CardHeader>
            <CardTitle className="text-blue-700 flex items-center">
              <FileSpreadsheet className="mr-2 h-5 w-5" />
              Monthly Reports
            </CardTitle>
            <CardDescription>Access comprehensive monthly reports for your brands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <Link key={brand._id} to={`/ad-metrics/${brand._id}`}>
                  <div className="bg-blue-50 p-2 rounded-lg shadow hover:shadow-md transition-shadow duration-200 ">
                    <h3 className="text-base font-semibold text-blue-700">{brand.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white shadow-lg border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="text-blue-700 flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Stay updated with your latest alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center bg-blue-50 p-2 rounded">
                  <Bell className="mr-2 h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-700">New Shopify order received for UDD Studio</span>
                </li>
                <li className="flex items-center bg-blue-50 p-2 rounded">
                  <Bell className="mr-2 h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-700">Weekly analytics report ready for Fisherman Hub</span>
                </li>
                <li className="flex items-center bg-blue-50 p-2 rounded">
                  <Bell className="mr-2 h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-700">Facebook Ads campaign ended for UDD Studio</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-t-4 border-t-blue-600">
            <CardHeader>
              <CardTitle className="text-blue-700 flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Frequently used features and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200">
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </Button>
              <Button variant="outline" className="w-full justify-start text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200">
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Data Sources
              </Button>
              <Button variant="outline" className="w-full justify-start text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200">
                <Briefcase className="mr-2 h-4 w-4" />
                Manage Brands
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}