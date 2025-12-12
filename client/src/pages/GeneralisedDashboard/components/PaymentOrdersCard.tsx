import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { ShopifyLogo } from '@/data/logo';
import { DashboardCard } from '../dashboard';

interface PaymentOrdersCardProps {
  onNavigate: () => void;
  brandId: string;
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string;   // Format: YYYY-MM-DD
}

interface PaymentOrderData {
  month: string;
  monthName: string;
  codOrderCount: number;
  prepaidOrderCount: number;
  totalOrderCount: number;
}

function PaymentOrdersCard({ onNavigate, brandId, startDate, endDate }: PaymentOrdersCardProps) {
  const [paymentData, setPaymentData] = useState<PaymentOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const axiosInstance = createAxiosInstance();

  useEffect(() => {
    const fetchPaymentData = async () => {
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
          `/api/shopify/payment-orders/${brandId}`,
          {
            startDate: apiStartDate,
            endDate: apiEndDate
          },
          { withCredentials: true }
        );

        if (response.data && response.data.success && response.data.data) {
          setPaymentData(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching payment orders data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (brandId) {
      fetchPaymentData();
    }
  }, [brandId, startDate, endDate]);

  // Calculate totals across all months
  const totalCOD = paymentData.reduce((sum, item) => sum + (item.codOrderCount || 0), 0);
  const totalPrepaid = paymentData.reduce((sum, item) => sum + (item.prepaidOrderCount || 0), 0);
  const totalOrders = totalCOD + totalPrepaid;

  // Prepare data for pie chart
  const chartData = [
    {
      name: 'COD Orders',
      value: totalCOD,
      color: '#155E95' // blue-800
    },
    {
      name: 'Prepaid Orders',
      value: totalPrepaid,
      color: '#80C4E9' // blue-500
    }
  ];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = totalOrders > 0 ? ((data.value / totalOrders) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-slate-700 mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Orders:</span>
              <span className="font-bold">{data.value.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Percentage:</span>
              <span className="font-bold">{percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label function
  const renderLabel = (entry: any) => {
    const percentage = totalOrders > 0 ? ((entry.value / totalOrders) * 100).toFixed(1) : 0;
    return `${percentage}%`;
  };

  if (loading) {
    return (
      <DashboardCard
        title="Payment Orders"
        icon={<ShopifyLogo width="1.25rem" height="1.25rem" />}
        onNavigate={onNavigate}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-slate-100 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-slate-100 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
          </div>
        </div>
      </DashboardCard>
    );
  }

  if (!paymentData || paymentData.length === 0 || totalOrders === 0) {
    return (
      <DashboardCard
        title="Payment Orders"
        icon={<ShopifyLogo width="1.25rem" height="1.25rem" />}
        onNavigate={onNavigate}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-slate-400">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">No orders found in the selected period</p>
          </div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Payment Orders"
      icon={<ShopifyLogo width="1.25rem" height="1.25rem" />}
      onNavigate={onNavigate}
    >
      <div className="space-y-4">
        {/* Pie Chart */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
                formatter={(value) => {
                  const data = chartData.find(d => d.name === value);
                  return data ? `${value} (${data.value.toLocaleString()})` : value;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-800"></div>
              <p className="text-xs text-slate-600">COD</p>
            </div>
            <p className="text-lg font-bold text-slate-800">{totalCOD.toLocaleString()}</p>
            <p className="text-xs text-slate-500">
              {totalOrders > 0 ? ((totalCOD / totalOrders) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <p className="text-xs text-slate-600">Prepaid</p>
            </div>
            <p className="text-lg font-bold text-slate-800">{totalPrepaid.toLocaleString()}</p>
            <p className="text-xs text-slate-500">
              {totalOrders > 0 ? ((totalPrepaid / totalOrders) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export default PaymentOrdersCard;

