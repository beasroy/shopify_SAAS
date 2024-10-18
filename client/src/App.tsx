
import { UserProvider } from './context/UserContext';
import { BrowserRouter as Router,Route,Routes } from 'react-router-dom';
import AuthForm from "./Auth/AuthForm.tsx";
import { Toaster } from "@/components/ui/toaster"
import BusinessDashboard from './Dashboard/BusinessDashboard.tsx';
import AnalyticsDashboard from './AnalyticsDashboard/AnalyticsDashboard.tsx';

function App() {
  return (
    <UserProvider>
      <Router>
        <Toaster />
        <Routes>
          <Route path="/" element={<AuthForm />} />
          <Route path="/dashboard" element={<BusinessDashboard/>} />
          <Route path="/analytics-dashboard" element={<AnalyticsDashboard/>} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
