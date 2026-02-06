import { Quote, Star } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const testimonials = [
    {
        quote: "We see exactly which campaigns are driving revenue. The correlation engine is a game-changer for scaling decisions.",
        author: "Performance Marketing Lead",
        company: "DTC Fashion Brand",
        rating: 5,
    },
    {
        quote: "We've cut our reporting time in half. The unified dashboard gives our entire team the same view of performance.",
        // quote: "We've cut our reporting time in half. The unified dashboard instantly gives our entire team the exact same view of real-time performance.",
        author: "Head of Growth",
        company: "Shopify Plus Brand",
        rating: 5,
    },
    {
        quote: "Client reporting used to be a nightmare. Now we deliver insights that actually build trust and drive results.",
        author: "Agency Director",
        company: "Ecommerce Agency",
        rating: 5,
    },
];

const TrustSection = () => {
    const { ref: sectionRef, isInView } = useInView({ threshold: 0.1 });

    return (
        <section className="bg-section-gradient py-24 lg:py-32 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/5 rounded-full blur-3xl" />

            <div className="container mx-auto px-6 relative z-10">
                <div
                    ref={sectionRef}
                    className={`max-w-3xl mx-auto text-center mb-16 ${isInView ? "animate-fade-in" : "opacity-0"}`}
                >
                    <span className="inline-block text-accent-foreground text-sm font-semibold tracking-wider uppercase mb-4">
                        Testimonials
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                        Developed with{" "}
                        <span className="text-gradient">ecommerce teams.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Built by a team with deep ecommerce and analytics experience. Currently in private beta with select brands.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className={`group ${isInView ? "animate-fade-in" : "opacity-0"}`}
                            style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                        >
                            <div className="bg-card border border-border rounded-2xl p-8 h-full card-hover relative overflow-hidden">
                                {/* Decorative gradient */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="relative z-10">
                                    {/* Quote icon */}
                                    <div className="w-12 h-12 rounded-xl bg-accent-foreground/10 flex items-center justify-center mb-6">
                                        <Quote size={24} className="text-accent-foreground" />
                                    </div>

                                    {/* Rating */}
                                    <div className="flex gap-1 mb-4">
                                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                                            <Star key={i} size={16} className="text-brand-amber fill-brand-amber" />
                                        ))}
                                    </div>

                                    <p className="text-foreground mb-6 leading-relaxed">
                                        "{testimonial.quote}"
                                    </p>

                                    <div className="border-t border-border pt-6">
                                        <p className="font-semibold text-foreground">{testimonial.author}</p>
                                        <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Beta badge */}
                {/* <div className="text-center mt-12">
                    <div className="inline-flex items-center gap-3 bg-accent/10 border border-accent/20 rounded-full px-6 py-3">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-sm font-medium text-accent">Currently in private beta with select ecommerce teams</span>
                    </div>
                </div> */}
                <div className="text-center mt-12">
                    <div className="inline-flex items-center gap-3 bg-brand-blue/10 border border-brand-blue/20 rounded-full px-6 py-3">
                        {/* Added flex-shrink-0 here to prevent squashing */}
                        <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse flex-shrink-0" />

                        <span className="text-sm font-medium text-brand-blue text-left">
                            Currently in private beta with select ecommerce teams
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TrustSection;
