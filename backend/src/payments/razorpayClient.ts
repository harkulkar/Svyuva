import { AppError } from '../middleware/errorHandler.js';

const BASE_URL = 'https://api.razorpay.com/v1';
const TIMEOUT_MS = 15000;

export type RazorpayCredentials = { keyId: string; keySecret: string };

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string | null;
  status: string;
};

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  status: string;
  amount: number;
  currency: string;
  method?: string | null;
  error_code?: string | null;
  error_description?: string | null;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

let fetchImpl: FetchLike = (input, init) => fetch(input, init);

/** Test seam: replace the HTTP transport. Call with no argument to restore. */
export function setRazorpayFetch(next?: FetchLike): void {
  fetchImpl = next ?? ((input, init) => fetch(input, init));
}

async function call<T>(creds: RazorpayCredentials, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch {
    throw new AppError('The payment gateway could not be reached. Please try again.', 502, 'GATEWAY_UNREACHABLE');
  }
  const text = await response.text();
  let json: { error?: { description?: string; code?: string } } & Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (response.status === 401) {
    throw new AppError('The payment gateway rejected the Key ID / Key Secret.', 400, 'GATEWAY_AUTH_FAILED');
  }
  if (!response.ok) {
    throw new AppError(json.error?.description || 'The payment gateway returned an error.', 502, 'GATEWAY_ERROR');
  }
  return json as T;
}

export function createRazorpayOrder(
  creds: RazorpayCredentials,
  input: { amountPaise: number; currency: string; receipt: string; notes: Record<string, string> }
) {
  return call<RazorpayOrder>(creds, 'POST', '/orders', {
    amount: input.amountPaise,
    currency: input.currency,
    receipt: input.receipt,
    notes: input.notes
  });
}

export function fetchRazorpayPayment(creds: RazorpayCredentials, paymentId: string) {
  return call<RazorpayPayment>(creds, 'GET', `/payments/${encodeURIComponent(paymentId)}`);
}

export function captureRazorpayPayment(creds: RazorpayCredentials, paymentId: string, amountPaise: number, currency: string) {
  return call<RazorpayPayment>(creds, 'POST', `/payments/${encodeURIComponent(paymentId)}/capture`, {
    amount: amountPaise,
    currency
  });
}

export async function fetchRazorpayOrderPayments(creds: RazorpayCredentials, orderId: string): Promise<RazorpayPayment[]> {
  const result = await call<{ items?: RazorpayPayment[] }>(creds, 'GET', `/orders/${encodeURIComponent(orderId)}/payments`);
  return result.items ?? [];
}

/** Cheap authenticated read used by the admin "Test connection" button. */
export async function pingRazorpay(creds: RazorpayCredentials): Promise<void> {
  await call<unknown>(creds, 'GET', '/orders?count=1');
}
