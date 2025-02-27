import React from "react";
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar";
import { useUser } from "@/context/UserContext";
import Dashboard from "./BrandSetUpDashboard";
import SummaryDashboard from "./dashboard";
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal";
// import LandingSlides from "./components/LandingSlides";

const GeneralDashboard: React.FC = () => {
    const { user } = useUser();

    return (
        <div className="flex h-screen relative"> 
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-auto">
               
                {user?.brands?.length === 0 ? <Dashboard /> : <SummaryDashboard />}
            </div>
            <HelpDeskModal />
        </div>
    );
}

export default GeneralDashboard;