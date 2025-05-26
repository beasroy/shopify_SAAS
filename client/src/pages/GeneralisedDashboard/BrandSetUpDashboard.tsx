import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Sparkles, CircleCheckBig } from "lucide-react";
import { setupSteps } from "@/data/constant";

import CollapsibleSidebar from "../../components/dashboard_component/CollapsibleSidebar";
import BrandSetup from "./components/BrandForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface BrandSetupDashboardProps {
  newOpenModalVal: string;
}

export default function BrandSetupDashboard({
  newOpenModalVal,
}: BrandSetupDashboardProps) {
  const user = useSelector((state: RootState) => state.user.user);
  const name = user?.username || "user";

  return (
    <div className="flex h-screen bg-gray-50">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        <div className="container mx-auto p-4 max-w-7xl">
          <div className="mb-6 rounded-xl overflow-hidden shadow-lg relative">
            <div className="absolute inset-0">
              <img
                src="/abstract-layout.jpg"
                alt="Background"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60"></div>
            </div>
            <div className="relative z-10 p-8 md:p-12">
              <div className="max-w-3xl">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-yellow-300" />
                    <span className="font-medium">Getting Started</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
                    Welcome to Parallels, {name}!
                  </h1>
                  <p className="text-white/90 text-lg max-w-2xl">
                    Set up your brand to start tracking analytics across your
                    marketing platforms. Connect your accounts to get
                    comprehensive insights all in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <BrandSetup newOpenModalVal={newOpenModalVal} />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">
                    Setup Steps
                  </CardTitle>
                  <CardDescription>
                    Complete these steps to get started
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {setupSteps.map((step, index) => (
                    <div key={step.id} className="group">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-gray-100 p-1.5 flex-shrink-0 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <step.icon className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-medium text-sm">{step.title}</h3>
                          <p className="text-xs text-gray-500">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      {index < setupSteps.length - 1 && (
                        <div className="ml-3 pl-3 border-l border-gray-200 h-4 my-1"></div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-blue-800">
                    Pro Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <div className="rounded-full bg-blue-100 p-1 text-blue-600 flex-shrink-0">
                        <CircleCheckBig width={14} height={14} />
                      </div>
                      <span className="text-blue-700">
                        Connect multiple platforms for comprehensive analytics
                        across all your marketing channels.
                      </span>
                    </li>
                    <Separator className="my-2 bg-blue-100" />
                    <li className="flex items-start gap-2">
                      <div className="rounded-full bg-blue-100 p-1 text-blue-600 flex-shrink-0">
                        <CircleCheckBig width={14} height={14} />
                      </div>
                      <span className="text-blue-700">
                        Your data will be automatically synced and updated every
                        3 hours.
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
