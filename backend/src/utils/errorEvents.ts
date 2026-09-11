export type ErrorCategory =
  | 'api'
  | 'unhandled'
  | 'database'
  | 'authentication'
  | 'upload'
  | 'download'
  | 'ecard'
  | 'job'
  | 'maintenance'
  | 'unknown';

export type ErrorEvent = {
  timestamp: string;
  requestId?: string;
  method?: string;
  route?: string;
  status: number;
  category: ErrorCategory;
  message: string;
  code?: string;
};

const MAX_EVENTS = 100;
const events: ErrorEvent[] = [];
let lastSuccessfulHealthAt: string | null = null;

export function markHealthSuccess(): void {
  lastSuccessfulHealthAt = new Date().toISOString();
}

export function getLastSuccessfulHealthAt(): string | null {
  return lastSuccessfulHealthAt;
}

export function categorizeError(code?: string, status = 500): ErrorCategory {
  if (code === 'MAINTENANCE') return 'maintenance';
  if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN' || code === 'LOGIN_FAILED') return 'authentication';
  if (code === 'FILE_TOO_LARGE' || code === 'UPLOAD_ERROR' || code === 'INVALID_FILE_TYPE') return 'upload';
  if (code === 'DOWNLOAD_ERROR') return 'download';
  if (code === 'ECARD_ERROR') return 'ecard';
  if (status === 401 || status === 403) return 'authentication';
  if (status >= 500) return 'unhandled';
  return 'api';
}

export function recordErrorEvent(event: ErrorEvent): void {
  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }
}

export function listRecentErrors(limit = 20): ErrorEvent[] {
  return events.slice(0, Math.min(Math.max(limit, 1), MAX_EVENTS));
}

export function recentErrorCount(sinceMs = 15 * 60 * 1000): number {
  const cutoff = Date.now() - sinceMs;
  return events.filter((event) => Date.parse(event.timestamp) >= cutoff).length;
}
