import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, ChevronsLeft, ChevronRight, ChevronsRight, ChevronLeft, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableProps {
  columns: string[];
  data: any[];
  isFullScreen?: boolean;
}

const getConditionalColors = (value: number, average: number) => {
  const epsilon = 0.0001;

  if (value > average) return 'bg-green-100 text-green-800';
  if (value < average) return 'bg-red-50 text-red-800';
  if (Math.abs(value - average) < epsilon) return 'bg-yellow-100 text-yellow-700';

  return 'bg-yellow-100 text-yellow-700';
};

const NewReportTable: React.FC<TableProps> = ({
  columns = [],
  data = [],
  isFullScreen,
}) => {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [columnWidths, setColumnWidths] = useState<number[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loadedRows, setLoadedRows] = useState<any[]>([]);
    const [columnOrder, setColumnOrder] = useState<string[]>(columns);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    
  
    const rowsPerChunk = 30;
    const rowsPerPage = 9;
    const minColumnWidth = isFullScreen ? 100 : 150;
  
    const tableRef = useRef<HTMLTableElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const widthsRef = useRef<number[]>([]);
  
    const comparisonColumns = ['Add To Cart Rate', 'Checkout Rate', 'Purchase Rate', 'Sessions'];

    useEffect(() => {
      setColumnOrder(columns);
    }, [columns]);
  
    const handleDragStart = (e: React.DragEvent, column: string) => {
      setDraggedColumn(column);
      e.dataTransfer.effectAllowed = 'move';
    };
  
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };
  
    const handleDrop = (e: React.DragEvent, targetColumn: string) => {
      e.preventDefault();
      if (!draggedColumn || draggedColumn === targetColumn) return;
  
      const newOrder = [...columnOrder];
      const draggedIdx = newOrder.indexOf(draggedColumn);
      const targetIdx = newOrder.indexOf(targetColumn);
  
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedColumn);
  
      setColumnOrder(newOrder);
      setDraggedColumn(null);
    };

    const parsePercentage = (value: string | number): number => {
        // If value is already a number, return it
        if (typeof value === 'number') return value;
        
        // If value is undefined or null, return 0
        if (!value) return 0;
        
        // If value is string, remove % and convert to number
        return parseFloat(value.replace('%', '').trim()) || 0;
      };

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const totalColumns = columns.length;
      
      let initialWidths: number[];
      if (isFullScreen) {
        const equalWidth = Math.max(minColumnWidth, Math.floor(containerWidth / totalColumns));
        initialWidths = columns.map(() => equalWidth);
      } else {
        initialWidths = columns.map((_, index) => 
          index === 0 ? 160 : 150
        );
      }
      
      setColumnWidths(initialWidths);
      widthsRef.current = initialWidths;
    }
  }, [columns.length, isFullScreen]);

 



  const averageValues = useMemo(() => {
    const averages: Record<string, number> = {};
    comparisonColumns.forEach((key) => {
      const validData = data.filter(item => item[key] !== undefined && !isNaN(parsePercentage(item[key] || '0')));
      const average = validData.length > 0
        ? validData.reduce((sum, item) => sum + parsePercentage(item[key] || '0'), 0) / validData.length
        : 0;

      averages[key] = key === 'Sessions' ? Math.round(average) : parseFloat(average.toFixed(2));
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

    const sortedData = useMemo(() => {
        if (!sortColumn) return parsedData;
      
        return [...parsedData].sort((a, b) => {
          const aValue = a[sortColumn];
          const bValue = b[sortColumn];
      
          if (sortColumn === 'Date') {
            const parseDateString = (dateStr: string) => {
              const [day, month, year] = dateStr.split('-');
              return new Date(`${year}-${month}-${day}`);
            };
      
            const aDate = parseDateString(aValue);
            const bDate = parseDateString(bValue);
      
            return sortDirection === 'asc'
              ? aDate.getTime() - bDate.getTime()
              : bDate.getTime() - aDate.getTime();
          }
      
          // Handle numeric sorting for other columns
          const aNum = typeof aValue === 'number'
            ? aValue
            : parseFloat((aValue || '0').toString().replace('%', '').trim());
          const bNum = typeof bValue === 'number'
            ? bValue
            : parseFloat((bValue || '0').toString().replace('%', '').trim());
      
          if (aNum < bNum) return sortDirection === 'asc' ? -1 : 1;
          if (aNum > bNum) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }, [parsedData, sortColumn, sortDirection]);

  const isNumericColumn = (column: string) => {
    return [
      'Date',

    ].includes(column);
  };

  const handleSort = (column: string) => {
    if (!isNumericColumn(column)) return;
  
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    } 
  };

  useEffect(() => {
    if (isFullScreen) {
      setLoadedRows(sortedData.slice(0, rowsPerChunk));
    }
  }, [isFullScreen, sortedData, rowsPerChunk]);

  const loadMoreRows = () => {
    if (isFullScreen && loadedRows.length < sortedData.length) {
      const nextChunk = sortedData.slice(
        loadedRows.length,
        loadedRows.length + rowsPerChunk
      );
      setLoadedRows(prev => [...prev, ...nextChunk]);
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      loadMoreRows();
    }
  };

  const displayRows = useMemo(() => {
    if (isFullScreen) {
      return loadedRows;
    }
    return sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [isFullScreen, loadedRows, sortedData, currentPage, rowsPerPage]);

  const pageCount = Math.ceil(sortedData.length / rowsPerPage);

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, pageCount));
    setCurrentPage(pageNumber);
  };

  const columnPairs = {
    'Add To Cart': 'Add To Cart Rate',
    'Checkouts': 'Checkout Rate',
    'Purchases': 'Purchase Rate'
  };
  const renderHeader = (column: string, colIndex: number) => {
    const isComparisonCol = comparisonColumns.includes(column);

    return (
      <th
        key={column}
        className={`
          relative font-bold p-1 text-gray-800 text-sm border-b-2
          capitalize border-r border-gray-300
          ${isNumericColumn(column) ? 'cursor-pointer' : ''}
          ${colIndex === 0 && !isFullScreen ? 'sticky left-0 z-30 bg-gray-100' : ''}
          ${draggedColumn === column ? 'opacity-50' : ''}
          hover:bg-gray-200 transition-colors duration-200
        `}
        style={{
          width: colIndex === 0 ? '180px' : `${columnWidths[colIndex]}px`,
        }}
        draggable
        onDragStart={(e) => handleDragStart(e, column)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, column)}
      >
        <div onClick={() => handleSort(column)} className="flex flex-col items-center">
          <div  className="flex items-center justify-center gap-2 mb-1">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
            <span >{column}</span>
            {isNumericColumn(column) && (
              <span className="ml-2">
                {sortColumn === column ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-blue-600" />
                  )
                ) : (
                  ""
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
      </th>
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        className="rounded-md overflow-x-auto relative border"
        style={{
          width: '100%',
          maxHeight: isFullScreen ? 'calc(100vh - 105px)' : 'calc(100vh - 200px)',
          overflowX: isFullScreen ? 'hidden' : 'auto',
        }}
        onScroll={isFullScreen ? handleScroll : undefined}
      >
        <table
          ref={tableRef}
          className="w-full text-center shadow-lg rounded-lg border border-gray-200"
          style={{
            tableLayout: 'fixed',
            width: isFullScreen ? '100%' : 'auto',
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}
        >
          <thead className="bg-gray-100">
            <tr>
              {columnOrder.map((column, index) => renderHeader(column, index))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayRows.map((item, rowIndex) => (
              <tr
                key={rowIndex}
                className={`${
                  rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                } hover:bg-gray-100 transition-colors duration-200`}
              >
                {columnOrder.map((column, colIndex) => {
                  const cellValue = item[column];
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
                      key={`${rowIndex}-${column}`}
                      className={`p-3 text-sm font-normal border-r border-gray-300 ${colorClass} ${
                        colIndex === 0 && !isFullScreen
                          ? 'sticky left-0 z-20 bg-inherit'
                          : ''
                      }`}
                      style={{
                        width: colIndex === 0 ? '150px' : `${columnWidths[colIndex]}px`,
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
          Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} entries
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

export default React.memo(NewReportTable);