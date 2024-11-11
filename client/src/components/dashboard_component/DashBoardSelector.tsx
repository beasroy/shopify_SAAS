import { useEffect, useState } from "react";
import { BriefcaseBusiness, BarChart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate, useLocation } from "react-router-dom";

interface DashboardDropdownProps {
  brandId: string | undefined;
}

export default function DashboardSelector({ brandId }: DashboardDropdownProps) {
  const dashboards = [
    { name: "Business Dashboard", icon: BriefcaseBusiness, path: `/business-dashboard/${brandId}` },
    { name: "Ad Metrics Dashboard", icon: BarChart, path: `/analytics-dashboard/${brandId}` },
  ];

  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDashboard, setSelectedDashboard] = useState(dashboards[0]);

  useEffect(() => {
    // Find the currently active dashboard based on the URL path
    const activeDashboard = dashboards.find((dashboard) =>
      location.pathname.includes(dashboard.path)
    );
    if (activeDashboard) {
      setSelectedDashboard(activeDashboard);
    }
  }, [location.pathname, dashboards]);

  const handleDashboardSelect = (dashboard: typeof dashboards[0]) => {
    setSelectedDashboard(dashboard);
    navigate(dashboard.path);
  };

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="p-0 hover:bg-transparent">
            <h1 className="text-2xl font-bold">{selectedDashboard.name}</h1>
            <ChevronDown className="h-4 w-4 ml-2" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {dashboards.map((dashboard) => (
            <DropdownMenuItem
              key={dashboard.name}
              onSelect={() => handleDashboardSelect(dashboard)}
              className="flex items-center"
            >
              <dashboard.icon className="h-5 w-5 mr-2 text-gray-500" aria-hidden="true" />
              <span>{dashboard.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
