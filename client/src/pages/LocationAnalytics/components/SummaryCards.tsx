
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LocationAnalyticsSummary } from '../interfaces';
import { formatCurrency } from '@/utils/currency';
import { TrendingUp, Package, MapPin } from 'lucide-react';

interface SummaryCardsProps {
  summary: LocationAnalyticsSummary;
  currencyCode?: string;
}

export default function SummaryCards({ summary, currencyCode = 'USD' }: SummaryCardsProps) {
  // Calculate totals across all dimension values
  const totals = Object.values(summary).reduce(
    (acc, dimSummary) => ({
      totalSales: acc.totalSales + dimSummary.totalSales,
      totalOrders: acc.totalOrders + dimSummary.totalOrderCount,
      totalLocations: acc.totalLocations + dimSummary.locationCount,
    }),
    { totalSales: 0, totalOrders: 0, totalLocations: 0 }
  );

  // Get summary cards for each dimension value
  const dimensionCards = Object.entries(summary).map(([dimensionValue, dimSummary]) => (
    <Card key={dimensionValue} className="transition-transform hover:scale-105">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
          {dimensionValue}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Sales</span>
            </div>
            <span className="text-lg font-semibold">
              {formatCurrency(dimSummary.totalSales, currencyCode)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Orders</span>
            </div>
            <span className="text-lg font-semibold">
              {dimSummary.totalOrderCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Locations</span>
            </div>
            <span className="text-lg font-semibold">
              {dimSummary.locationCount.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  ));

  return (
    <div className="space-y-4">
      {/* Overall Summary Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Overall Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Total Sales</span>
              </div>
              <span className="text-xl font-bold">
                {formatCurrency(totals.totalSales, currencyCode)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Total Orders</span>
              </div>
              <span className="text-xl font-bold">
                {totals.totalOrders.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Total Locations</span>
              </div>
              <span className="text-xl font-bold">
                {totals.totalLocations.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension-specific Summary Cards */}
      {dimensionCards.length > 0 && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dimensionCards}
          </div>
        </div>
      )}
    </div>
  );
}

