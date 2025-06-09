import { Sparkles } from "lucide-react"
import BrandSetup from "./components/BrandForm"
import CollapsibleSidebar from "../../components/dashboard_component/CollapsibleSidebar"

export default function AddBrandDashboard() {


  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <CollapsibleSidebar />
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-8 px-4">
         
          <div className="w-full">
            <BrandSetup />
          </div>

          {/* Quick Tips */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeInUp">
            <div className="bg-white p-6 rounded-xl border hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 group">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-gray-900">Connect Multiple Platforms</h3>
              </div>
              <p className="text-sm text-gray-600">Link all your marketing platforms for comprehensive analytics and insights</p>
            </div>
            <div className="bg-white p-6 rounded-xl border hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 group">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-success/10 p-2 group-hover:bg-success/20 transition-colors">
                  <Sparkles className="h-5 w-5 text-success" />
                </div>
                <h3 className="font-medium text-gray-900">Real-time Updates</h3>
              </div>
              <p className="text-sm text-gray-600">Your data will be automatically synced every 3 hours for accurate reporting</p>
            </div>
            <div className="bg-white p-6 rounded-xl border hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 group">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-warning/10 p-2 group-hover:bg-warning/20 transition-colors">
                  <Sparkles className="h-5 w-5 text-warning" />
                </div>
                <h3 className="font-medium text-gray-900">Easy Management</h3>
              </div>
              <p className="text-sm text-gray-600">Manage all your brands and their performance from a single dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 