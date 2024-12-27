import React from 'react'
import { 
  Rocket, 
  ChevronRight, 
  BarChart2, 
  Target, 
  TrendingUp, 
  PieChart, 
  Zap 
} from 'lucide-react'
import BrandSetup from './components/BrandForm.tsx'
import { useUser } from '@/context/UserContext.tsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const { user } = useUser()

  const features = [
    {
      title: "Comprehensive Analytics",
      description: "Get deep insights into your brand's performance across multiple channels.",
      icon: BarChart2,
      gradient: "from-purple-500 to-pink-500",
      iconColor: "text-purple-600"
    },
    {
      title: "Performance Tracking",
      description: "Monitor sales, campaigns, and growth metrics in real-time.",
      icon: TrendingUp,
      gradient: "from-green-500 to-teal-500",
      iconColor: "text-green-600"
    },
    {
      title: "Actionable Insights",
      description: "Receive data-driven recommendations to optimize your business strategy.",
      icon: Target,
      gradient: "from-blue-500 to-indigo-500",
      iconColor: "text-blue-600"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Vibrant Welcome Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl shadow-2xl overflow-hidden">
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
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Learn More
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

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`
                bg-gradient-to-br ${feature.gradient} 
                text-white 
                rounded-2xl 
                p-6 
                transform transition-all 
                hover:-translate-y-2 
                hover:shadow-2xl
                group
              `}
            >
              <div className="flex items-center justify-between mb-4">
                <feature.icon className={`h-10 w-10 ${feature.iconColor} bg-white/20 p-2 rounded-full group-hover:animate-pulse`} />
                <ChevronRight className="h-6 w-6 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-white/80 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
