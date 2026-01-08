import { RootState } from "@/store";
import React from "react";
import { useSelector } from "react-redux";
import NewConversionTable from "@/pages/ConversionReportPage/components/ConversionTable";

interface ConversionComponentProps {
    isFullScreen: boolean;
    onDataUpdate: (data: any[], tabType: string) => void;
    tabData: Array<any>;
}

const BounceRateHome: React.FC<ConversionComponentProps> = ({
    isFullScreen,
    tabData
}) => {

    const locale = useSelector((state: RootState) => state.locale.locale);
 
    const primaryColumn = "All Page";
    const monthlyDataKey = "MonthlyData";

    return (
        <>
            <div className="rounded-md overflow-hidden">
                <NewConversionTable
                    data={tabData || []}
                    primaryColumn={primaryColumn}
                    monthlyDataKey={monthlyDataKey}
                    isFullScreen={isFullScreen}
                    locale={locale}
                />
            </div>
        </>
    )
}
export default BounceRateHome