import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

export interface MonthlyData {
  Month: string;
  [key: string]: number | string;
}

export interface RowData {
  [key: string]: number | string | MonthlyData[];
}

interface ConversionTableProps {
  data: RowData[];
  primaryColumn: string;
  secondaryColumns: string[];
  monthlyDataKey: string;
  monthlyMetrics: string[];
  isFullScreen: boolean;
}

export default function ConversionTable({
  data,
  primaryColumn,
  secondaryColumns,
  monthlyDataKey,
  monthlyMetrics,
  isFullScreen
}: ConversionTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedRows, setLoadedRows] = useState<Array<{ dataIndex: number; metricIndex: number }>>([]);
  const rowsPerPage = 8;
  const rowsPerChunk = 30;

  const getTableHeight = () => {
    return isFullScreen ? 'max-h-[calc(100vh-130px)]' : 'max-h-[400px]';
  };

  const months = useMemo(() => {
    if (!Array.isArray(data)) {
      console.error("Data is not an array:", data);
      return [];
    }

    const allMonths = new Set<string>();
    data.forEach((row) => {
      const monthlyData = row[monthlyDataKey] as MonthlyData[] | undefined;
      if (Array.isArray(monthlyData)) {
        monthlyData.forEach((month) => {
          if (month?.Month) {
            allMonths.add(`${month.Month.slice(0, 4)}-${month.Month.slice(4)}`);
          }
        });
      }
    });
    return Array.from(allMonths).sort().reverse();
  }, [data, monthlyDataKey]);

  const allRows = useMemo(() => {
    const rows: Array<{ dataIndex: number; metricIndex: number }> = [];
    data.forEach((_, dataIndex) => {
      monthlyMetrics.forEach((_, metricIndex) => {
        rows.push({ dataIndex, metricIndex });
      });
    });
    return rows;
  }, [data, monthlyMetrics]);

  const loadMoreRows = () => {
    setLoadedRows((prevRows) => [
      ...prevRows,
      ...allRows.slice(prevRows.length, prevRows.length + rowsPerChunk)
    ]);
  };

  useEffect(() => {
    if (isFullScreen) {
      setLoadedRows(allRows.slice(0, rowsPerChunk));
    }
  }, [isFullScreen, allRows]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadMoreRows();
    }
  };

  const displayRows = useMemo(() => {
    if (isFullScreen) {
      return loadedRows;
    }
    return allRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [isFullScreen, allRows, loadedRows, currentPage]);

  const thresholds = useMemo(() => {
    let totalSessions = 0;
    let totalConvRate = 0;
    let count = 0;

    data.forEach(row => {
      if (typeof row['Total Sessions'] === 'number' && typeof row['Avg Conv. Rate'] === 'number') {
        totalSessions += Number(row['Total Sessions']);
        totalConvRate += Number(row['Avg Conv. Rate']);
        count++;
      }
    });

    return {
      avgSessions: totalSessions / count,
      avgConvRate: totalConvRate / count
    };
  }, [data]);

  

  useEffect(() => {
    if (!isFullScreen) {
      setCurrentPage(1);
    }
  }, [isFullScreen]);

  const getMetricColor = (sessions: number, convRate: number) => {
    const isHighSessions = sessions >= thresholds.avgSessions;
    const isGoodConversion = convRate >= thresholds.avgConvRate;

    if (isHighSessions && isGoodConversion) return 'bg-green-100';
    if (isHighSessions && !isGoodConversion) return 'bg-blue-100';
    if (!isHighSessions && isGoodConversion) return 'bg-yellow-100';
    return 'bg-red-50';
  };

  const renderCell = (value: number | string, isPercentage: boolean = false) => {
    if (typeof value === "number") {
      return isPercentage ? `${value.toFixed(2)} %` : value.toLocaleString();
    }
    return value;
  };

  const renderMonthCell = (monthData: MonthlyData | undefined, metric: string) => {
    if (!monthData) {
      return (
        <td className="w-[100px] text-right whitespace-nowrap p-2 text-xs border-r border-border bg-background">
          -
        </td>
      );
    }

    const value = monthData[metric];
    let bgColor = 'bg-background';

    if (
      (metric === 'Sessions' || metric === 'Conv. Rate') &&
      typeof monthData['Sessions'] === 'number' &&
      typeof monthData['Conv. Rate'] === 'number'
    ) {
      bgColor = getMetricColor(
        Number(monthData['Sessions']),
        Number(monthData['Conv. Rate'])
      );
    }

    return (
      <td className={`w-[100px]  text-right whitespace-nowrap p-2 text-xs border-r border-border ${bgColor}`}>
        {renderCell(value, metric.toLowerCase().includes('rate'))}
        {/* Additional cell for Purchases */}
        {metric === 'Conv. Rate' && (
          <div className="text-xs text-muted-foreground">{`Purchases: ${monthData['Purchases'] ?? 0}`}</div>
        )}
      </td>
    );
  };

  const renderMetricValue = (
    row: RowData,
    column: string,
    currentMetric: string,
    columnIndex: number
  ) => {
    const value = row[column];

    if (typeof value !== "number") {
      return (
        <td
          className="sticky top-0 min-w-[130px] p-2 text-xs border-r border-border bg-background"
          style={{ left: `${130 + 100 + columnIndex * 130}px` }}
        >
          {""}
        </td>
      );
    }

    let bgColor = "bg-background";

    if (
      (currentMetric === "Sessions" && column === "Total Sessions") ||
      (currentMetric === "Conv. Rate" && column === "Avg Conv. Rate")
    ) {
      const sessions = row["Total Sessions"] as number;
      const convRate = row["Avg Conv. Rate"] as number;
      bgColor = getMetricColor(sessions, convRate);
    }

    return (
      <td
        className={`sticky top-0 min-w-[130px] p-2 text-xs border-r border-border ${bgColor}`}
        style={{ left: `${130 + 100 + columnIndex * 130}px` }}
      >
        {currentMetric.toLowerCase() === "sessions" && column === "Total Sessions"
          ? renderCell(value)
          : currentMetric.toLowerCase() === "conv. rate" &&
            column === "Avg Conv. Rate"
            ? renderCell(value, true)
            : ""}
      </td>
    );
  };


  const totalRows = allRows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };
  const renderColumnHeader = (column: string, index: number) => {
    let thresholdValue = '';
    if (column === 'Total Sessions') {
      thresholdValue = `(avg: ${Math.round(thresholds.avgSessions).toLocaleString()})`;
    } else if (column === 'Avg Conv. Rate') {
      thresholdValue = `(avg: ${thresholds.avgConvRate.toFixed(2)}%)`;
    }

    return (
      <th
        key={column}
        className="sticky top-0 min-w-[130px] w-[150px] z-20 px-2 py-2.5 text-left text-sm font-medium text-muted-foreground border-r border-border bg-slate-100"
        style={{ left: `${130 + 100 + index * 130}px` }}
      >
        <div className="flex flex-col">
          <span>{column}</span>
          {thresholdValue && (
            <span className="text-xs text-muted-foreground font-normal">
              {thresholdValue}
            </span>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="w-full border border-border rounded-lg flex flex-col">
      <div className={`relative overflow-x-auto ${getTableHeight()}`} onScroll={isFullScreen ? handleScroll : undefined}>
        <table className="w-full">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 min-w-[130px]  w-[150px] z-20 px-2 py-2.5 text-left text-sm font-medium text-muted-foreground border-r border-border bg-slate-100">
                {primaryColumn}
              </th>
              <th className="sticky left-[130px] top-0 min-w-[100px] w-[150px] z-20 px-2 py-2.5 text-left text-sm font-medium text-muted-foreground border-r border-border bg-slate-100">
                Metric
              </th>
              {secondaryColumns.map((column, index) => renderColumnHeader(column, index))}
              {months.map((month) => (
                <th
                  key={month}
                  className="sticky top-0 min-w-[100px] z-10 px-2 py-2.5 text-right text-sm font-medium text-muted-foreground whitespace-nowrap border-r border-border bg-zinc-50"
                >
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayRows.map(({ dataIndex, metricIndex }) => {
              const row = data[dataIndex];
              const metric = monthlyMetrics[metricIndex];
              return (
                <tr key={`${row[primaryColumn]}-${metric}`}>
                  <td className="sticky left-0 min-w-[130px] max-w-[200px] bg-background p-2 text-xs border-r border-border">
                    {metricIndex === 0
                      ? (typeof row[primaryColumn] === "string" || typeof row[primaryColumn] === "number"
                        ? renderCell(row[primaryColumn])
                        : "")
                      : ""}
                  </td>
                  <td className="sticky left-[130px] min-w-[100px] bg-background whitespace-nowrap p-2 text-xs border-r border-border">
                    {metric}
                  </td>
                  {secondaryColumns.map((column, index) => renderMetricValue(row, column, metric, index))}
                  {months.map((month) => {
                    const monthData = (row[monthlyDataKey] as MonthlyData[]).find(
                      (m) => `${m.Month.slice(0, 4)}-${m.Month.slice(4)}` === month
                    );
                    return renderMonthCell(monthData, metric);
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isFullScreen && (
        <div className="border-t border-border p-2.5 flex items-center justify-between bg-background">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} rows
          </div>
          <div className="flex gap-2">
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
            <div className="flex items-center justify-center text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}