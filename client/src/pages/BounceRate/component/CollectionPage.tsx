import NewConversionTable from "@/pages/ConversionReportPage/components/ConversionTable";
import { RootState } from "@/store";
import { useSelector } from "react-redux";

interface ConversionComponentProps {
    isFullScreen: boolean;
    currentFilter?: string[] | undefined;
    onDataUpdate: (data: any[], tabType: string) => void;
    refreshTrigger?: number;
    tabData: Array<any>;
}

const CollectionPage: React.FC<ConversionComponentProps> = ({ isFullScreen, tabData }) => {

    const locale = useSelector((state: RootState) => state.locale.locale);
    const primaryColumn = "All Page";
    const monthlyDataKey = "MonthlyData";

    const normalizeCollectionPath = (path = "") => {
        if (!path || path === "(not set)") return null;

        // Remove query params & hash
        let cleanPath = path.split("?")[0].split("#")[0];

        // Remove locale prefix like /en-us, /fr, /de, etc.
        // cleanPath = cleanPath.replace(/^\/[a-z]{2}(-[a-z]{2})?\//i, "/");

        // Ensure it starts with /collections
        // if (!cleanPath.startsWith("/collections")) return null;

        const pathIncludesCollectiond = cleanPath?.split("/")?.includes("collections")

        if (!pathIncludesCollectiond) return null

        return cleanPath;
    };


    const normalizedCollectionPages = tabData
        .map(item => {
            const normalizedPath = normalizeCollectionPath(item["All Page"]);
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
                // secondaryColumns={secondaryColumns}
                monthlyDataKey={monthlyDataKey}
                isFullScreen={isFullScreen}
                locale={locale}
                // filter={currentFilter}
            />
        </div>
    )
}

export default CollectionPage;