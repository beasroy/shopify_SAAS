import { Route, BrowserRouter as Router,Routes } from "react-router-dom";
import AuthForm from "./Auth/AuthForm.tsx";
import { Toaster } from "@/components/ui/toaster"
import Dashboard from "./Dashboard/dashboard.tsx";

function App() {
  return (
    <Router>
        <Toaster />
      <Routes>
        <Route path="/" element={<AuthForm />} />
        <Route path="/dashboard" element={<Dashboard/>} />
      </Routes>
    </Router>
  );
}

export default App;
