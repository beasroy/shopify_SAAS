import NewConversionTable from "@/pages/ConversionReportPage/components/ConversionTable";
import { RootState } from "@/store";
import React from "react";
import { useSelector } from "react-redux";
import { normalizePath } from "../BounceRatePage";

interface ConversionComponentProps {
    isFullScreen: boolean;
    currentFilter?: string[] | undefined;
    onDataUpdate: (data: any[], tabType: string) => void;
    refreshTrigger?: number;
    tabData: Array<any>;
}

const ProductPage: React.FC<ConversionComponentProps> = ({ isFullScreen, currentFilter, tabData }) => {

    const locale = useSelector((state: RootState) => state.locale.locale);
    const primaryColumn = "All Page";
    const monthlyDataKey = "MonthlyData";


    const normalizedProductPages = tabData
        .map(item => {
            const normalizedPath = normalizePath(item["All Page"], "products");
            if (!normalizedPath) return null;

            return {
                ...item,
                "All Page": normalizedPath
            };
        })
        .filter(Boolean);


    return (
        <div className="rounded-md overflow-hidden">
            <NewConversionTable
                data={normalizedProductPages || []}
                primaryColumn={primaryColumn}
                monthlyDataKey={monthlyDataKey}
                isFullScreen={isFullScreen}
                locale={locale}
                filter={currentFilter}
            />
        </div>
    )
}

export default ProductPage