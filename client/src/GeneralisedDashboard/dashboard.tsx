import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Settings, Briefcase, RefreshCw, Store, FileSpreadsheet} from "lucide-react"
import { Link } from "react-router-dom"
import { useUser } from "@/context/UserContext"
import { useBrand } from "@/context/BrandContext"


export default function LandingPage() {

  const { user } = useUser();
  const { brands } = useBrand();

  

 
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-pink-50 p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight ">Welcome back, {user?.username.split(' ')[0] || 'user'} !</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white border-t-4 border-t-black shadow-lg">
            <CardHeader>
              <CardTitle>Your Brands</CardTitle>
              <CardDescription>Quick access to your brand dashboards</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {brands.map((brand, index) => (
                <Button
                key={brand._id}
                 asChild
                  className={`w-full justify-start ${index %2 == 0?' hover:bg-black/50 hover:text-white':'hover:bg-pink-500 bg-pink-600 text-white'} `}>
                  <Link to={`/business-dashboard/${brand._id}`}>
                    <Store className="mr-2 h-4 w-4" />
                    {brand.name}
                  </Link>
                </Button>
              ))}
              <Button variant="outline" className="w-full justify-start border-dashed border-2 border-gray-300 hover:bg-indigo-50">
                <Briefcase className="mr-2 h-4 w-4" />
                Add New Brand
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-white border-t-4 border-t-cyan-600 shadow-lg">
          <CardHeader>
            <CardTitle className="text-cyan-600">Daily Reports</CardTitle>
            <CardDescription>Get Daily Reports for your brands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand) => (
                <Link to={`/ad-metrics/${brand._id}`}>
                <Button
                  key={brand._id}
                  variant="outline"
                  className="w-full justify-start items-center text-cyan-600 hover:bg-green-50 hover:text-cyan-700 border-cyan-400">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="">{brand.name}</span>
                </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
        <div className="grid gap-6 md:grid-cols-1">
        <Card className="bg-white border-t-4 border-t-amber-500 shadow-lg">
          <CardHeader>
            <CardTitle className="text-amber-600">Getting Started</CardTitle>
            <CardDescription>Follow these steps to make the most of your analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li className="text-gray-700">Select a brand from the sidebar or "Your Brands" section</li>
              <li className="text-gray-700">Connect your brand's Shopify store</li>
              <li className="text-gray-700">Set up Google Analytics 4 property for your brand</li>
              <li className="text-gray-700">Link your brand's Facebook Ads account</li>
              <li className="text-gray-700">Configure Google Ads integration for your brand</li>
              <li className="text-gray-700">Explore your unified brand analytics in the dashboard</li>
            </ol>
          </CardContent>
        </Card>
      
{/*         
        <Card className="bg-white border-t-4 border-t-pink-500 shadow-lg">
            <CardHeader>
              <CardTitle className="text-pink-600">Recent Activity</CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="w-32 text-sm text-gray-500">2 hours ago</span>
                  <span>Updated UDD Studio Shopify integration</span>
                </li>
                <li className="flex items-center">
                  <span className="w-32 text-sm text-gray-500">Yesterday</span>
                  <span className="text-pink-600">Viewed Fisherman Hub GA4 report</span>
                </li>
                <li className="flex items-center">
                  <span className="w-32 text-sm text-gray-500">2 days ago</span>
                  <span>Created new FB Ad campaign for UDD Studio</span>
                </li>
              </ul>
            </CardContent>
          </Card> */}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white border-t-4 border-t-teal-500 shadow-lg">
            <CardHeader>
              <CardTitle className="text-teal-600">Notifications</CardTitle>
              <CardDescription>Stay updated with your latest alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Bell className="mr-2 h-4 w-4 text-indigo-500" />
                  <span className="text-gray-700">New Shopify order received for UDD Studio</span>
                </li>
                <li className="flex items-center">
                  <Bell className="mr-2 h-4 w-4 text-pink-500" />
                  <span className="text-gray-700">Weekly analytics report ready for Fisherman Hub</span>
                </li>
                <li className="flex items-center">
                  <Bell className="mr-2 h-4 w-4 text-amber-500" />
                  <span className="text-gray-700">Facebook Ads campaign ended for UDD Studio</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-t-4 border-t-purple-500 shadow-lg">
            <CardHeader>
              <CardTitle className="text-purple-600">Quick Actions</CardTitle>
              <CardDescription>Frequently used features and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start text-purple-600 hover:bg-purple-50 hover:text-purple-700 border-purple-200">
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </Button>
              <Button variant="outline" className="w-full justify-start text-purple-600 hover:bg-purple-50 hover:text-purple-700 border-purple-200">
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Data Sources
              </Button>
              <Button variant="outline" className="w-full justify-start text-purple-600 hover:bg-purple-50 hover:text-purple-700 border-purple-200">
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