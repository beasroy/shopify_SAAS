import CTA from './components/CTA'
import Features from './components/Features'
import Footer from './components/Footer'
import HeroSection from './components/HeroSection'
import Navbar from './components/Navbar'

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col gradient-bg">
   <Navbar />
   <main className="flex-1">
    <HeroSection />
    <Features />
    <CTA />
   </main>
   <Footer />
   </div>
  )
}

export default LandingPage