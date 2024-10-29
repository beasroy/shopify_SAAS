import { useEffect, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define the MetricsData type based on your expected data structure
interface MetricsData {
  date: string;
  metaSpend: number;
  metaROAS: number;
  googleSpend: number;
  googleROAS: number;
  totalSpend: number;
  grossROI: number;
  shopifySales: number;
  netROI: number;
}

// Define props for the SheetModal component
interface SheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
}

// Component definition
export const SheetModal: React.FC<SheetModalProps> = ({ isOpen, onClose, brandId }) => {
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [brandName, setBrandName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const baseURL =
    import.meta.env.PROD
      ? import.meta.env.VITE_API_URL
      : import.meta.env.VITE_LOCAL_API_URL;

  useEffect(() => {
    if (isOpen) {
      // Fetch data when the modal opens
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const reportResponse = await axios.get(`${baseURL}/api/report/${brandId}`, { withCredentials: true });
          const metricsData: MetricsData[] = reportResponse.data.data;

          const brandResponse = await axios.get(`${baseURL}/api/brands/${brandId}`, { withCredentials: true });
          const brandName = brandResponse.data.name;

          setMetricsData(metricsData);
          setBrandName(brandName);
        } catch (err) {
          setError("Failed to fetch data. Please try again later.");
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [isOpen, brandId, baseURL]);

  const dataArray = Array.isArray(metricsData) ? metricsData : [metricsData];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold mb-4">
            Daily Report - {brandName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p>Loading data...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-blue-900 sticky top-0">
                <TableRow>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Date</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Meta Spend</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Meta Sales</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Meta ROAS</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Google Spend</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Google Sales</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Google ROAS</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Total Spend</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Gross ROI</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Shopify Sales</TableHead>
                  <TableHead className="font-bold text-white border border-gray-300 px-2 py-2">Net ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataArray.map((entry, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="border border-gray-300 px-2 py-1">{new Date(entry.date).toDateString()}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{entry.metaSpend.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{(entry.metaSpend * entry.metaROAS).toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{entry.metaROAS.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{entry.googleSpend.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{(entry.googleSpend * entry.googleROAS).toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{entry.googleROAS.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{entry.totalSpend.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{entry.grossROI.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{entry.shopifySales.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 px-2 py-1">{entry.netROI.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
