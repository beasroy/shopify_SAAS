import { LayoutDashboard, Settings } from "lucide-react";

export const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;

export const apphandle = import.meta.env.VITE_APP_HANDLE ;

export const COLORS = {
  primary: {
    main: "#0EA5E9", // Vivid sky blue
    light: "#7DD3FC", // Light sky blue
    dark: "#0369A1", // Deep sky blue
    bg: "#F0F9FF", // Very light sky blue
  },
  secondary: {
    main: "#475569", // Slate gray
    light: "#94A3B8", // Light slate
    dark: "#334155", // Dark slate
    bg: "#F8FAFC", // Very light slate
  },
  success: {
    main: "#10B981", // Emerald green
    dark: "#047857", // Deep emerald
    bg: "#D7FFDF", // Very light emerald
  },
  danger: {
    main: "#F43F5E", // Rose red
    dark: "#BE123C", // Deep rose
    bg: "#FFF1F2", // Very light rose
  },
  warning: {
    main: "#1E40AF", // Deep navy blue
    dark: "#1E3A8A", // Darker navy blue
    bg: "#EFF6FF", // Very light blue
  },
  neutral: {

    main: "#F59E0B", // Amber
    dark: "#B45309", // Deep amber
    bg: "#FFFBEB", // Very light amber
  },
  text: {
    primary: "#0F172A", // Very dark slate
    secondary: "#334155", // Dark slate
    muted: "#64748B", // Medium slate
  },
  border: {
    main: "#CBD5E1", // Light slate
    dark: "#94A3B8", // Medium slate
  },
  background: {
    headerGradient: "linear-gradient(to bottom, #F1F5F9, #E2E8F0)",
  },
};


export const pricingPlans = [
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

export const setupSteps = [
  {
    id: 1,
    title: "Brand Setup",
    description: "Configure your brand details and identity",
    icon: Settings,
  },
  {
    id: 2,
    title: "Connect Platforms",
    description: "Link your marketing and analytics accounts",
    icon: LayoutDashboard,
  }
]




  
  
  
  

