import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { Ga4Logo } from '@/data/logo';

interface ConversionFunnelCardProps {
  onNavigate: () => void;
  brandId: string;
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string;   // Format: YYYY-MM-DD
}

interface ConsolidatedData {
  startDate: string;
  endDate: string;
  Sessions: number;
  'Add To Cart': number;
  'Add To Cart Rate': string;
  Checkouts: number;
  'Checkout Rate': string;
  Purchases: number;
  'Purchase Rate': string;
}

function ConversionFunnelCard({ onNavigate, brandId, startDate, endDate }: ConversionFunnelCardProps) {
  const [funnelData, setFunnelData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const axiosInstance = createAxiosInstance();

  useEffect(() => {
    const fetchFunnelData = async () => {
      try {
        setLoading(true);
        
        // Use provided dates or default to current month
        let apiStartDate = startDate;
        let apiEndDate = endDate;
        
        if (!apiStartDate || !apiEndDate) {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          apiStartDate = formatDate(start);
          apiEndDate = formatDate(end);
        }

        const response = await axiosInstance.post(
          `/api/highlights/conversion-funnel/${brandId}`,
          {
            startDate: apiStartDate,
            endDate: apiEndDate
          },
          { withCredentials: true }
        );

        if (response.data && response.data.success && response.data.data) {
          setFunnelData(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching conversion funnel data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (brandId) {
      fetchFunnelData();
    }
  }, [brandId, startDate, endDate]);

  if (loading) {
    return (
      <div 
        className="bg-white border rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-[380px]"
        onClick={onNavigate}
      >
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Ga4Logo width="1.2rem" height="1.2rem" />
              </div>
              <h3 className="font-semibold text-slate-800">E-Commerce Funnel</h3>
            </div>
          </div>
        </div>
        <div className="p-4 animate-pulse space-y-4 flex-1 overflow-y-auto">
          <div className="h-48 bg-slate-100 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-slate-100 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!funnelData) {
    return (
      <div 
        className="bg-white border rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-[450px]"
        onClick={onNavigate}
      >
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Ga4Logo width="1.2rem" height="1.2rem" />
            </div>
            <h3 className="font-semibold text-slate-800">E-Commerce Funnel</h3>
          </div>
        </div>
        <div className="p-4 flex-1 flex items-center justify-center overflow-y-auto">
          <div className="text-center text-slate-400">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Connect Google Analytics to see metrics</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for area chart - showing progression through funnel
  const chartData = [
    {
      stage: 'Sessions',
      count: funnelData.Sessions,
      rate: '-'
    },
    {
      stage: 'Add To Cart',
      count: funnelData['Add To Cart'],
      rate: funnelData['Add To Cart Rate']
    },
    {
      stage: 'Checkouts',
      count: funnelData.Checkouts,
      rate: funnelData['Checkout Rate']
    },
    {
      stage: 'Purchases',
      count: funnelData.Purchases,
      rate: funnelData['Purchase Rate']
    }
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-slate-700 mb-2">{data.stage}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Count:</span>
              <span className="font-bold">{data.count.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Rate:</span>
              <span className="font-bold">{data.rate}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className="bg-white border rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col h-[380px]"
      onClick={onNavigate}
    >
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Ga4Logo width="1.2rem" height="1.2rem" />
            </div>
            <h3 className="font-semibold text-slate-800">E-Commerce Funnel</h3>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Area Chart - Funnel Progression */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="stage" 
                tick={{ fontSize: 11 }}
                stroke="#64748b"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                stroke="#64748b"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCount)"
                name="Count"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

    

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex-shrink-0">
          <p className="text-xs text-slate-500 text-center">
            Click to view detailed analytics →
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConversionFunnelCard;

