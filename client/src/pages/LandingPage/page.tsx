import { useSelector } from 'react-redux'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import DataChallengeSection from './components/DataChallengeSection'
import MetricsSection from './components/MetricsSection'
import FeaturesSection from './components/FeaturesSection'
import UseCasesSection from './components/UseCasesSection'
import HowItWorksSection from './components/HowItWorksSection'
import HowParallelsEnablesSection from './components/HowParallelsEnablesSection'
import WhyParallelsSection from './components/WhyParallelsSection'
import TrustSection from './components/TrustSection'
import FinalCTASection from './components/FinalCTASection'
import NewFooter from './components/New_Footer'
import { RootState } from '@/store'

import './landingPage.css'

function LandingPage() {
  const user = useSelector((state: RootState) => state.user.user)
  const isLoggedIn = Boolean(user?.id)
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoggedIn) navigate('/dashboard')
  }, [isLoggedIn])

  return (
    <div className="landing-page min-h-screen bg-white text-slate-900">
      <Navbar />
      <main>
        <HeroSection />
        <DataChallengeSection />
        <MetricsSection />
        <FeaturesSection />
        <UseCasesSection />
        <HowItWorksSection />
        <HowParallelsEnablesSection />
        <WhyParallelsSection />
        <TrustSection />
        <FinalCTASection />
        <NewFooter />
      </main>
    </div>
  )
}

export default LandingPage
