export const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;


// Define a new color scheme directly in the component
export const COLORS = {
  primary: {
    main: "#6366F1",
    light: "#A5B4FC",
  },
  secondary: {
    main: "#64748B",
    light: "#CBD5E1",
  },
  success: {
    main: "#10B981",
    light: "#A7F3D0",
    bg: "#ECFDF5",
    dark: "#065F46",
  },
  danger: {
    main: "#EF4444",
    light: "#FCA5A5",
    bg: "#FEF2F2",
    dark: "#B91C1C",
  },
  warning: {
    main: "#F59E0B",
    light: "#FCD34D",
    bg: "#FFFBEB",
    dark: "#92400E",
  },
  neutral: {
    main: "#D1D5DB",
    light: "#E5E7EB",
    bg: "#F9FAFB",
    dark: "#4B5563",
  },
  text: {
    primary: "#1E293B",
    secondary: "#475569",
    muted: "#64748B",
  },
  border: {
    main: "#E2E8F0",
  },
  background: {
    headerGradient: "linear-gradient(to bottom, #F8FAFC, #F3F4F6)",
  },
}


  
  
  
  
  
  
  
  
  