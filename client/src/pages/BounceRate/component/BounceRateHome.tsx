import { RootState } from "@/store";
import React from "react";
import { useSelector } from "react-redux";
import NewConversionTable from "@/pages/ConversionReportPage/components/ConversionTable";

interface ConversionComponentProps {
    isFullScreen: boolean;
    currentFilter?: string[] | undefined;
    onDataUpdate: (data: any[], tabType: string) => void;
    refreshTrigger?: number;
    tabData: Array<any>;
}

const BounceRateHome: React.FC<ConversionComponentProps> = ({
    isFullScreen,
    tabData
}) => {

    const locale = useSelector((state: RootState) => state.locale.locale);
 
    const primaryColumn = "All Page";
    // const secondaryColumns = ["Avg Engagement Rate", "Avg Bounce Rate"];
    const monthlyDataKey = "MonthlyData";

    return (
        <>
            <div className="rounded-md overflow-hidden">
                <NewConversionTable
                    data={tabData || []}
                    primaryColumn={primaryColumn}
                    // secondaryColumns={secondaryColumns}
                    monthlyDataKey={monthlyDataKey}
                    isFullScreen={isFullScreen}
                    locale={locale}
                    // filter={currentFilter}
                />
            </div>
        </>
    )
}
export default BounceRateHome