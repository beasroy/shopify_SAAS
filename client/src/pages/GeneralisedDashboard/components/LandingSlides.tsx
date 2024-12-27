import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './landingSlides.css';

interface LandingSlidesProps {
    onEnd: () => void;
}

const LandingSlides: React.FC<LandingSlidesProps> = ({ onEnd }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    
    const slides = [
        {
            title: "All-in-One Marketing Analytics Platform",
            description: "Your complete solution for Shopify marketing analytics and performance tracking",
            features: [
                "Multi-brand performance tracking",
                "Real-time analytics dashboard",
                "Campaign ROI analysis",
                "Segment-based insights"
            ],
            bgColor: "bg-gradient-to-br from-blue-500 to-indigo-600",
            // Using placeholder image for demo
            image: "/sildeimages/slide-1.webp"
        },
        {
            title: "Advanced Campaign Analytics",
            description: "Deep dive into your marketing campaigns with detailed performance metrics",
            features: [
                "Campaign performance tracking",
                "Monthly ad metrics analysis",
                "Cross-channel campaign insights",
                "Custom date range analytics"
            ],
            bgColor: "bg-gradient-to-br from-purple-500 to-pink-600",
            image: "/sildeimages/slide-2.webp"
        },
        {
            title: "Interactive Analytics Dashboard",
            description: "Dive deep into your business metrics with our powerful analytics dashboard",
            features: [
                "Real-time data visualization",
                "Interactive filtering & sorting",
                "Custom KPI tracking",
                "Multi-dimensional analysis"
            ],
            bgColor: "bg-gradient-to-br from-blue-500 to-indigo-600",
            image: "/slideimages/slide-3.webp"
        },
        {
            title: "Customer Segmentation & Insights",
            description: "Understand your customers better with powerful segmentation tools",
            features: [
                "Customer behavior analysis",
                "Segment-based performance metrics",
                "Geographic insights",
                "Purchase pattern tracking"
            ],
            bgColor: "bg-gradient-to-br from-green-500 to-teal-600",
            image: "/slideimages/slide-4.webp"
        },
        {
            title: "Performance Reporting",
            description: "Generate comprehensive reports and track your brand's growth",
            features: [
                "Automated report generation",
                "Brand performance metrics",
                "Revenue tracking & forecasting",
                "Custom KPI monitoring"
            ],
            bgColor: "bg-gradient-to-br from-orange-500 to-red-600",
            image: "slideimages/slide-5.webp"
        },
        {
            title: "Marketing Intelligence",
            description: "Make data-driven decisions with our advanced analytics tools",
            features: [
                "ROI optimization suggestions",
                "Performance benchmarking",
                "Trend analysis & insights",
                "Marketing spend optimization"
            ],
            bgColor: "bg-gradient-to-br from-cyan-500 to-blue-600",
            image: "/slideimages/slide-6.webp"
        }
    ];

    const nextSlide = () => {
        if (currentSlide === slides.length - 1) {
            onEnd();
        } else {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    return (
        <div className="relative h-[600px] w-full rounded-xl overflow-hidden">
            <div className={`absolute inset-0 ${slides[currentSlide].bgColor} p-8 transition-all duration-500 bg-opacity-50`}>
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                    <div className="text-white space-y-6">
                        <h2 className="text-4xl font-bold mb-4 animate-fade-in">
                            {slides[currentSlide].title}
                        </h2>
                        <p className="text-xl text-white/90 mb-6 animate-fade-in">
                            {slides[currentSlide].description}
                        </p>
                        <div className="space-y-3">
                            {slides[currentSlide].features.map((feature, index) => (
                                <div 
                                    key={index} 
                                    className="flex items-center space-x-2 animate-slide-in"
                                    style={{ 
                                        animationDelay: `${index * 100}ms`
                                    }}
                                >
                                    <div className="w-2 h-2 rounded-full bg-white/75" />
                                    <p className="text-lg">{feature}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:block relative h-[400px]">
                        <div className="absolute inset-0 bg-white/10 rounded-lg backdrop-blur-sm overflow-hidden">
                            <img 
                                src={slides[currentSlide].image}
                                alt={slides[currentSlide].title}
                                className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-300"
                            />
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={prevSlide}
                            disabled={currentSlide === 0}
                            className="bg-white/90 text-gray-800 hover:bg-white shadow-lg hover:shadow-xl transition-all"
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Previous
                        </Button>
                        <button
                            onClick={onEnd}
                            className="text-white/80 hover:text-white underline-offset-4 hover:underline transition-all duration-200 text-sm font-medium"
                        >
                            Skip
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    currentSlide === index 
                                        ? 'bg-white scale-110' 
                                        : 'bg-white/50 hover:bg-white/70'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>

                    <Button
                        variant="secondary"
                        onClick={nextSlide}
                        className="bg-white/90 text-gray-800 hover:bg-white shadow-lg hover:shadow-xl transition-all"
                    >
                        {currentSlide === slides.length - 1 ? (
                            "Get Started"
                        ) : (
                            <>
                                Next
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LandingSlides;