import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

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
    if (value < average) return 'text-red-600';
    else if (value > average) return 'text-green-600';
    else return 'text-yellow-600';
  };

  const getConditionalIcon = (value: number, average: number) => {
    if (value < average) {
      return <ArrowDown className="ml-1 text-red-600 w-3 h-3" />;
    } else if (value > average) {
      return <ArrowUp className="ml-1 text-green-600 w-3 h-3" />;
    } else {
      return null;
    }
  };

  return (
    <div className="rounded-md overflow-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
      <table className="w-full text-center shadow-lg rounded-lg overflow-auto">
        <thead className="bg-white sticky top-0 z-10">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className={`font-bold p-3 text-gray-800 text-sm uppercase min-w-[200px] border-b-2 ${isNumericColumn(column) ? 'cursor-pointer' : ''
                  }`}
                onClick={() => handleSort(column)}
                style={{ position: 'sticky', top: 0 }}
              >
                <div className="flex items-center justify-center">
                  {column}
                  {isNumericColumn(column) && (
                    <span className="ml-2">
                      {sortColumn === column ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-gray-500" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.slice(0, rowsToShow).map((item, index) => (
            <tr
              key={index}
              className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'} hover:bg-gray-100 transition-colors duration-200 rounded-md`}
            >
              {columns.map((column) => {
                const cellValue = item[column as keyof typeof item];
                const isComparisonColumn = comparisonColumns.includes(column);
                return (
                  <td
                    key={column}
                    className={`p-3 text-sm font-normal ${column === 'Sessions'
                      ? getTextColor(Number(item.Sessions))
                      : isComparisonColumn
                        ? getConditionalTextColor(cellValue as number, averageValues[column])
                        : 'text-gray-800'
                      }`}
                    style={{
                      backgroundColor: column === 'Sessions' ? getBackgroundColor(Number(item.Sessions)) : '',
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isComparisonColumn ? `${(cellValue as number).toFixed(2)}%` : cellValue}
                      {isComparisonColumn &&
                        getConditionalIcon(cellValue as number, averageValues[column])}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(ReportTable);

