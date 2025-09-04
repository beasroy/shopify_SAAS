import React from "react";
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar.tsx";
import Dashboard from "./dashboard.tsx";
import HelpDeskModal from "@/components/dashboard_component/HelpDeskModal.tsx";


const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="flex h-screen"> 
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        <Dashboard />
     <HelpDeskModal />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
