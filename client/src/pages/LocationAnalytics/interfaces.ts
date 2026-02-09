export interface DailyBreakdown {
  date: string;
  sales: number;
  orderCount: number;
}

export interface LocationData {
  city?: string;
  state?: string;
  totalSales: number;
  orderCount: number;
  monthlyTotal: number;
  dailyBreakdown: DailyBreakdown[];
  isClassified: boolean;
}

export interface DimensionSummary {
  totalSales: number;
  totalOrderCount: number;
  locationCount: number;
}

export interface LocationAnalyticsData {
  [dimensionValue: string]: LocationData[];
}

export interface LocationAnalyticsSummary {
  [dimensionValue: string]: DimensionSummary;
}

export interface PerformanceMetadata {
  queryTime: number;
  totalTime: number;
  resultCount: number;
}

export interface LocationAnalyticsMetadata {
  status: 'complete' | 'partial';
  unclassifiedLocations: string[];
  unclassifiedSales: number;
  lastUpdated: string;
  resultsTruncated: boolean;
  performance: PerformanceMetadata;
}

export interface Period {
  startDate: string;
  endDate: string;
  currentDate: string;
}

export interface LocationAnalyticsResponse {
  success: boolean;
  dimension: 'metro' | 'region' | 'tier' | 'coastal';
  period: Period;
  data: LocationAnalyticsData;
  summary: LocationAnalyticsSummary;
  metadata: LocationAnalyticsMetadata;
  fromCache: boolean;
  queryTime?: number;
}

