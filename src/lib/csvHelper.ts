/**
 * Robust CSV Parsing and Generation Utility for Pharmacy Management System
 * Complies with RFC 4180 and protects against formula injection.
 * Prepends UTF-8 BOM (\uFEFF) for Microsoft Excel & Google Sheets compatibility.
 */

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rawRows: string[][];
  totalLines: number;
}

/**
 * Parses raw CSV text into headers and an array of key-value objects.
 * Accurately handles quoted strings with embedded commas, quotes, and newlines.
 */
export function parseCSV(text: string): ParsedCSV {
  if (!text || !text.trim()) {
    return { headers: [], rows: [], rawRows: [], totalLines: 0 };
  }

  // Remove leading BOM if present
  let cleanText = text.replace(/^\uFEFF/, '');

  // Detect delimiter: check first non-empty line
  const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        currentField += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }
    }

    if (!insideQuotes && char === delimiter) {
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }

    if (!insideQuotes && (char === '\n' || char === '\r')) {
      // Handle CRLF or single LF/CR
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      // Only push non-empty rows (skip trailing blank lines)
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  // Add any remaining field/row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], rawRows: [], totalLines: 0 };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(h => h.trim());
  const dataRows = rows.slice(1);

  const formattedRows: Record<string, string>[] = [];
  for (const row of dataRows) {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] !== undefined ? row[idx].trim() : '';
    });
    formattedRows.push(obj);
  }

  return {
    headers,
    rows: formattedRows,
    rawRows: dataRows,
    totalLines: dataRows.length
  };
}

/**
 * Escapes a single cell for CSV output.
 * Neutralizes formula injection (=, +, -, @) and wraps in quotes if needed.
 */
export function escapeCSVCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    value = value.join(', ');
  } else if (typeof value === 'object') {
    value = JSON.stringify(value);
  }

  let str = String(value).trim();

  // Excel / CSV Formula Injection Protection
  if (str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
    // If not a standard numeric value like -5 or +10
    const isStandardNumber = !isNaN(Number(str)) && !/^[=@\t\r]/.test(str);
    if (!isStandardNumber) {
      str = `'${str}`;
    }
  }

  // Wrap in double quotes if it contains commas, double quotes, or newlines
  if (/[",\n\r\t;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts an array of objects to RFC 4180 compliant CSV string with UTF-8 BOM.
 */
export function generateCSV<T extends Record<string, any>>(
  columns: { key: keyof T | string; label: string }[],
  data: T[]
): string {
  const headerRow = columns.map(c => escapeCSVCell(c.label)).join(',');
  const rows = data.map(item => {
    return columns
      .map(col => {
        const val = item[col.key as keyof T];
        return escapeCSVCell(val);
      })
      .join(',');
  });

  // Prepend UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility
  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
}

/**
 * Triggers a browser file download of CSV content with proper MIME type.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
