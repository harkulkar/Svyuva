export const SENSITIVE_KEY =
  /password|passwd|pwd|secret|token|authorization|mongo(?:db)?_uri|access_key|credential|cvv|cvc|pin|otp|card.?number|cardno|pan|cvv2|bank.?password/i;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string' && SENSITIVE_KEY.test(value)) {
    return '[redacted]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        isSensitiveKey(key) ? '[redacted]' : redactValue(entry)
      ])
    );
  }
  return value;
}

export function stripSensitiveFields(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (isSensitiveKey(key)) continue;
    out[key] = value;
  }
  return out;
}

const PAYMENT_FORBIDDEN = /card.?number|cardno|cvv|cvc|pin|otp|bank.?password|expiry|exp_month|exp_year/i;

export function stripForbiddenPaymentFields(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (PAYMENT_FORBIDDEN.test(key) || isSensitiveKey(key)) continue;
    out[key] = value;
  }
  return out;
}
