import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PricingCallback = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;

    useEffect(() => {
        const handlePricingCallback = async () => {
            try {
                const queryParams = new URLSearchParams(window.location.search);
                const shop = queryParams.get('shop');
                const chargeId = queryParams.get('charge_id');

                if (!shop || !chargeId) {
                    console.error('Missing required parameters: shop or charge_id');
                    setError('Missing required parameters');
                    setLoading(false);
                    setTimeout(() => navigate('/dashboard'), 2000);
                    return;
                }

                console.log(`Processing subscription for shop: ${shop}, charge ID: ${chargeId}`);
                
                // Call your backend API to process the subscription
                await axios.get(`${baseURL}/api/pricing/callback`, {
                    params: { shop, charge_id: chargeId }
                });
                
                console.log('Subscription processed successfully');
                setLoading(false);
                navigate('/dashboard');
                
            } catch (error :any) {
                console.error('Error processing subscription:', error);
                setError(error.response?.data?.error || 'An error occurred');
                setLoading(false);
                setTimeout(() => navigate('/dashboard'), 2000);
            }
        };

        handlePricingCallback();
    }, [navigate, baseURL]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-lg font-medium">Processing your subscription...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p>Error: {error}</p>
                    <p className="mt-2">Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return null;
};

export default PricingCallback;