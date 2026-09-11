type LogLevel = 'info' | 'warn' | 'error';

const SENSITIVE = /password|secret|token|jwt|authorization|mongo(?:db)?_uri|access_key|credential|cvv|pin|otp|card.?number|cardNo|cookie|refresh/i;

function redact(value: unknown, keyName?: string): unknown {
  if (keyName && SENSITIVE.test(keyName)) {
    return '[redacted]';
  }
  if (typeof value === 'string') {
    if (keyName === 'route' || keyName === 'path' || keyName === 'message' || keyName === 'method') {
      return value;
    }
    if (SENSITIVE.test(value)) {
      return '[redacted]';
    }
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, redact(entry, key)])
    );
  }
  return value;
}

function write(level: LogLevel, message: string, extra?: unknown): void {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message
  };
  if (extra !== undefined) {
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      Object.assign(payload, redact(extra) as Record<string, unknown>);
    } else {
      payload.detail = redact(extra);
    }
  }
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.info(line);
}

export const logger = {
  info: (message: string, extra?: unknown) => write('info', message, extra),
  warn: (message: string, extra?: unknown) => write('warn', message, extra),
  error: (message: string, extra?: unknown) => write('error', message, extra)
};

export { redact };
