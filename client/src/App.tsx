
import { UserProvider } from './context/UserContext';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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
import AudienceConversionReportPage from './pages/ConversionReportPage/AudienceConversionReportPage.tsx';
import WebsiteConversionReportPage from './pages/ConversionReportPage/WebsiteConversionReportPage.tsx';
import GoogleAdsDashboard from './pages/GoogleAdsHub/Dashboard.tsx';
import FbReportPage from './pages/FbReports/FbReportPage.tsx';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import MetaDashboard from './pages/META/AdAccount/MetaDashboard.tsx';
import CampaignDashboard from './pages/META/Campaign/CampaignDashboard.tsx';

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <UserProvider>
          <BrandProvider>
            <TokenErrorProvider>
              <Router>
                <Toaster />
                <Routes>
                  <Route path="/" element={<AuthForm />} />
                  <Route path="/dashboard" element={<GeneralDashboard />} />
                  <Route path="/analytics-dashboard/:brandId" element={<AnalyticsDashboard />} />
                  <Route path='/ecommerce-reports/:brandId' element={<ReportsPage />} />
                  <Route path="/ad-metrics/:brandId" element={<ExcelMetricsPage />} />
                  <Route path='/performance-metrics' element={<PerformanceDashboard />} />
                  <Route path='/segment-dashboard/:brandId' element={<SegmentDashboard />} />
                  <Route path='/adaccount-summary/:brandId' element={<MetaDashboard />} />
                  <Route path='/meta-campaigns/:brandId' element={<CampaignDashboard />} />
                  <Route path='/meta-reports/:brandId' element={<FbReportPage />} />
                  <Route path='/google-ads-hub/:brandId' element={<GoogleAdsDashboard />} />
                  <Route path="/conversion-reports/:brandId/demographics" element={<AudienceConversionReportPage />} />
                  <Route path="/conversion-reports/:brandId/performance" element={<WebsiteConversionReportPage />} />
                  <Route path="/callback" element={<GoogleCallback />} />
                </Routes>
              </Router>
            </TokenErrorProvider>
          </BrandProvider>
        </UserProvider>
        </PersistGate>
        </Provider>
        );
}

        export default App;
