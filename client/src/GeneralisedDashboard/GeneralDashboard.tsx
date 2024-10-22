import React from "react";
import LandingPage from "./dashboard";
import CollapsibleSidebar from "@/Dashboard/CollapsibleSidebar";
 const GeneralDashboard : React.FC=()=>{
    return (
        <div className="flex h-screen"> 
        <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        <LandingPage />
      </div>
    </div>
    );
}
export default GeneralDashboard;