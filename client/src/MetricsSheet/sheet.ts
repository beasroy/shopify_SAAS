import * as XLSX from "xlsx";
import axios from "axios";

interface MetricsData {
    brandId: string;
    createdAt: string;
    date: string;
    googleROAS: number;
    googleSpend: number;
    grossROI: number;
    metaROAS: number;
    metaSpend: number;
    netROI: number;
    shopifySales: number;
    totalSpend: number;
    updatedAt: string;
    _id: string;
}

const downloadXlsxReport = async (brandId: string) => {
    try {
        const baseURL =
            import.meta.env.PROD
                ? import.meta.env.VITE_API_URL
                : import.meta.env.VITE_LOCAL_API_URL;

        const reportResponse = await axios.get(`${baseURL}/api/report/${brandId}`, { withCredentials: true });
        const metricsData: { success: boolean; data: MetricsData[] } = reportResponse.data; // Expect data as an array

        const brandResponse = await axios.get(`${baseURL}/api/brands/${brandId}`, { withCredentials: true });
        const brandName = brandResponse.data.name;

        const dataArray = Array.isArray(metricsData.data) ? metricsData.data : [metricsData.data];

        const worksheetData = dataArray.map((entry) => ({
            Date: new Date(entry.date).toDateString(),
            MetaSpend: entry.metaSpend,
            MetaSales: (entry.metaSpend * entry.metaROAS),
            MetaROAS: entry.metaROAS,
            GoogleSpend: entry.googleSpend,
            GoogleSales: (entry.googleSpend * entry.googleROAS),
            GoogleROAS: entry.googleROAS,
            TotalSpend: entry.totalSpend,
            GrossROI: entry.grossROI,
            ShopifySales: entry.shopifySales,
            NetROI: entry.netROI,
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 20 }, // Width for Date
            { wch: 15 }, // Width for MetaSpend
            { wch: 15 }, // Width for MetaSales
            { wch: 15 }, // Width for MetaROAS
            { wch: 15 }, // Width for GoogleSpend
            { wch: 15 }, // Width for GoogleSales
            { wch: 15 }, // Width for GoogleROAS
            { wch: 15 }, // Width for TotalSpend
            { wch: 15 }, // Width for GrossROI
            { wch: 15 }, // Width for ShopifySales
            { wch: 15 }, // Width for NetROI
        ];


        XLSX.utils.book_append_sheet(workbook, worksheet, `DailyReport-${brandName}`);
        XLSX.writeFile(workbook, `Metrics Report-${brandName}.xlsx`);
        
    } catch (error) {
        console.error("Error downloading Excel report:", error);
    }
};

export default downloadXlsxReport;



