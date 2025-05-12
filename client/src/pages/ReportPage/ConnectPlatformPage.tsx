import { useState } from 'react';
import { AlertTriangle, BarChart3, LineChart, TrendingUp, ArrowRight, Facebook, PieChart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PlatformModal from '@/components/dashboard_component/PlatformModal';

const platformConfigs = {
  'google analytics': {
    title: "Google analytics",
    description: "Unlock powerful insights for your store",
    icon: <PieChart className="h-16 w-16 text-blue-500 animate-bounce" />,
    benefits: [
      {
        icon: <BarChart3 className="h-8 w-8 text-primary" />,
        title: "Real-time Analytics",
        description: "Track visitor behavior as it happens"
      },
      {
        icon: <LineChart className="h-8 w-8 text-primary" />,
        title: "Performance Metrics",
        description: "Monitor your store's key metrics"
      },
      {
        icon: <TrendingUp className="h-8 w-8 text-primary" />,
        title: "Growth Insights",
        description: "Make data-driven decisions"
      }
    ],
    buttonText: "Connect GA4 Now",
    guideText: "Need help setting up GA4?"
  },
  'google ads': {
    title: "Google Ads",
    description: "Supercharge your advertising performance",
    icon: <AlertTriangle className="h-16 w-16 text-red-500 animate-bounce" />,
    benefits: [
      {
        icon: <BarChart3 className="h-8 w-8 text-primary" />,
        title: "Campaign Tracking",
        description: "Monitor ad performance in real-time"
      },
      {
        icon: <LineChart className="h-8 w-8 text-primary" />,
        title: "Conversion Analytics",
        description: "Track ROI and conversions"
      },
      {
        icon: <TrendingUp className="h-8 w-8 text-primary" />,
        title: "Budget Optimization",
        description: "Optimize spending across campaigns"
      }
    ],
    buttonText: "Connect Google Ads",
    guideText: "New to Google Ads?"
  },
  facebook: {
    title: "Facebook Ads",
    description: "Scale your social media advertising",
    icon: <Facebook className="h-16 w-16 text-blue-600 animate-bounce" />,
    benefits: [
      {
        icon: <BarChart3 className="h-8 w-8 text-primary" />,
        title: "Audience Insights",
        description: "Understand your target audience"
      },
      {
        icon: <LineChart className="h-8 w-8 text-primary" />,
        title: "Ad Performance",
        description: "Track engagement and reach"
      },
      {
        icon: <TrendingUp className="h-8 w-8 text-primary" />,
        title: "ROAS Tracking",
        description: "Measure advertising return"
      }
    ],
    buttonText: "Connect Facebook Ads",
    guideText: "First time with Facebook Ads?"
  }
};

type PlatformKeys = 'google analytics' | 'google ads' | 'facebook';

interface ConnectPlatformProps {
  platform?: PlatformKeys;
  brandId: string;
  onSuccess?: (platform: string, accountName: string, accountId: string) => void;
}

const ConnectPlatform: React.FC<ConnectPlatformProps> = ({ 
  platform = 'google analytics',
  brandId,
  onSuccess 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const config = platformConfigs[platform];

  const handleConnect = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              {config.icon}
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Connect {config.title}</h1>
            <p className="text-xl text-muted-foreground">
              {config.description}
            </p>
          </div>

          {/* Main Content */}
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <div className="space-y-6">
              <p className="text-lg text-center">
                You haven't connected {config.title} yet. You're missing out on valuable insights about your store's performance!
              </p>

              {/* Benefits Grid */}
              <div className="grid md:grid-cols-3 gap-4 my-8">
                {config.benefits.map((benefit, index) => (
                  <div key={index} className="flex flex-col items-center text-center p-4 space-y-2">
                    {benefit.icon}
                    <h3 className="font-semibold">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="flex justify-center">
                <Button 
                  size="lg" 
                  className="group"
                  onClick={handleConnect}
                >
                  {config.buttonText}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Footer Note */}
          <p className="text-center text-sm text-muted-foreground">
            {config.guideText}{" "}
            <a href="#" className="text-primary hover:underline">
              Check out our guide
            </a>
          </p>
        </div>
      </div>

      <PlatformModal
        platform={platform}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        brandId={brandId}
        onSuccess={onSuccess}
      />
    </>
  );
};

export default ConnectPlatform;