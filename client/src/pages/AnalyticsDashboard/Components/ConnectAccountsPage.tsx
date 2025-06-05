
import { ConnectPlatformCard } from '../../GeneralisedDashboard/dashboard';
import { useState } from 'react';
import PlatformModal from '@/components/dashboard_component/PlatformModal';
import { useParams } from 'react-router-dom';
import Header from '@/components/dashboard_component/Header';
import { LineChart } from 'lucide-react';

export default function ConnectAccountsPage() {
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'Facebook' | 'Google Ads' | null>(null);
  const { brandId } = useParams();

  const handleConnectPlatform = (platform: 'Facebook' | 'Google Ads') => {
    setSelectedPlatform(platform);
    setIsPlatformModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        title="AdMetrics Dashboard"
        Icon={LineChart}
        showDatePicker={false}
        showSettings={false}
        showRefresh={false}
        isLoading={false}
      />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Connect Your Advertising Accounts
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect your Facebook and Google Ads accounts to start tracking your advertising performance metrics in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:border-blue-500 transition-colors">
            <ConnectPlatformCard 
              platform="Facebook" 
              onClick={() => handleConnectPlatform("Facebook")} 
            />
            <div className="mt-4 text-sm text-gray-600">
              <h3 className="font-semibold mb-2">Facebook Ads Benefits:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Track ad spend and performance</li>
                <li>Monitor ROAS and conversions</li>
                <li>Analyze audience insights</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:border-blue-500 transition-colors">
            <ConnectPlatformCard 
              platform="Google Ads" 
              onClick={() => handleConnectPlatform("Google Ads")} 
            />
            <div className="mt-4 text-sm text-gray-600">
              <h3 className="font-semibold mb-2">Google Ads Benefits:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Track campaign performance</li>
                <li>Monitor conversion rates</li>
                <li>Analyze keyword performance</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500 mb-8">
            <div className="h-px w-16 bg-gray-300"></div>
            <span>or</span>
            <div className="h-px w-16 bg-gray-300"></div>
          </div>
          <p className="text-gray-600">
            Need help? Contact our support team for assistance with connecting your accounts.
          </p>
        </div>
      </div>

      <PlatformModal
        open={isPlatformModalOpen}
        onOpenChange={setIsPlatformModalOpen}
        platform={selectedPlatform || 'Facebook'}
        brandId={brandId || ''}
      />
    </div>
  );
} 