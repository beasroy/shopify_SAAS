import { useState, useRef } from "react";
import {
    LayoutDashboard, Calendar, Gauge, Calculator, Image, Eye, BarChart3,
    ShoppingCart, FileText, Target, Search, Package, Activity,
    TrendingUp, Sparkles, ChevronLeft, ChevronRight
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";

const colorMap = {
    'accent': 'text-brand-blue border-brand-blue bg-brand-blue/10',
    'brand-green': 'text-brand-green border-brand-green bg-brand-green/10',
    'brand-amber': 'text-brand-amber border-brand-amber bg-brand-amber/10',
    'brand-coral': 'text-brand-coral border-brand-coral bg-brand-coral/10',
};

const features = [
    {
        icon: LayoutDashboard,
        title: "Marketing Insights",
        bullets: [
            "Unified view across Shopify, Meta & Google",
            "2 years historical data",
            "Identify top & underperforming channels"
        ],
        color: "accent",
    },
    {
        icon: Calendar,
        title: "Festival Calendar",
        bullets: [
            "Add regional & special festivals",
            "See sales spikes on hover",
            "Plan campaigns around key dates"
        ],
        color: "brand-amber",
    },
    {
        icon: Gauge,
        title: "Speed Insights",
        bullets: [
            "Analyze any URL performance",
            "LCP, FID, CLS metrics",
            "Find conversion bottlenecks"
        ],
        color: "brand-green",
    },
    {
        icon: Calculator,
        title: "D2C Calculator",
        bullets: [
            "Real-time EBITDA tracking",
            "Factor all costs & revenue",
            "True profitability insights"
        ],
        color: "accent",
    },
    {
        icon: Image,
        title: "Creative Library",
        bullets: [
            "Track all ad creatives",
            "Compare spend, ROAS, engagement",
            "Spot creative fatigue early"
        ],
        color: "brand-coral",
    },
    {
        icon: Eye,
        title: "Ad Market",
        bullets: [
            "Monitor competitor ads",
            "Track their strategies over time",
            "Stay ahead of trends"
        ],
        color: "brand-amber",
    },
    {
        icon: BarChart3,
        title: "Ad Metrics Dashboard",
        bullets: [
            "Meta & Google unified view",
            "Spend, ROAS, CTR, CPC",
            "Daily & monthly trends"
        ],
        color: "accent",
    },
    {
        icon: ShoppingCart,
        title: "E-commerce Metrics",
        bullets: [
            "Full funnel: Sessions → Purchase",
            "COD/Prepaid & returning customers",
            "Identify funnel drop-offs"
        ],
        color: "brand-green",
    },
    {
        icon: FileText,
        title: "Conversion Reports",
        bullets: [
            "Segment by demographics & device",
            "Channel & campaign analysis",
            "Understand who converts"
        ],
        color: "brand-coral",
    },
    {
        icon: Target,
        title: "Meta Ads Analytics",
        bullets: [
            "Campaign-level insights",
            "Interest & demographic breakdown",
            "Placement performance"
        ],
        color: "accent",
    },
    {
        icon: Search,
        title: "Google Ads Analytics",
        bullets: [
            "Search terms & keywords",
            "Cost per conversion tracking",
            "Product-level performance"
        ],
        color: "brand-amber",
    },
    {
        icon: Package,
        title: "Product Analytics",
        bullets: [
            "Page & product performance",
            "Landing page analysis",
            "Top performers identification"
        ],
        color: "brand-green",
    },
    {
        icon: Activity,
        title: "Bounce Rate Analytics",
        bullets: [
            "Monthly bounce trends",
            "Collection & product segmentation",
            "Optimize user experience"
        ],
        color: "brand-coral",
    },
];

// Compact visual components for each feature type
const FeatureVisual = ({ index, isActive }: { index: number; isActive: boolean }) => {
    const feature = features[index];
    const colorClass = feature.color === "accent" ? "brand-blue" :
        feature.color === "brand-green" ? "brand-green" :
            feature.color === "brand-amber" ? "brand-amber" : "brand-coral";

    const colorClassBG = "bg-" + colorClass;
    const colorClassText = "text-" + colorClass;
    return (
        <div className={`w-full h-full flex items-center justify-center transition-all duration-500 ${isActive ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
            <div className="relative w-full">
                {/* Glow effect */}
                <div className={`absolute inset-0 ${colorClassBG}/20 rounded-3xl blur-3xl`} />

                {/* Main visual card - larger for desktop */}
                <div className="relative bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-8">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-xl ${colorClassBG}/20 flex items-center justify-center`}>
                            <feature.icon className={`w-7 h-7 ${colorClassText}`} />
                        </div>
                        <h4 className="text-2xl font-bold text-foreground">{feature.title}</h4>
                    </div>

                    {/* Dynamic visualization based on feature type - larger */}
                    <div className="min-h-[180px]">
                        <FeatureChart index={index} colorClass={colorClass} isActive={isActive} />
                    </div>

                    {/* Bullet points */}
                    <div className="mt-6 space-y-3">
                        {feature.bullets.map((bullet, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-3"
                                style={{
                                    opacity: isActive ? 1 : 0,
                                    transform: isActive ? "translateX(0)" : "translateX(-10px)",
                                    transition: `all 0.4s ease-out ${i * 0.1}s`
                                }}
                            >
                                <div className={`w-2 h-2 rounded-full bg-${colorClass} mt-2 flex-shrink-0`} />
                                <span className="text-base text-muted-foreground">{bullet}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Specific chart visualizations
const FeatureChart = ({ index, isActive }: { index: number; colorClass?: string; isActive: boolean }) => {
    // Different mini charts based on feature index
    const charts: Record<number, JSX.Element> = {
        0: ( // Marketing Insights - Platform bars
            <div className="flex items-end gap-3 h-24 px-2">
                {[
                    { label: "Meta", value: 85, color: "bg-[#1877F2]" },
                    { label: "Google", value: 65, color: "bg-[#F9AB00]" },
                    { label: "Shopify", value: 95, color: "bg-[#96BF48]" },
                ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-secondary/50 rounded-t-lg overflow-hidden h-20 flex items-end">
                            <div
                                className={`w-full ${bar.color} rounded-t-lg transition-all duration-700`}
                                style={{ height: isActive ? `${bar.value}%` : "0%", transitionDelay: `${i * 100}ms` }}
                            />
                        </div>
                        <span className="text-xs text-muted-foreground">{bar.label}</span>
                    </div>
                ))}
            </div>
        ),
        1: ( // Festival Calendar - Mini heatmap
            <div className="grid grid-cols-7 gap-1 p-2">
                {[...Array(21)].map((_, i) => {
                    const intensity = [6, 7, 13, 14, 20].includes(i) ? "bg-brand-amber" :
                        [5, 12, 19].includes(i) ? "bg-brand-amber/50" : "bg-secondary/50";
                    return (
                        <div
                            key={i}
                            className={`aspect-square rounded ${intensity} transition-all duration-300`}
                            style={{
                                opacity: isActive ? 1 : 0,
                                transform: isActive ? "scale(1)" : "scale(0.5)",
                                transitionDelay: `${i * 20}ms`
                            }}
                        />
                    );
                })}
            </div>
        ),
        2: ( // Speed Insights - Gauge
            <div className="flex justify-center py-2">
                <div className="relative w-28 h-16 overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
                        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" strokeLinecap="round" />
                        <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="hsl(var(--brand-green))"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={isActive ? "100 126" : "0 126"}
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                        <span className="text-lg font-bold text-brand-green">92</span>
                        <span className="text-xs text-muted-foreground block">Score</span>
                    </div>
                </div>
            </div>
        ),
        3: ( // D2C Calculator - Stacked bar
            <div className="space-y-2 py-2">
                {[
                    { label: "Revenue", value: 85, color: "bg-brand-green" },
                    { label: "Costs", value: 45, color: "bg-brand-coral" },
                    { label: "EBITDA", value: 40, color: "bg-accent" },
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">{item.label}</span>
                        <div className="flex-1 h-4 bg-secondary/50 rounded overflow-hidden">
                            <div
                                className={`h-full ${item.color} rounded transition-all duration-700`}
                                style={{ width: isActive ? `${item.value}%` : "0%", transitionDelay: `${i * 100}ms` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        ),
        4: ( // Creative Library - Grid cards
            <div className="grid grid-cols-3 gap-2 py-2">
                {[
                    { status: "Top", color: "bg-brand-green" },
                    { status: "Good", color: "bg-accent" },
                    { status: "Fatigue", color: "bg-brand-coral" },
                ].map((card, i) => (
                    <div
                        key={i}
                        className="aspect-video bg-secondary/50 rounded-lg border border-border/50 flex items-end p-1.5 transition-all duration-500"
                        style={{
                            opacity: isActive ? 1 : 0,
                            transform: isActive ? "translateY(0)" : "translateY(10px)",
                            transitionDelay: `${i * 100}ms`
                        }}
                    >
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${card.color} text-primary-foreground`}>{card.status}</span>
                    </div>
                ))}
            </div>
        ),
        5: ( // Ad Market - Competitor cards
            <div className="flex gap-2 py-2 overflow-hidden">
                {[1, 2, 3].map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-secondary/50 rounded-lg p-2 border border-border/50 transition-all duration-500"
                        style={{
                            opacity: isActive ? 1 : 0,
                            transform: isActive ? "translateX(0)" : "translateX(20px)",
                            transitionDelay: `${i * 100}ms`
                        }}
                    >
                        <div className="w-6 h-6 bg-brand-amber/30 rounded mb-2" />
                        <div className="h-1.5 bg-brand-amber/50 rounded w-full mb-1" />
                        <div className="h-1.5 bg-brand-amber/30 rounded w-2/3" />
                    </div>
                ))}
            </div>
        ),
        6: ( // Ad Metrics - Line chart
            <div className="h-20 relative py-2">
                <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <path
                        d={isActive ? "M 0 50 Q 30 45 50 35 T 100 30 T 150 20 T 200 15" : "M 0 50 L 200 50"}
                        fill="none"
                        stroke="hsl(var(--accent))"
                        strokeWidth="2"
                        className="transition-all duration-1000"
                    />
                    <path
                        d={isActive ? "M 0 55 Q 40 50 60 45 T 120 40 T 180 35 T 200 30" : "M 0 55 L 200 55"}
                        fill="none"
                        stroke="hsl(var(--brand-green))"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        className="transition-all duration-1000"
                    />
                </svg>
                <div className="absolute bottom-0 right-0 flex gap-3 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-accent" /> Meta</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-brand-green" /> Google</span>
                </div>
            </div>
        ),
        7: ( // E-commerce Metrics - Funnel
            <div className="flex flex-col items-center gap-1 py-2">
                {[
                    { label: "Sessions", width: "100%" },
                    { label: "ATC", width: "65%" },
                    { label: "Checkout", width: "40%" },
                    { label: "Purchase", width: "25%" },
                ].map((step, i) => (
                    <div
                        key={i}
                        className="h-5 bg-gradient-to-r from-accent to-brand-green rounded flex items-center justify-center transition-all duration-500"
                        style={{
                            width: isActive ? step.width : "0%",
                            transitionDelay: `${i * 100}ms`
                        }}
                    >
                        <span className="text-[9px] text-primary-foreground font-medium truncate px-1">{step.label}</span>
                    </div>
                ))}
            </div>
        ),
        8: ( // Conversion Reports - Segments
            <div className="grid grid-cols-2 gap-2 py-2">
                {["Age 25-34", "Mobile", "Instagram", "Female"].map((seg, i) => (
                    <div
                        key={i}
                        className="bg-secondary/50 rounded-lg p-2 border border-border/50 flex items-center justify-between transition-all duration-500"
                        style={{
                            opacity: isActive ? 1 : 0,
                            transitionDelay: `${i * 80}ms`
                        }}
                    >
                        <span className="text-xs text-muted-foreground">{seg}</span>
                        <span className="text-xs font-medium text-brand-coral">{(3.2 + i * 0.5).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        ),
        9: ( // Meta Ads - Campaign cards
            <div className="space-y-2 py-2">
                {["Prospecting", "Retargeting", "Lookalike"].map((camp, i) => (
                    <div
                        key={i}
                        className="bg-secondary/50 rounded-lg p-2 flex items-center justify-between transition-all duration-500"
                        style={{
                            opacity: isActive ? 1 : 0,
                            transform: isActive ? "translateX(0)" : "translateX(-10px)",
                            transitionDelay: `${i * 100}ms`
                        }}
                    >
                        <span className="text-xs text-foreground">{camp}</span>
                        <span className="text-xs font-medium text-accent-foreground/50">{(2.8 + i * 0.6).toFixed(1)}x ROAS</span>
                    </div>
                ))}
            </div>
        ),
        10: ( // Google Ads - Keywords
            <div className="space-y-2 py-2">
                {["brand shoes", "+running", "[sneakers online]"].map((kw, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-2 transition-all duration-500"
                        style={{
                            opacity: isActive ? 1 : 0,
                            transitionDelay: `${i * 100}ms`
                        }}
                    >
                        <span className="text-xs bg-brand-amber/20 text-brand-amber px-2 py-1 rounded font-mono">{kw}</span>
                        <div className="flex-1 h-1.5 bg-secondary/50 rounded overflow-hidden">
                            <div className="h-full bg-brand-amber rounded" style={{ width: `${80 - i * 15}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        ),
        11: ( // Product Analytics - Bar chart
            <div className="flex items-end gap-2 h-20 px-2 py-2">
                {["PDP 1", "PDP 2", "LP 1", "LP 2"].map((page, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-secondary/50 rounded-t-lg overflow-hidden h-16 flex items-end">
                            <div
                                className="w-full bg-brand-green rounded-t-lg transition-all duration-700"
                                style={{ height: isActive ? `${90 - i * 15}%` : "0%", transitionDelay: `${i * 80}ms` }}
                            />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{page}</span>
                    </div>
                ))}
            </div>
        ),
        12: ( // Bounce Rate - Trend line
            <div className="h-20 relative py-2">
                <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <path
                        d={isActive ? "M 0 20 Q 30 25 60 35 T 120 30 T 160 40 T 200 25" : "M 0 40 L 200 40"}
                        fill="none"
                        stroke="hsl(var(--brand-coral))"
                        strokeWidth="2"
                        className="transition-all duration-1000"
                    />
                </svg>
                <div className="absolute top-1 right-1 flex items-center gap-1 px-2 py-0.5 bg-brand-green/20 rounded">
                    <TrendingUp size={10} className="text-brand-green" />
                    <span className="text-[10px] text-brand-green">-12%</span>
                </div>
            </div>
        ),
    };

    return charts[index] || charts[0];
};

const FeaturesSection = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const { ref, isInView } = useInView({ threshold: 0.2, triggerOnce: true });
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToFeature = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 120;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section
            ref={ref}
            id="features"
            className="py-16 md:py-20 relative overflow-hidden bg-section-gradient"
        >
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-brand-green/5 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 relative">
                {/* Header */}
                <div className={`text-center mb-10 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    {/* <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
                        <Sparkles size={14} />
                        13 Powerful Features
                    </span> */}
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-medium mb-4">
                        <Sparkles size={14} />
                        13 Powerful Features
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                        Everything You Need to Scale
                    </h2>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        Comprehensive analytics suite for modern D2C brands
                    </p>
                </div>

                {/* Desktop Layout - Features on both sides, visual in center */}
                <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 lg:items-center">
                    {/* Left: First 7 features */}
                    {/* <div className="lg:col-span-3 space-y-1">
                        {features.slice(0, 7).map((feature, index) => {
                            const isActive = activeIndex === index;
                            const colorClass = feature.color === "accent" ? "accent" :
                                feature.color === "brand-green" ? "brand-green" :
                                    feature.color === "brand-amber" ? "brand-amber" : "brand-coral";

                            return (
                                <button
                                    key={index}
                                    onClick={() => setActiveIndex(index)}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-300 group ${isActive
                                        ? `bg-${colorClass}/10 border-l-2 border-${colorClass}`
                                        : "hover:bg-secondary/50 border-l-2 border-transparent"
                                        }`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${isActive ? `bg-${colorClass}/20` : "bg-secondary"
                                        }`}>
                                        <feature.icon className={`w-3.5 h-3.5 transition-colors ${isActive ? `text-${colorClass}` : "text-muted-foreground group-hover:text-foreground"
                                            }`} />
                                    </div>
                                    <span className={`text-sm font-medium transition-colors truncate ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                        }`}>
                                        {feature.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div> */}

                    {/* Left: First 7 features */}
                    <div className="lg:col-span-3 space-y-1">
                        {features.slice(0, 7).map((feature, index) => {
                            const isActive = activeIndex === index;
                            const activeStyles = colorMap[feature.color as keyof typeof colorMap] as string || colorMap['accent'];

                            return (
                                <button
                                    key={index}
                                    onClick={() => setActiveIndex(index)}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-300 group border-l-2 ${isActive ? activeStyles : "hover:bg-secondary/50 border-transparent text-muted-foreground"
                                        }`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${isActive ? "bg-current/20" : "bg-secondary"
                                        }`}>
                                        <feature.icon className={`w-3.5 h-3.5 ${isActive ? "" : "group-hover:text-foreground"}`} />
                                    </div>
                                    <span className={`text-sm font-medium transition-colors truncate ${isActive ? "text-foreground" : "group-hover:text-foreground"
                                        }`}>
                                        {feature.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Center: Large Visual Display */}
                    <div className="lg:col-span-6 relative min-h-[480px] flex items-center justify-center">
                        {features.map((_, index) => (
                            <div
                                key={index}
                                className={`absolute inset-0 flex items-center justify-center ${activeIndex === index ? "z-10" : "z-0 pointer-events-none"}`}
                            >
                                <FeatureVisual index={index} isActive={activeIndex === index} />
                            </div>
                        ))}
                    </div>

                    {/* Right: Last 6 features */}
                    <div className="lg:col-span-3 space-y-1">
                        {features.slice(7).map((feature, sliceIndex) => {
                            const index = sliceIndex + 7;
                            const isActive = activeIndex === index;
                            const colorClass = feature.color === "accent" ? "accent-foreground" :
                                feature.color === "brand-green" ? "brand-green" :
                                    feature.color === "brand-amber" ? "brand-amber" : "brand-coral";


                            return (
                                <button
                                    key={index}
                                    onClick={() => setActiveIndex(index)}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-300 group ${isActive
                                        ? `bg-${colorClass}/10 border-r-2 border-${colorClass}`
                                        : "hover:bg-secondary/50 border-r-2 border-transparent"
                                        }`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${isActive ? `bg-${colorClass}/20` : "bg-secondary"
                                        }`}>
                                        <feature.icon className={`w-3.5 h-3.5 transition-colors ${isActive ? `text-${colorClass}` : "text-muted-foreground group-hover:text-foreground"
                                            }`} />
                                    </div>
                                    <span className={`text-sm font-medium transition-colors truncate ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                        }`}>
                                        {feature.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                </div>

                {/* Mobile/Tablet Layout - Horizontal Tabs with Swipe */}
                <div className="lg:hidden">
                    {/* Horizontal scrollable tabs */}
                    <div className="relative mb-6">
                        <button
                            onClick={() => scrollToFeature('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-background/90 border border-border rounded-full flex items-center justify-center shadow-lg"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div
                            ref={scrollContainerRef}
                            className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-2 snap-x snap-mandatory"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {features.map((feature, index) => {
                                const isActive = activeIndex === index;
                                const colorClass = feature.color === "accent" ? "accent" :
                                    feature.color === "brand-green" ? "brand-green" :
                                        feature.color === "brand-amber" ? "brand-amber" : "brand-coral";

                                return (
                                    <button
                                        key={index}
                                        onClick={() => setActiveIndex(index)}
                                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 snap-center ${isActive
                                            ? `bg-${colorClass}/20 border border-${colorClass}/50`
                                            : "bg-secondary/50 border border-transparent"
                                            }`}
                                    >
                                        <feature.icon className={`w-4 h-4 ${isActive ? `text-${colorClass}` : "text-muted-foreground"}`} />
                                        <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-foreground" : "text-muted-foreground"
                                            }`}>
                                            {feature.title}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => scrollToFeature('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-background/90 border border-border rounded-full flex items-center justify-center shadow-lg"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Swipeable visual area */}
                    <Carousel
                        opts={{
                            align: "center",
                            loop: true,
                        }}
                        className="w-full"
                    >
                        <CarouselContent>
                            {features.map((_, index) => (
                                <CarouselItem key={index} className="basis-full">
                                    <div
                                        onClick={() => setActiveIndex(index)}
                                        className="px-4"
                                    >
                                        <FeatureVisual index={index} isActive={true} />
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>

                    {/* Dot indicators */}
                    <div className="flex justify-center gap-1.5 mt-4">
                        {features.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all ${activeIndex === index ? "bg-accent w-6" : "bg-muted-foreground/30"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
