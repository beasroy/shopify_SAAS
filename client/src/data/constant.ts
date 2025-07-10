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



export const privacyPolicySections = [
  {
    title: "1. Introduction",
    content: [
      "Welcome to Messold (\"we,\" \"our,\" or \"us\"). Your privacy is important to us. This Privacy Policy explains how we collect, use, share, and protect your information when you use our Parallels application."
    ]
  },
  {
    title: "2. Information We Collect",
    content: [
      "Our application accesses and processes the following user data from Google and Meta:",
      [
        "Google Ads Data: We access advertising campaign performance and spend data.",
        "Google Analytics Data: We access read-only analytics data and may edit settings.",
        "Meta Ads Data: We access ad account data, campaign insights, and interest-based targeting information.",
      ]
    ]
  },
  {
    title: "3. How We Use Google and Meta User Data",
    content: [
      [
        "To provide analytics and advertising insights.",
        "To display relevant reports and campaign performance data.",
        "To personalize the user experience.",
        "To enhance and improve our services through data analysis."
      ]
    ]
  },
  {
    title: "4. Data Sharing & Disclosure",
    content: [
      "We do not sell, rent, or trade your personal information. However, we may share your data:",
      [
        "With authorized service providers assisting in hosting, analytics, or customer support.",
        "For legal compliance if required by law.",
        "With your consent."
      ]
    ]
  },
  {
    title: "5. Data Retention & Deletion",
    content: [
      "Users can request:",
      [
        "Deletion of their data by contacting us at info@messold.com.",
        "Access to stored data via email.",
        "Revocation of Meta data access via Facebook's security settings."
      ]
    ]
  },
  {
    title: "6. Data Security",
    content: [
      "We take appropriate security measures including encryption, access control, and regular security audits."
    ]
  },
  {
    title: "7. User Rights & Control",
    content: [
      "You have the right to:",
      [
        "Revoke our application's access via Google Security Settings.",
        "Revoke our application's access via Meta App Settings.",
        "Request access, correction, or deletion of your data.",
        "Opt-out of non-essential data collection."
      ]
    ]
  },
  {
    title: "8. Compliance with Google API Services Policy & Meta Platform Terms",
    content: [
      "We comply with the Google API Services User Data Policy, including the Limited Use requirements.",
      "We comply with Meta's Platform Terms and ensure that we process Platform Data only as described in this policy and in accordance with applicable laws."
    ]
  },
  {
    title: "9. GDPR/CCPA Compliance",
    content: [
      "Residents of the EEA or California have additional rights, including:",
      [
        "The right to access, correct, or delete your data.",
        "The right to data portability.",
        "The right to restrict or object to data processing."
      ]
    ]
  },
  {
    title: "10. Updates to This Privacy Policy",
    content: [
      "We may update this Privacy Policy periodically. Any significant changes will be communicated via email or within the application."
    ]
  },
  {
    title: "11. Contact Us",
    content: [
      "If you have any questions, contact us at:",
      "Email: info@messold.com"
    ]
  }
];

export const termsAndConditionsSections = [
  {
    title: "1. Terms",
    content: [
      "By accessing this web site, you are agreeing to be bound by these web site Terms and Conditions of Use, applicable laws and regulations and their compliance. If you disagree with any of the stated terms and conditions, you are prohibited from using or accessing this site. The materials contained in this site are secured by relevant copyright and trade mark law."
    ]
  },
  {
    title: "2. Use License",
    content: [
      "Permission is allowed to temporarily download one duplicate of the materials (data or programming) on Messold Technologies's site for individual and non-business use only. This is the just a permit of license and not an exchange of title, and under this permit you may not:",
      [
        "modify or copy the materials;",
        "use the materials for any commercial use, or for any public presentation (business or non-business);",
        "attempt to decompile or rebuild any product or material contained on Messold Technologies's site;",
        "remove any copyright or other restrictive documentations from the materials; or",
        "transfer the materials to someone else or even \"mirror\" the materials on other server."
      ],
      "This permit might consequently be terminated if you disregard any of these confinements and may be ended by Messold Technologies whenever deemed. After permit termination or when your viewing permit is terminated, you must destroy any downloaded materials in your ownership whether in electronic or printed form."
    ]
  },
  {
    title: "3. Disclaimer",
    content: [
      "The materials on Messold Technologies's site are given \"as is\". Messold Technologies makes no guarantees, communicated or suggested, and thus renounces and nullifies every single other warranties, including without impediment, inferred guarantees or states of merchantability, fitness for a specific reason, or non-encroachment of licensed property or other infringement of rights. Further, Messold Technologies does not warrant or make any representations concerning the precision, likely results, or unwavering quality of the utilization of the materials on its Internet site or generally identifying with such materials or on any destinations connected to this website."
    ]
  },
  {
    title: "4. Constraints",
    content: [
      "In no occasion should Messold Technologies or its suppliers subject for any harms (counting, without constraint, harms for loss of information or benefit, or because of business interference,) emerging out of the utilization or powerlessness to utilize the materials on Messold Technologies's Internet webpage, regardless of the possibility that Messold Technologies or a Messold Technologies approved agent has been told orally or in written of the likelihood of such harm. Since a few purviews don't permit constraints on inferred guarantees, or impediments of obligation for weighty or coincidental harms, these confinements may not make a difference to you."
    ]
  },
  {
    title: "5. Amendments and Errata",
    content: [
      "The materials showing up on Messold Technologies's site could incorporate typographical, or photographic mistakes. Messold Technologies does not warrant that any of the materials on its site are exact, finished, or current. Messold Technologies may roll out improvements to the materials contained on its site whenever without notification. Messold Technologies does not, then again, make any dedication to update the materials."
    ]
  },
  {
    title: "6. Links",
    content: [
      "Messold Technologies has not checked on the majority of the websites or links connected to its website and is not in charge of the substance of any such connected webpage. The incorporation of any connection does not infer support by Messold Technologies of the site. Utilization of any such connected site is at the user's own risk."
    ]
  },
  {
    title: "7. Site Terms of Use Modifications",
    content: [
      "Messold Technologies may update these terms of utilization for its website whenever without notification. By utilizing this site you are consenting to be bound by the then current form of these Terms and Conditions of Use."
    ]
  },
  {
    title: "8. Governing Law",
    content: [
      "Any case identifying with Messold Technologies's site should be administered by the laws of the country of India Messold Technologies State without respect to its contention of law provisions."
    ]
  },
  {
    title: "9. Refunds",
    content: [
      "Any amount charged is non-refundable."
    ]
  },
  {
    title: "10. Contact Us",
    content: [
      "If you have any questions about these Terms and Conditions, please contact us at:",
      "Email: info@messold.com"
    ]
  }
];

export const metricConfigs = {
    sessionsAndConversion: {
      primary: {
        key: 'Total Sessions',
        name: 'Sessions'
      },
      secondary: {
        key: 'Avg Conv. Rate',
        name: 'Conversion'
      }
    },
    spendAndRoas: {
      primary: {
        key: 'Total Spend',
        name: 'Spend'
      },
      secondary: {
        key: 'Total Purchase ROAS',
        name: 'Purchase ROAS'
      }
    }
  };



  
  
  
  

