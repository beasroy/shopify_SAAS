export interface ReportData {
  yearMonth: string;
  [key: string]: string; // Allows for additional properties like landingPage, city, channel, etc.
}

export interface AnalyticsReport {
  reportType: string;
  data: ReportData[];
}

export interface DashboardData {
  orders: any[];
  totalOrders: number;
  totalSales: number;
  conversionRate: number;
  averageOrderValue: number;
  topSellingProducts: { name: string; count: number }[];
  salesByTimeOfDay: number[];
  MonthlyCustomerReturnRate: { [month: string]: number };
  referringChannelsData: { [channel: string]: number };
}

export interface CombinedData {
  orders: any[];
  totalOrders: number;
  totalSales: number;
  conversionRate: number;
  averageOrderValue: number;
  topSellingProducts: { name: string; count: number }[];
  salesByTimeOfDay: number[];
  MonthlyCustomerReturnRate: { [month: string]: number };
  referringChannelsData: { [channel: string]: number };
  analyticsReports: AnalyticsReport[];
}

export interface Order {
  id: number;
  order_number: number;
  total_price: string;
  created_at: string;
  financial_status: string;
}

// types.ts

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
