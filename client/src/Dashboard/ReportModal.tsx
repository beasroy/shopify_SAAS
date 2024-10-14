import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"; // Adjust the import based on your UI library
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Import Dialog components from ShadCN

interface LandingPageReport {
  AddToCarts: string;
  Checkouts: string;
  Conversions: string;
  LandingPage: string;
  Sessions: string;
  Visitors: string;
  YearMonth: string;
}

// Define the interface for City Report
interface CityReport {
  City: string;
  Country: string;
  Region: string;
  Sessions: string;
  Visitors: string;
  YearMonth: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: (LandingPageReport | CityReport)[];
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, title, data }) => {

  // Function to determine background color based on the session count
  const getBackgroundColor = (sessions: number, maxSessions: number) => {
    const intensity = sessions / maxSessions; // Scale intensity between 0 and 1 
    return `rgba(0, 0, 255, ${Math.max(0.1, intensity)})`; // Use rgba for a gradient effect
  };

  // Parse session data and find the maximum value
  const parsedData = data.map(item => ({
    ...item,
    Sessions: Number(item.Sessions),
  }));
  console.log('parseddata', parsedData);
  const maxSessions = Math.max(...parsedData.map(item => item.Sessions));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full w-[90%] h-[80%]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-200">
              <TableRow>
                {data.length > 0 && Object.keys(data[0]).map((key) => (
                  <TableCell key={key} className="font-bold px-4 text-black min-w-[100px]">{key}</TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedData.map((item, index) => (
                <TableRow key={index}>
                  {Object.entries(item).map(([key, value], idx) => (
                    <TableCell 
                      key={idx} 
                      className="px-4 py-2 border-b"
                      style={{
                        width: '150px',
                        backgroundColor: key === "Sessions" ? getBackgroundColor(Number(value), maxSessions) : '',
                      }}
                    >
                      {value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
