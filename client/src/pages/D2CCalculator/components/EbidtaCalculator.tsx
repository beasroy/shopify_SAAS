import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import axiosInstance from '@/services/axiosConfig';
import { baseURL } from '@/data/constant';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface EbidtaMetrics {
  revenue: number;
  cogs: number;
  grossProfit: number;
  sellingMarketingExpense: number;
  fulfillmentLogistics: number;
  otherOperatingExpense: number;
  totalOperatingExpenses: number;
  operatingIncome: number;
  currency: string;
}

interface EbidtaCalculatorProps {
  date: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

const EbidtaCalculator: React.FC<EbidtaCalculatorProps> = ({ date }) => {
  const { brandId } = useParams<{ brandId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenue, setRevenue] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('USD');
  const [metrics, setMetrics] = useState<EbidtaMetrics | null>(null);

  // User inputs
  const [cogs, setCogs] = useState<string>('');
  const [sellingMarketingExpense, setSellingMarketingExpense] = useState<string>('');
  const [fulfillmentLogistics, setFulfillmentLogistics] = useState<string>('');
  const [otherOperatingExpense, setOtherOperatingExpense] = useState<string>('');

  // Calculate metrics on server (sends stored revenue, no Shopify API call)
  const calculateMetrics = useCallback(async () => {
    if (!brandId || revenue === 0) {
      toast({
        title: "Error",
        description: "Please fetch revenue first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post(
        `${baseURL}/api/d2c-calculator/ebidta-calculate/${brandId}`,
        {
          revenue: revenue,
          currency: currency,
          cogs: cogs || 0,
          sellingMarketingExpense: sellingMarketingExpense || 0,
          fulfillmentLogistics: fulfillmentLogistics || 0,
          otherOperatingExpense: otherOperatingExpense || 0,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setMetrics(response.data.data);
        toast({
          title: "Success",
          description: "Metrics calculated successfully",
        });
      }
    } catch (error: any) {
      console.error('Error calculating metrics:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to calculate metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [brandId, revenue, currency, cogs, sellingMarketingExpense, fulfillmentLogistics, otherOperatingExpense, toast]);

  // Fetch revenue from API (only when date range changes)
  const fetchRevenue = useCallback(async () => {
    if (!brandId || !date.from || !date.to) {
      return;
    }

    setRevenueLoading(true);
    try {
      const response = await axiosInstance.post(
        `${baseURL}/api/d2c-calculator/revenue/${brandId}`,
        {
          startDate: format(date.from, 'yyyy-MM-dd'),
          endDate: format(date.to, 'yyyy-MM-dd'),
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setRevenue(response.data.data.revenue);
        setCurrency(response.data.data.currency || 'USD');
        // Clear old metrics - user needs to click Calculate button to recalculate
        setMetrics(null);
        toast({
          title: "Success",
          description: "Revenue fetched successfully",
        });
      }
    } catch (error: any) {
      console.error('Error fetching revenue:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to fetch revenue",
        variant: "destructive",
      });
    } finally {
      setRevenueLoading(false);
    }
  }, [brandId, date.from, date.to, toast]);

  // Fetch revenue when date range changes
  useEffect(() => {
    if (brandId && date.from && date.to) {
      fetchRevenue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, date.from, date.to]);

  const formatCurrency = (value: number) => {
    const currencyCode = currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="w-full p-6">
      <div className="w-full">
        {/* Gross Profit Calculation - Inline */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <Label className="text-xs text-gray-500 mb-2 block">Gross Profit Calculation</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="revenue" className="text-xs text-gray-600 mb-1 block">Revenue</Label>
                <Input
                  id="revenue"
                  type="text"
                  value={formatCurrency(revenue)}
                  readOnly
                  className="bg-gray-50 font-semibold text-sm h-9"
                />
              </div>
              <div className="text-2xl font-bold text-gray-400 mt-6">−</div>
              <div className="flex-1">
                <Label htmlFor="cogs" className="text-xs text-gray-600 mb-1 block">COGS</Label>
                <Input
                  id="cogs"
                  type="number"
                  placeholder="0"
                  value={cogs}
                  onChange={(e) => setCogs(e.target.value)}
                  className="font-semibold text-sm h-9"
                />
              </div>
              <div className="text-2xl font-bold text-gray-400 mt-6">=</div>
              <div className="flex-1">
                <Label htmlFor="grossProfit" className="text-xs text-green-700 mb-1 block font-medium">Gross Profit</Label>
                <Input
                  id="grossProfit"
                  type="text"
                  value={metrics ? formatCurrency(metrics.grossProfit) : formatCurrency(0)}
                  readOnly
                  className="bg-green-50 border-green-200 font-bold text-sm text-green-900 h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operating Expenses - Compact Grid */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <Label className="text-xs text-gray-500 mb-3 block">Operating Expenses</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sellingMarketing" className="text-xs text-gray-600 mb-1 block">Selling & Marketing</Label>
                <Input
                  id="sellingMarketing"
                  type="number"
                  placeholder="0"
                  value={sellingMarketingExpense}
                  onChange={(e) => setSellingMarketingExpense(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div>
                <Label htmlFor="fulfillment" className="text-xs text-gray-600 mb-1 block">Fulfillment & Logistics</Label>
                <Input
                  id="fulfillment"
                  type="number"
                  placeholder="0"
                  value={fulfillmentLogistics}
                  onChange={(e) => setFulfillmentLogistics(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div>
                <Label htmlFor="otherOperating" className="text-xs text-gray-600 mb-1 block">Other Operating</Label>
                <Input
                  id="otherOperating"
                  type="number"
                  placeholder="0"
                  value={otherOperatingExpense}
                  onChange={(e) => setOtherOperatingExpense(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            onClick={fetchRevenue}
            disabled={revenueLoading || !date.from || !date.to}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${revenueLoading ? 'animate-spin' : ''}`} />
            {revenueLoading ? 'Loading...' : 'Refresh Revenue'}
          </Button>
          <Button
            onClick={calculateMetrics}
            disabled={loading || revenue === 0}
            variant="default"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Calculating...' : 'Calculate'}
          </Button>
        </div>

        {/* Operating Income Calculation - Inline */}
        <Card className="mb-4 border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4">
            <Label className="text-xs text-blue-700 mb-2 block font-medium">Operating Income Calculation</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="grossProfitDisplay" className="text-xs text-gray-600 mb-1 block">Gross Profit</Label>
                <Input
                  id="grossProfitDisplay"
                  type="text"
                  value={metrics ? formatCurrency(metrics.grossProfit) : formatCurrency(0)}
                  readOnly
                  className="bg-white font-semibold text-sm h-9"
                />
              </div>
              <div className="text-2xl font-bold text-gray-400 mt-6">−</div>
              <div className="flex-1">
                <Label htmlFor="totalExpenses" className="text-xs text-gray-600 mb-1 block">Total Operating Expenses</Label>
                <Input
                  id="totalExpenses"
                  type="text"
                  value={metrics ? formatCurrency(metrics.totalOperatingExpenses) : formatCurrency(0)}
                  readOnly
                  className="bg-white font-semibold text-sm h-9"
                />
              </div>
              <div className="text-2xl font-bold text-gray-400 mt-6">=</div>
              <div className="flex-1">
                <Label htmlFor="operatingIncome" className="text-xs text-blue-700 mb-1 block font-medium">Operating Income</Label>
                <Input
                  id="operatingIncome"
                  type="text"
                  value={metrics ? formatCurrency(metrics.operatingIncome) : formatCurrency(0)}
                  readOnly
                  className="bg-blue-100 border-blue-200 font-bold text-sm text-blue-900 h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Summary */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4">
            <Label className="text-xs text-gray-500 mb-3 block font-medium">Summary</Label>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">Revenue</div>
                <div className="font-semibold text-gray-900">{metrics ? formatCurrency(metrics.revenue) : formatCurrency(0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">COGS</div>
                <div className="font-semibold text-gray-900">{metrics ? formatCurrency(metrics.cogs) : formatCurrency(0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Gross Profit</div>
                <div className="font-bold text-green-700">{metrics ? formatCurrency(metrics.grossProfit) : formatCurrency(0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Operating Income</div>
                <div className="font-bold text-blue-700">{metrics ? formatCurrency(metrics.operatingIncome) : formatCurrency(0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EbidtaCalculator;

