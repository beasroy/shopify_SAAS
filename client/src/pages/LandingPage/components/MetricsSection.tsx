import { useCountUp } from "@/hooks/useCountUp";
import { useInView } from "@/hooks/useInView";
import { Clock, TrendingUp, CheckCircle, Users, BarChart3, Zap } from "lucide-react";

const metrics = [
    {
        icon: Clock,
        value: 5,
        suffix: "x",
        label: "Faster real-time insight discovery",
        description: "Find answers without manual data reconciliation",
        color: "accent",
    },
    {
        icon: TrendingUp,
        value: 40,
        suffix: "%",
        label: "Less time on reporting, more scaling",
        description: "Automated insights reduce manual workflows",
        color: "brand-green",
    },
    {
        icon: CheckCircle,
        value: 3,
        suffix: "x",
        label: "Higher confidence in scaling",
        description: "Data-driven decisions backed by unified metrics",
        color: "brand-amber",
    },
    {
        icon: Users,
        value: 90,
        suffix: "%",
        label: "Fewer attribution disputes",
        description: "One source of truth for all stakeholders",
        color: "brand-coral",
    },
];

const MetricCard = ({ metric, index }: { metric: typeof metrics[0]; index: number }) => {
    const { count, ref } = useCountUp({ end: metric.value, duration: 2000 });

    const colorClasses: Record<string, { bg: string; text: string; glow: string }> = {
        accent: { bg: "bg-accent/20", text: "text-accent", glow: "group-hover:shadow-accent/20" },
        "brand-green": { bg: "bg-brand-green/20", text: "text-brand-green", glow: "group-hover:shadow-brand-green/20" },
        "brand-amber": { bg: "bg-brand-amber/20", text: "text-brand-amber", glow: "group-hover:shadow-brand-amber/20" },
        "brand-coral": { bg: "bg-brand-coral/20", text: "text-brand-coral", glow: "group-hover:shadow-brand-coral/20" },
    };

    const colors = colorClasses[metric.color] || colorClasses.accent;

    return (
        <div
            ref={ref}
            className={`relative group transition-all duration-500`}
            style={{
                animationDelay: `${index * 0.15}s`,
                animation: "fadeInUp 0.6s ease-out forwards",
                opacity: 0
            }}
        >
            <div className={`text-center p-8 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 group-hover:border-accent/30 transition-all duration-300 hover:scale-105 ${colors.glow} group-hover:shadow-lg`}>
                {/* Animated background glow */}
                <div className={`absolute inset-0 ${colors.bg} opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity blur-xl`} />

                {/* Icon with animation */}
                <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform relative z-10`}>
                    <metric.icon size={28} className={colors.text} />
                </div>

                {/* Animated Number */}
                <div className="text-5xl md:text-6xl font-bold text-primary-foreground mb-2 relative z-10">
                    <span className="text-gradient">{count}</span>
                    <span className="text-primary-foreground/80">{metric.suffix}</span>
                </div>

                <div className="text-lg font-semibold text-primary-foreground mb-2 relative z-10">
                    {metric.label}
                </div>
                <p className="text-sm text-primary-foreground/50 relative z-10">
                    {metric.description}
                </p>
            </div>
        </div>
    );
};

// Animated mini chart component
const AnimatedMiniChart = () => {
    const { ref, isInView } = useInView({ threshold: 0.3 });

    return (
        <div ref={ref} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-40 opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 800 160" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="metricsChartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
                        <stop offset="50%" stopColor="hsl(160, 84%, 39%)" />
                        <stop offset="100%" stopColor="hsl(38, 92%, 50%)" />
                    </linearGradient>
                </defs>
                <path
                    d="M 0 120 Q 100 100 200 80 T 400 60 T 600 40 T 800 20"
                    fill="none"
                    stroke="url(#metricsChartGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{
                        strokeDasharray: 1200,
                        strokeDashoffset: isInView ? 0 : 1200,
                        transition: "stroke-dashoffset 2s ease-out"
                    }}
                />
            </svg>
        </div>
    );
};

const MetricsSection = () => {
    const { ref: sectionRef, isInView } = useInView({ threshold: 0.1 });

    return (
        <section className="relative py-20 lg:py-28 overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-accent/20" />
            <div className="absolute inset-0 bg-mesh-gradient opacity-50" />

            {/* Animated orbs */}
            <div className="absolute top-1/4 left-10 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-brand-green/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
            <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-brand-amber/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2.5s" }} />

            {/* Animated background chart */}
            <AnimatedMiniChart />

            <div className="container mx-auto px-6 relative z-10">
                <div
                    ref={sectionRef}
                    className={`max-w-3xl mx-auto text-center mb-12 ${isInView ? "animate-fade-in" : "opacity-0"}`}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
                        <Zap size={14} className="text-accent animate-pulse" />
                        <span className="text-sm font-medium text-accent">Measurable Impact</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
                        Driving meaningful outcomes through{" "}
                        <span className="text-gradient">clarity.</span>
                    </h2>
                    <p className="text-lg text-primary-foreground/70">
                        Real results for ecommerce teams.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    {metrics.map((metric, index) => (
                        <MetricCard key={index} metric={metric} index={index} />
                    ))}
                </div>

                {/* Bottom visual element */}
                <div className="flex justify-center mt-12">
                    <div className="flex items-center gap-3 px-6 py-3 bg-primary-foreground/5 rounded-full border border-primary-foreground/10">
                        <BarChart3 size={18} className="text-accent" />
                        <span className="text-sm text-primary-foreground/70">Based on early user feedback</span>
                    </div>
                </div>
            </div>

            {/* Inline keyframes for animation */}
            <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </section>
    );
};

export default MetricsSection;
