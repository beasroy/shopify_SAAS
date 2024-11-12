import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, ChevronDown, BarChart, ShoppingCart, MapPin, Layout, Share2 } from "lucide-react";
import { useCallback } from "react";

interface ReportsDropdownProps {
  brandId: string | undefined;
}

export default function ReportsDropdown({ brandId }: ReportsDropdownProps) {
  const navigate = useNavigate();

  const handleNavigate = useCallback((path: any) => {
    navigate(path);
  }, [navigate]);

  const reports = [
    { name: "Monthly Ad Metrics Reports", icon: BarChart, path: `/ad-metrics/${brandId}` },
    { name: "Daily E-Commerce Metrics Reports", icon: ShoppingCart, path: `/ecommerce-metrics/${brandId}` },
    { name: "City based Reports", icon: MapPin, path: `/city-metrics/${brandId}` },
    { name: "Landing Page based Reports", icon: Layout, path: `/page-metrics/${brandId}` },
    { name: "Referring Channel based Reports", icon: Share2, path: `/channel-metrics/${brandId}` },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="flex items-center justify-between bg-cyan-600 hover:bg-cyan-700" aria-label="View Reports">
          <span className="mr-2">View Reports</span>
          <Sheet className="mr-2 h-4 w-4" aria-hidden="true" />
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {reports.map((report) => (
          <DropdownMenuItem
            key={report.name}
            onClick={() => handleNavigate(report.path)}
            className="flex items-center"
          >
            <report.icon className="mr-2 h-4 w-4" aria-hidden="true" />
            <span className="p-0.5">{report.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
