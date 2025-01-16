
import { UserProvider } from './context/UserContext';
import { BrowserRouter as Router,Route,Routes } from 'react-router-dom';
import AuthForm from "./Auth/AuthForm.tsx";
import { Toaster } from "@/components/ui/toaster"
import AnalyticsDashboard from './pages/AnalyticsDashboard/AnalyticsDashboard.tsx';
import GeneralDashboard from './pages/GeneralisedDashboard/GeneralDashboard.tsx';
import { BrandProvider } from './context/BrandContext.tsx';
import { ExcelMetricsPage } from './pages/MonthlyAdMetrics/ExcelMetrics.tsx';
import PerformanceDashboard from './pages/BrandPerformanceDashboard/PerformanceDashboard.tsx';
import SegmentDashboard from './pages/SegmentDashboard/SegmentDashboard.tsx';
import GoogleCallback from './Auth/OauthSucces.tsx';
import ReportsPage from './pages/ReportPage/ReportsPage.tsx';
import { TokenErrorProvider } from './context/TokenErrorContext.tsx';
import ConversionReportPage from './pages/ConversionReportPage/ConversionReportPage.tsx';

function App() {
  return (

    <UserProvider>
      <BrandProvider>
      <TokenErrorProvider>
      <Router>
        <Toaster />
        <Routes>
          <Route path="/" element={<AuthForm />} />
          <Route path="/dashboard" element={<GeneralDashboard />} />
          <Route path="/analytics-dashboard/:brandId" element={<AnalyticsDashboard/>} />
          <Route path='/reports/:brandId' element={<ReportsPage />} />
          <Route path ="/ad-metrics/:brandId" element={<ExcelMetricsPage />} />
          <Route path = '/performance-metrics' element={<PerformanceDashboard />} />
          <Route path = '/segment-dashboard/:brandId' element={<SegmentDashboard />} />
          <Route path="/conversion-reports/:brandId" element={<ConversionReportPage />} />
          <Route path="/callback" element={<GoogleCallback />} />
        </Routes>
      </Router>
      </TokenErrorProvider>
      </BrandProvider>
    </UserProvider>
  );
}

export default App;
