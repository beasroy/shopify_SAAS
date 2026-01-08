import NewConversionTable from "@/pages/ConversionReportPage/components/ConversionTable";
import { RootState } from "@/store";
import { useSelector } from "react-redux";
import { normalizePath } from "../BounceRatePage";

interface ConversionComponentProps {
    isFullScreen: boolean;
    onDataUpdate: (data: any[], tabType: string) => void;
    tabData: Array<any>;
}

const CollectionPage: React.FC<ConversionComponentProps> = ({ isFullScreen, tabData }) => {

    const locale = useSelector((state: RootState) => state.locale.locale);
    const primaryColumn = "All Page";
    const monthlyDataKey = "MonthlyData";



    const normalizedCollectionPages = tabData
        .map(item => {
            const normalizedPath = normalizePath(item["All Page"], "collections");
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
                data={normalizedCollectionPages || []}
                primaryColumn={primaryColumn}
                monthlyDataKey={monthlyDataKey}
                isFullScreen={isFullScreen}
                locale={locale}
            />
        </div>
    )
}

export default CollectionPage;