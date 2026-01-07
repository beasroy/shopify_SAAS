import NewConversionTable from "@/pages/ConversionReportPage/components/ConversionTable";
import { RootState } from "@/store";
import React from "react";
import { useSelector } from "react-redux";

interface ConversionComponentProps {
    isFullScreen: boolean;
    currentFilter?: string[] | undefined;
    onDataUpdate: (data: any[], tabType: string) => void;
    refreshTrigger?: number;
    tabData: Array<any>;
}

const ProductPage: React.FC<ConversionComponentProps> = ({ isFullScreen, currentFilter, tabData }) => {

    const locale = useSelector((state: RootState) => state.locale.locale);
    // const { brandId } = useParams();
    const primaryColumn = "All Page";
    const monthlyDataKey = "MonthlyData";

    const normalizeProductPath = (path = "") => {
        if (!path || path === "(not set)") return null;

        // Remove query params & hash
        let cleanPath = path.split("?")[0].split("#")[0];

        // Remove locale prefix: /en-us, /fr, /de, etc.
        // cleanPath = cleanPath.replace(/^\/[a-z]{2}(-[a-z]{2})?\//i, "/");

        // Must start with /products
        // if (!cleanPath.startsWith("/products")) return null;

        const pathIncludesProduct = cleanPath?.split("/")?.includes("products")

        if (!pathIncludesProduct) return null

        return cleanPath;
    };

    const normalizedProductPages = tabData
        .map(item => {
            const normalizedPath = normalizeProductPath(item["All Page"]);
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
                // secondaryColumns={secondaryColumns}
                monthlyDataKey={monthlyDataKey}
                isFullScreen={isFullScreen}
                locale={locale}
                filter={currentFilter}
            />
        </div>
    )
}

export default ProductPage