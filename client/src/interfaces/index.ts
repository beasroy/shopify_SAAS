export interface IBrand {
    _id: string;
    name: string;
    brandId: string;
    fbAdAccounts?: [];
    googleAdAccount?: {
        clientId: string;
        managerId: string;
    }[];
    ga4Account?: { [key: string]: string };
    shopifyAccount: { [key: string]: string };
}

export interface IBrandState {
    selectedBrandId: string | null;
    brands: IBrand[];
}

export interface ITooltipHeaderProps {
    title: string
    tooltip: string
    colSpan?: number
    rowSpan?: number
    isSubHeader?: boolean
}

export interface IDailyMetric {
    _id: string
    date: string
    metaSpend: number
    metaROAS: number
    googleSpend: number
    googleROAS: number
    totalSpend: number
    adSales: number
    grossROI: number
    shopifySales: number
    totalSales: number
    refundAmount: number
    netROI: number
    metaSales?: number
    googleSales?: number
    ROI?: number
}

export interface IMonthlyAggregate {
    _id: {
        month: number
        year: number
    }
    metaSpend: number
    metaROAS: number
    googleSpend: number
    googleROAS: number
    totalSpend: number
    grossROI: number
    shopifySales: number
    totalSales: number
    refundAmount: number
    netROI: number
    dailyMetrics: IDailyMetric[]
    month: number
    year: number
    metaSales?: number
    googleSales?: number
    totalAdSales?: number
    ROI?: number
}

export interface Interest {
    [key: string]: string | number
}

export interface InterestTableProps {
    data: {

        account_id: string
        interest: Interest[]
    }
    height: string
    account_name: string
}

export interface ILogoProps {
    width?: string | number;
    height?: string | number;
}

export interface RowData {
    [key: string]: any;
}

export interface MetricConfig {
    primary: {
        key: string;
        name: string;
    };
    secondary: {
        key: string;
        name: string;
    };
}

export interface CategoryData {
    name: string;
    color: string;
    bgColor: string;
    count: number;
    items: (string | number)[];
    description: string;
}

export interface PerformanceSummaryProps {
    data: RowData[];
    primaryColumn: string;
    metricConfig: MetricConfig;
    onCategoryFilter?: (items: (string | number)[]) => void;
}

interface Campaign {
    campaignId: string;
    campaignName: string;
    Status: string;
    "Amount spend": number;
    "Conversion Rate": number;
    ROAS: number;
    Reach: number;
    Frequency: number;
    CPM: number;
    "CPM (Reach Based)": number;
    "Link Click": number;
    "Outbound CTR": number;
    "Audience Saturation Score": number;
    "Reach v/s Unique Click": number;
    "High-Intent Click Rate": number;
    "Hook Rate": number;
    "Hold Rate": number;
    "Content View (CV)": number;
    "Cost per CV": number;
    "Add To Cart (ATC)": number;
    "Cost per ATC": number;
    "CV to ATC Rate": number;
    "Checkout Initiate (CI)": number;
    "Cost per CI": number;
    "ATC to CI Rate": number;
    Purchases: number;
    "Cost per purchase": number;
    "CI to Purchase Rate": number;
    "Unique Link Click": number;
    "Landing Page View": number;
    "Three Seconds View": number;
    Impressions: number;
}

interface Account {
    account_id: string;
    account_name: string;
    campaigns: Campaign[];
}

interface BlendedCampaign extends Campaign {
    accountName: string;
    accountId: string;
}

export interface ICampaignData {
    accountData: Account[];
    blendedSummary: BlendedCampaign[];
}


export interface BrandDetail {
    _id: string;
    name: string;
}

export interface FullBrandData {
    _id: string;
    name: string;
    fbAdAccounts: string[];
    googleAdAccount: Array<{ clientId: string, managerId: string }>;
    ga4Account: { PropertyID: string };
    shopifyAccount: {
        shopName: string;
        shopId: number;
    };
}

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
  
  export interface ActionValue {
    action_type: string;
    value: string | number;
  }
  

  export interface AdAccountData {
    adAccountId: string;
    account_name: string;
    spend: number | string;
    purchase_roas?: ActionValue[];
    Revenue?: ActionValue | null;
    purchases?: ActionValue | null;
    cpm: string;
    ctr: string;
    cpc: string;
    cpp: string;
    clicks: string;
    impressions: string;
    date_start?: string;
    date_stop?: string;
    campaigns: Campaign[];
    interestMetrics: Interest[];
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
  
  
  
  