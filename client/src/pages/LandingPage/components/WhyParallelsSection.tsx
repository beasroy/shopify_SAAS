import { Check, X, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const comparisons = [
    {
        feature: "Cross-platform consistency",
        traditional: "Limited",
        parallels: "Strong",
        isBoolean: false,
    },
    {
        feature: "Revenue-centric insights",
        traditional: "Partial",
        parallels: "Comprehensive",
        isBoolean: false,
    },
    {
        feature: "Ecommerce-specific focus",
        traditional: "Generalised",
        parallels: "Purpose-built",
        isBoolean: false,
    },
    {
        feature: "Actionable intelligence",
        traditional: "Manual",
        parallels: "Automated",
        isBoolean: false,
    },
    {
        feature: "Raw data exports required",
        traditional: true,
        parallels: false,
        isBoolean: true,
    },
    {
        feature: "Manual reconciliation",
        traditional: true,
        parallels: false,
        isBoolean: true,
    },
];

const WhyParallelsSection = () => {
    const { ref: sectionRef, isInView } = useInView({ threshold: 0.1 });

    return (
        <section id="why-parallels" className="bg-dark-section py-24 lg:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-mesh-gradient opacity-30" />

            <div className="container mx-auto px-6 relative z-10">
                <div
                    ref={sectionRef}
                    className={`max-w-3xl mx-auto text-center mb-16 ${isInView ? "animate-fade-in" : "opacity-0"}`}
                >
                    <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
                        Comparison
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
                        Built specifically for{" "}
                        <span className="text-gradient">ecommerce growth.</span>
                    </h2>
                    <p className="text-lg text-primary-foreground/70">
                        Why teams choose Parallels.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="glass-dark rounded-2xl overflow-hidden border border-primary-foreground/10">
                        {/* Table Header */}
                        <div className="grid grid-cols-3 bg-primary-foreground/5 border-b border-primary-foreground/10">
                            <div className="p-4 md:p-6">
                                <span className="font-semibold text-primary-foreground">Capability</span>
                            </div>
                            <div className="p-4 md:p-6 text-center border-x border-primary-foreground/10">
                                <span className="font-semibold text-primary-foreground/50">Traditional Tools</span>
                            </div>
                            <div className="p-4 md:p-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Sparkles size={16} className="text-accent" />
                                    <span className="font-semibold text-accent">Parallels</span>
                                </div>
                            </div>
                        </div>

                        {/* Table Body */}
                        {comparisons.map((row, index) => (
                            <div
                                key={index}
                                className={`grid grid-cols-3 ${index !== comparisons.length - 1 ? "border-b border-primary-foreground/10" : ""
                                    } ${isInView ? "animate-fade-in" : "opacity-0"}`}
                                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                            >
                                <div className="p-4 md:p-6 flex items-center">
                                    <span className="text-sm md:text-base text-primary-foreground">{row.feature}</span>
                                </div>
                                <div className="p-4 md:p-6 flex items-center justify-center border-x border-primary-foreground/10">
                                    {row.isBoolean ? (
                                        row.traditional ? (
                                            <div className="w-8 h-8 rounded-full bg-brand-coral/20 flex items-center justify-center">
                                                <X size={16} className="text-brand-coral" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center">
                                                <Check size={16} className="text-brand-green" />
                                            </div>
                                        )
                                    ) : (
                                        <span className="text-sm md:text-base text-primary-foreground/50">{row.traditional as string}</span>
                                    )}
                                </div>
                                <div className="p-4 md:p-6 flex items-center justify-center bg-accent/5">
                                    {row.isBoolean ? (
                                        !row.parallels ? (
                                            <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center">
                                                <Check size={16} className="text-brand-green" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-brand-coral/20 flex items-center justify-center">
                                                <X size={16} className="text-brand-coral" />
                                            </div>
                                        )
                                    ) : (
                                        <span className="text-sm md:text-base font-medium text-accent">{row.parallels as string}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhyParallelsSection;
