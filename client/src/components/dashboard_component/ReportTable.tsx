import React from 'react';
import { ArrowUp, ArrowDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"// Import icons based on your setup

interface TableProps {
  columns: string[];
  data: any[];
  rowsToShow: number;
}

const ReportTable: React.FC<TableProps> = ({ columns, data, rowsToShow }) => {
  
  const parsePercentage = (value: string): number => {
    return parseFloat(value.replace('%', '').trim());
  };

  // Define a type for average values
  type AverageValues = {
    [key: string]: number; 
  };

  // Calculate averages for specific columns
  const averageValues: AverageValues = {
    "Add To Cart Rate": data.reduce((sum, item) => sum + parsePercentage(item["Add To Cart Rate"]), 0) / data.length,
    "Checkout Rate": data.reduce((sum, item) => sum + parsePercentage(item["Checkout Rate"]), 0) / data.length,
    "Purchase Rate": data.reduce((sum, item) => sum + parsePercentage(item["Purchase Rate"]), 0) / data.length,
  };

  // Helper function to get conditional text color based on comparison
  const getConditionalTextColor = (value: number, average: number) => {
    if (value < average) return 'red';
    else if (value > average) return 'green';
    else return '#FFB200';
  };

  // Helper function to get conditional icon based on comparison
  const getConditionalIcon = (value: number, average: number) => {
    if (value < average) {
      return <ArrowDown className="ml-1 text-red-500 w-3 h-3" />;
    } else if (value > average) {
      return <ArrowUp className="ml-1 text-green-500 w-3 h-3" />;
    } else {
      return null;
    }
  };

  // Parse Sessions as numbers and calculate maxSessions
  const parsedData = data.map(item => ({
    ...item,
    Sessions: Number(item.Sessions),
  }));
  const maxSessions = Math.max(...parsedData.map(item => item.Sessions));

  // Calculate background color and text color based on session intensity
  const getBackgroundColor = (sessions: number) => {
    const intensity = sessions / maxSessions;
    return `rgba(0, 0, 255, ${Math.max(0.1, intensity)})`;
  };
  const getTextColor = (sessions: number) => {
    const intensity = sessions / maxSessions;
    return intensity > 0.7 ? 'white' : 'black';
  };

  return (
    <div className="relative border rounded-md" style={{ maxHeight: 'calc(100vh - 183px)' }}>
      <div className="overflow-y-auto h-full">
        <div className="overflow-x-auto min-w-full">
          <Table className="text-center min-w-[800px]">
            <TableHeader className="bg-gray-200 sticky top-0 z-10">
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column} className="font-bold px-4 text-black min-w-[150px]">
                    {column}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedData.slice(0, rowsToShow).map((item, index) => (
                <TableRow key={index}>
                  {columns.map((column) => {
                    const cellValue = column.includes('Rate')
                      ? parsePercentage(item[column as keyof typeof item] as string)
                      : item[column as keyof typeof item];
                    const isComparisonColumn = ['Add To Cart Rate', 'Checkout Rate', 'Purchase Rate'].includes(column);
                    return (
                      <TableCell
                        key={column}
                        className="px-4 py-2 max-w-[200px] font-medium"
                        style={{
                          backgroundColor:
                            column === 'Sessions' ? getBackgroundColor(Number(item.Sessions)) : '',
                          color:
                            column === 'Sessions'
                              ? getTextColor(Number(item.Sessions))
                              : isComparisonColumn
                              ? getConditionalTextColor(cellValue as number, averageValues[column as keyof AverageValues])
                              : 'inherit',
                        }}
                      >
                        <div className="flex flex-row items-center justify-center gap-1">
                          {item[column as keyof typeof item]}
                          {isComparisonColumn &&
                            getConditionalIcon(cellValue as number, averageValues[column as keyof AverageValues])}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ReportTable;
