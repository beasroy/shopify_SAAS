import { AlertTriangle, BarChart3, LineChart, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function ConnectGA4() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center"> 
            <AlertTriangle className="h-16 w-16 text-yellow-500 animate-bounce" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Connect Google Analytics 4</h1>
          <p className="text-xl text-muted-foreground">
            Unlock powerful insights for your store
          </p>
        </div>

        {/* Main Content */}
        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <div className="space-y-6">
            <p className="text-lg text-center">
              You haven't connected Google Analytics 4 yet. You're missing out on valuable insights about your store's performance!
            </p>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-3 gap-4 my-8">
              <div className="flex flex-col items-center text-center p-4 space-y-2">
                <BarChart3 className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Real-time Analytics</h3>
                <p className="text-sm text-muted-foreground">Track visitor behavior as it happens</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 space-y-2">
                <LineChart className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Performance Metrics</h3>
                <p className="text-sm text-muted-foreground">Monitor your store's key metrics</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 space-y-2">
                <TrendingUp className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Growth Insights</h3>
                <p className="text-sm text-muted-foreground">Make data-driven decisions</p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center">
              <Button size="lg" className="group">
                Connect GA4 Now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground">
          Need help setting up GA4? Check out our{" "}
          <a href="#" className="text-primary hover:underline">
            step-by-step guide
          </a>
        </p>
      </div>
    </div>
  );
}

export default ConnectGA4;