import { AppError } from '../middleware/errorHandler.js';

export const DATE_RANGE_KEYS = [
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'last_90_days',
  'this_month',
  'previous_month',
  'this_year',
  'custom'
] as const;

export type DateRangeKey = (typeof DATE_RANGE_KEYS)[number];

export type UtcRange = { start?: Date; end?: Date };

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

export function resolveUtcRange(key?: string, from?: string, to?: string): UtcRange {
  if (!key) return {};
  if (!(DATE_RANGE_KEYS as readonly string[]).includes(key)) {
    throw new AppError('Invalid date range.', 400, 'VALIDATION_ERROR');
  }
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const todayEnd = endOfUtcDay(now);

  switch (key as DateRangeKey) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'yesterday': {
      const start = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      return { start, end: endOfUtcDay(start) };
    }
    case 'last_7_days':
      return { start: new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000), end: todayEnd };
    case 'last_30_days':
      return { start: new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000), end: todayEnd };
    case 'last_90_days':
      return { start: new Date(todayStart.getTime() - 89 * 24 * 60 * 60 * 1000), end: todayEnd };
    case 'this_month':
      return {
        start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        end: todayEnd
      };
    case 'previous_month': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
      return { start, end };
    }
    case 'this_year':
      return { start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), end: todayEnd };
    case 'custom': {
      if (!from || !to) {
        throw new AppError('Custom date range requires from and to.', 400, 'VALIDATION_ERROR');
      }
      const start = new Date(from);
      const end = new Date(to);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        throw new AppError('Invalid custom date range.', 400, 'VALIDATION_ERROR');
      }
      return { start, end };
    }
    default:
      return {};
  }
}

export function createdAtFilter(range: UtcRange): Record<string, unknown> {
  if (!range.start && !range.end) return {};
  const createdAt: Record<string, Date> = {};
  if (range.start) createdAt.$gte = range.start;
  if (range.end) createdAt.$lte = range.end;
  return { createdAt };
}

export function daysAgoUtc(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
