import { Check, Star } from "lucide-react"
import { Link } from "react-router-dom"

const pricingPlans = [
    {
        id: "FREE",
        title: "Free Plan",
        price: "Free",
        description: "Perfect for getting started with analytics",
        features: [
            "Basic Analytics Dashboard",
            "Shopify Integration",
            "Daily Data Updates",
            "Basic Reports",
            "Email Support",
        ],
        buttonText: "Get Started",
    },
    {
        id: "STARTUP",
        title: "Startup Plan",
        price: "$10",
        period: "/month",
        description: "Ideal for growing businesses",
        features: [
            "Everything in Free Plan",
            "Real-time Analytics",
            "Custom Dashboards",
            "Advanced Reports",
            "Priority Email Support",
        ],
        isPopular: true,
        buttonText: "Subscribe Now",
    },
    {
        id: "GROWTH",
        title: "Growth Plan",
        price: "$50",
        period: "/month",
        description: "For businesses ready to scale",
        features: [
            "Everything in Startup Plan",
            "AI-Powered Insights",
            "White-label Reports",
            "Custom Integrations",
            "Team Collaboration",
        ],
        buttonText: "Subscribe Now",
    },
]

function Pricing() {
    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
                <div
                    key={plan.id}
                    className={`relative bg-white rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg hover:scale-105 ${plan.isPopular ? "border-slate-200 shadow-md" : "border-slate-100"
                        }`}
                >
                    {/* Card Header */}
                    <div
                        className={`p-6 flex flex-col items-center ${plan.id === "FREE"
                            ? "bg-gradient-to-b from-teal-50 to-white"
                            : plan.id === "STARTUP"
                                ? "bg-gradient-to-b from-violet-50 to-white"
                                : "bg-gradient-to-b from-rose-50 to-white"
                            }`}
                    >
                        {plan.isPopular && (
                            <div className="absolute top-0 left-0 bg-amber-500 text-white text-xs font-semibold py-1 px-3 rounded-br-lg">
                                <Star className="h-3.5 w-3.5 fill-white inline-block mr-1" /> POPULAR
                            </div>
                        )}

                        {/* Icon and Title in the Same Row */}
                        <h3 className="text-xl font-bold text-slate-800">{plan.title}</h3>
                        {/* Price and Description */}
                        <div className="flex items-baseline mt-4">
                            <span
                                className={`text-4xl font-bold ${plan.id === "FREE" ? "text-teal-600" : plan.id === "STARTUP" ? "text-violet-600" : "text-rose-600"
                                    }`}
                            >
                                {plan.price}
                            </span>
                            {plan.period && <span className="text-slate-500 ml-1">{plan.period}</span>}
                        </div>

                        <p className="mt-3 text-slate-600 text-sm text-center">{plan.description}</p>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-slate-100"></div>

                    {/* Features */}
                    <div className="p-6 bg-white">
                        <ul className="space-y-4">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-start">
                                    <div
                                        className={`flex-shrink-0 rounded-full p-0.5 mt-0.5 ${plan.id === "FREE"
                                            ? "bg-teal-100 text-teal-600"
                                            : plan.id === "STARTUP"
                                                ? "bg-violet-100 text-violet-600"
                                                : "bg-rose-100 text-rose-600"
                                            }`}
                                    >
                                        <Check className="h-4 w-4" />
                                    </div>
                                    <span className="ml-3 text-slate-700 text-sm">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Button */}
                        <div className="mt-8">
                            <Link to="https://parallelsapp-production.up.railway.app/">
                            <button
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${plan.id === "FREE"
                                    ? "bg-teal-600 hover:bg-teal-700 text-white"
                                    : plan.id === "STARTUP"
                                        ? "bg-violet-600 hover:bg-violet-700 text-white"
                                        : "bg-rose-600 hover:bg-rose-700 text-white"
                                    }`}
                            >
                                {plan.buttonText}
                            </button>
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default Pricing
