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
        account_name: string
        account_id: string
        interest: Interest[]
    }
    height: string
}