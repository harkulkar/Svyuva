const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function looksLikeSpreadsheetFormula(value: string): boolean {
  return FORMULA_PREFIX.test(value);
}

export function neutralizeSpreadsheetFormula(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (looksLikeSpreadsheetFormula(text)) {
    return `'${text}`;
  }
  return text;
}

export function safeUploadFilename(originalName: string): string {
  const base = originalName.replace(/\\/g, '/').split('/').pop() ?? 'upload.xlsx';
  return base.replace(/[^\w.\- ()]/g, '_').slice(0, 180) || 'upload.xlsx';
}
