import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const FinalCTASection = () => {
    const { ref: sectionRef, isInView } = useInView({ threshold: 0.2 });

    return (
        <section className="relative py-24 lg:py-32 overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-accent/30" />
            <div className="absolute inset-0 bg-mesh-gradient opacity-50" />

            {/* Animated orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-green/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(hsl(var(--primary-foreground) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground) / 0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }} />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div
                    ref={sectionRef}
                    className={`max-w-3xl mx-auto text-center ${isInView ? "animate-fade-in" : "opacity-0"}`}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 mb-8">
                        <Sparkles size={14} className="text-accent" />
                        <span className="text-sm font-medium text-primary-foreground">Ready to transform your analytics?</span>
                    </div>

                    <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
                        Build growth strategies on{" "}
                        <span className="text-gradient">aligned data.</span>
                    </h2>

                    <p className="text-lg md:text-xl text-primary-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Parallels helps ecommerce teams make confident, revenue-focused decisions by connecting marketing activity with real business outcomes.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            size="lg"
                            className="bg-primary-foreground text-black hover:bg-primary-foreground/90 gap-2 hover:shadow-primary-foreground/25 transition-all group text-lg px-8"
                        >
                            Request a Demo
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                            size="lg"
                            className="bg-accent-gradient text-primary-foreground hover:opacity-90 transition-all hover:shadow-accent/25 text-lg px-8"
                        >
                            Join Early Access Program
                        </Button>
                    </div>

                    {/* Trust indicators */}
                    <div className="flex items-center justify-center gap-8 mt-12 pt-12 border-t border-primary-foreground/10">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary-foreground">5 min</div>
                            <div className="text-sm text-primary-foreground/50">Setup time</div>
                        </div>
                        <div className="w-px h-10 bg-primary-foreground/10" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary-foreground">No code</div>
                            <div className="text-sm text-primary-foreground/50">Required</div>
                        </div>
                        <div className="w-px h-10 bg-primary-foreground/10" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary-foreground">Free</div>
                            <div className="text-sm text-primary-foreground/50">Trial</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FinalCTASection;
