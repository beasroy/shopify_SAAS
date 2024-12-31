import { 
  Rocket, 
  ChevronRight, 
  Zap 
} from 'lucide-react'
import BrandSetup from './components/BrandForm.tsx'
import { useUser } from '@/context/UserContext.tsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const { user } = useUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-5">
        {/* Vibrant Welcome Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-8 flex items-center justify-between">
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-4xl font-extrabold tracking-tight">
                Welcome, <span className="text-white/90">{user?.username.split(' ')[0] || 'User'}</span>
              </h1>
              <p className="text-lg text-white/80 leading-relaxed">
                Embark on your analytics journey! Setting up your first brand will unlock powerful insights, helping you transform data into strategic growth.
              </p>
              <div className="flex space-x-4 pt-4">
                <Button variant="secondary" className="bg-white text-primary hover:bg-gray-100">
                  Get Started
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <Rocket className="h-24 w-24 text-white/20 animate-pulse" />
          </div>
        </div>

        {/* Brand Setup Card */}
        <Card className="border-0 rounded-2xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Zap className="h-8 w-8 text-yellow-500 animate-bounce" />
                <span className="text-2xl font-bold text-gray-800">
                  Add Your First Brand
                </span>
              </div>
              <Button variant="outline" className="group border-primary/30 hover:bg-primary/5">
                <span className="text-primary">Quick Setup Guide</span>
                <ChevronRight className="ml-2 h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <BrandSetup />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
