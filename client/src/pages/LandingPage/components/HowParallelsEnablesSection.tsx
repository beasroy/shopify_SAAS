import { Database, GitBranch, Lightbulb, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const pillars = [
  {
    icon: Database,
    number: "01",
    title: "Data Unification",
    // description: "Parallels automatically consolidates data from Meta Pixel, GA4, and Shopify into a single, structured environment.",
    description: "Parallels automatically consolidates data from Meta Pixel, GA4, and Shopify into a single, structured, analytics-ready unified workspace",
    outcome: "Teams work from consistent, reliable performance metrics across all channels.",
    color: "accent",
    gradient: "from-accent to-accent/60",
  },
  {
    icon: GitBranch,
    number: "02",
    title: "Revenue Correlation",
    description: "Marketing activity is mapped directly to ecommerce outcomes, allowing teams to understand how campaigns influence revenue over time.",
    outcome: "Clear visibility into the relationship between spend, traffic quality, and sales performance.",
    color: "brand-green",
    gradient: "from-brand-green to-brand-green/60",
  },
  {
    icon: Lightbulb,
    number: "03",
    title: "Actionable Intelligence",
    description: "Parallels transforms complex datasets into understandable insights, highlighting trends, changes, and opportunities for optimisation.",
    outcome: "Teams can act quickly and confidently, guided by data rather than assumptions.",
    color: "brand-amber",
    gradient: "from-brand-amber to-brand-amber/60",
  },
];

const HowParallelsEnablesSection = () => {
  const { ref: sectionRef, isInView } = useInView({ threshold: 0.1 });

  return (
    <section className="bg-dark-section py-24 lg:py-32 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-30" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div 
          ref={sectionRef}
          className={`max-w-3xl mx-auto text-center mb-16 ${isInView ? "animate-fade-in" : "opacity-0"}`}
        >
          {/* <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            How It Works
          </span> */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            A unified foundation for{" "}
            <span className="text-gradient">informed decisions.</span>
          </h2>
          <p className="text-lg text-primary-foreground/70">
            How Parallels enables ecommerce growth through three core capabilities.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className={`group relative ${isInView ? "animate-fade-in" : "opacity-0"}`}
              style={{ animationDelay: `${0.2 + index * 0.15}s` }}
            >
              {/* Connection line between cards */}
              {index < pillars.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary-foreground/20 to-transparent z-10">
                  <ArrowRight size={16} className="absolute -right-2 -top-1.5 text-primary-foreground/20" />
                </div>
              )}

              <div className="glass-dark rounded-2xl p-8 h-full border border-primary-foreground/10 group-hover:border-accent/30 transition-all duration-300 hover-lift">
                {/* Number & Icon */}
                <div className="flex items-center justify-between mb-8">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${pillar.gradient} flex items-center justify-center shadow-lg`}>
                    <pillar.icon size={28} className="text-primary-foreground" />
                  </div>
                  <span className="text-5xl font-bold text-primary-foreground/10 group-hover:text-primary-foreground/20 transition-colors">
                    {pillar.number}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-primary-foreground mb-4">{pillar.title}</h3>
                <p className="text-primary-foreground/70 mb-6 leading-relaxed">{pillar.description}</p>

                {/* Outcome */}
                <div className={`bg-${pillar.color}/10 rounded-xl p-4 border-l-4 border-${pillar.color}`}>
                  <p className="text-sm text-primary-foreground">
                    <span className="text-primary-foreground/50 font-medium">Outcome: </span>
                    {pillar.outcome}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual Flow Diagram */}
        <div className="max-w-4xl mx-auto mt-16 pt-16 border-t border-primary-foreground/10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
            {["Raw Data", "Unified View", "Correlated Insights", "Growth Actions"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index === 3 ? "bg-success-gradient" : "bg-primary-foreground/10"
                  }`}>
                    <span className={`text-sm font-bold ${index === 3 ? "text-primary-foreground" : "text-primary-foreground/70"}`}>
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-primary-foreground/70">{step}</span>
                </div>
                {index < 3 && (
                  <div className="hidden md:block w-12 h-0.5 bg-gradient-to-r from-primary-foreground/20 to-primary-foreground/5 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowParallelsEnablesSection;

