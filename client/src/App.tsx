
import { UserProvider } from './context/UserContext';
import { BrowserRouter as Router,Route,Routes } from 'react-router-dom';
import AuthForm from "./Auth/AuthForm.tsx";
import { Toaster } from "@/components/ui/toaster"
import BusinessDashboard from './pages/Dashboard/BusinessDashboard.tsx';
import AnalyticsDashboard from './pages/AnalyticsDashboard/AnalyticsDashboard.tsx';
import GeneralDashboard from './pages/GeneralisedDashboard/GeneralDashboard.tsx';
import { BrandProvider } from './context/BrandContext.tsx';
import { ExcelMetricsPage } from './pages/MonthlyAdMetrics/ExcelMetrics.tsx';
import CampaignMetricsPage from './pages/CampaignMetricsPage.tsx';
import PerformanceDashboard from './pages/BrandPerformanceDashboard/PerformanceDashboard.tsx';
import SegmentDashboard from './pages/SegmentDashboard/SegmentDashboard.tsx';
import GoogleCallback from './Auth/OauthSucces.tsx';
import ReportsPage from './pages/ReportPage/ReportsPage.tsx';

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
          <Route path='/reports/:brandId' element={<ReportsPage />} />
          <Route path ="/ad-metrics/:brandId" element={<ExcelMetricsPage />} />
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
