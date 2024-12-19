import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, ThumbsDown, Award, ChevronsLeft, ChevronRight, ChevronsRight, ChevronLeft } from 'lucide-react';
import { PageMetric } from '@/pages/ReportPage/component/LandingPageSession';
import { Button } from '@/components/ui/button';

interface TableProps {
  columns: string[];
  data: any[];
  allTimeData?: PageMetric[];
  isFullScreen?: boolean;
}

const getConditionalTextColor = (value: number, average: number) => {
  if (value > average) return 'text-green-800';
  if (value < average) return 'text-red-800';
  return 'text-yellow-500';
};

const getConditionalIcon = (value: number, average: number) => {
  if (value > average) return <ArrowUp className="w-4 h-4 text-green-800" />;
  if (value < average) return <ArrowDown className="w-4 h-4 text-red-800" />;
  return null;
};

const ReportTable: React.FC<TableProps> = ({
  columns = [],
  data = [],
  allTimeData = [],
  isFullScreen,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [isResizing, setIsResizing] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = isFullScreen ? 14 : 7;

  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const comparisonColumns = ['Add To Cart Rate', 'Checkout Rate', 'Purchase Rate'];

  const parsePercentage = (value: string): number => {
    return parseFloat(value?.replace('%', '').trim()) || 0;
  };

  const averageValues = useMemo(() => {
    const averages: Record<string, number> = {};
    comparisonColumns.forEach((key) => {
      const validData = data.filter(item => item[key] !== undefined && !isNaN(parsePercentage(item[key] || '0'))); // Validate data
      averages[key] = validData.length > 0 ?
        validData.reduce((sum, item) => sum + parsePercentage(item[key] || '0'), 0) / validData.length : 0;
    });
    return averages;
  }, [data]);

  const allTimeAverageValues = useMemo(() => {
    const averages: Record<string, number> = {};
    comparisonColumns.forEach((key) => {
      if (allTimeData) {
        const validAllTimeData = allTimeData.filter(item => item[key] !== undefined && !isNaN(parsePercentage(item[key] || '0'))); // Validate all time data
        averages[key] = validAllTimeData.length > 0 ?
          validAllTimeData.reduce((sum, item) => sum + parsePercentage(item[key] || '0'), 0) / validAllTimeData.length : 0;
      } else {
        averages[key] = 0;
      }
    });
    return averages;
  }, [allTimeData]);

  const rowPerformanceLabels = useMemo(() => {
    if (columns[0] === 'Date') return data.map(() => ({ currentLabel: null, allTimeLabel: null })); // Exclude performance labels for Daily E-Commerce metrics

    return data.map((item, _) => {
      if (!item || !comparisonColumns.every(column => item[column] !== undefined)) return { currentLabel: null, allTimeLabel: null }; // Validate data

      const currentPerformance = comparisonColumns.some((column) => {
        const value = parsePercentage(item[column] || '0');
        const average = averageValues[column];
        return value > average;
      });

      const isWorstPerformingCurrent = comparisonColumns.every((column) => {
        const value = parsePercentage(item[column] || '0');
        const average = averageValues[column];
        return value < average;
      });

      const currentLabel = currentPerformance ? 'Current Top' : isWorstPerformingCurrent ? 'Current Worst' : '';

      const allTimePerformance = comparisonColumns.some((column) => {
        const value = parsePercentage(item[column] || '0');
        const allTimeAverage = allTimeAverageValues[column];
        return value > allTimeAverage;
      });

      const isWorstPerformingAllTime = comparisonColumns.every((column) => {
        const value = parsePercentage(item[column] || '0');
        const allTimeAverage = allTimeAverageValues[column];
        return value < allTimeAverage;
      });

      const allTimeLabel =
        allTimePerformance
          ? 'All Time Top'
          : isWorstPerformingAllTime
            ? 'All Time Worst'
            : '';

      return {
        currentLabel,
        allTimeLabel,
      };
    });
  }, [data, allTimeData, averageValues, allTimeAverageValues, columns]);

  useEffect(() => {
    const initializeColumnWidths = () => {
      if (tableRef.current && containerRef.current) {
        const headerCells = tableRef.current.querySelectorAll('thead th');
        const widths = Array.from(headerCells).map(cell => {
          return Math.max(100, cell.clientWidth);
        });
        setColumnWidths(widths);
      }
    };

    initializeColumnWidths();
    window.addEventListener('resize', initializeColumnWidths);
    return () => window.removeEventListener('resize', initializeColumnWidths);
  }, [columns]);

  const handleMouseDown = (index: number, event: React.MouseEvent) => {
    setIsResizing(index);
    const startX = event.pageX;
    const startWidth = columnWidths[index];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.pageX - startX;
      const newWidth = Math.max(100, startWidth + delta);
      const newWidths = [...columnWidths];
      newWidths[index] = newWidth;
      setColumnWidths(newWidths);
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const parsedData = useMemo(() =>
    data.map((item, index) => ({
      ...item,
      currentPerformanceLabel: columns[0] !== 'Daily E-Commerce' ? rowPerformanceLabels?.[index]?.currentLabel || null : null,
      allTimePerformanceLabel: columns[0] !== 'Daily E-Commerce' ? rowPerformanceLabels?.[index]?.allTimeLabel || null : null,
      Sessions: Number(item?.Sessions || 0),
      'Add To Cart Rate': parsePercentage(item?.['Add To Cart Rate'] || '0'),
      'Checkout Rate': parsePercentage(item?.['Checkout Rate'] || '0'),
      'Purchase Rate': parsePercentage(item?.['Purchase Rate'] || '0'),
    })), [data, rowPerformanceLabels, columns]);

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

  const pageCount = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, pageCount));
    setCurrentPage(pageNumber);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="rounded-md overflow-x-auto relative border"
        style={{
          width: '100%',
          maxHeight: isFullScreen ? 'calc(100vh - 100px)' : 'calc(100vh - 400px)',
          overflowX: 'auto',
        }}
      >
        <table
          ref={tableRef}
          className="w-full text-center shadow-lg rounded-lg border border-gray-200"
          style={{
            tableLayout: 'fixed',
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead className="bg-gray-100">
            <tr>
              {columns[0] !== 'Date' && allTimeData && (
                <th
                  className="font-bold p-3 text-gray-800 text-sm border-b-2 sticky left-0 bg-gray-100 z-30 border-r border-gray-300"
                  style={{
                    width: `${columnWidths[0] + 10}px`,
                    minWidth: '200px',
                    position: 'sticky',
                    left: 0,
                    top: 0,
                  }}
                >
                  Performance Label
                  <div
                    onMouseDown={(e) => handleMouseDown(0, e)}
                    className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 ${isResizing === 0 ? 'bg-blue-300' : ''}`}
                  />
                </th>
              )}
              {columns.map((column, colIndex) => (
                <th
                  key={column}
                  className={`font-bold p-3 text-gray-800 text-sm border-b-2 capitalize sticky top-0 bg-gray-100 z-20 border-r border-gray-300 ${isNumericColumn(column) ? 'cursor-pointer' : ''} ${colIndex === 0 && columns[0] !== 'Date' && allTimeData ? 'sticky left-[150px]' : ''
                    }`}
                  style={{
                    width: `${columnWidths[colIndex] + 10}px`,
                    minWidth: '200px',
                    ...(colIndex === 0
                      ? { left: columns[0] !== 'Date' && allTimeData ? columnWidths[0] : 0 }
                      : {}),
                  }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center justify-center">
                    {column}
                    {isNumericColumn(column) && (
                      <span className="ml-2">
                        {sortColumn === column ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-500" />
                        )}
                      </span>
                    )}
                  </div>
                  <div
                    onMouseDown={(e) => handleMouseDown(colIndex, e)}
                    className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 ${isResizing === colIndex ? 'bg-blue-300' : ''}`}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((item, index) => (
              <tr
                key={index}
                className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  } hover:bg-gray-100 transition-colors duration-200 rounded-md`}
              >
                {columns[0] !== 'Date' && allTimeData && (
                  <td
                    className="p-3 text-sm font-normal sticky left-0 bg-white z-20 shadow-[2px_0_0_0_rgba(0,0,0,0.1)] border-r border-gray-300"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div className="flex items-center gap-1 min-w-[150px]">
                      {item.currentPerformanceLabel && (
                        <span
                          onClick={() => handleClickLabel(item.currentPerformanceLabel, 'current')}
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${item.currentPerformanceLabel === 'Current Top'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            } ${filterLabel === item.currentPerformanceLabel && filterType === 'current'
                              ? 'ring-2 ring-offset-1 ring-opacity-60'
                              : ''
                            } cursor-pointer`}
                        >
                          {item.currentPerformanceLabel === 'Current Top' ? (
                            <ArrowUp size={12} className="mr-1" />
                          ) : (
                            <ArrowDown size={12} className="mr-1" />
                          )}
                          {item.currentPerformanceLabel.split(' ')[1]}
                        </span>
                      )}
                      {item.allTimePerformanceLabel && (
                        <span
                          onClick={() => handleClickLabel(item.allTimePerformanceLabel, 'allTime')}
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${item.allTimePerformanceLabel === 'All Time Top'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                            } ${filterLabel === item.allTimePerformanceLabel && filterType === 'allTime'
                              ? 'ring-2 ring-offset-1 ring-opacity-60'
                              : ''
                            } cursor-pointer`}
                        >
                          {item.allTimePerformanceLabel === 'All Time Top' ? (
                            <Award size={12} className="mr-1" />
                          ) : (
                            <ThumbsDown size={12} className="mr-1" />
                          )}
                          All-time
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td
                  className="p-3 text-sm font-normal sticky left-[150px] bg-white z-20 shadow-[2px_0_0_0_rgba(0,0,0,0.1)] border-r border-gray-300"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    left: `${columns[0] !== 'Date' ? columnWidths[0] : 0}px`,
                  }}
                >
                  {item[columns[0]]}
                </td>
                {columns.slice(1).map((column) => {
                  const cellValue = item[column as keyof typeof item];
                  const isComparisonColumn = comparisonColumns.includes(column);

                  return (
                    <td
                      key={column}
                      className={`p-3 text-sm font-normal border-r border-gray-300 ${isComparisonColumn
                        ? getConditionalTextColor(cellValue as number, averageValues[column])
                        : 'text-gray-800'
                        }`}
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
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
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
        </div>
        <div className="flex items-center space-x-2">
        <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center text-sm font-medium">
            Page {currentPage} of {pageCount}
          </div>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === pageCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => goToPage(pageCount)}
            disabled={currentPage === pageCount}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default React.memo(ReportTable);