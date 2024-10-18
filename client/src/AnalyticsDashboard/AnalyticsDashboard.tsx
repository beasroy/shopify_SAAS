import React from "react";
import CollapsibleSidebar from "@/Dashboard/CollapsibleSidebar";
import Dashboard from "./dashboard.tsx";

const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="flex h-screen"> {/* Set a fixed width for the sidebar */}
        <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        <Dashboard />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
