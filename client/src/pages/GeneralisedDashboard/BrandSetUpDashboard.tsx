import {
  Rocket,
} from 'lucide-react'
import BrandSetup from './components/BrandForm.tsx'
import { useSelector } from 'react-redux'
import { RootState } from '@/store/index.ts'
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar.tsx'

export default function BrandSetupDashboard() {
  const user = useSelector((state: RootState) => state.user.user)

  return (
    <div className="flex h-screen"> {/* Set a fixed width for the sidebar */}
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
      <div className="container mx-auto px-4 py-4">
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
              </div>
              <Rocket className="h-24 w-24 text-white/20 animate-pulse" />
            </div>
          </div>
              <BrandSetup />
        </div>
        </div>
      </div>
    </div>
  )
}
