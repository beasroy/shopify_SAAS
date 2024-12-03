import React from "react";
import LandingPage from "./dashboard";
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar";
import { useUser } from "@/context/UserContext";
import Dashboard from "./BrandSetUpDashboard";
 const GeneralDashboard : React.FC=()=>{

  const  {user} = useUser();
  console.log(user)

    return (
        <div className="flex h-screen"> 
        <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
       {user?.brands?.length === 0 ?<Dashboard /> : <LandingPage />}
      </div>
    </div>
    );
}
export default GeneralDashboard;