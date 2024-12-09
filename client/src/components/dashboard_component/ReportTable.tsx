import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface TableProps {
  columns: string[];
  data: any[];
  rowsToShow?: number; 
}

const getConditionalTextColor = (value: number, average: number) => {
  if (value > average) return 'text-green-600';
  if (value < average) return 'text-red-600';
  return 'text-gray-600';
};



const getConditionalIcon = (value: number, average: number) => {
  if (value > average) return <ArrowUp className="w-4 h-4 text-green-600" />;
  if (value < average) return <ArrowDown className="w-4 h-4 text-red-600" />;
  return null;
};

const ReportTable: React.FC<TableProps> = ({ 
  columns, 
  data, 
  rowsToShow, 
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterLabel, setFilterLabel] = useState<'top' | 'worst' | null>(null);

  const comparisonColumns = ['Add To Cart Rate', 'Checkout Rate', 'Purchase Rate'];

  const parsePercentage = (value: string): number => {
    return parseFloat(value?.replace('%', '').trim()) || 0;
  };

  const averageValues = useMemo(() => {
    const averages: Record<string, number> = {};
    comparisonColumns.forEach((key) => {
      averages[key] =
        data.reduce((sum, item) => sum + parsePercentage(item?.[key] || '0'), 0) / data.length || 0;
    });
    return averages;
  }, [data]);

  const rowPerformanceLabels = useMemo(() => {
    return data.map((item) => {
      const isTopPerforming = comparisonColumns.some(column => {
        const value = parsePercentage(item?.[column] || '0');
        const average = averageValues[column];
        return value > average;
      });

      const isWorstPerforming = comparisonColumns.every(column => {
        const value = parsePercentage(item?.[column] || '0');
        const average = averageValues[column];
        return value < average;
      });

      if (isTopPerforming) return 'top';
      if (isWorstPerforming) return 'worst';
      return null;
    });
  }, [data, averageValues]);

  const parsedData = useMemo(() =>
    data.map((item, index) => ({
      ...item,
      performanceLabel: rowPerformanceLabels?.[index] || null,
      Sessions: Number(item?.Sessions || 0),
      'Add To Cart Rate': parsePercentage(item?.['Add To Cart Rate'] || '0'),
      'Checkout Rate': parsePercentage(item?.['Checkout Rate'] || '0'),
      'Purchase Rate': parsePercentage(item?.['Purchase Rate'] || '0'),
    })), [data, rowPerformanceLabels]);


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

  const isNumericColumn = (column: string) => {
    return [
      'Add To Cart',
      'Checkouts',
      'Sessions',
      'Purchases',
      'Visitors',
      ...comparisonColumns,
    ].includes(column);
  };

  const handleLabelClick = (label: 'top' | 'worst') => {
    if (filterLabel === label) {
      setFilterLabel(null); // Remove the filter if the same label is clicked again
    } else {
      setFilterLabel(label);
    }
  };

  const filteredData = useMemo(() => {
    if (filterLabel) {
      return sortedData.filter((item) => item.performanceLabel === filterLabel);
    }
    return sortedData;
  }, [sortedData, filterLabel]);
  const maxSessions = useMemo(() => Math.max(...parsedData.map((item) => item.Sessions)), [parsedData]);

const getBackgroundColor = (sessions: number) => {
  const intensity = sessions / maxSessions;
  return `rgba(0, 0, 255, ${Math.max(0.1, intensity)})`;
};
const getTextColor = (sessions: number) => {
  const intensity = sessions / maxSessions;
  return intensity > 0.7 ? 'text-white' : 'text-black';
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
          {filteredData.slice(0, rowsToShow).map((item, index) => (
            <tr
              key={index}
              className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'} hover:bg-gray-100 transition-colors duration-200 rounded-md`}
            >
              {columns.map((column) => {
                const cellValue = item[column as keyof typeof item];
                const isComparisonColumn = comparisonColumns.includes(column);
                const firstColumn = columns[0];
                
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
                      {isComparisonColumn && getConditionalIcon(cellValue as number, averageValues[column])}
                      
                      {/* Performance Label for the specified column */}
                      {column === firstColumn && item.performanceLabel === 'top' && (
                        <span
                          className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full cursor-pointer"
                          onClick={() => handleLabelClick('top')}
                        >
                          Top
                        </span>
                      )}
                      {column === firstColumn && item.performanceLabel === 'worst' && (
                        <span
                          className="ml-1 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full cursor-pointer"
                          onClick={() => handleLabelClick('worst')}
                        >
                          Worst
                        </span>
                      )}
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
