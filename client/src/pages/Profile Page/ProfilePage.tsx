import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    Mail,
    Shield,
    HelpCircle,
    Plus,
    Settings,
    Trash2,
} from 'lucide-react';
import CollapsibleSidebar from '../Dashboard/CollapsibleSidebar';
import { RootState } from '@/store';
import { useSelector } from 'react-redux';
import axios from 'axios';

function ProfilePage() {
    const [activeTab, setActiveTab] = useState('brands');
    const user = useSelector((state: RootState) => state.user.user);
    const userbrands = user?.brands;
    const brands = useSelector((state: RootState) => state.brand.brands);

    const userBrandNames = userbrands?.map((brandId) => {
        const brand = brands.find((b) => b._id === brandId);
        return brand ? brand.name : "Unknown Brand";
    })

    const handleZohoLogin = async () => {
        try {
          const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL
          const response = await axios.get(`${baseURL}/api/auth/zoho`);
          const { authUrl } = response.data;
    
          window.location.href = authUrl;
        } catch (error) {
          console.error('Error getting Zoho Auth URL:', error);
        }
      }

    return (
        <div className="flex h-screen"> {/* Set a fixed width for the sidebar */}
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-auto">
                <div className="min-h-screen bg-slate-50">
                    {/* Header */}
                    <div className="bg-white shadow-sm">
                        <div className="container mx-auto px-4 py-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-xl font-semibold text-slate-800">User Details</h1>
                                <div className="flex gap-3">
                                    <Button className="bg-teal-600 hover:bg-teal-700">
                                        Edit/Update
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="container mx-auto px-4 py-8">
                        <div className="bg-white rounded-xl shadow-sm">
                            {/* Profile Header */}
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-start gap-6">
                                    <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                                        <span className="text-4xl font-bold text-slate-600">{user?.username[0]}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-2xl font-semibold text-slate-800">{user?.username}</h2>
                                            {user?.isAdmin && (
                                                <Badge className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full">
                                                    <Shield className="h-4 w-4 mr-1" />
                                                    Administrator
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Mail className="h-4 w-4" />
                                                <span>{user?.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="border-b border-slate-200">
                                <div className="flex px-6">
                                    {['Brands', 'Support'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab.toLowerCase())}
                                            className={`px-6 py-4 font-medium text-sm transition-colors relative ${activeTab === tab.toLowerCase()
                                                ? 'text-teal-600'
                                                : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            {tab}
                                            {activeTab === tab.toLowerCase() && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            {activeTab.toLowerCase() === 'brands' &&
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <Button variant="outline" className="text-slate-700">
                                            <Plus className="h-5 w-5 mr-2" />
                                            Add New Brand
                                        </Button>
                                        {userBrandNames?.map((brand) => (
                                            <div
                                                key={brand}
                                                className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <Building2 className="h-5 w-5 text-teal-600" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium text-slate-900">{brand}</h3>
                                                            <span className="text-sm text-slate-500">Connected</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="text-slate-600">
                                                        <Settings className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-600">Integration Status</span>
                                                        <Badge className="bg-teal-100 text-teal-700">Active</Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <Button variant="outline" size="sm" className="text-slate-700">
                                                            Manage
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>


                                </div>
                            }
                            {activeTab.toLowerCase() === "support" && user?.isAdmin && (
                                <div className="py-8 flex gap-4 items-center justify-center">
                                    <Button onClick={handleZohoLogin} className="bg-teal-600 hover:bg-teal-700">
                                        <HelpCircle className="h-5 w-5 mr-2" />
                                        Connect Zoho Help Desk
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;