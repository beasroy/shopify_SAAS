// ExcelDownload.tsx
import * as XLSX from 'xlsx-js-style';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

export interface ExcelStyle {
  patternType: string;
  fgColor: { rgb: string };
}

export interface ExcelStyles {
  green: ExcelStyle;
  blue: ExcelStyle;
  yellow: ExcelStyle;
  red: ExcelStyle;
  header: ExcelStyle;
}

export interface ExcelThresholds {
  avgSessions: number;
  avgConvRate: number;
}

export interface MonthlyData {
  Month: string;
  [key: string]: number | string;
}

export interface RowData {
  [key: string]: number | string | MonthlyData[];
}

interface ExcelDownloadProps {
  data: RowData[];
  fileName: string;
  primaryColumn: string;
  secondaryColumns: string[];
  monthlyDataKey: string;
  monthlyMetrics: string[];
  buttonClassName?: string;
  disabled?: boolean;
}

const defaultStyles: ExcelStyles = {
  green: { patternType: 'solid', fgColor: { rgb: "DCFCE7" } },
  blue: { patternType: 'solid', fgColor: { rgb: "DBEAFE" } },
  yellow: { patternType: 'solid', fgColor: { rgb: "FEF9C3" } },
  red: { patternType: 'solid', fgColor: { rgb: "FEF2F2" } },
  header: { patternType: 'solid', fgColor: { rgb: "F1F5F9" } }
};

export const calculateThresholds = (data: RowData[]): ExcelThresholds => {
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
};

const getCellStyle = (
  metric: string,
  sessions: number | undefined,
  convRate: number | undefined,
  thresholds: ExcelThresholds,
  styles: ExcelStyles
) => {
  if (
    (metric === 'Sessions' || metric === 'Conv. Rate') &&
    typeof sessions === 'number' &&
    typeof convRate === 'number'
  ) {
    const isHighSessions = sessions >= thresholds.avgSessions;
    const isGoodConversion = convRate >= thresholds.avgConvRate;

    if (isHighSessions && isGoodConversion) return styles.green;
    if (isHighSessions && !isGoodConversion) return styles.blue;
    if (!isHighSessions && isGoodConversion) return styles.yellow;
    return styles.red;
  }
  return undefined;
};

const applyExcelStyles = (
  worksheet: XLSX.WorkSheet,
  data: RowData[],
  months: string[],
  secondaryColumns: string[],
  monthlyDataKey: string,
  monthlyMetrics: string[],
  styles: ExcelStyles,
  thresholds: ExcelThresholds
) => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Style header row
  for (let C = range.s.c; C <= range.e.c; C++) {
    const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!worksheet[headerCell]) worksheet[headerCell] = { v: '' };
    worksheet[headerCell].s = {
      fill: styles.header,
      font: { bold: true, color: { rgb: "64748B" } },
      alignment: { horizontal: 'left' }
    };
  }

  // Style data cells
  data.forEach((row, dataIndex) => {
    monthlyMetrics.forEach((metric, metricIndex) => {
      const actualRow = dataIndex * monthlyMetrics.length + metricIndex + 2;

      // Apply styles for each cell
      const startCol = 2;
      const endCol = months.length + secondaryColumns.length + 1;

      for (let col = startCol; col <= endCol; col++) {
        const cellRef = XLSX.utils.encode_cell({
          r: actualRow - 1,
          c: col
        });

        if (!worksheet[cellRef]) worksheet[cellRef] = { v: '' };

        let cellStyle: any = {
          font: { color: { rgb: "000000" } },
          alignment: { horizontal: 'right' },
          format: metric === 'Conv. Rate' ? '0.00%' : '#,##0'
        };

        let sessions: number | undefined;
        let convRate: number | undefined;

        if (col < startCol + secondaryColumns.length) {
          sessions = row['Total Sessions'] as number;
          convRate = row['Avg Conv. Rate'] as number;
        } else {
          const monthIndex = col - (startCol + secondaryColumns.length);
          const monthKey = months[monthIndex];
          const monthlyData = (row[monthlyDataKey] as MonthlyData[]).find(
            m => `${m.Month.slice(0, 4)}-${m.Month.slice(4)}` === monthKey
          );

          if (monthlyData) {
            sessions = monthlyData['Sessions'] as number;
            convRate = monthlyData['Conv. Rate'] as number;
          }
        }

        const fillStyle = getCellStyle(metric, sessions, convRate, thresholds, styles);
        if (fillStyle) {
          cellStyle.fill = fillStyle;
        }

        worksheet[cellRef].s = cellStyle;
      }
    });
  });
};

const ExcelDownload: React.FC<ExcelDownloadProps> = ({
  data,
  fileName,
  primaryColumn,
  secondaryColumns,
  monthlyDataKey,
  monthlyMetrics,
  buttonClassName = '',
  disabled = false,
}) => {
  const handleDownload = () => {
    const workbook = XLSX.utils.book_new();
    const sheetData: Array<Array<string | number | null>> = [];
    const thresholds = calculateThresholds(data);

    // Get all months
    const months = Array.from(new Set(
      data.flatMap(row => 
        (row[monthlyDataKey] as MonthlyData[]).map(m => 
          `${m.Month.slice(0, 4)}-${m.Month.slice(4)}`
        )
      )
    )).sort().reverse();

    // Create header row
    const headerRow = [
      primaryColumn,
      'Metric',
      ...secondaryColumns,
      ...months,
    ];
    sheetData.push(headerRow);

    // Create rows
    data.forEach(row => {
      monthlyMetrics.forEach(metric => {
        const rowData: Array<string | number | null> = [];
        
        rowData.push(metric === monthlyMetrics[0] ? (row[primaryColumn] as string | number) : '');
        rowData.push(metric);

        secondaryColumns.forEach(column => {
          const value = row[column] as number | string | undefined;
          rowData.push(typeof value === 'number' ? Number(value.toFixed(2)) : null);
        });

        months.forEach(month => {
          const monthData = (row[monthlyDataKey] as MonthlyData[]).find(
            m => `${m.Month.slice(0, 4)}-${m.Month.slice(4)}` === month
          );
          const value = monthData ? monthData[metric] : null;
          rowData.push(typeof value === 'number' ? Number(value.toFixed(2)) : null);
        });

        sheetData.push(rowData);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Apply styles
    applyExcelStyles(
      worksheet,
      data,
      months,
      secondaryColumns,
      monthlyDataKey,
      monthlyMetrics,
      defaultStyles,
      thresholds
    );

    // Set column widths
    const colWidths = [
      { wch: 20 },
      { wch: 12 },
      ...secondaryColumns.map(() => ({ wch: 15 })),
      ...months.map(() => ({ wch: 12 }))
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Conversion Data');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  return (
    <Button
      onClick={handleDownload}
      size="icon"
      variant="outline"
      className={buttonClassName}
      disabled={disabled}
    >
      <FileDown className="h-4 w-4" />
    </Button>
  );
};

export default ExcelDownload;