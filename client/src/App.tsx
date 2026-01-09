import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AuthForm from "./Auth/AuthForm.tsx";
import { Toaster } from "@/components/ui/toaster"
import AnalyticsDashboard from './pages/AnalyticsDashboard/AnalyticsDashboard.tsx';
import GeneralDashboard from './pages/GeneralisedDashboard/GeneralDashboard.tsx'
import { ExcelMetricsPage } from './pages/MonthlyAdMetrics/ExcelMetrics.tsx';
import PerformanceDashboard from './pages/BrandPerformanceDashboard/PerformanceDashboard.tsx';
import SegmentDashboard from './pages/SegmentDashboard/SegmentDashboard.tsx';
import GoogleCallback from './Auth/OauthSucces.tsx';
import ReportsPage from './pages/ReportPage/ReportsPage.tsx';
import { TokenErrorProvider } from './context/TokenErrorContext.tsx';
import GoogleAdsDashboard from './pages/GoogleAdsHub/Dashboard.tsx';
import FbReportPage from './pages/Meta/FbReports/FbReportPage';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import ProfilePage from './pages/Profile Page/ProfilePage.tsx';
import BrandSetupDashboard from './pages/GeneralisedDashboard/BrandSetUpDashboard.tsx';
import TutorialManager from './components/Tutorial/TutorialManager.tsx';
import TutorialDriver from './components/Tutorial/TutorialDriver.tsx';
import LandingPage from './pages/LandingPage/page.tsx';
import PrivacyPolicy from './pages/LandingPage/components/PrivacyPolicy.tsx';
import TermsAndConditions from './pages/LandingPage/components/TermsAndConditions.tsx';
import ConversionLens from './pages/ConversionReportPage/ConversionLens.tsx';
import CampaignPage from './pages/Meta/Campaign Reports/CampaignPage.tsx';
import InterestPage from './pages/Meta/Interest Reports/InterestReportPage.tsx';
import ShopifyAuth from "./Auth/Shopify.tsx";
import PricingCallback from './Auth/PricingSuccess.tsx';
import AddBrandDashboard from './pages/GeneralisedDashboard/AddBrandDashboard.tsx';
import AutoLogout from './components/dashboard_component/AutoLogout.tsx';
import CreativesLibrary from './pages/CreativesLibrary/CreativesLibrary.tsx';
import D2CCalculator from './pages/D2CCalculator/D2CCalculator.tsx';
import ProductPage from './pages/Product/ProductPage.tsx';
import BounceRatePage from './pages/BounceRate/BounceRatePage.tsx';
import FollowedBrands from './pages/FollowedBrands/FollowedBrands.tsx';




function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <TokenErrorProvider>
          <Router>
            <AutoLogout>
              <TutorialManager>
                <TutorialDriver />
                <Toaster />
                <Routes>
                  <Route path='/' element={<LandingPage />} />
                  <Route path="/login" element={<AuthForm />} />
                  <Route path="/dashboard" element={<GeneralDashboard />} />
                  <Route path="/admetrics/:brandId" element={<AnalyticsDashboard />} />
                  <Route path='/ecommerce-reports/:brandId' element={<ReportsPage />} />
                  <Route path="/marketing-insights/:brandId" element={<ExcelMetricsPage />} />
                  <Route path='/performance-metrics' element={<PerformanceDashboard />} />
                  <Route path='/segment-dashboard/:brandId' element={<SegmentDashboard />} />
                  <Route path='/meta-reports/:brandId' element={<FbReportPage />} />
                  <Route path='/google-reports/:brandId' element={<GoogleAdsDashboard />} />
                  <Route path="/conversion-reports/:brandId" element={<ConversionLens />} />
                  <Route path="/product-reports/:brandId" element={<ProductPage />} />
                  <Route path="/callback" element={<GoogleCallback />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/shopify" element={<ShopifyAuth />} />
                  <Route path="/brand-setup" element={<AddBrandDashboard />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                  <Route path="/meta-campaigns/:brandId" element={<CampaignPage />} />
                  <Route path="/meta-interest/:brandId" element={<InterestPage />} />
                  <Route path="/creatives-library/:brandId" element={<CreativesLibrary />} />
                  <Route path="/pricing_callback" element={<PricingCallback />} />
                  <Route path="/first-time-brand-setup" element={<BrandSetupDashboard />} />
                  <Route path="/d2c-calculator/:brandId" element={<D2CCalculator />} />
                  <Route path="/bounce-rate-reports/:brandId" element={<BounceRatePage />} />
                  <Route path="/followed-brands/:brandId" element={<FollowedBrands />} />
                </Routes>
              </TutorialManager>
            </AutoLogout>
          </Router>
        </TokenErrorProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
