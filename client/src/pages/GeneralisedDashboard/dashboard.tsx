// CombinedDashboard.tsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { useBrand } from "@/context/BrandContext";
import { Activity, Target, TrendingUp, ArrowUpRight } from "lucide-react";
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BrandSetup from "./components/BrandForm";
import LandingSlides from "./components/LandingSlides";

// Define the Brand interface
interface Brand {
    brandId: string;
    name: string;
    targetAmount: number;
}

export default function CombinedDashboard() {
    const { user, setUser, showLandingPopup, setShowLandingPopup } = useUser();
    const { brands } = useBrand();
    const [activeTab, setActiveTab] = useState("landing");
    const [selectedBrands, setSelectedBrands] = useState<Brand[]>([]);
    const [achievedSales, setAchievedSales] = useState<{ [key: string]: number }>({});
    const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;

    const getAchievedSales = useCallback(async (brandId: string) => {
        try {
            const response = await axios.get(`${baseURL}/api/shopify/dailysales/${brandId}`, { withCredentials: true });
            return response.data.totalSales;
        } catch (error) {
            console.error('Error fetching sales data:', error);
            return 0;
        }
    }, [baseURL]);

    const fetchSalesData = useCallback(async () => {
        try {
            const salesData: { [key: string]: number } = {};
            await Promise.all(
                selectedBrands.map(async (brand) => {
                    salesData[brand.brandId] = await getAchievedSales(brand.brandId);
                })
            );
            setAchievedSales(salesData);
        } catch (error) {
            console.error('Error fetching sales data:', error);
        } 
    }, [selectedBrands, getAchievedSales]);

    useEffect(() => {
        const fetchBrandTargets = async () => {
            try {
                const response = await axios.get(`${baseURL}/api/performance/brandTarget`, { withCredentials: true });
                setSelectedBrands(response.data); // Ensure response.data is correctly typed
            } catch (error) {
                console.error('Error fetching brands:', error);
            }
        };

        fetchBrandTargets();
    }, [baseURL]);

    useEffect(() => {
        fetchSalesData();
    }, [fetchSalesData]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 relative">
            {/* Landing Slides Popup */}
            {showLandingPopup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="w-full max-w-4xl mx-4">
                        <LandingSlides 
                            onEnd={() => {
                                setShowLandingPopup(false);
                                if (user) {
                                    setUser({
                                        ...user,
                                        hasSeenLandingSlides: true
                                    });
                                }
                                if (brands.length === 0) {
                                    setActiveTab("setup");
                                }
                            }} 
                        />
                    </div>
                </div>
            )}

            {/* Main Dashboard Content */}
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-700">
                            Welcome{brands.length === 0 ? '' : ' back'}, {user?.username.split(' ')[0] || 'user'}! 👋
                        </h1>
                        <p className="mt-2 text-gray-500">
                            {brands.length === 0 
                                ? "Let's get started by setting up your first brand!"
                                : "Here's what's happening with your brands today."
                            }
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                {brands.length === 0 ? (
                    <></>
                ) : (
                    <>
                        {/* Tabs Section */}
                        <div className="flex space-x-4 border-b border-gray-300">
                            <div
                                onClick={() => setActiveTab("landing")}
                                className={`cursor-pointer py-2 px-4 ${activeTab === "landing" ? "border-b-2 border-blue-500 font-bold" : "text-gray-600"}`}
                            >
                                Dashboard
                            </div>
                            <div
                                onClick={() => setActiveTab("setup")}
                                className={`cursor-pointer py-2 px-4 ${activeTab === "setup" ? "border-b-2 border-blue-500 font-bold" : "text-gray-600"}`}
                            >
                                Brand Setup
                            </div>
                        </div>

                        {/* Dashboard Content */}
                        {activeTab === "landing" && (
                            <div className="space-y-6">
                                {/* Quick Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="bg-white shadow-md rounded-lg">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-gray-800 font-semibold">Active Brands</p>
                                                    <p className="text-3xl font-bold mt-2">{brands.length}</p>
                                                </div>
                                                <Target className="h-8 w-8 text-blue-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white shadow-md rounded-lg">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-gray-800 font-semibold">Total Sales</p>
                                                    <p className="text-3xl font-bold mt-2">
                                                        ${Object.values(achievedSales).reduce((a, b) => a + b, 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <TrendingUp className="h-8 w-8 text-green-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white shadow-md rounded-lg">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-gray-800 font-semibold">Active Targets</p>
                                                    <p className="text-3xl font-bold mt-2">{selectedBrands.length}</p>
                                                </div>
                                                <Activity className="h-8 w-8 text-purple-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Brand Quick Access */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center text-lg">
                                                <ArrowUpRight className="mr-2 h-5 w-5 text-blue-500" />
                                                Analytics Dashboards
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4">
                                                {brands.map((brand) => (
                                                    <Link key={brand.brandId} to={`/analytics-dashboard/${brand.brandId}`}>
                                                        <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                                            <p className="font-medium text-gray-900">{brand.name}</p>
                                                            <p className="text-sm text-gray-500 mt-1">View Analytics</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center text-lg">
                                                <ArrowUpRight className="mr-2 h-5 w-5 text-blue-500" />
                                                Monthly Reports
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4">
                                                {brands.map((brand) => (
                                                    <Link key={brand.brandId} to={`/ad-metrics/${brand.brandId}`}>
                                                        <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                                            <p className="font-medium text-gray-900">{brand.name}</p>
                                                            <p className="text-sm text-gray-500 mt-1">View Report</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {activeTab === "setup" && <BrandSetup />}
                    </>
                )}
            </div>
        </div>
    );
}