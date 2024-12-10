import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { PageMetric } from '@/pages/LandingPageSession/LandingPageSession';

interface TableProps {
  columns: string[];
  data: any[];
  rowsToShow?: number;
  allTimeData?: PageMetric[]
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
  allTimeData
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);


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

  const allTimeAverageValues = useMemo(() => {
    const averages: Record<string, number> = {};
    comparisonColumns.forEach((key) => {
      if (allTimeData) {
        averages[key] =
          allTimeData.reduce((sum, item) => sum + parsePercentage(item[key] || '0'), 0) / allTimeData.length;
      } else {
        averages[key] = 0;
      }
    });
    return averages;
  }, [allTimeData])

  const rowPerformanceLabels = useMemo(() => {
    return data.map((item) => {
      // Determine current performance labels based on current data and averages
      const currentPerformance = comparisonColumns.some(column => {
        const value = parsePercentage(item?.[column] || '0');
        const average = averageValues[column];
        return value > average;
      });

      // Determine if it's the worst performing in the current date range
      const isWorstPerformingCurrent = comparisonColumns.every(column => {
        const value = parsePercentage(item?.[column] || '0');
        const average = averageValues[column];
        return value < average;
      });

      // Create separate labels for current performance
      const currentLabel = currentPerformance ? 'Current Top' : isWorstPerformingCurrent ? 'Current Worst' : '';

      // Calculate all-time performance labels independently of the current data
      const allTimePerformance = allTimeData?.some((allItem) => {
        return comparisonColumns.every(column => {
          const allTimeAverage = allTimeAverageValues[column];
          const value = parsePercentage(allItem?.[column] || '0');
          return value > allTimeAverage;
        });
      });

      // Determine if it's the worst performing in all-time data
      const isWorstPerformingAllTime = allTimeData?.every((allItem) => {
        return comparisonColumns.every(column => {
          const allTimeAverage = allTimeAverageValues[column];
          const value = parsePercentage(allItem?.[column] || '0');
          return value < allTimeAverage;
        });
      });

      // Create separate labels for all-time performance
      const allTimeLabel = allTimePerformance ? 'All Time Top' : isWorstPerformingAllTime ? 'All Time Worst' : '';

      return {
        currentLabel,
        allTimeLabel
      };
    });
  }, [data, allTimeData, averageValues, allTimeAverageValues]);




  const parsedData = useMemo(() =>
    data.map((item, index) => ({
      ...item,
      currentPerformanceLabel: rowPerformanceLabels?.[index]?.currentLabel || null,
      allTimePerformanceLabel: rowPerformanceLabels?.[index]?.allTimeLabel || null,
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

  const handleClickLabel = (label: string, type: string) => {
    if (filterLabel === label && filterType === type) {
      setFilterLabel(null);
      setFilterType(null);
    } else {
      setFilterLabel(label);
      setFilterType(type);
    }
  };


  const filteredData = useMemo(() => {
    if (filterLabel) {
      return sortedData.filter((item) => {
        if (filterType === 'current') {
          return item.currentPerformanceLabel === filterLabel;
        }
        if (filterType === 'allTime') {
          return item.allTimePerformanceLabel === filterLabel;
        }
        return false;
      });
    }
    return sortedData;
  }, [sortedData, filterLabel, filterType]);





  return (
    <div className="rounded-md overflow-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
      <table className="w-full text-center shadow-lg rounded-lg overflow-auto">
        <thead className="bg-white sticky top-0 z-10">
          <tr>
            {/* Header for Performance Label */}
            <th className="font-bold p-3 text-gray-800 text-sm min-w-[160px] border-b-2">
              Performance Label
            </th>
            {columns.map((column) => (
              <th
                key={column}
                className={`font-bold p-3 text-gray-800 text-sm min-w-[160px] border-b-2 ${isNumericColumn(column) ? 'cursor-pointer' : ''}`}
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
              className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100 transition-colors duration-200 rounded-md`}
            >
              {/* Performance Label Column */}
              <td className="p-3 text-sm font-normal">
                <div className="flex flex-col items-center gap-1">
                  {item.currentPerformanceLabel === 'Current Top' && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full cursor-pointer">
                      Current Top
                    </span>
                  )}
                  {item.currentPerformanceLabel === 'Current Worst' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full cursor-pointer">
                      Current Worst
                    </span>
                  )}
                  {item.allTimePerformanceLabel === 'All Time Top' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full cursor-pointer">
                      All Time Top
                    </span>
                  )}
                  {item.allTimePerformanceLabel === 'All Time Worst' && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full cursor-pointer">
                      All Time Worst
                    </span>
                  )}
                </div>
              </td>

              {/* Other columns */}
              {columns.map((column) => {
                const cellValue = item[column as keyof typeof item];
                const isComparisonColumn = comparisonColumns.includes(column);

                return (
                  <td
                    key={column}
                    className={`p-3 text-sm font-normal ${isComparisonColumn
                      ? getConditionalTextColor(cellValue as number, averageValues[column])
                      : 'text-gray-800'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isComparisonColumn ? `${(cellValue as number).toFixed(2)}%` : cellValue}
                      {isComparisonColumn && getConditionalIcon(cellValue as number, averageValues[column])}
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
