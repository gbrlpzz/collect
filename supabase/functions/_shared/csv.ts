/**
 * Neutralize CSV/Excel formula injection and produce RFC-4180-compatible
 * cells/rows. Values beginning with "=", "+", "-", "@", tab, or CR are
 * prefixed with a single quote so spreadsheet applications render them as
 * text instead of executing them as formulas.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const rawText = typeof value === "string" ? value : JSON.stringify(value);
  const text = /^[=+\-@\t\r]/.test(rawText) ? `'${rawText}` : rawText;
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}
