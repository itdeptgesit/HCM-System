import * as XLSX from 'xlsx';

export interface ExcelSheetData {
  sheetName: string;
  data: any[];
}

/**
 * Calculates responsive column widths for worksheet based on content and headers
 */
const calculateColWidths = (data: any[]): { wch: number }[] => {
  if (!data || data.length === 0) return [];
  const maxWidths: number[] = [];
  data.forEach((row) => {
    Object.keys(row).forEach((key, i) => {
      const val = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
      const len = Math.max(val.length, key.length) + 3;
      maxWidths[i] = Math.max(maxWidths[i] || 0, Math.min(len, 60));
    });
  });
  return maxWidths.map(wch => ({ wch: Math.max(wch, 12) }));
};

/**
 * Exports multiple sheets in a single Excel workbook (.xlsx)
 * @param sheets Array of sheet configurations with name and data
 * @param fileName Name of the file (without extension)
 */
export const exportMultiSheetToExcel = (sheets: ExcelSheetData[], fileName: string) => {
  if (!sheets || sheets.length === 0) {
    console.warn('No sheets to export');
    return;
  }

  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    if (!data || data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = calculateColWidths(data);
    // Excel worksheet names have a max length of 31 characters
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  });

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Exports JSON data to an Excel file (.xlsx)
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  worksheet['!cols'] = calculateColWidths(data);

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

