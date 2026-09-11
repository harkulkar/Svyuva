export function firstPresent(record: Record<string, unknown>, aliases: readonly string[]): { key: string; value: string } | undefined {
  const lower = new Map<string, string>();
  for (const key of Object.keys(record)) {
    lower.set(key.toLowerCase().replace(/[\s_-]/g, ''), key);
  }
  for (const alias of aliases) {
    const direct = record[alias];
    if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
      return { key: alias, value: String(direct).trim() };
    }
    const compact = alias.toLowerCase().replace(/[\s_-]/g, '');
    const actual = lower.get(compact);
    if (!actual) continue;
    const value = record[actual];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return { key: actual, value: String(value).trim() };
    }
  }
  return undefined;
}

export function firstString(record: Record<string, unknown>, aliases: readonly string[]): string | undefined {
  return firstPresent(record, aliases)?.value;
}

export function firstNumber(record: Record<string, unknown>, aliases: readonly string[]): number | undefined {
  const raw = firstString(record, aliases);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeEmail(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const email = value.trim().toLowerCase();
  return email.includes('@') ? email : undefined;
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function unmappedFields(record: Record<string, unknown>, usedKeys: string[]): Record<string, unknown> | undefined {
  const used = new Set(usedKeys.map((key) => key.toLowerCase()));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (used.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

export function parseDateFlexible(raw: string | undefined): { date: Date | null; ambiguous: boolean } {
  if (!raw) return { date: null, ambiguous: false };
  const value = raw.trim();
  if (!value) return { date: null, ambiguous: false };
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? { date: null, ambiguous: false } : { date, ambiguous: false };
  }
  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (month > 12 && day <= 12) {
      return { date: null, ambiguous: true };
    }
    if (!day || !month || month > 12 || day > 31) return { date: null, ambiguous: false };
    const date = new Date(Date.UTC(year, month - 1, day));
    return { date, ambiguous: false };
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return { date: parsed, ambiguous: true };
  }
  return { date: null, ambiguous: false };
}

export function emptyCounts(): {
  legacy: number;
  valid: number;
  warning: number;
  review: number;
  skipped: number;
  failed: number;
  migrated: number;
  existing: number;
} {
  return { legacy: 0, valid: 0, warning: 0, review: 0, skipped: 0, failed: 0, migrated: 0, existing: 0 };
}
