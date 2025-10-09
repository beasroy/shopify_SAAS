import { useEffect, useState } from 'react';
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { TrendingUp } from 'lucide-react';
import { DashboardCard } from '../dashboard';
import { cn } from '@/lib/utils';

interface MonthlyMetric {
    period: string;
    totalSales: number;
    metaSpend: number;
    googleSpend: number;
    totalSpend: number;
    metaROAS: number;
    grossROI: number;
  }
  
  export default function MarketingInsightsCard({ onNavigate, brandId }: { onNavigate: () => void; brandId: string }) {
    const [metrics, setMetrics] = useState<MonthlyMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const axiosInstance = createAxiosInstance();
  
    useEffect(() => {
      const fetchMetrics = async () => {
        try {
          setLoading(true);
          const response = await axiosInstance.get(`/api/highlights/marketing/${brandId}`);
          if (response.data.success) {
            setMetrics(response.data.monthlyMetrics);
          }
        } catch (error) {
          console.error('Error fetching marketing insights:', error);
        } finally {
          setLoading(false);
        }
      };
  
      if (brandId) {
        fetchMetrics();
      }
    }, [brandId]);
  
    const formatCurrency = (value: number) => {
      // if (value >= 1000) return `${(value / 1000).toFixed(1)}`;
      return `${value.toFixed(0)}`;
    };
  
    if (loading) {
      return (
        <DashboardCard
          title="Marketing Insights"
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          onNavigate={onNavigate}
        >
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-slate-100 rounded"></div>
            <div className="h-20 bg-slate-100 rounded"></div>
            <div className="h-20 bg-slate-100 rounded"></div>
          </div>
        </DashboardCard>
      );
    }
  
    if (!metrics || metrics.length === 0) {
      return (
        <DashboardCard
          title="Marketing Insights"
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          onNavigate={onNavigate}
        >
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Monthly metrics will appear here</p>
          </div>
        </DashboardCard>
      );
    }
  
    // Get dynamic columns from the first metric (exclude period, month, year)
    const getColumns = () => {
      if (metrics.length === 0) return [];
      const excludeFields = ['period', 'month', 'year'];
      return Object.keys(metrics[0]).filter(key => !excludeFields.includes(key));
    };
  
    const columns = getColumns();
  
    // Format column headers
    const formatColumnHeader = (key: string) => {
      const headerMap: Record<string, string> = {
        totalSales: 'Total Sales',
        totalRefunds: 'Total Refunds',
        metaSpend: 'Meta Spend',
        metaRevenue: 'Meta Sales',
        metaROAS: 'Meta ROAS',
        googleSpend: 'Google Spend',
        googleSales: 'Google Sales',
        googleROAS: 'Google ROAS',
        totalSpend: 'Total Ad Spend',
        grossROI: 'Gross ROI'
      };
      return headerMap[key] || key;
    };
  
    // Format cell value based on column type
    const formatCellValue = (key: string, value: number) => {
      if (key.toLowerCase().includes('roas') || key.toLowerCase().includes('roi')) {
        return value.toFixed(2) + 'x';
      }
      return formatCurrency(value);
    };
  
    // Get cell color class based on value and column
    const getCellColorClass = (key: string, value: number) => {
      if (key === 'grossROI') {
        if (value >= 2) return 'text-green-600 font-bold';
        if (value >= 1) return 'text-amber-600 font-semibold';
        return 'text-red-600 font-semibold';
      }
      if (key === 'metaROAS') {
        if (value >= 3) return 'text-green-600 font-semibold';
        if (value >= 2) return 'text-amber-600';
        return 'text-slate-600';
      }
      if (key === 'totalSales') return 'font-semibold text-slate-800';
      return 'text-slate-600';
    };
  
    return (
      <DashboardCard
        title="Marketing Insights"
        icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
        onNavigate={onNavigate}
      >
        <div className="flex flex-col h-full">
          <div className="overflow-x-auto -mx-2 flex-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-200">
                  <th className="text-left p-2 font-semibold text-slate-600 sticky left-0 bg-white">Period</th>
                  {columns.map((column) => (
                    <th key={column} className="text-right p-2 font-semibold text-slate-600 whitespace-nowrap">
                      {formatColumnHeader(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, idx) => (
                  <tr 
                    key={`${metric.period}-${idx}`}
                    className={cn(
                      "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                      idx === 0 && "bg-blue-50/30"
                    )}
                  >
                    <td className="p-2 font-medium text-slate-700 sticky left-0 bg-white whitespace-nowrap">
                      {metric.period}
                      {idx === 0 && <span className="ml-1 text-blue-600 text-[10px]">●</span>}
                    </td>
                    {columns.map((column) => (
                      <td 
                        key={column}
                        className={cn("p-2 text-right whitespace-nowrap", getCellColorClass(column, metric[column as keyof MonthlyMetric] as number))}
                      >
                        {formatCellValue(column, metric[column as keyof MonthlyMetric] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
  
          <div className="mt-4 pt-3 border-t border-slate-100 flex-shrink-0">
            <p className="text-xs text-slate-500 text-center">
              Click to view full monthly breakdown →
            </p>
          </div>
        </div>
      </DashboardCard>
    );
  }