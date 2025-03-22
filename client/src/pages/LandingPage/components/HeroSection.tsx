import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const generateLast30Days = () => {
    const data = [];
    const today = new Date();
    
    let baseValue = 25000; // Start at a lower value

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (29 - i)); // Ensure chronological order
        const day = date.getDate();

        // Gradual increase over time
        baseValue += Math.random() * 1500 + 500; // Ensure an upward movement

        // Large fluctuations for some days
        const fluctuation = (Math.random() > 0.7 ? Math.random() * 10000 - 5000 : Math.random() * 3000 - 1500);

        const value = Math.round(baseValue + fluctuation);

        data.push({
            name: day,
            value: Math.max(value, 5000), // Ensure it never goes too low
        });
    }

    return data;
};


const data = generateLast30Days();

function HeroSection() {
    return (
      <div className="relative min-h-screen w-full overflow-hidden gradient-bg">
        {/* Gradient effects */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-12">
            {/* Top badge */}
           
            {/* Main content grid */}
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
              <div className="flex flex-col justify-center items-start">
              <div className="mb-8 flex justify-center">
              <div className="animate-fade-in rounded-full border border-[#1E1B4B]/20 bg-[#0E0E2C] px-3 py-1 text-sm text-slate-300 backdrop-blur-sm">
                <span className="mr-2 inline-block text-indigo-500">✦</span>
                Unified Marketing Analytics Platform
              </div>
            </div>
  
                <h1 className="text-center text-4xl font-bold tracking-tight text-white lg:text-left lg:text-6xl">
                  <span className="block mb-2">All Your Marketing Data,  One Place.</span>
                </h1>
  
                <p className="mt-6 text-center text-lg text-slate-200 lg:text-left">
                  Connect Shopify, Meta, Google Ads, and GA4 in one dashboard. Track performance, analyze conversions, and get automated email reports.
                </p>
  
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Link to="/login">
                  <Button size="lg" className="w-full bg-white text-black hover:bg-blue-100 sm:w-auto">
                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="w-full border-slate-800 text-black hover:bg-blue-100 sm:w-auto">
                    View Demo
                  </Button>
                </div>
              </div>
  
              {/* Dashboard Preview */}
              <div className="relative">
            <div className="relative rounded-2xl border border-slate-800 bg-[#0A0A1B] p-4">
              {/* Window Controls */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                  <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                  <div className="h-3 w-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-800/50 px-3 py-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-300">Last 30 days</span>
                </div>
              </div>

              {/* Analytics Content */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-300">Analytics Overview</h2>
                  <Button variant="outline" size="sm" className="border-slate-800">
                    Export
                  </Button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-4 text-slate-100">
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <div className="text-sm text-slate-400">Revenue</div>
                    <div className="mt-1 text-2xl font-bold">$48.2K</div>
                    <div className="mt-2 text-sm text-emerald-400">+12.4%</div>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <div className="text-sm text-slate-400">Orders</div>
                    <div className="mt-1 text-2xl font-bold">2,567</div>
                    <div className="mt-2 text-sm text-emerald-400">+8.2%</div>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <div className="text-sm text-slate-400">Customers</div>
                    <div className="mt-1 text-2xl font-bold">1.2M</div>
                    <div className="mt-2 text-sm text-emerald-400">+4.7%</div>
                  </div>
                </div>

                {/* Chart Placeholder */}
                <div className="h-[300px] rounded-lg bg-slate-800/30 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value) => `$${value / 1000}k`}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Floating Achievement Card */}
            <div className="absolute -right-4 bottom-20">
              <div className="rounded-2xl border border-green-500/20 bg-green-400/20 p-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-500">New Milestone!</span>
                </div>
                <p className="mt-1 text-xs text-green-300">Revenue target achieved</p>
              </div>
            </div>
          </div>
        </div>
            </div>
          </div>
        </div>
    );
  }

export default HeroSection;