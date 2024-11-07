
import { UserProvider } from './context/UserContext';
import { BrowserRouter as Router,Route,Routes } from 'react-router-dom';
import AuthForm from "./Auth/AuthForm.tsx";
import { Toaster } from "@/components/ui/toaster"
import BusinessDashboard from './Dashboard/BusinessDashboard.tsx';
import AnalyticsDashboard from './AnalyticsDashboard/AnalyticsDashboard.tsx';
import GeneralDashboard from './GeneralisedDashboard/GeneralDashboard.tsx';
import { BrandProvider } from './context/BrandContext.tsx';
import EcommerceMetricsPage from './EcommerceMetrics/EcommerceMetricsPage.tsx';
import { ExcelMetricsPage } from './ExcelMetrics/ExcelMetrics.tsx';
import CitySessionPage from './CitySessionPage/CitySessionPage.tsx';

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
        </Routes>
      </Router>
      </BrandProvider>
    </UserProvider>
  );
}

export default App;
