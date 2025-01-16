import * as XLSX from 'xlsx';
import { utils, WorkSheet } from 'xlsx';

interface ConversionData {
  [primaryColumn: string]: string | number;
  'Total Sessions': number;
  'Avg Conv. Rate': number;
  MonthlyData?: Array<{
    Month: string;
    [key: string]: any;
  }>;
}

export const exportConversionData = (
  data: ConversionData[],
  primaryColumn: string,
  secondaryColumns: string[],
  monthlyMetrics: string[],
  months: string[],
  thresholds: { avgSessions: number; avgConvRate: number }
) => {
  // Prepare data for Excel
  const excelData: any[] = [];

  data.forEach(row => {
    monthlyMetrics.forEach(metric => {
      const rowData: any = {
        [primaryColumn]: row[primaryColumn],
        'Metric': metric,
      };

      // Add secondary column values
      secondaryColumns.forEach(column => {
        rowData[column] = row[column];
      });

      // Add monthly data
      months.forEach(month => {
        const monthData = row.MonthlyData?.find(
          m => `${m.Month.slice(0, 4)}-${m.Month.slice(4)}` === month
        );
        rowData[month] = monthData ? monthData[metric] : null;
      });

      excelData.push(rowData);
    });
  });

  // Create worksheet
  const ws: WorkSheet = utils.json_to_sheet(excelData);

  // Apply color formatting
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Apply header styles
  for (let C = range.s.c; C <= range.e.c; C++) {
    const headerRef = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[headerRef]) continue;

    if (!ws[headerRef].s) ws[headerRef].s = {};
    ws[headerRef].s = {
      font: { bold: true },
      fill: {
        patternType: 'solid',
        fgColor: { rgb: 'E2E8F0' } // Light gray background for headers
      },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }

  // Apply data styles and colors
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    const rowData = excelData[R - 1];
    const metric = rowData['Metric'];

    if (metric === 'Sessions' || metric === 'Conv. Rate') {
      const sessions = data[Math.floor((R - 1) / monthlyMetrics.length)]['Total Sessions'];
      const convRate = data[Math.floor((R - 1) / monthlyMetrics.length)]['Avg Conv. Rate'];
      
      let bgColor = '';
      const isHighSessions = sessions >= thresholds.avgSessions;
      const isGoodConversion = convRate >= thresholds.avgConvRate;

      if (isHighSessions && isGoodConversion) {
        bgColor = 'BBFFD3'; // Light green
      } else if (isHighSessions && !isGoodConversion) {
        bgColor = 'BBE5FF'; // Light blue
      } else if (!isHighSessions && isGoodConversion) {
        bgColor = 'FFF4BB'; // Light yellow
      } else {
        bgColor = 'FFBBBB'; // Light red
      }

      // Apply colors to monthly data columns only
      const monthStartCol = secondaryColumns.length + 2; // +2 for primary column and metric
      for (let C = monthStartCol; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;

        if (!ws[cellRef].s) ws[cellRef].s = {};
        ws[cellRef].s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: bgColor }
          },
          font: { color: { rgb: '000000' } },
          alignment: { horizontal: 'right' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    }

    // Apply default styles to non-colored cells
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef] || ws[cellRef].s?.fill) continue;

      if (!ws[cellRef].s) ws[cellRef].s = {};
      ws[cellRef].s = {
        font: { color: { rgb: '000000' } },
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
  }

  // Set column widths
  const colWidths = [
    { wch: 15 }, // Primary column
    { wch: 10 }, // Metric
    ...secondaryColumns.map(() => ({ wch: 15 })),
    ...months.map(() => ({ wch: 12 }))
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook and save
  XLSX.utils.book_append_sheet(wb, ws, 'Conversion Data');
  XLSX.writeFile(wb, 'Conversion_Report.xlsx');
};
