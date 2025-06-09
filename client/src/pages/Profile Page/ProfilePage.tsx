import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Mail,
    Shield,
    HelpCircle,
} from 'lucide-react';
import CollapsibleSidebar from '../../components/dashboard_component/CollapsibleSidebar';
import { RootState } from '@/store';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { baseURL } from '@/data/constant';
import { BrandCards } from './components/BrandCard';

function ProfilePage() {
    const [activeTab, setActiveTab] = useState('brands');
    const user = useSelector((state: RootState) => state.user.user);
    const userbrands = user?.brands;    

    const handleZohoLogin = async () => {
        try {
          const response = await axios.get(
            `${baseURL}/api/auth/zoho?source=${encodeURIComponent(window.location.pathname)}`
          );
          const { authUrl } = response.data;
     
          window.location.href = authUrl;
        } catch (error) {
          console.error('Error getting Zoho Auth URL:', error);
        }
    }

    return (
        <div className="flex h-screen"> 
            <CollapsibleSidebar />
            <div className="flex-1 h-screen overflow-auto">
                <div className="min-h-screen bg-slate-50">
                    <div className="container mx-auto px-4 py-4">
                        <div className="bg-white rounded-xl shadow-sm">
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
                            <div className="border-b border-slate-200">
                                <div className="flex px-6">
                                    {['Brands'].map((tab) => (
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

                            {activeTab.toLowerCase() === 'brands' &&
                              <BrandCards userBrands={userbrands} />
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