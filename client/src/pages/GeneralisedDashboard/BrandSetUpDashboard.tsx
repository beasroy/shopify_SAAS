

import { DollarSign, TrendingUp } from 'lucide-react'
import { MdCampaign, MdInsights } from "react-icons/md"
import BrandSetup from './components/BrandForm.tsx'
import { AnalyticsCard, AnalyticsCardProps } from './components/AnalyticsCard.tsx'
import { useUser } from '@/context/UserContext.tsx'


export default function Dashboard() {
  const { user } = useUser()
  const insights: AnalyticsCardProps[] = [
    {
      title: "Revenue Tracking",
      description: "Monitor your sales performance across all channels",
      icon: <DollarSign className="h-8 w-8 text-green-500" />,
      bgColor: "from-green-200 to-green-100",
    },
    {
      title: "Ad Performance",
      description: "Analyze the effectiveness of your ad campaigns",
      icon: <MdCampaign className="h-8 w-8 text-yellow-500" />,
      bgColor: "from-yellow-200 to-yellow-100",
    },
    {
      title: "Customer Insights",
      description: "Understand your audience and their behavior",
      icon: <MdInsights className="h-8 w-8 text-purple-500" />,
      bgColor: "from-purple-200 to-purple-100",
    },
    {
      title: "Growth Metrics",
      description: "Track your business growth and identify opportunities",
      icon: <TrendingUp className="h-8 w-8 text-amber-500" />,
      bgColor: "from-amber-200 to-amber-100",
    },
  ]

  return (
    <div className="flex-col md:flex">
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm">
        <div className="lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Welcome back, <span className="text-primary">{user?.username.split(' ')[0] || 'user'}</span>
            </h1>
          </div>
        </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {insights.map((insight, index) => (
              <AnalyticsCard
                key={index}
                title={insight.title}
                description={insight.description}
                icon={insight.icon}
                bgColor={insight.bgColor}
                ribbonText={insight.ribbonText} />
            ))}
          </div>
          <BrandSetup />
        </div>
      </div>
      )
}

