import { AlertCircle, TrendingDown, Clock, Link2Off, ArrowRight, TrendingUp, BarChart3, ShoppingCart, Zap } from "lucide-react";
import { useInView } from "@/hooks/useInView";

// Platform Logo Components
const MetaLogo = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
);

const GA4Logo = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M22.84 2.9992v17.984c0 .5521-.4479 1-1 1h-2.9861c-.5521 0-1-.4479-1-1V2.9992c0-.552.4479-1 1-1h2.9861c.5521 0 1 .448 1 1z" />
        <path d="M6.1519 21.9992c-2.2091 0-4-1.7909-4-4 0-2.2092 1.7909-4 4-4 2.2092 0 4 1.7908 4 4 0 2.2091-1.7908 4-4 4z" />
        <path d="M17.8481 13.1992c-.7416 0-1.3861-.4141-1.7147-1.0229L7.3974 2.8942c-.5066-.9382.1672-2.0929 1.2306-2.1049.4189-.0047.8318.1351 1.1693.4162l8.7461 7.2863c.5282.4399.831 1.0909.831 1.7854v.922c0 1.1046-.8954 2-2 2h-.5263z" />
    </svg>
);

const ShopifyLogo = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M15.337 3.415c-.022-.146-.134-.238-.268-.252-.134-.014-2.96-.219-2.96-.219s-1.97-1.964-2.188-2.179c-.217-.216-.64-.152-.805-.103-.022 0-.43.132-1.09.342C7.526.489 6.9.133 6.167.133 4.525.133 3.666 1.728 3.315 3.056c-.955.296-1.629.504-1.717.534-.534.168-.55.186-.62.69C.909 4.74 0 12.47 0 12.47l11.281 2.47 6.106-1.474s-2.028-9.903-2.05-10.051z" />
    </svg>
);

const challenges = [
    {
        icon: AlertCircle,
        title: "Inconsistent metrics across platforms",
        description: "Meta shows one story, GA4 another, and Shopify something entirely different.",
    },
    {
        icon: Link2Off,
        title: "Limited visibility into the full customer journey",
        description: "Understanding how customers move from discovery to purchase remains fragmented.",
    },
    {
        icon: Clock,
        title: "Time-intensive reporting processes",
        description: "Hours spent exporting, cleaning, and reconciling data from multiple sources.",
    },
    {
        icon: TrendingDown,
        title: "Difficulty connecting marketing to sales",
        description: "Linking advertising spend to actual revenue outcomes is often unclear.",
    },
];

const questions = [
    "Which channels are contributing most effectively to revenue?",
    "How do marketing efforts influence customer purchasing behaviour?",
    "Where should budgets be allocated for efficient growth?",
];

const DataChallengeSection = () => {
    const { ref: sectionRef, isInView } = useInView({ threshold: 0.1 });
    const { ref: cardsRef, isInView: cardsInView } = useInView({ threshold: 0.1 });

    return (
        <section className="bg-section-gradient py-24 lg:py-32 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-accent/5 to-transparent" />
                <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-radial from-brand-coral/5 to-transparent" />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div
                    ref={sectionRef}
                    className={`max-w-3xl mx-auto text-center mb-16 ${isInView ? "animate-fade-in" : "opacity-0"}`}
                >
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                        Modern ecommerce requires{" "}
                        <span className="text-gradient">aligned data.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Ecommerce teams rely on multiple platforms to drive growth — advertising platforms to acquire customers, analytics tools to track behaviour, and ecommerce platforms to process revenue. However, when these systems operate independently, it becomes difficult to answer key questions.
                    </p>
                </div>

                {/* Enhanced Visual Split - Before/After */}
                <div className="max-w-6xl mx-auto mb-20">
                    <div className="grid lg:grid-cols-2 gap-8 items-stretch">
                        {/* Fragmented Side - Without Parallels */}
                        <div className={`relative ${isInView ? "animate-fade-in" : "opacity-0"}`} style={{ animationDelay: "0.2s" }}>
                            <div className="bg-card border border-brand-coral/30 rounded-2xl p-8 relative overflow-hidden h-full group hover:border-brand-coral/50 transition-all">
                                {/* Glitch effect overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-coral/5 to-transparent opacity-50" />
                                <div className="absolute top-0 right-0 w-40 h-40 bg-brand-coral/10 rounded-full blur-3xl animate-pulse" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-3 h-3 rounded-full bg-brand-coral animate-pulse" />
                                        <h3 className="text-lg font-semibold text-foreground">Without unified data</h3>
                                    </div>

                                    {/* Fragmented Data Visualization */}
                                    <div className="space-y-4">
                                        {/* Scattered platform boxes with disconnect animation */}
                                        <div className="flex gap-3 items-center">
                                            <div className="flex-1 p-4 bg-[#1877F2]/10 rounded-xl border border-[#1877F2]/20 opacity-60 group-hover:opacity-80 transition-all transform group-hover:-translate-x-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MetaLogo className="w-4 h-4 text-[#1877F2]" />
                                                    <span className="text-xs font-medium text-[#1877F2]">Meta Pixel</span>
                                                </div>
                                                <div className="h-8 bg-[#1877F2]/20 rounded flex items-end p-1 gap-0.5">
                                                    {[30, 50, 40, 60, 45].map((h, i) => (
                                                        <div key={i} className="flex-1 bg-[#1877F2]/50 rounded-t" style={{ height: `${h}%` }} />
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">Shows: 2,400 conversions</p>
                                            </div>

                                            <div className="flex flex-col gap-1 opacity-30">
                                                <div className="w-4 h-0.5 bg-brand-coral" />
                                                <div className="w-4 h-0.5 bg-brand-coral animate-pulse" />
                                            </div>

                                            <div className="flex-1 p-4 bg-[#F9AB00]/10 rounded-xl border border-[#F9AB00]/20 opacity-60 group-hover:opacity-80 transition-all transform group-hover:translate-x-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <GA4Logo className="w-4 h-4 text-[#F9AB00]" />
                                                    <span className="text-xs font-medium text-[#F9AB00]">GA4</span>
                                                </div>
                                                <div className="h-8 bg-[#F9AB00]/20 rounded flex items-end p-1 gap-0.5">
                                                    {[45, 35, 55, 40, 50].map((h, i) => (
                                                        <div key={i} className="flex-1 bg-[#F9AB00]/50 rounded-t" style={{ height: `${h}%` }} />
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">Shows: 1,800 conversions</p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-[#96BF48]/10 rounded-xl border border-[#96BF48]/20 opacity-60 group-hover:opacity-80 transition-all transform group-hover:translate-y-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ShopifyLogo className="w-4 h-4 text-[#96BF48]" />
                                                <span className="text-xs font-medium text-[#96BF48]">Shopify</span>
                                            </div>
                                            <div className="h-8 bg-[#96BF48]/20 rounded flex items-end p-1 gap-0.5">
                                                {[55, 40, 65, 50, 70].map((h, i) => (
                                                    <div key={i} className="flex-1 bg-[#96BF48]/50 rounded-t" style={{ height: `${h}%` }} />
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">Shows: 1,234 orders</p>
                                        </div>

                                        {/* Confusion indicators */}
                                        <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                                            <div className="flex items-center gap-2 text-brand-coral">
                                                <AlertCircle size={16} className="animate-pulse" />
                                                <span className="text-xs font-medium">Data mismatch detected</span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-brand-coral font-medium flex items-center gap-2">
                                            <span className="inline-block w-1 h-1 rounded-full bg-brand-coral animate-pulse" />
                                            Disconnected. Conflicting. Time-consuming.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Arrow connector for desktop */}
                        <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <div className="w-16 h-16 rounded-full bg-accent-gradient flex items-center justify-center shadow-lg animate-pulse">
                                <ArrowRight size={24} className="text-primary-foreground" />
                            </div>
                        </div>

                        {/* Unified Side - With Parallels */}
                        <div className={`relative ${isInView ? "animate-fade-in" : "opacity-0"}`} style={{ animationDelay: "0.4s" }}>
                            <div className="bg-card border border-accent/30 rounded-2xl p-8 relative overflow-hidden glow-blue h-full group hover:border-accent/50 transition-all">
                                {/* Glow effects */}
                                <div className="absolute top-0 right-0 w-40 h-40 bg-accent/15 rounded-full blur-3xl animate-float" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-green/10 rounded-full blur-2xl animate-float" style={{ animationDelay: "1s" }} />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-3 h-3 rounded-full bg-brand-green animate-pulse" />
                                        <h3 className="text-lg font-semibold text-foreground">With Parallels</h3>
                                        <div className="ml-auto flex items-center gap-1 px-2 py-1 bg-brand-green/10 rounded-full">
                                            <Zap size={12} className="text-brand-green" />
                                            <span className="text-xs text-brand-green font-medium">Live</span>
                                        </div>
                                    </div>

                                    {/* Unified Dashboard Preview */}
                                    <div className="space-y-4">
                                        {/* Platform logos flowing into unified view */}
                                        <div className="flex items-center justify-center gap-3 py-3 bg-accent/5 rounded-xl border border-accent/20">
                                            <div className="w-8 h-8 rounded-lg bg-[#1877F2]/20 flex items-center justify-center animate-float" style={{ animationDelay: "0s" }}>
                                                <MetaLogo className="w-4 h-4 text-[#1877F2]" />
                                            </div>
                                            <div className="flex gap-1">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                                                ))}
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-[#F9AB00]/20 flex items-center justify-center animate-float" style={{ animationDelay: "0.2s" }}>
                                                <GA4Logo className="w-4 h-4 text-[#F9AB00]" />
                                            </div>
                                            <div className="flex gap-1">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" style={{ animationDelay: `${i * 0.2 + 0.3}s` }} />
                                                ))}
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-[#96BF48]/20 flex items-center justify-center animate-float" style={{ animationDelay: "0.4s" }}>
                                                <ShopifyLogo className="w-4 h-4 text-[#96BF48]" />
                                            </div>
                                        </div>

                                        {/* Unified metrics */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 bg-accent/10 rounded-xl border border-accent/20 text-center group-hover:scale-105 transition-transform">
                                                <BarChart3 size={16} className="text-accent mx-auto mb-1" />
                                                <p className="text-lg font-bold text-foreground">$124K</p>
                                                <p className="text-xs text-muted-foreground">Revenue</p>
                                            </div>
                                            <div className="p-3 bg-brand-green/10 rounded-xl border border-brand-green/20 text-center group-hover:scale-105 transition-transform" style={{ transitionDelay: "0.1s" }}>
                                                <TrendingUp size={16} className="text-brand-green mx-auto mb-1" />
                                                <p className="text-lg font-bold text-foreground">4.2x</p>
                                                <p className="text-xs text-muted-foreground">ROAS</p>
                                            </div>
                                            <div className="p-3 bg-brand-amber/10 rounded-xl border border-brand-amber/20 text-center group-hover:scale-105 transition-transform" style={{ transitionDelay: "0.2s" }}>
                                                <ShoppingCart size={16} className="text-brand-amber mx-auto mb-1" />
                                                <p className="text-lg font-bold text-foreground">1,234</p>
                                                <p className="text-xs text-muted-foreground">Orders</p>
                                            </div>
                                        </div>

                                        {/* Animated unified chart */}
                                        <div className="h-20 bg-gradient-to-r from-accent/10 via-brand-green/10 to-brand-amber/10 rounded-xl p-3 relative overflow-hidden">
                                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                                <defs>
                                                    <linearGradient id="unifiedChartLine" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
                                                        <stop offset="50%" stopColor="hsl(160, 84%, 39%)" />
                                                        <stop offset="100%" stopColor="hsl(38, 92%, 50%)" />
                                                    </linearGradient>
                                                </defs>
                                                <path
                                                    d="M 0 60 Q 40 50 80 45 T 160 35 T 240 25 T 320 20 T 400 15"
                                                    fill="none"
                                                    stroke="url(#unifiedChartLine)"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    style={{
                                                        strokeDasharray: 500,
                                                        strokeDashoffset: 500,
                                                        animation: "drawLine 2s ease-out forwards"
                                                    }}
                                                />
                                            </svg>
                                            <div className="absolute bottom-2 right-3 flex items-center gap-1 text-brand-green">
                                                <TrendingUp size={12} />
                                                <span className="text-xs font-medium">+18.2%</span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-brand-green font-medium flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                                            Connected. Aligned. Actionable.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Questions Box */}
                <div className="max-w-3xl mx-auto mb-16">
                    <div className="bg-black rounded-2xl p-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-mesh-gradient opacity-30" />
                        <div className="relative z-10">
                            <h3 className="text-lg font-semibold text-primary-foreground mb-6">Key questions teams struggle to answer:</h3>
                            <ul className="space-y-4">
                                {questions.map((question, index) => (
                                    <li
                                        key={index}
                                        className={`flex items-center gap-4 text-primary-foreground/80 ${cardsInView ? "animate-fade-in" : "opacity-0"}`}
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <span className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                                            {index + 1}
                                        </span>
                                        <span className="text-left">{question}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Challenges Grid */}
                <div
                    ref={cardsRef}
                    className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto"
                >
                    {challenges.map((challenge, index) => (
                        <div
                            key={index}
                            className={`bg-card border border-border rounded-xl p-6 card-hover group ${cardsInView ? "animate-fade-in" : "opacity-0"
                                }`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-brand-coral/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-brand-coral/20 transition-all">
                                    <challenge.icon size={24} className="text-brand-coral" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2 group-hover:text-brand-coral transition-colors">{challenge.title}</h4>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{challenge.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Transition Statement */}
                <div className="max-w-2xl mx-auto text-center mt-16">
                    <p className="text-xl md:text-2xl text-foreground font-medium">
                        Parallels brings these data sources together to create{" "}
                        <span className="text-gradient">clarity and alignment.</span>
                    </p>
                </div>
            </div>

            {/* Inline keyframes */}
            <style>{`
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
        </section>
    );
};

export default DataChallengeSection;
