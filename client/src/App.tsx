
import { UserProvider } from './context/UserContext';
import { BrowserRouter as Router,Route,Routes } from 'react-router-dom';
import AuthForm from "./Auth/AuthForm.tsx";
import { Toaster } from "@/components/ui/toaster"
import BusinessDashboard from './pages/Dashboard/BusinessDashboard.tsx';
import AnalyticsDashboard from './pages/AnalyticsDashboard/AnalyticsDashboard.tsx';
import GeneralDashboard from './pages/GeneralisedDashboard/GeneralDashboard.tsx';
import { BrandProvider } from './context/BrandContext.tsx';
import EcommerceMetricsPage from './pages/EcommerceMetrics/EcommerceMetricsPage.tsx';
import { ExcelMetricsPage } from './pages/MonthlyAdMetrics/ExcelMetrics.tsx';
import CitySessionPage from './pages/CitySessionPage/CitySessionPage.tsx';
import ChannelSessionPage from './pages/RefferingChannelPage/RefferingChannelPage.tsx';
import LandingPageSession from './pages/LandingPageSession/LandingPageSession.tsx';
import CampaignMetricsPage from './pages/CampaignMetricsPage.tsx';
import PerformanceDashboard from './pages/BrandPerformanceDashboard/PerformanceDashboard.tsx';
import SegmentDashboard from './pages/SegmentDashboard/SegmentDashboard.tsx';
import GoogleCallback from './Auth/OauthSucces.tsx';

function App() {
  return (
    <UserProvider>
      <BrandProvider>
      <Router>
        <Toaster />
        <Routes>
          <Route path="/" element={<AuthForm />} />
          <Route path="/dashboard" element={<GeneralDashboard />} />
          <Route path="/business-dashboard/:brandId" element={<BusinessDashboard />} />
          <Route path="/analytics-dashboard/:brandId" element={<AnalyticsDashboard/>} />
          <Route path ="/ecommerce-metrics/:brandId" element={<EcommerceMetricsPage />} />
          <Route path ="/ad-metrics/:brandId" element={<ExcelMetricsPage />} />
          <Route path ="/city-metrics/:brandId" element={<CitySessionPage />} />
          <Route path ='/channel-metrics/:brandId' element={<ChannelSessionPage />} />
          <Route path ='/page-metrics/:brandId' element={<LandingPageSession />} />
          <Route path = '/campaign-metrics/:brandId' element={<CampaignMetricsPage/>}/>
          <Route path = '/performance-metrics' element={<PerformanceDashboard />} />
          <Route path = '/segment-dashboard/:brandId' element={<SegmentDashboard />} />
          <Route path="/callback" element={<GoogleCallback />} />
        </Routes>
      </Router>
      </BrandProvider>
    </UserProvider>
  );
}

export default App;
