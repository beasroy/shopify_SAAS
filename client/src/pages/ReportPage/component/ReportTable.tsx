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

const getConditionalColors = (value: number, average: number) => {
  const epsilon = 0.0001; // Small tolerance for floating-point comparisons

  if (value > average) return 'bg-green-100 text-green-800';
  if (value < average) return 'bg-red-50 text-red-800';
  if (Math.abs(value - average) < epsilon) return 'bg-yellow-100 text-yellow-700'; // Handles approximate equality

  return 'bg-yellow-100 text-yellow-700';
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
  const [loadedRows, setLoadedRows] = useState<any[]>([]);
  const rowsPerChunk = 30;
  const rowsPerPage = 7;
  const isDateTable = columns[0] === 'Date';

  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializationRef = useRef(false);
  const dataRef = useRef(data);
  const filteredDataRef = useRef<any[]>([]);

  const comparisonColumns = ['Add To Cart Rate', 'Checkout Rate', 'Purchase Rate', 'Sessions'];

  const parsePercentage = (value: string): number => {
    return parseFloat(value?.replace('%', '').trim()) || 0;
  };

  // Initialize column widths only once after initial render
  useEffect(() => {
    if (!initializationRef.current && tableRef.current && containerRef.current) {
      const headerCells = tableRef.current.querySelectorAll('thead th');
      const widths = Array.from(headerCells).map(cell => {
        return Math.max(100, cell.clientWidth);
      });
      setColumnWidths(widths);
      initializationRef.current = true;
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (tableRef.current && containerRef.current && initializationRef.current) {
        const headerCells = tableRef.current.querySelectorAll('thead th');
        const widths = Array.from(headerCells).map((cell, index) => {
          return Math.max(100, columnWidths[index] || cell.clientWidth);
        });
        setColumnWidths(widths);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [columnWidths]);

  const averageValues = useMemo(() => {
    const averages: Record<string, number> = {};
    comparisonColumns.forEach((key) => {
      const validData = data.filter(item => item[key] !== undefined && !isNaN(parsePercentage(item[key] || '0')));
      const average = validData.length > 0
        ? validData.reduce((sum, item) => sum + parsePercentage(item[key] || '0'), 0) / validData.length
        : 0;

      // Convert "Sessions" to an integer, others remain as decimals
      averages[key] = key === 'Sessions' ? Math.round(average) : parseFloat(average.toFixed(2));
    });
    return averages;
  }, [data]);



  const allTimeAverageValues = useMemo(() => {
    const averages: Record<string, number> = {};
    comparisonColumns.forEach((key) => {
      if (allTimeData) {
        const validAllTimeData = allTimeData.filter(item => item[key] !== undefined && !isNaN(parsePercentage(item[key] || '0')));
        averages[key] = validAllTimeData.length > 0 ?
          validAllTimeData.reduce((sum, item) => sum + parsePercentage(item[key] || '0'), 0) / validAllTimeData.length : 0;
      } else {
        averages[key] = 0;
      }
    });
    return averages;
  }, [allTimeData]);

  const rowPerformanceLabels = useMemo(() => {
    if (columns[0] === 'Date') return data.map(() => ({ currentLabel: null, allTimeLabel: null }));

    return data.map((item) => {
      if (!item || !comparisonColumns.every(column => item[column] !== undefined)) {
        return { currentLabel: null, allTimeLabel: null };
      }

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

      const allTimeLabel = allTimePerformance ? 'All Time Top' : isWorstPerformingAllTime ? 'All Time Worst' : '';

      return {
        currentLabel,
        allTimeLabel,
      };
    });
  }, [data, allTimeData, averageValues, allTimeAverageValues, columns]);

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
      currentPerformanceLabel: !isDateTable ? rowPerformanceLabels[index]?.currentLabel || null : null,
      allTimePerformanceLabel: !isDateTable ? rowPerformanceLabels[index]?.allTimeLabel || null : null,
      Sessions: Number(item?.Sessions || 0),
      'Add To Cart Rate': parsePercentage(item?.['Add To Cart Rate'] || '0'),
      'Checkout Rate': parsePercentage(item?.['Checkout Rate'] || '0'),
      'Purchase Rate': parsePercentage(item?.['Purchase Rate'] || '0'),
    })), [data, rowPerformanceLabels, isDateTable]);

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
    const result = isDateTable
      ? sortedData
      : filterLabel
        ? sortedData.filter((item) => {
          if (filterType === 'current') {
            return item.currentPerformanceLabel === filterLabel;
          }
          if (filterType === 'allTime') {
            return item.allTimePerformanceLabel === filterLabel;
          }
          return false;
        })
        : sortedData;

    filteredDataRef.current = result;
    return result;
  }, [sortedData, filterLabel, filterType, isDateTable]);


  useEffect(() => {
    if (isFullScreen) {
      setLoadedRows(filteredDataRef.current.slice(0, rowsPerChunk));
    }
  }, [isFullScreen]);

  useEffect(() => {
    if (
      isFullScreen &&
      (dataRef.current !== data ||
        filterLabel !== null ||
        sortColumn !== null)
    ) {
      setLoadedRows(filteredDataRef.current.slice(0, rowsPerChunk));
      dataRef.current = data;
    }
  }, [data, filterLabel, sortColumn, isFullScreen]);

  const loadMoreRows = () => {
    if (isFullScreen && loadedRows.length < filteredDataRef.current.length) {
      const nextChunk = filteredDataRef.current.slice(
        loadedRows.length,
        loadedRows.length + rowsPerChunk
      );
      setLoadedRows(prev => [...prev, ...nextChunk]);
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const target = event.currentTarget;
    if (
      target.scrollHeight - target.scrollTop <= target.clientHeight + 100
    ) {
      loadMoreRows();
    }
  };

  const displayRows = useMemo(() => {
    if (isFullScreen) {
      return loadedRows;
    }
    return filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [isFullScreen, loadedRows, filteredData, currentPage, rowsPerPage]);

  const pageCount = Math.ceil(filteredData.length / rowsPerPage);

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, pageCount));
    setCurrentPage(pageNumber);
  };

  const columnPairs = {
    'Add To Cart': 'Add To Cart Rate',
    'Checkouts': 'Checkout Rate',
    'Purchases': 'Purchase Rate'
  };
  

  return (
    <>
      <div
        ref={containerRef}
        className="rounded-md overflow-x-auto relative border"
        style={{
          width: '100%',
          maxHeight: isFullScreen ? 'calc(100vh - 105px)' : 'calc(100vh - 350px)',
          overflowX: 'auto',
        }}
        onScroll={isFullScreen ? handleScroll : undefined}
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
                  className="font-bold p-2 text-gray-800 text-sm border-b-2 sticky left-0 bg-gray-100 z-30 border-r border-gray-300"
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
              {columns.map((column, colIndex) => {
                const isFirstColumn = colIndex === 0;
                const needsLeftSticky = isFirstColumn && columns[0] === 'Date';
                const isComparisonCol = comparisonColumns.includes(column);

                return (
                  <th
                    key={column}
                    className={`
            font-bold p-2 text-gray-800 text-sm border-b-2 
            capitalize sticky top-0 bg-gray-100 
            border-r border-gray-300 
            ${isNumericColumn(column) ? 'cursor-pointer' : ''}
            ${needsLeftSticky ? 'sticky left-0 z-30' : 'z-20'}
            ${isFirstColumn && columns[0] !== 'Date' && allTimeData ? 'sticky left-[150px]' : ''}
          `}
                    style={{
                      width: `${columnWidths[colIndex] + 10}px`,
                      minWidth: '200px',
                      ...(isFirstColumn && {
                        left: needsLeftSticky
                          ? 0
                          : (columns[0] !== 'Date' && allTimeData ? columnWidths[0] : 0)
                      }),
                      ...(needsLeftSticky && {
                        backgroundColor: 'rgb(243 244 246)', // bg-gray-100
                        zIndex: 30,
                      })
                    }}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center mb-1">
                        <span>{column}</span>
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
                      {isComparisonCol && averageValues[column] !== undefined && (
                        <span className="text-xs text-gray-500">
                          avg: {column === 'Sessions'
                            ? Math.round(averageValues[column])
                            : averageValues[column]?.toFixed(2)}
                          {column !== 'Sessions' ? '%' : ''}
                        </span>
                      )}
                    </div>
                    <div
                      onMouseDown={(e) => handleMouseDown(colIndex, e)}
                      className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 ${isResizing === colIndex ? 'bg-blue-300' : ''
                        }`}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {displayRows.map((item, index) => (
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
                  const isPairedColumn = column in columnPairs;

                  let colorClass = 'text-gray-800';
                  if (isComparisonColumn) {
                    colorClass = getConditionalColors(cellValue as number, averageValues[column]);
                  } else if (isPairedColumn) {
                    const rateColumn = columnPairs[column as keyof typeof columnPairs];
                    const rateValue = item[rateColumn] as number;
                    colorClass = getConditionalColors(rateValue, averageValues[rateColumn]);
                  }
                  return (
                    <td
                      key={column}
                      className={`p-3 text-sm font-normal border-r border-gray-300 ${colorClass}`}
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {column.includes('Rate')
                          ? `${(cellValue as number).toFixed(2)}%`
                          : cellValue}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isFullScreen && (
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
        </div>)}
    </>
  );
};

export default React.memo(ReportTable);