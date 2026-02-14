import { useState } from "react";
import { Store, Target, TrendingUp, Users } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const roles = [
    {
        id: "dtc",
        icon: Store,
        title: "DTC Brand Owners",
        shortTitle: "Brand Owners",
        insight: "Know which channels actually generate profit",
        description: "See the full picture of revenue attribution across all your marketing spend.",
        highlightAreas: ["revenue", "profit"],
        color: "accent",
    },
    {
        id: "performance",
        icon: Target,
        title: "Performance Marketing",
        shortTitle: "Marketers",
        insight: "See which campaigns drive real revenue",
        description: "Move beyond vanity metrics to understand true campaign performance.",
        highlightAreas: ["campaigns", "roas"],
        color: "brand-green",
    },
    {
        id: "growth",
        icon: TrendingUp,
        title: "Growth Leaders",
        shortTitle: "Growth",
        insight: "Allocate budget with confidence",
        description: "Make data-driven decisions on where to invest for maximum growth.",
        highlightAreas: ["budget", "growth"],
        color: "brand-amber",
    },
    {
        id: "agency",
        icon: Users,
        title: "Agencies",
        shortTitle: "Agencies",
        insight: "Deliver reporting clients can trust",
        description: "Build credibility with transparent, revenue-focused client reports.",
        highlightAreas: ["reporting", "clients"],
        color: "brand-coral",
    },
];

const UseCasesSection = () => {
    const [activeRole, setActiveRole] = useState("dtc");
    const { ref: sectionRef, isInView } = useInView({ threshold: 0.1 });

    const currentRole = roles.find((r) => r.id === activeRole) || roles[0];

    return (
        <section id="use-cases" className="bg-dark-section py-24 lg:py-32 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-hero-pattern opacity-20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[150px]" />

            <div className="container mx-auto px-6 relative z-10">
                {/* Header */}
                <div
                    ref={sectionRef}
                    className={`max-w-3xl mx-auto text-center mb-16 ${isInView ? "animate-fade-in" : "opacity-0"}`}
                >
                    <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
                        One Platform, Many Perspectives
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
                        Same data.{" "}
                        <span className="text-gradient">Your view.</span>
                    </h2>
                    <p className="text-lg text-primary-foreground/70">
                        Parallels adapts to how different teams think and make decisions.
                    </p>
                </div>

                {/* Interactive Dashboard Section */}
                <div
                    className={`max-w-5xl mx-auto ${isInView ? "animate-fade-in" : "opacity-0"}`}
                    style={{ animationDelay: "0.2s" }}
                >
                    {/* Role Selector Tabs */}
                    <div className="flex flex-wrap justify-center gap-3 mb-10">
                        {roles.map((role) => {
                            const isActive = activeRole === role.id;
                            return (
                                <button
                                    key={role.id}
                                    onClick={() => setActiveRole(role.id)}
                                    className={`group flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 ${isActive
                                        ? `bg-${role.color}/20 border border-${role.color}/50`
                                        : "bg-primary-foreground/5 border border-primary-foreground/10 hover:bg-primary-foreground/10"
                                        }`}
                                >
                                    <role.icon
                                        size={18}
                                        className={`transition-colors ${isActive ? `text-${role.color}` : "text-primary-foreground/50 group-hover:text-primary-foreground/70"
                                            }`}
                                    />
                                    <span
                                        className={`text-sm font-medium transition-colors ${isActive ? "text-primary-foreground" : "text-primary-foreground/60 group-hover:text-primary-foreground/80"
                                            }`}
                                    >
                                        <span className="hidden sm:inline">{role.title}</span>
                                        <span className="sm:hidden">{role.shortTitle}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Central Dashboard with Role Context */}
                    <div className="relative">
                        {/* Main Dashboard Visual */}
                        <div className="glass-dark rounded-2xl border border-primary-foreground/10 p-6 md:p-8 relative overflow-hidden">
                            {/* Dashboard Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-brand-green animate-pulse" />
                                    <span className="text-sm text-primary-foreground/60">Live Dashboard</span>
                                </div>
                                <div className="text-xs text-primary-foreground/40">
                                    Unified View • Real-time
                                </div>
                            </div>

                            {/* Dashboard Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {/* Revenue Card */}
                                <div
                                    className={`p-4 rounded-xl transition-all duration-500 ${currentRole.highlightAreas.includes("revenue") || currentRole.highlightAreas.includes("profit")
                                        ? "bg-accent/10 border-2 border-accent/40 scale-[1.02]"
                                        : "bg-primary-foreground/5 border border-primary-foreground/10"
                                        }`}
                                >
                                    <div className="text-xs text-primary-foreground/50 mb-1">Total Revenue</div>
                                    <div className="text-xl md:text-2xl font-bold text-primary-foreground">$847K</div>
                                    <div className="text-xs text-brand-green mt-1">+23% MoM</div>
                                </div>

                                {/* ROAS Card */}
                                <div
                                    className={`p-4 rounded-xl transition-all duration-500 ${currentRole.highlightAreas.includes("roas") || currentRole.highlightAreas.includes("campaigns")
                                        ? "bg-brand-green/10 border-2 border-brand-green/40 scale-[1.02]"
                                        : "bg-primary-foreground/5 border border-primary-foreground/10"
                                        }`}
                                >
                                    <div className="text-xs text-primary-foreground/50 mb-1">Blended ROAS</div>
                                    <div className="text-xl md:text-2xl font-bold text-primary-foreground">4.2x</div>
                                    <div className="text-xs text-brand-green mt-1">+0.8 vs target</div>
                                </div>

                                {/* Budget Card */}
                                <div
                                    className={`p-4 rounded-xl transition-all duration-500 ${currentRole.highlightAreas.includes("budget") || currentRole.highlightAreas.includes("growth")
                                        ? "bg-brand-amber/10 border-2 border-brand-amber/40 scale-[1.02]"
                                        : "bg-primary-foreground/5 border border-primary-foreground/10"
                                        }`}
                                >
                                    <div className="text-xs text-primary-foreground/50 mb-1">Ad Spend</div>
                                    <div className="text-xl md:text-2xl font-bold text-primary-foreground">$201K</div>
                                    <div className="text-xs text-primary-foreground/40 mt-1">Optimal allocation</div>
                                </div>

                                {/* Clients/Reporting Card */}
                                <div
                                    className={`p-4 rounded-xl transition-all duration-500 ${currentRole.highlightAreas.includes("reporting") || currentRole.highlightAreas.includes("clients")
                                        ? "bg-brand-coral/10 border-2 border-brand-coral/40 scale-[1.02]"
                                        : "bg-primary-foreground/5 border border-primary-foreground/10"
                                        }`}
                                >
                                    <div className="text-xs text-primary-foreground/50 mb-1">CAC Payback</div>
                                    <div className="text-xl md:text-2xl font-bold text-primary-foreground">42d</div>
                                    <div className="text-xs text-brand-coral mt-1">-8d improvement</div>
                                </div>
                            </div>

                            {/* Mini Chart Area */}
                            <div className="relative h-32 md:h-40 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 overflow-hidden">
                                {/* Animated trend line */}
                                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor={`hsl(var(--${currentRole.color}))`} stopOpacity="0.3" />
                                            <stop offset="100%" stopColor={`hsl(var(--${currentRole.color}))`} stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor={`hsl(var(--${currentRole.color}))`} stopOpacity="0.5" />
                                            <stop offset="50%" stopColor={`hsl(var(--${currentRole.color}))`} stopOpacity="1" />
                                            <stop offset="100%" stopColor={`hsl(var(--${currentRole.color}))`} stopOpacity="0.5" />
                                        </linearGradient>
                                    </defs>

                                    {/* Area fill */}
                                    <path
                                        d="M 0 120 Q 50 100, 100 90 T 200 70 T 300 85 T 400 60 T 500 50 T 600 65 T 700 45 T 800 40 L 800 160 L 0 160 Z"
                                        fill="url(#chartGradient)"
                                        className="transition-all duration-700"
                                    />

                                    {/* Trend line */}
                                    <path
                                        d="M 0 120 Q 50 100, 100 90 T 200 70 T 300 85 T 400 60 T 500 50 T 600 65 T 700 45 T 800 40"
                                        stroke="url(#lineGradient)"
                                        strokeWidth="2"
                                        fill="none"
                                        className="transition-all duration-700"
                                        style={{
                                            strokeDasharray: "1200",
                                            strokeDashoffset: "0",
                                            animation: "drawLine 2s ease-out forwards",
                                        }}
                                    />

                                    {/* Data points */}
                                    {[100, 200, 300, 400, 500, 600, 700].map((x, i) => (
                                        <circle
                                            key={x}
                                            cx={x}
                                            cy={[90, 70, 85, 60, 50, 65, 45][i]}
                                            r="4"
                                            fill={`hsl(var(--${currentRole.color}))`}
                                            className="animate-pulse"
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                        />
                                    ))}
                                </svg>

                                {/* Chart labels */}
                                <div className="absolute bottom-3 left-4 right-4 flex justify-between text-xs text-primary-foreground/40">
                                    <span>Jan</span>
                                    <span>Feb</span>
                                    <span>Mar</span>
                                    <span>Apr</span>
                                    <span>May</span>
                                    <span>Jun</span>
                                </div>
                            </div>

                            {/* Platform indicators */}
                            <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-primary-foreground/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#4285F4]" />
                                    <span className="text-xs text-primary-foreground/50">Google</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#0081FB]" />
                                    <span className="text-xs text-primary-foreground/50">Meta</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#96BF48]" />
                                    <span className="text-xs text-primary-foreground/50">Shopify</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#F9AB00]" />
                                    <span className="text-xs text-primary-foreground/50">GA4</span>
                                </div>
                            </div>
                        </div>

                        {/* Role Insight Card - Appears below dashboard */}
                        <div
                            key={activeRole}
                            className="mt-6 glass-dark rounded-xl border border-primary-foreground/10 p-6 animate-fade-in"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-${currentRole.color}/20 flex items-center justify-center flex-shrink-0`}>
                                    <currentRole.icon size={24} className={`text-${currentRole.color}`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-primary-foreground mb-1">
                                        {currentRole.insight}
                                    </h3>
                                    <p className="text-primary-foreground/60 text-sm">
                                        {currentRole.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes drawLine {
          from {
            stroke-dashoffset: 1200;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
        </section>
    );
};

export default UseCasesSection;





// import { Store, Target, TrendingUp, Users } from "lucide-react";
// import { useInView } from "@/hooks/useInView";

// const useCases = [
//     {
//         icon: Store,
//         title: "DTC Brand Owners",
//         tagline: "I want to know what actually makes me money.",
//         points: [
//             "Gain visibility into which channels and campaigns contribute to sustainable revenue growth",
//             "Channel-level revenue clarity",
//             "Faster growth decisions",
//         ],
//         color: "accent",
//         bgGradient: "from-accent/10 to-accent/5",
//     },
//     {
//         icon: Target,
//         title: "Performance Marketing Teams",
//         tagline: "I need proof, not guesses.",
//         points: [
//             "Optimise campaigns based on their direct impact on sales and customer value",
//             "True ROAS visibility",
//             "Cleaner reporting",
//         ],
//         color: "brand-green",
//         bgGradient: "from-brand-green/10 to-brand-green/5",
//     },
//     {
//         icon: TrendingUp,
//         title: "Ecommerce & Growth Leaders",
//         tagline: "I need the full picture to make decisions.",
//         points: [
//             "Access a unified view of performance to guide budget allocation and growth strategy",
//             "Cross-platform consistency",
//             "Faster experimentation loops",
//         ],
//         color: "brand-amber",
//         bgGradient: "from-brand-amber/10 to-brand-amber/5",
//     },
//     {
//         icon: Users,
//         title: "Agencies Managing Ecommerce",
//         tagline: "I need clients to trust the numbers.",
//         points: [
//             "Deliver transparent, revenue-focused reporting that strengthens client relationships",
//             "Unified client dashboards",
//             "Clear performance storytelling",
//         ],
//         color: "brand-coral",
//         bgGradient: "from-brand-coral/10 to-brand-coral/5",
//     },
// ];

// const UseCasesSection = () => {
//     const { ref: sectionRef, isInView } = useInView({ threshold: 0.1 });

//     return (
//         <section id="use-cases" className="bg-dark-section py-24 lg:py-32 relative overflow-hidden">
//             <div className="absolute inset-0 bg-hero-pattern opacity-30" />

//             <div className="container mx-auto px-6 relative z-10">
//                 <div
//                     ref={sectionRef}
//                     className={`max-w-3xl mx-auto text-center mb-16 ${isInView ? "animate-fade-in" : "opacity-0"}`}
//                 >
//                     <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
//                         Use Cases
//                     </span>
//                     <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
//                         Supporting ecommerce teams at{" "}
//                         <span className="text-gradient">every growth stage.</span>
//                     </h2>
//                     <p className="text-lg text-primary-foreground/70">
//                         Who Parallels is built for.
//                     </p>
//                 </div>

//                 <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
//                     {useCases.map((useCase, index) => (
//                         <div
//                             key={index}
//                             className={`group relative ${isInView ? "animate-fade-in" : "opacity-0"}`}
//                             style={{ animationDelay: `${0.1 + index * 0.1}s` }}
//                         >
//                             <div className={`glass-dark rounded-2xl p-8 h-full border border-primary-foreground/10 group-hover:border-${useCase.color}/30 transition-all duration-300 hover-lift overflow-hidden`}>
//                                 {/* Background gradient */}
//                                 <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${useCase.bgGradient} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />

//                                 <div className="relative z-10">
//                                     {/* Icon */}
//                                     <div className={`w-14 h-14 rounded-xl bg-${useCase.color}/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
//                                         <useCase.icon size={28} className={`text-${useCase.color}`} />
//                                     </div>

//                                     <h3 className="text-xl font-bold text-primary-foreground mb-2">{useCase.title}</h3>
//                                     <p className="text-primary-foreground/60 italic mb-6 text-sm">"{useCase.tagline}"</p>

//                                     <ul className="space-y-3">
//                                         {useCase.points.map((point, idx) => (
//                                             <li key={idx} className="flex items-start gap-3">
//                                                 <div className={`w-1.5 h-1.5 rounded-full bg-${useCase.color} mt-2 flex-shrink-0`} />
//                                                 <span className="text-sm text-primary-foreground/70">{point}</span>
//                                             </li>
//                                         ))}
//                                     </ul>
//                                 </div>
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </section>
//     );
// };

// export default UseCasesSection;
