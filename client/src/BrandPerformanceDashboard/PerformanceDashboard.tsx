import React from "react";
import BrandPerformanceDashboard from "./Dashboard";
import CollapsibleSidebar from "@/Dashboard/CollapsibleSidebar";
 const PerformanceDashboard : React.FC=()=>{
    return (
        <div className="flex h-screen"> 
        <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        <BrandPerformanceDashboard />
      </div>
    </div>
    );
}
export default PerformanceDashboard;