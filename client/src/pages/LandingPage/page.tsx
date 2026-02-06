
import DataChallengeSection from './components/DataChallengeSection'
import FeaturesSection from './components/FeaturesSection'
import FinalCTASection from './components/FinalCTASection'
import HeroSection from './components/HeroSection'
import HowItWorksSection from './components/HowItWorksSection'
import HowParallelsEnablesSection from './components/HowParallelsEnablesSection'
import MetricsSection from './components/MetricsSection'
import Navbar from './components/Navbar'
import NewFooter from './components/New_Footer'
import TrustSection from './components/TrustSection'
import UseCasesSection from './components/UseCasesSection'
import WhyParallelsSection from './components/WhyParallelsSection'
import './landingPage.css'

function LandingPage() {
  return (
    <div className="landing-page landing-page-container text-accent flex min-h-screen flex-col gradient-bg">
      <Navbar />
      <main className="flex-1">
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