import React from "react";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import { useSelector } from "react-redux";
import BrandSetupDashboard from "./BrandSetUpDashboard";
import SummaryDashboard from "./dashboard";
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal";
import { RootState } from "@/store";
import { useNavigate } from "react-router-dom";

const GeneralDashboard: React.FC = () => {
    const user = useSelector((state: RootState) => state.user.user);
    const navigate = useNavigate();

    if (!user) {
        navigate('/');
        return null;
    }

    return (
        <>
          {user.brands?.length === 0 ? (
            <BrandSetupDashboard />
          ) : (
            <div className="flex h-screen relative">
              <CollapsibleSidebar />
              <div className="flex-1 h-screen overflow-auto">
                <SummaryDashboard />
              </div>
              <HelpDeskModal />
            </div>
          )}
        </>
      );
}

export default GeneralDashboard;