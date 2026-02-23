import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, TrendingUp, BarChart3, Target, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";



const HeroSection = () => {
  const navigate = useNavigate();
  const { ref: heroRef, isInView } = useInView({ threshold: 0.1 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);


  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-hero-gradient">
      {/* Parallax background layers */}
      <div 
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${mousePosition.x * -10}px, ${mousePosition.y * -10}px)` }}
      >
        <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] bg-brand-blue/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] bg-brand-green/10 rounded-full blur-[80px]" />
      </div>

      <div 
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{ transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px)` }}
      >
        <div className="absolute top-[40%] right-[30%] w-[500px] h-[500px] bg-brand-blue/8 rounded-full blur-[120px]" />
      </div>

      {/* Floating parallax data elements */}
      <div 
        className="absolute top-[15%] left-[8%] transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)` }}
      >
        <div className="glass-dark rounded-xl p-4 border border-primary-foreground/10 animate-float opacity-60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-blue/20 flex items-center justify-center">
              <BarChart3 size={18} className="text-brand-blue" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">Revenue</p>
              <p className="text-sm font-bold text-primary-foreground">$847K</p>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="absolute top-[25%] right-[12%] transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePosition.x * 25}px, ${mousePosition.y * 25}px)` }}
      >
        <div className="glass-dark rounded-xl p-4 border border-primary-foreground/10 animate-float opacity-60" style={{ animationDelay: "1s" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-green/20 flex items-center justify-center">
              <TrendingUp size={18} className="text-brand-green" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">ROAS</p>
              <p className="text-sm font-bold text-primary-foreground">4.2x</p>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="absolute bottom-[20%] left-[12%] transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePosition.x * 35}px, ${mousePosition.y * 35}px)` }}
      >
        <div className="glass-dark rounded-xl p-4 border border-primary-foreground/10 animate-float opacity-60" style={{ animationDelay: "2s" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-amber/20 flex items-center justify-center">
              <Target size={18} className="text-brand-amber" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">CAC</p>
              <p className="text-sm font-bold text-primary-foreground">$24.50</p>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="absolute bottom-[30%] right-[8%] transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePosition.x * 40}px, ${mousePosition.y * 40}px)` }}
      >
        <div className="glass-dark rounded-xl p-4 border border-primary-foreground/10 animate-float opacity-60" style={{ animationDelay: "1.5s" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-coral/20 flex items-center justify-center">
              <Sparkles size={18} className="text-brand-coral" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">LTV</p>
              <p className="text-sm font-bold text-primary-foreground">$186</p>
            </div>
          </div>
        </div>
      </div>

      {/* Central connecting lines SVG */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Animated connection lines to center */}
        <path
          d="M 10% 20% Q 30% 35% 50% 50%"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="1"
          className="data-line"
        />
        <path
          d="M 90% 25% Q 70% 40% 50% 50%"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="1"
          className="data-line"
          style={{ animationDelay: "0.5s" }}
        />
        <path
          d="M 15% 75% Q 35% 60% 50% 50%"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="1"
          className="data-line"
          style={{ animationDelay: "1s" }}
        />
        <path
          d="M 88% 70% Q 70% 60% 50% 50%"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="1"
          className="data-line"
          style={{ animationDelay: "1.5s" }}
        />
      </svg>

      {/* Main content - Centered */}
      <div ref={heroRef} className="container mx-auto px-6 py-32 lg:py-40 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass-dark border border-brand-blue/20 mb-8 ${isInView ? "animate-fade-in" : "opacity-0"}`}
          >
            <Zap size={14} className="text-brand-blue" />
            <span className="text-sm font-medium text-primary-foreground/80">Ecommerce Growth Intelligence</span>
          </div>

          {/* Headline */}
          {/* <h1 
            className={`border text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-foreground leading-[1.1] tracking-tight mb-6 ${isInView ? "animate-fade-in" : "opacity-0"}`}
            style={{ animationDelay: "0.1s" }}
          >
            Understand what truly drives your{" "}
            <span className="text-gradient">ecommerce revenue.</span>
          </h1> */}
          {/* Headline */}
          <h1 
            className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-foreground leading-[1.1] tracking-tight mb-6 ${isInView ? "animate-fade-in" : "opacity-0"}`}
            style={{ animationDelay: "0.1s" }}
          >
            Understand what truly drives your{" "}
            <span className="text-gradient">ecommerce revenue.</span>
          </h1>

          {/* Subheadline */}
          <p 
            className={`text-lg md:text-xl text-primary-foreground/60 leading-relaxed max-w-2xl mx-auto mb-10 ${isInView ? "animate-fade-in" : "opacity-0"}`}
            style={{ animationDelay: "0.2s" }}
          >
            Parallels unifies Meta, Google, GA4, and Shopify data to reveal the real drivers behind your revenue and profit.
          </p>

          {/* CTAs */}
          <div 
            className={`flex flex-col sm:flex-row gap-4 justify-center mb-12 ${isInView ? "animate-fade-in" : "opacity-0"}`}
            style={{ animationDelay: "0.3s" }}
          >
            <Button 
              onClick={() => navigate('/login')}
              size="lg" 
              className="bg-accent-gradient text-primary-foreground hover:opacity-90 transition-all gap-2 group  hover:shadow-brand-blue/20 h-11"
            >
              Request a Demo
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              size="lg" 
              className="bg-success-gradient text-primary-foreground hover:opacity-90 transition-all gap-2  hover:shadow-brand-green/20 h-11"
            >
              <Zap size={18} />
              Sign In
            </Button>
          </div>

          {/* Platform indicators */}
          <div 
            className={`flex flex-wrap items-center justify-center gap-3 ${isInView ? "animate-fade-in" : "opacity-0"}`}
            style={{ animationDelay: "0.4s" }}
          >
            <span className="text-sm text-primary-foreground/40">Connects with:</span>
            {["Meta Ads", "Google Ads", "GA4", "Shopify"].map((platform) => (
              <div 
                key={platform}
                className="px-3 py-1.5 rounded-md glass-dark border border-primary-foreground/10 text-xs text-primary-foreground/60 hover:text-primary-foreground/90 hover:border-brand-blue/30 transition-all cursor-default"
              >
                {platform}
              </div>
            ))}
          </div>

          {/* Central visual element */}
          <div 
            className={`mt-16 relative ${isInView ? "animate-fade-in" : "opacity-0"}`}
            style={{ animationDelay: "0.5s" }}
          >
            <div className="absolute inset-0 bg-brand-blue/20 rounded-full blur-[80px] animate-pulse-slow" />
            <div className="relative glass-dark rounded-2xl p-6 border border-primary-foreground/10 max-w-3xl mx-auto overflow-hidden">
              {/* Animated insight visualization */}
              <svg viewBox="0 0 600 200" className="w-full h-auto">
                <defs>
                  <linearGradient id="areaFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lineStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
                    <stop offset="100%" stopColor="hsl(160, 84%, 39%)" />
                  </linearGradient>
                  <filter id="glowEffect" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid lines */}
                {[50, 100, 150].map((y) => (
                  <line key={y} x1="30" y1={y} x2="570" y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1" />
                ))}

                {/* Area fill */}
                <path
                  d="M 30 160 Q 80 150 130 140 T 230 100 T 330 80 T 430 50 T 530 30 L 530 180 L 30 180 Z"
                  fill="url(#areaFill)"
                  className="animate-fade-in"
                  style={{ animationDelay: "0.6s" }}
                />

                {/* Main trend line */}
                <path
                  d="M 30 160 Q 80 150 130 140 T 230 100 T 330 80 T 430 50 T 530 30"
                  fill="none"
                  stroke="url(#lineStroke)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="url(#glowEffect)"
                  style={{ 
                    strokeDasharray: 800,
                    strokeDashoffset: 800,
                    animation: "drawLine 2s ease-out 0.7s forwards"
                  }}
                />

                {/* Data points with labels */}
                {[
                  { x: 130, y: 140, label: "Meta", value: "+18%" },
                  { x: 330, y: 80, label: "Google", value: "+24%" },
                  { x: 530, y: 30, label: "Total", value: "+42%" },
                ].map((point, i) => (
                  <g 
                    key={i} 
                    className="animate-fade-in" 
                    style={{ animationDelay: `${1.2 + i * 0.2}s` }}
                  >
                    <circle cx={point.x} cy={point.y} r="8" fill="hsl(160, 84%, 39%)" filter="url(#glowEffect)" />
                    <circle cx={point.x} cy={point.y} r="14" fill="none" stroke="hsl(160, 84%, 39%)" strokeWidth="1" strokeOpacity="0.4" />
                    <text x={point.x} y={point.y - 25} textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="10">{point.label}</text>
                    <text x={point.x} y={point.y - 40} textAnchor="middle" fill="hsl(160, 84%, 39%)" fontSize="12" fontWeight="bold">{point.value}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      {/* Keyframe animations */}
      <style>{`
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;

