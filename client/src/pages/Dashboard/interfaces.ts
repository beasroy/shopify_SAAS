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

export interface DailyCartCheckoutData {
  "Date": string;
  "Add To Carts": string;
  "Checkouts": string;
  "Sessions": string;
  "Purchases": string;
}

export interface DailyCartCheckoutReport {
  reportType: string;
  data: DailyCartCheckoutData[]; // This structure is correct
}

export interface CombinedData {
  totalOrders: number;
  totalSales: number;
  conversionRate: number;
  averageOrderValue: number;
  topSellingProducts: { name: string; count: number }[];
  MonthlyCustomerReturnRate: { [month: string]: number };
  referringChannelsData: { [channel: string]: number };
  analyticsReports: AnalyticsReport[]; // Assuming this is correctly defined elsewhere
  dailyCartCheckoutReports: DailyCartCheckoutReport[]; // This expects an array of DailyCartCheckoutReport
}



export interface PurchaseRoas {
  action_type: string;
  value: string;
}

export interface Purchases {
  action_type: string;
  value: string;
}


export interface ActionValue {
  action_type: string;
  value: string;
}

export interface Campaign {
  campaign_name: string;
  spend: string;
  purchase_roas?: ActionValue[];
}

export interface AdAccountData {
  adAccountId: string;
  spend?: string;
  purchase_roas?: ActionValue[];
  purchases?: ActionValue;
  Revenue?: ActionValue;
  cpm?: string;
  ctr?: string;
  cpc?: string;
  cpp?: string;
  account_name?: string;
  clicks?: string;
  impressions?: string;
  date_start: string;
  date_stop: string;
  campaigns?: Campaign[];
  message?: string;
}

export interface AggregatedMetrics {
  totalSpent: string;
  totalRevenue: string;
  totalROAS: string; 
  totalPurchases: string;
  totalCTR: string;
  totalCPC: string;
  totalCPM: string;
  totalCPP: string;
}

export interface GoogleAdAccountData {
  adAccountName: string; // Name of the ad account
  adMetrics: AdMetrics; // Nested object for ad metrics
  campaignData: GoogleCampaign[]; // Array of campaign data
}

export interface AdMetrics {
  totalSpend: string; // Number type since it's a monetary value
  roas: string; // Number type as it's a ratio
  totalConversionsValue: string; // Number type as it's a monetary value
  totalConversions: string; // Number type as it's a numeric value
  totalCPC: string; // Number type for cost per click
  totalCPM: string; // Number type for cost per 1000 impressions
  totalCTR: string; // Number type for percentage
  totalCostPerConversion: string; // Number type for cost per conversion
  totalClicks: string; // Number type for the number of clicks
  totalImpressions: string; // Number type for the number of impressions
}

export interface GoogleCampaign {
  campaign_name: string; // String for the campaign name
  spend: string;
  purchase_roas: string
}



