import { Plug, RefreshCw, Cpu, BarChart, Zap } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const steps = [
    {
        icon: Plug,
        number: "01",
        title: "Connect your platforms",
        description: "Link Shopify, Meta, and GA4 with a few clicks. No engineering required.",
        color: "accent",
    },
    {
        icon: RefreshCw,
        number: "02",
        title: "Data syncs automatically",
        description: "Your data is pulled and structured in real-time, always up to date.",
        color: "brand-green",
    },
    {
        icon: Cpu,
        number: "03",
        title: "Parallels analyses relationships",
        description: "Our engine correlates marketing activity with revenue outcomes.",
        color: "brand-amber",
    },
    {
        icon: BarChart,
        number: "04",
        title: "Insights appear in your dashboard",
        description: "See performance signals, trends, and opportunities instantly.",
        color: "brand-coral",
    },
];

const colorStyles = {
    accent: {
        bg: "bg-accent-foreground/10",
        border: "border-accent-foreground/30",
        text: "text-accent-foreground",
    },
    "brand-green": {
        bg: "bg-brand-green/10",
        border: "border-brand-green/30",
        text: "text-brand-green",
    },
    "brand-amber": {
        bg: "bg-brand-amber/10",
        border: "border-brand-amber/30",
        text: "text-brand-amber",
    },
    "brand-coral": {
        bg: "bg-brand-coral/10",
        border: "border-brand-coral/30",
        text: "text-brand-coral",
    },
};


const HowItWorksSection = () => {
    const { ref: sectionRef, isInView } = useInView({ threshold: 0.1 });

    return (
        <section id="how-it-works" className="bg-section-gradient py-24 lg:py-32 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-green/5 rounded-full blur-3xl" />

            <div className="container mx-auto px-6 relative z-10">
                <div
                    ref={sectionRef}
                    className={`max-w-3xl mx-auto text-center mb-16 ${isInView ? "animate-fade-in" : "opacity-0"}`}
                >
                    {/* <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
                        How It Works.....
                    </span> */}
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-medium mb-4">
                        <Zap size={14} />
                        How It Works
                    </span>

                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                        From connection to{" "}
                        <span className="text-gradient">insight.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        No engineering. No setup headaches.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="relative">

                        {/* <div className="absolute left-8 md:left-10 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent via-brand-green to-brand-coral hidden md:block" /> */}

                        <div className="space-y-6 md:space-y-0">
                            {steps.map((step, index) => (
                                <div
                                    key={index}
                                    className={`relative flex gap-6 md:gap-10 ${isInView ? "animate-fade-in" : "opacity-0"}`}
                                    style={{ animationDelay: `${0.2 + index * 0.15}s` }}
                                >
                                    {/* Step Number & Icon */}
                                    <div className="relative z-10 flex-shrink-0">
                                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl ${colorStyles[step.color as keyof typeof colorStyles].bg} border-2 ${colorStyles[step.color as keyof typeof colorStyles].border} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <step.icon size={28} className={`${colorStyles[step.color as keyof typeof colorStyles].text}`} />
                                        </div>

                                        {/* Vertical line between icons */}
                                        {index < steps.length - 1 && (
                                            <div className="mx-auto hidden md:block w-0.5 h-32 bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/10 " />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pb-12 md:pb-16">
                                        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 card-hover">
                                            <div className="flex items-center gap-4 mb-4">
                                                <span className={`text-sm font-mono ${colorStyles[step.color as keyof typeof colorStyles].text} ${colorStyles[step.color as keyof typeof colorStyles].bg} px-3 py-1 rounded-full`}>
                                                    Step {step.number}
                                                </span>
                                                <h3 className={`text-xl font-bold  ${colorStyles[step.color as keyof typeof colorStyles].text}`}>{step.title}</h3>
                                            </div>
                                            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary badge */}
                    <div className="text-center mt-8">
                        <div className="inline-flex items-center gap-3 bg-brand-green/10 border border-brand-green/20 rounded-full px-6 py-3">
                            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                            <span className="text-sm font-medium text-brand-green">Average setup time: Under 5 minutes</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorksSection;
