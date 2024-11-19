import React from "react";
import Dashboard from "./Dashboard";
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar";
 const SegmentDashboard : React.FC=()=>{
    return (
        <div className="flex h-screen"> 
        <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
       <Dashboard />
      </div>
    </div>
    );
}
export default SegmentDashboard;