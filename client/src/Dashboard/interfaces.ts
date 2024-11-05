export interface ReportData {
  yearMonth: string;
  [key: string]: string; // Allows for additional properties like landingPage, city, channel, etc.
}

export interface AnalyticsReport {
  reportType: string;
  data: ReportData[];
}

export interface DashboardData {
  totalOrders: number;
  totalSales: number;
  conversionRate: number;
  averageOrderValue: number;
  topSellingProducts: { name: string; count: number }[];
  MonthlyCustomerReturnRate: { [month: string]: number };
  referringChannelsData: { [channel: string]: number };
}

export interface CombinedData {
  totalOrders: number;
  totalSales: number;
  conversionRate: number;
  averageOrderValue: number;
  topSellingProducts: { name: string; count: number }[];
  MonthlyCustomerReturnRate: { [month: string]: number };
  referringChannelsData: { [channel: string]: number };
  analyticsReports: AnalyticsReport[];
}


export interface PurchaseRoas {
  action_type: string;
  value: string;
}

export interface Purchases {
  action_type: string;
  value: string;
}

export interface Metric {
  label: string;
  value: string;
}

export interface AdAccountData {
  adAccountId: string;
  spend?: string;
  purchase_roas?: PurchaseRoas[];
  purchases?: Purchases;
  Revenue?:string;
  cpm?: string;
  ctr?: string;
  cpc?: string;
  cpp?: string;
  account_name?:string;
  date_start: string;
  date_stop: string;
  message?: string;
  metrics?: Metric[]; // Optional for accounts with no data
}


export interface AggregatedMetrics {
  totalSpent: string;
  totalRevenue: string;
  totalROAS: string; 
  totalPurchases: string;
  totalCPC: string;
  totalCPM: string;
  totalCTR: string;
  totalCPP: string;
}

export interface DailyCartCheckoutData {
  date: string;
  addToCarts: string;
  checkouts: string;
  sessions: string;
}
