
import { UserProvider } from './context/UserContext';
import { BrowserRouter as Router,Route,Routes } from 'react-router-dom';
import AuthForm from "./Auth/AuthForm.tsx";
import { Toaster } from "@/components/ui/toaster"
import BusinessDashboard from './Dashboard/BusinessDashboard.tsx';
import AnalyticsDashboard from './AnalyticsDashboard/AnalyticsDashboard.tsx';
import GeneralDashboard from './GeneralisedDashboard/GeneralDashboard.tsx';
import { BrandProvider } from './context/BrandContext.tsx';
import EcommerceMetricsPage from './EcommerceMetrics/EcommerceMetricsPage.tsx';
import { ExcelMetricsPage } from './MonthlyAdMetrics/ExcelMetrics.tsx';
import CitySessionPage from './CitySessionPage/CitySessionPage.tsx';
import ChannelSessionPage from './RefferingChannelPage/RefferingChannelPage.tsx';
import LandingPageSession from './LandingPageSession/LandingPageSession.tsx';
import PerformanceDashboard from './BrandPerformanceDashboard/PerformanceDashboard.tsx';

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
          <Route path = '/performance-metrics' element={<PerformanceDashboard />} />
        </Routes>
      </Router>
      </BrandProvider>
    </UserProvider>
  );
}

export default App;
