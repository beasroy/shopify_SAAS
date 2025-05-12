import React from "react";
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar";
import { useSelector } from "react-redux";
import BrandSetupDashboard from "./BrandSetUpDashboard";
import SummaryDashboard from "./dashboard";
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal";
import { RootState } from "@/store";


const GeneralDashboard: React.FC = () => {
    const user = useSelector((state:RootState)=>state.user.user);

    return (
        <div className="flex h-screen relative"> 
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-auto"> 
                {user?.brands?.length === 0 ? <BrandSetupDashboard /> : <SummaryDashboard />}
            </div>
            <HelpDeskModal />
        </div>
    );
}

export default GeneralDashboard;