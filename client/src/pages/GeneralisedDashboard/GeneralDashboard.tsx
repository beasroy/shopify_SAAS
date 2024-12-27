import React from "react";
import LandingPage from "./dashboard";
import CollapsibleSidebar from "@/pages/Dashboard/CollapsibleSidebar";
import { useUser } from "@/context/UserContext";
import Dashboard from "./BrandSetUpDashboard";
import LandingSlides from "./components/LandingSlides";

const GeneralDashboard: React.FC = () => {
    const { user, showLandingPopup, setShowLandingPopup, setUser } = useUser();

    return (
        <div className="flex h-screen relative"> 
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-auto">
                {/* Landing Slides Popup */}
                {showLandingPopup && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="w-full max-w-4xl mx-4">
                            <LandingSlides 
                                onEnd={() => {
                                    setShowLandingPopup(false);
                                    if (user) {
                                        setUser({
                                            ...user,
                                            hasSeenLandingSlides: true
                                        });
                                    }
                                }} 
                            />
                        </div>
                    </div>
                )}
                
                {/* Main Content */}
                {user?.brands?.length === 0 ? <Dashboard /> : <LandingPage />}
            </div>
        </div>
    );
}

export default GeneralDashboard;