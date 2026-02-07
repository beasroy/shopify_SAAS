import React from 'react';
import CollapsibleSidebar from '@/components/dashboard_component/CollapsibleSidebar';
import LocationAnalytics from './components/LocationAnalytics';
import HelpDeskModal from '@/components/dashboard_component/HelpDeskModal';

const LocationAnalyticsPage: React.FC = () => {
  return (
    <div className="flex h-screen">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        <LocationAnalytics />
        <HelpDeskModal />
      </div>
    </div>
  );
};

export default LocationAnalyticsPage;

