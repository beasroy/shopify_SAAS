import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
  secondaryColumns?: string[];
  monthlyDataKey: string;
  monthlyMetrics: string[];
  isFullScreen: boolean;
  rows?: number;
  isAdsTable?: boolean;
}

export default function ConversionTable({
  data,
  primaryColumn,
  secondaryColumns,
  monthlyDataKey,
  monthlyMetrics,
  isFullScreen,
  rows,
  isAdsTable
}: ConversionTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedRows, setLoadedRows] = useState<Array<{ dataIndex: number; metricIndex: number }>>([]);
  const rowsPerPage = rows ? rows : 8;
  const rowsPerChunk = 30;

  const getTableHeight = () => {
    if (isFullScreen) {
      if (isAdsTable) {
        return 'max-h-[calc(100vh-90px)]';
      }
      return 'max-h-[calc(100vh-130px)]';
    }
    return 'max-h-[400px]';
  };

  const months = useMemo(() => {
    if (!Array.isArray(data)) {
      console.error("Data is not an array:", data);
      return [];
    }

    const getMonthName = (monthNumber: string): string => {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return months[parseInt(monthNumber) - 1];
    };


    const allMonths = new Set<string>();
    data.forEach((row) => {
      const monthlyData = row[monthlyDataKey] as MonthlyData[] | undefined;
      if (Array.isArray(monthlyData)) {
        monthlyData.forEach((month) => {
          if (month?.Month) {
            const year = month.Month.slice(0, 4);
            const monthNum = month.Month.slice(4);
            allMonths.add(`${getMonthName(monthNum)}-${year}`);
          }
        });
      }
    });
    return Array.from(allMonths).reverse();
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
    let totalSessions = 0, totalConvRate = 0, sessionCount = 0;
    let totalSpend = 0, totalPurchaseROAS = 0, spendCount = 0;
    let totalCost = 0, totalConvValuePerCost = 0, costCount = 0;

    data.forEach(row => {
      if (typeof row['Total Sessions'] === 'number' && typeof row['Avg Conv. Rate'] === 'number') {
        totalSessions += Number(row['Total Sessions']);
        totalConvRate += Number(row['Avg Conv. Rate']);
        sessionCount++;
      }

      if (typeof row['Total Spend'] === 'number' && typeof row['Total Purchase ROAS'] === 'number') {
        totalSpend += Number(row['Total Spend']);
        totalPurchaseROAS += Number(row['Total Purchase ROAS']);
        spendCount++;
      }

      if (typeof row['Total Cost'] === 'number' && typeof row['Conv. Value / Cost'] === 'number') {
        totalCost += Number(row['Total Cost']);
        totalConvValuePerCost += Number(row['Conv. Value / Cost']);
        costCount++;
      }
    });

    return {
      avgSessions: sessionCount > 0 ? totalSessions / sessionCount : 0,
      avgConvRate: sessionCount > 0 ? totalConvRate / sessionCount : 0,
      avgSpend: spendCount > 0 ? totalSpend / spendCount : 0,
      avgPurchaseROAS: spendCount > 0 ? totalPurchaseROAS / spendCount : 0,
      avgCost: costCount > 0 ? totalCost / costCount : 0,
      avgConvValuePerCost: costCount > 0 ? totalConvValuePerCost / costCount : 0,
    };
  }, [data]);




  useEffect(() => {
    if (!isFullScreen) {
      setCurrentPage(1);
    }
  }, [isFullScreen]);

  const getMetricColor = ({
    sessions,
    convRate,
    spend,
    purchaseROAS,
    cost,
    convValuePerCost
  }: {
    sessions?: number;
    convRate?: number;
    spend?: number;
    purchaseROAS?: number;
    cost?: number;
    convValuePerCost?: number
  }) => {
    const isHighSessions = sessions !== undefined && sessions >= thresholds.avgSessions;
    const isGoodConversion = convRate !== undefined && convRate >= thresholds.avgConvRate;
    const isHighSpent = spend !== undefined && spend >= thresholds.avgSpend;
    const isGoodROAS = purchaseROAS !== undefined && purchaseROAS >= thresholds.avgPurchaseROAS;
    const isHighCost = cost !== undefined && cost >= thresholds.avgCost;
    const isGoodConvValuePerCost = convValuePerCost !== undefined && convValuePerCost >= thresholds.avgConvValuePerCost;

    // Prioritizing Sessions & Conversion Rate
    if (isHighSessions && isGoodConversion) return 'bg-green-100'; // Best case (high traffic & conversions)
    if (isHighSessions && !isGoodConversion) return 'bg-[#E0F4FF]'; // High traffic, poor conversion
    if (!isHighSessions && isGoodConversion) return 'bg-yellow-100'; // Low traffic, good conversion

    // Prioritizing Spend & Purchase ROAS
    if (isHighSpent && isGoodROAS) return 'bg-green-100'; // Profitable with high spend
    if (isHighSpent && !isGoodROAS) return 'bg-[#E0F4FF]'; // High spend, poor ROAS
    if (!isHighSpent && isGoodROAS) return 'bg-yellow-100'; // Low spend, good ROAS

    // Prioritizing Spend & Purchase ROAS
    if (isHighCost && isGoodConvValuePerCost) return 'bg-green-100'; // Profitable with high cost
    if (isHighCost && !isGoodConvValuePerCost) return 'bg-[#E0F4FF]'; // High cost, poor ROAS
    if (!isHighCost && isGoodConvValuePerCost) return 'bg-yellow-100'; // Low cost, good ROAS

    return 'bg-red-50'; // Default case (poor metrics)
  };



  const renderCell = (value: number | string, type?: 'spend' | 'percentage' | 'default') => {
    if (typeof value === "number") {
      switch (type) {
        case 'spend':
          return Math.round(value).toLocaleString();
        case 'percentage':
          return `${value.toFixed(2)} %`;
        default:
          return value.toFixed(2);
      }
    }
    return value;
  };

  const renderMonthCell = (monthData: MonthlyData | undefined, metric: string) => {
    if (!monthData) {
      return (
        <td className="w-[100px] text-right whitespace-nowrap p-2 text-xs border-r border-slate-300 bg-background">
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
      bgColor = getMetricColor({
        sessions: Number(monthData['Sessions']),
        convRate: Number(monthData['Conv. Rate']),
      });
    }

    if (
      (metric === 'Spend' || metric === 'Purchase ROAS') &&
      typeof monthData['Spend'] === 'number' &&
      typeof monthData['Purchase ROAS'] === 'number'
    ) {
      bgColor = getMetricColor({
        spend: Number(monthData['Spend']),
        purchaseROAS: Number(monthData['Purchase ROAS'])
      });
    }

    if (
      (metric === 'Cost' || metric === 'Conv. Value/ Cost') &&
      typeof monthData['Cost'] === 'number' &&
      typeof monthData['Conv. Value/ Cost'] === 'number'
    ) {
      bgColor = getMetricColor({
        cost: Number(monthData['Cost']),
        convValuePerCost: Number(monthData['Conv. Value/ Cost'])
      });
    }


    return (
      <td className={`w-[100px]  text-right whitespace-nowrap p-2 text-xs border-r border-slate-300 ${bgColor}`}>
        {renderCell(
          value,
          metric.toLowerCase().includes('rate')
            ? 'percentage'
            : metric.toLowerCase().includes('spend') || metric.toLowerCase().includes('cost')
              ? 'spend'
              : 'default'
        )}
        {metric === 'Conv. Rate' && (
          <div className="text-xs text-muted-foreground">{`Purchases: ${monthData['Purchases'] ?? 0}`}</div>
        )}
        {metric === 'Cost' && (
          <div className="text-xs text-muted-foreground">{`clicks: ${monthData['Clicks'] ?? 0}`}</div>
        )}
        {metric === 'Conv. Value/ Cost' && (
          <div className="text-xs text-muted-foreground">{`conv. rate: ${Number(monthData['Conversion Rate']).toFixed(2) ?? 0} %`}</div>
        )}
        {metric === 'Purchase ROAS' && (
          <div className="text-xs text-muted-foreground">{`PCV: ${Number(monthData['Purchase Conversion Value']).toFixed(2) ?? 0}`}</div>
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
          className="sticky top-0 min-w-[130px] p-2 text-xs border-r border-slate-300 bg-background"
          style={{ left: `${130 + 100 + columnIndex * 130}px` }}
        >
          {""}
        </td>
      );
    }

    let bgColor = "bg-background";

    // Check if the current metric and column match specific conditions for color
    if (currentMetric && column) {
      if (column.includes("Sessions") || column.includes("Rate")) {
        const sessions = row["Total Sessions"] as number;
        const convRate = row["Avg Conv. Rate"] as number;
        bgColor = getMetricColor({ sessions, convRate });
      }
    }

    if (currentMetric && column) {
      if (column.includes("Spend") || column.includes("ROAS")) {
        const spend = row["Total Spend"] as number;
        const purchaseROAS = row["Total Purchase ROAS"] as number;
        bgColor = getMetricColor({ spend, purchaseROAS });
      }
    }

    if (currentMetric && column) {
      if (column.includes("Cost") || column.includes("Conv. Value / Cost")) {
        const cost = row["Total Cost"] as number;
        const convValuePerCost = row["Conv. Value / Cost"] as number;
        bgColor = getMetricColor({ cost, convValuePerCost });
      }
    }

    const totalPurchases = typeof row["Total Purchases"] === "number"
      ? row["Total Purchases"].toLocaleString()
      : null;
    const totalConvValue = typeof row["Total Conv. Value"] === "number"
      ? row["Total Conv. Value"].toFixed(2)
      : null;
    const totalPCV = typeof row["Total PCV"] === "number"
      ? row["Total PCV"].toFixed(2)
      : null;
    return (
      <td
        className={`sticky top-0 min-w-[130px] p-2 text-xs border-r border-slate-300 ${bgColor}`}
        style={{ left: `${130 + 100 + columnIndex * 130}px` }}
      >
        {/* Only show cost when currentMetric is "Cost" */}
        {currentMetric.toLowerCase() === "cost" && column === "Total Cost" ? (
          <div className="flex flex-col">
            <span>{renderCell(value, 'spend')}</span>
          </div>
        ) :
          /* Only show conv value/cost when currentMetric is "Conv. Value/Cost" */
          currentMetric.toLowerCase() === "conv. value/ cost" && column === "Conv. Value / Cost" ? (
            <div className="flex flex-col">
              <span>{renderCell(value)}</span>
              {totalConvValue && (
                <span className="text-xs text-gray-500 mt-1">
                  Total Conv. Value: {totalConvValue}
                </span>
              )}
            </div>
          ) :
            currentMetric.toLowerCase() === "sessions" && column.includes("Sessions") ? (
              renderCell(value)
            ) :
              currentMetric.toLowerCase() === "conv. rate" && column.includes("Rate") ? (
                <div className="flex flex-col">
                  <span>{renderCell(value, 'percentage')}</span>
                  {totalPurchases && (
                    <span className="text-xs text-gray-500 mt-1">
                      Total Purchases: {totalPurchases}
                    </span>
                  )}
                </div>
              ) : currentMetric.toLowerCase() === "spend" && column.includes("Total Spend") ? (
                renderCell(value, 'spend')
              ) : currentMetric.toLowerCase() == "purchase roas" && column.includes("Total Purchase ROAS") ? (
                <div className="flex flex-col">
                  <span>{renderCell(value)}</span>
                  {totalPCV && (
                    <span className="text-xs text-gray-500 mt-1">
                      Total PCV: {totalPCV}
                    </span>
                  )}
                </div>
              ) : (
                ""
              )}
      </td>
    );
  };

  const renderMetricRow = (row: RowData, metricIndex: number) => {
    const metric = monthlyMetrics[metricIndex];
    
    // Determine the background color for both primary and metric columns
    let bgColor = 'bg-background';
    
    if (secondaryColumns) {
      const sessions = row["Total Sessions"] as number;
      const convRate = row["Avg Conv. Rate"] as number;
      const spend = row["Total Spend"] as number;
      const purchaseROAS = row["Total Purchase ROAS"] as number;
      const cost = row["Total Cost"] as number;
      const convValuePerCost = row["Conv. Value / Cost"] as number;

      if (metric === 'Sessions' || metric === 'Conv. Rate') {
        bgColor = getMetricColor({ sessions, convRate });
      } else if (metric === 'Spend' || metric === 'Purchase ROAS') {
        bgColor = getMetricColor({ spend, purchaseROAS });
      } else if (metric === 'Cost' || metric === 'Conv. Value/ Cost') {
        bgColor = getMetricColor({ cost, convValuePerCost });
      }
    }

    return (
      <tr key={`${row[primaryColumn]}-${metric}`}>
        <td className={`sticky left-0 min-w-[130px] max-w-[200px] p-2 text-xs border-r border-slate-300 ${bgColor}`}>
          {metricIndex === 0
            ? (typeof row[primaryColumn] === "string" || typeof row[primaryColumn] === "number"
              ? renderCell(row[primaryColumn])
              : "")
            : ""}
        </td>
        <td className={`sticky left-[130px] min-w-[100px] whitespace-nowrap p-2 text-xs border-r border-slate-300 ${bgColor}`}>
          {metric}
        </td>
        {secondaryColumns?.map((column, index) => renderMetricValue(row, column, metric, index))}
        {months.map((month) => {
          const getMonthNumber = (monthName: string): number => {
            const months = [
              'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];
            return months.indexOf(monthName) + 1;
          };
          const [monthName, year] = month.split('-'); 
          const monthNum = getMonthNumber(monthName); 
          const monthFormat = `${year}${monthNum.toString().padStart(2, '0')}`; 

          const monthData = (row[monthlyDataKey] as MonthlyData[]).find(
            (m) => m.Month === monthFormat
          );
          return renderMonthCell(monthData, metric);
        })}
      </tr>
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
    } else if (column === 'Total Spend') {
      thresholdValue = `(avg: ${Math.round(thresholds.avgSpend).toLocaleString()})`;
    } else if (column === 'Total Purchase ROAS') {
      thresholdValue = `(avg: ${(thresholds.avgPurchaseROAS).toFixed(2)})`;
    } else if (column === 'Total Cost') {
      thresholdValue = `(avg: ${Math.round(thresholds.avgCost).toLocaleString()})`;
    } else if (column === 'Conv. Value / Cost') {
      thresholdValue = `(avg: ${Math.round(thresholds.avgConvValuePerCost).toFixed(2)})`;
    }

    return (
      <th
        key={column}
        className="sticky top-0 min-w-[130px] w-[150px] z-20 px-2 py-2.5 text-left text-sm font-semibold text-black/70 border-r border-b border-slate-300 bg-slate-100"
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
    <div className="w-full rounded-lg border flex flex-col">
      <div className={`relative overflow-x-auto ${getTableHeight()}`} onScroll={isFullScreen ? handleScroll : undefined}>
        <table className="w-full">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 min-w-[130px]  w-[150px] z-20 px-2 py-2.5 text-left text-sm font-semibold text-black/70 border-r border-b border-slate-300 bg-slate-100">
                {primaryColumn}
              </th>
              <th className="sticky left-[130px] top-0 min-w-[100px] w-[150px] z-20 px-2 py-2.5 text-left text-sm font-semibold text-black/70 border-r border-b border-slate-300 bg-slate-100">
                Metric
              </th>
              {secondaryColumns?.map((column, index) => renderColumnHeader(column, index))}
              {months.map((month) => (
                <th
                  key={month}
                  className="sticky top-0 min-w-[100px] z-10 px-2 py-2.5 text-right text-sm font-semibold text-black/70 whitespace-nowrap border-r border-b border-slate-300  bg-zinc-50"
                >
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
          {displayRows.map(({ dataIndex, metricIndex }) => 
              renderMetricRow(data[dataIndex], metricIndex)
            )}
          </tbody>
        </table>
      </div>

      {!isFullScreen && (
        <div className="border-t border-slate-300 p-2.5 flex items-center justify-between bg-background">
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