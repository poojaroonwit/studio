const FORMULA_PREFIX = /^[=+\-@]/;

/**
 * Convert a value to an RFC 4180-compatible CSV cell while neutralising
 * spreadsheet formula injection for user-controlled text values.
 */
export function payrollCsvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildPayrollCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows]
    .map((row) => row.map(payrollCsvCell).join(","))
    .join("\r\n");
}
