import { useMemo, useState } from 'react';

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
  const rowsPerPage = isFullScreen ? 12 : 6;

  const getTableHeight = () => {
    return isFullScreen ? 'max-h-[calc(100vh-150px)]' : 'max-h-[320px]';
  };

  const months = useMemo(() => {
    const allMonths = new Set<string>();
    data.forEach((row) => {
      const monthlyData = row[monthlyDataKey] as MonthlyData[];
      monthlyData.forEach((month) => {
        allMonths.add(`${month.Month.slice(0, 4)}-${month.Month.slice(4)}`);
      });
    });
    return Array.from(allMonths).sort().reverse();
  }, [data, monthlyDataKey]);

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

    const result = {
      avgSessions: totalSessions / count,
      avgConvRate: totalConvRate / count
    };

    console.log('Average Sessions:', result.avgSessions);
    console.log('Average Conversion Rate:', result.avgConvRate);

    return result;
  }, [data]);

  const getMetricColor = (sessions: number, convRate: number) => {
    const isHighSessions = sessions >= thresholds.avgSessions;
    const isGoodConversion = convRate >= thresholds.avgConvRate;
    
    if (isHighSessions && isGoodConversion) {
      return 'bg-green-100';
    } else if (isHighSessions && !isGoodConversion) {
      return 'bg-blue-100';
    } else if (!isHighSessions && isGoodConversion) {
      return 'bg-yellow-100';
    } else {
      return 'bg-red-50';
    }
  };

  const renderCell = (value: number | string, isPercentage: boolean = false) => {
    if (typeof value === "number") {
      return isPercentage ? `${value.toFixed(2)} %` : value.toLocaleString();
    }
    return value;
  };

  const renderMonthCell = (monthData: MonthlyData | undefined, metric: string) => {
    if (!monthData) return <td className="w-[100px] whitespace-nowrap px-4 py-3 text-sm border-r border-border bg-background">-</td>;
    
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
      <td className={`w-[100px] whitespace-nowrap px-4 py-3 text-sm border-r border-border ${bgColor}`}>
        {renderCell(value, metric.toLowerCase().includes('rate'))}
      </td>
    );
  };

  const renderMetricValue = (row: RowData, column: string, currentMetric: string) => {
    const value = row[column];
    if (typeof value !== 'number') return (
      <td className="min-w-[130px] px-4 py-3 text-sm border-r border-border bg-background">
        {""}
      </td>
    );
  
    let bgColor = 'bg-background';
  
    if ((currentMetric === 'Sessions' && column === 'Total Sessions') ||
        (currentMetric === 'Conv. Rate' && column === 'Avg Conv. Rate')) {
      const sessions = row['Total Sessions'] as number;
      const convRate = row['Avg Conv. Rate'] as number;
      bgColor = getMetricColor(sessions, convRate);
    }
  
    return (
      <td className={`w-[130px] px-4 py-3 text-sm border-r border-border ${bgColor}`}>
        {currentMetric.toLowerCase() === 'sessions' && column === 'Total Sessions'
          ? renderCell(value)
          : currentMetric.toLowerCase() === 'conv. rate' && column === 'Avg Conv. Rate'
          ? renderCell(value, true)
          : ""}
      </td>
    );
  };
  

  const fixedColumnsWidth = 180 + 100 + (160 * secondaryColumns.length);
  const totalRows = data.length * monthlyMetrics.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);

  const paginatedRows = useMemo(() => {
    const rows: Array<{ dataIndex: number; metricIndex: number }> = [];
    data.forEach((_, dataIndex) => {
      monthlyMetrics.forEach((_, metricIndex) => {
        rows.push({ dataIndex, metricIndex });
      });
    });
    return rows.slice(startIndex, endIndex);
  }, [data.length, monthlyMetrics.length, startIndex, endIndex]);

  const tableHeightClass = getTableHeight();

  return (
    <div className="w-full border border-border rounded-lg flex flex-col">
      <div className={`relative ${tableHeightClass}`}>
        <div
          className={`absolute left-0 top-0 bg-background  overflow-x-auto overflow-y-hidden ${tableHeightClass}`}
          style={{ width: fixedColumnsWidth }}
        >
          <table className="w-full">
            <thead>
              <tr>
                <th className="sticky top-0 min-w-[130px] z-20 px-4 py-3 text-left text-sm font-medium text-muted-foreground border-r border-border bg-slate-100">
                  {primaryColumn}
                </th>
                <th className="sticky top-0 min-w-[100px] z-20 px-4 py-3 text-left text-sm font-medium text-muted-foreground border-r border-border bg-slate-100">
                  Metric
                </th>
                {secondaryColumns.map((column) => (
                  <th
                    key={column}
                    className="sticky top-0 min-w-[130px] z-20 px-4 py-3 text-left text-sm font-medium text-muted-foreground border-r border-border bg-slate-100"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.map(({ dataIndex, metricIndex }) => {
                const row = data[dataIndex];
                const metric = monthlyMetrics[metricIndex];
                return (
                  <tr key={`${row[primaryColumn]}-${metric}`}>
                    <td className="min-w-[130px] bg-background px-4 py-3 text-sm border-r border-border">
                      {metricIndex === 0 
                        ? (typeof row[primaryColumn] === "string" || typeof row[primaryColumn] === "number" 
                            ? renderCell(row[primaryColumn]) 
                            : "") 
                        : ""}
                    </td>
                    <td className="min-w-[100px] bg-background whitespace-nowrap px-4 py-3 text-sm border-r border-border">
                      {metric}
                    </td>
                    {secondaryColumns.map((column) => renderMetricValue(row, column, metric))} 
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div
          className={`overflow-x-auto ${tableHeightClass}`}
          style={{ marginLeft: fixedColumnsWidth }}
        >
          <table className="w-full">
            <thead>
              <tr>
                {months.map((month) => (
                  <th
                    key={month}
                    className="sticky top-0 min-w-[100px] px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap border-r border-border bg-muted/50"
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.map(({ dataIndex, metricIndex }) => {
                const row = data[dataIndex];
                const metric = monthlyMetrics[metricIndex];
                return (
                  <tr key={`${row[primaryColumn]}-${metric}`}>
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
      </div>

      <div className="border-t border-border p-4 flex items-center justify-between bg-background">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{endIndex} of {totalRows} rows
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border border-border disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border border-border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}