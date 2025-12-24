import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
  formatter?: (value: any) => string | number;
}

export const exportToCSV = (
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string
) => {
  if (data.length === 0) return;

  // Create headers
  const headers = columns.map(col => col.header).join(',');
  
  // Create rows
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      const formatted = col.formatter ? col.formatter(value) : value;
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(formatted ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  ).join('\n');

  const csv = `${headers}\n${rows}`;
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

export const exportToExcel = (
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
) => {
  if (data.length === 0) return;

  // Transform data with formatters
  const transformedData = data.map(row => {
    const newRow: Record<string, any> = {};
    columns.forEach(col => {
      const value = row[col.key];
      newRow[col.header] = col.formatter ? col.formatter(value) : value;
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(transformedData);
  
  // Set column widths
  const colWidths = columns.map(col => ({ wch: Math.max(col.header.length + 2, 15) }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportMultiSheetExcel = (
  sheets: { name: string; data: Record<string, any>[]; columns: ExportColumn[] }[],
  filename: string
) => {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    if (sheet.data.length === 0) return;

    const transformedData = sheet.data.map(row => {
      const newRow: Record<string, any> = {};
      sheet.columns.forEach(col => {
        const value = row[col.key];
        newRow[col.header] = col.formatter ? col.formatter(value) : value;
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    const colWidths = sheet.columns.map(col => ({ wch: Math.max(col.header.length + 2, 15) }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
