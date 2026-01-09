/**
 * Centralized CSV export utilities
 * Provides consistent CSV generation with proper escaping
 */

/**
 * Escape a cell value for CSV format
 * Handles quotes, newlines, and special characters
 */
export function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // If the value contains quotes, commas, or newlines, wrap in quotes and escape existing quotes
  if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes("\r")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert a row of values to a CSV line
 */
export function rowToCSV(row: unknown[]): string {
  return row.map(escapeCSVCell).join(",");
}

/**
 * Generate CSV content from headers and rows
 * @param headers - Array of header strings
 * @param rows - 2D array of cell values
 * @returns CSV string content
 */
export function generateCSV(headers: string[], rows: unknown[][]): string {
  const headerLine = rowToCSV(headers);
  const dataLines = rows.map(rowToCSV);
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Download CSV content as a file
 * @param content - CSV string content
 * @param filename - Name of the file to download (without extension)
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file
 * Combines generation and download in one step
 * @param headers - Array of header strings
 * @param rows - 2D array of cell values
 * @param filename - Name of the file to download
 */
export function exportToCSV(headers: string[], rows: unknown[][], filename: string): void {
  const content = generateCSV(headers, rows);
  downloadCSV(content, filename);
}

/**
 * Generate a timestamped filename for CSV exports
 * @param prefix - Prefix for the filename (e.g., "creators", "campaigns")
 * @returns Filename with current date
 */
export function generateCSVFilename(prefix: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}-${date}.csv`;
}
