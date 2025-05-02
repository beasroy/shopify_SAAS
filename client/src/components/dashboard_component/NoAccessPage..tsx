import { AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import axios from 'axios';

// Define props interface for the component
interface NoAccessPageProps {
  platform: string;
  message: string;
  icon?: React.ReactNode;
  loginOptions: {
    label: string;
    context: string;
    provider: 'google' | 'facebook';
  }[];
}

function NoAccessPage({ 
  platform, 
  message, 
  icon = <Mail className="w-8 h-8 text-red-600" />,
  loginOptions 
}: NoAccessPageProps) {
  const user = useSelector((state: RootState) => state.user.user);
  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;
  
  const handleLogin = async (provider: string, context?: string) => {
    try {
      let response;

        response = await axios.get(
          `${baseURL}/api/auth/${context ? `${context}` : ''}`, 
          { withCredentials: true }
        );
        const { authUrl } = response.data;
        window.location.href = authUrl;
      
    } catch (error) {
      console.error(`Error getting ${provider} Auth URL:`, error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {icon}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Hey there!
          </h1>
          <p className="text-gray-600">
            {message}
          </p>
        </div>

        {/* Current Account Info */}
        {user?.email && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Currently signed in as:</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Section */}
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Just a quick update to your {platform} token is needed to continue.
          </p>
          
          {loginOptions.map((option, index) => (
            <button 
              key={index}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 group"
              onClick={() => handleLogin(option.provider, option.context)}
            >
              {option.label}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NoAccessPage;