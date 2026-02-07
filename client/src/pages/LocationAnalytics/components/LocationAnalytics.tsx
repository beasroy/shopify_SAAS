import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import createAxiosInstance from '@/pages/ConversionReportPage/components/axiosInstance';
import Loader from '@/components/dashboard_component/loader';
import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import LocationTable from './LocationTable';
import SummaryCards from './SummaryCards';
import { LocationAnalyticsResponse } from '../interfaces';

export default function LocationAnalytics() {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  const { brandId } = useParams<{ brandId: string }>();
  const brands = useSelector((state: RootState) => state.brand.brands);
  const selectedBrand = brands.find((brand) => brand._id === brandId);

  const date = useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
    }),
    [dateFrom, dateTo]
  );

  const [dimension, setDimension] = useState<'metro' | 'region' | 'tier' | 'coastal'>('metro');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LocationAnalyticsResponse | null>(null);

  const axiosInstance = createAxiosInstance();

  const startDate = date?.from ? format(date.from, 'yyyy-MM-dd') : '';
  const endDate = date?.to ? format(date.to, 'yyyy-MM-dd') : '';

  const currencyCode = selectedBrand?.shopifyAccount?.currency || 'USD';

  const fetchData = useCallback(async () => {
    if (!brandId || !startDate || !endDate) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get('/api/analytics/location-sales', {
        params: {
          brandId,
          dimension,
          startDate,
          endDate,
        },
        withCredentials: true,
      });

      setData(response.data);
    } catch (err: any) {
      console.error('Error fetching location analytics:', err);
      setError(
        err.response?.data?.message || 'Failed to fetch location analytics. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [brandId, dimension, startDate, endDate]);

  useEffect(() => {
    if (date.from && date.to) {
      fetchData();
    }
  }, [fetchData]);

  const handleDimensionChange = (value: string) => {
    setDimension(value as 'metro' | 'region' | 'tier' | 'coastal');
  };

  const handleManualRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return <Loader isLoading={true} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Custom Header with Dimension, Date, and Refresh */}
      <div className="sticky top-0 z-40 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Location Analytics</h1>
          
          <div className="flex items-center gap-3">
            {/* Dimension Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="dimension-select" className="text-sm font-medium whitespace-nowrap">
                Dimension:
              </label>
              <Select value={dimension} onValueChange={handleDimensionChange}>
                <SelectTrigger id="dimension-select" className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metro">Metro</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                  <SelectItem value="tier">Tier</SelectItem>
                  <SelectItem value="coastal">Coastal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <DatePickerWithRange
              defaultDate={{
                from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                to: new Date()
              }}
            />

            {/* Refresh Button */}
            <Button 
              onClick={handleManualRefresh} 
              disabled={loading}
              variant="outline"
              size="icon"
              className="flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="mb-6">
              <SummaryCards summary={data.summary} currencyCode={currencyCode} />
            </div>

     

            {/* Location Tables by Dimension Value */}
            {Object.keys(data.data).length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground py-8">
                    No location data available for the selected date range and dimension.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(data.data).map(([dimensionValue, locations]) => (
                  <LocationTable
                    key={dimensionValue}
                    data={locations}
                    dimensionValue={dimensionValue}
                    currencyCode={currencyCode}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

