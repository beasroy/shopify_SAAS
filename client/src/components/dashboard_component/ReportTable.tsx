import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';

interface TableProps {
  columns: string[];
  data: any[];
  rowsToShow: number;
}

const ReportTable: React.FC<TableProps> = ({ columns, data, rowsToShow }) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const comparisonColumns = ['Add To Cart Rate', 'Checkout Rate', 'Purchase Rate'];

  const parsePercentage = (value: string): number => {
    return parseFloat(value?.replace('%', '').trim()) || 0;
  };


  // Calculate averages for specific columns
  const averageValues = useMemo(() => {
    const averages: Record<string, number> = {};
    comparisonColumns.forEach((key) => {
      averages[key] =
        data.reduce((sum, item) => sum + parsePercentage(item?.[key] || '0'), 0) / data.length || 0;
    });
    return averages;
  }, [data]);

  const parsedData = useMemo(() =>
    data.map((item) => ({
      ...item,
      Sessions: Number(item?.Sessions || 0),
      'Add To Cart Rate': parsePercentage(item?.['Add To Cart Rate'] || '0'),
      'Checkout Rate': parsePercentage(item?.['Checkout Rate'] || '0'),
      'Purchase Rate': parsePercentage(item?.['Purchase Rate'] || '0'),
    })), [data]);

  const maxSessions = useMemo(() => Math.max(...parsedData.map((item) => item.Sessions)), [parsedData]);

  const getBackgroundColor = (sessions: number) => {
    const intensity = sessions / maxSessions;
    return `rgba(0, 0, 255, ${Math.max(0.1, intensity)})`;
  };

  const getTextColor = (sessions: number) => {
    const intensity = sessions / maxSessions;
    return intensity > 0.7 ? 'text-white' : 'text-black';
  };

  const isNumericColumn = (column: string) => {
    return [
      'Add To Carts',
      'Checkouts',
      'Sessions',
      'Purchases',
      'Visitors',
      ...comparisonColumns,
    ].includes(column);
  };

  const sortedData = useMemo(() => {
    if (sortColumn) {
      return [...parsedData].sort((a, b) => {
        const aValue = typeof a[sortColumn] === 'number' 
          ? a[sortColumn] 
          : parseFloat((a[sortColumn] || '0').toString().replace('%', '').trim());
        const bValue = typeof b[sortColumn] === 'number' 
          ? b[sortColumn] 
          : parseFloat((b[sortColumn] || '0').toString().replace('%', '').trim());
  
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return parsedData;
  }, [parsedData, sortColumn, sortDirection]);
  

  const handleSort = (column: string) => {
    if (!isNumericColumn(column)) return;

    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getConditionalTextColor = (value: number, average: number) => {
    if (value < average) return 'text-red-500';
    else if (value > average) return 'text-green-500';
    else return 'text-yellow-500';
  };

  const getConditionalIcon = (value: number, average: number) => {
    if (value < average) {
      return <ArrowDown className="ml-1 text-red-500 w-3 h-3" />;
    } else if (value > average) {
      return <ArrowUp className="ml-1 text-green-500 w-3 h-3" />;
    } else {
      return null;
    }
  };

  return (
    <div className="relative border rounded-md overflow-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      <div className="overflow-x-auto min-w-full">
        <Table className="text-center">
          <TableHeader className="bg-gray-200 sticky top-0 z-10">
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column}
                  className={`font-bold px-4 text-black min-w-[170px] ${
                    isNumericColumn(column) ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center justify-center">
                    {column}
                    {isNumericColumn(column) && (
                      sortColumn === column ? (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 w-4 h-4" /> : <ArrowDown className="ml-1 w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="ml-1 w-4 h-4" />
                      )
                    )}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.slice(0, rowsToShow).map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => {
                  const cellValue = item[column as keyof typeof item];
                  const isComparisonColumn = comparisonColumns.includes(column);
                  return (
                    <TableCell
                      key={column}
                      className={`px-4 py-2 w-[160px] font-medium ${
                        column === 'Sessions'
                          ? getTextColor(Number(item.Sessions))
                          : isComparisonColumn
                          ? getConditionalTextColor(cellValue as number, averageValues[column])
                          : ''
                      }`}
                      style={{
                        backgroundColor: column === 'Sessions' ? getBackgroundColor(Number(item.Sessions)) : '',
                      }}
                    >
                      <div className="flex flex-row items-center justify-center gap-1">
                        {isComparisonColumn ? `${cellValue.toFixed(2)}%` : cellValue}
                        {isComparisonColumn &&
                          getConditionalIcon(cellValue as number, averageValues[column])}
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
  );
};

export default React.memo(ReportTable);