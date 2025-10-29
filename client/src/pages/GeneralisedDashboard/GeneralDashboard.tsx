import React, { useEffect } from "react";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import SummaryDashboard from "./dashboard";
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useNavigate } from "react-router-dom";

const GeneralDashboard: React.FC = () => {
    const user = useSelector((state: RootState) => state.user.user);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }

        // If user has no brands, redirect to brand setup
        if (!user.brands || user.brands.length === 0) {
            navigate('/brand-setup');
            return;
        }
    }, [user, navigate]);

    // If user is not authenticated or has no brands, don't render anything
    if (!user || !user.brands || user.brands.length === 0) {
        return null;
    }

    // Show summary dashboard for users with brands
    return (
        <div className="flex h-screen relative">
          <CollapsibleSidebar />
          <div className="flex-1 h-screen overflow-auto">
            <SummaryDashboard />
          </div>
          <HelpDeskModal />
        </div>
    );
}

export default GeneralDashboard;