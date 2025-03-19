import { cn } from "@/lib/utils";
import { BarChart3, CalendarRange, DollarSign, Folder, Layers, LineChart, Mail, Users } from "lucide-react"

const Feature = ({
    title,
    description,
    icon,
    index,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    index: number;
}) => {
    return (
        <div
            className={cn(
                "flex flex-col lg:border-r  py-10 relative group/feature dark:border-neutral-800",
                (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
                index < 4 && "lg:border-b dark:border-neutral-800"
            )}
        >
            {index < 4 && (
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-gray-200 dark:from-neutral-800 to-transparent pointer-events-none" />
            )}
            {index >= 4 && (
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-gray-200 dark:from-neutral-800 to-transparent pointer-events-none" />
            )}
            <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
                {icon}
            </div>
            <div className="text-lg font-bold mb-2 relative z-10 px-10">
                <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
                <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
                    {title}
                </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
                {description}
            </p>
        </div>
    );
};

const PlatformFeatures = [
    {
        title: "Unified Dashboard",
        description: "View all your marketing data in one place with customizable widgets",
        icon: <BarChart3 className="h-8 w-8 text-primary" />,
    },
    {
        title: "Multi-platform Integration",
        description: "Connect with Shopify, Meta, Google Ads, and GA4 seamlessly",
        icon: <Layers className="h-8 w-8 text-primary" />,
    },
    {
        title: "Performance Tracking",
        description: "Monitor business performance across platforms and time periods",
        icon: <LineChart className="h-8 w-8 text-primary" />,
    },
    {
        title: "Demographic Analysis",
        description: "Track conversions based on location, demographics, brands, and products",
        icon: <Users className="h-8 w-8 text-primary" />,
    },
    {
        title: "Automated Email Reports",
        description: "Receive regular performance updates directly in your inbox",
        icon: <Mail className="h-8 w-8 text-primary" />,
    },
    {
        title: "Campaign Grouping",
        description: "Group campaigns by category to analyze performance at a glance",
        icon: <Folder className="h-8 w-8 text-primary" />,
    },
    {
        title: "Compare Date Ranges",
        description: "Easily compare analytics across different time periods",
        icon: <CalendarRange className="h-8 w-8 text-primary" />,
    },
    {
        title: "Easy & Transparent Pricing",
        description: "Simple, no-surprise pricing plans to fit every business",
        icon: <DollarSign className="h-8 w-8 text-primary" />,
    }
];

function Features() {
    return (
        <section id="features" className="w-full py-12 md:py-8 lg:py-16 bg-slate-100 px-4">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center mb-5">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tighter md:text-4xl lg:text-3xl gradient-text">
                            Smarter Marketing, Better Results
                        </h2>
                        <p className="max-w-[900px] text-muted-foreground md:text-lg">
                            Track performance, scale campaigns, and maximize ROI—all with ease.
                        </p>
                    </div>

                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  relative z-10 pt-6 max-w-7xl mx-auto">
                    {PlatformFeatures.map((feature, index) => (
                        <Feature key={feature.title} {...feature} index={index} />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Features

