import React from "react";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar";
import { useSelector } from "react-redux";
import BrandSetupDashboard from "./BrandSetUpDashboard";
import SummaryDashboard from "./dashboard";
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal";
import { RootState } from "@/store";
import { useLocation, useNavigate } from "react-router-dom";

const GeneralDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user.user);
  const navigate = useNavigate();
  const location = useLocation();
  const newOpenModalVal = (location.state as string) || "";

    if (!user) {
        navigate('/login');
        return null;
    }

  return (
    <>
      {user.brands?.length === 0 ? (
        <BrandSetupDashboard newOpenModalVal={newOpenModalVal} />
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
};

export default GeneralDashboard;
