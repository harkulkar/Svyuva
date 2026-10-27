import type { CheckoutOrder, CheckoutSuccess } from '../types/payment';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

type RazorpayInstance = { open: () => void; on: (event: string, handler: (payload: unknown) => void) => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadCheckoutScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Checkout is only available in the browser.'));
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('The payment window could not be loaded. Check your connection and try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export type CheckoutResult = { status: 'success'; response: CheckoutSuccess } | { status: 'dismissed' };

/**
 * Opens Razorpay Checkout for an order created by our server. Resolves when the user pays or closes the window.
 * A failed attempt does not end checkout (the customer can retry inside the window), so it is only reported via onFailure.
 */
export async function openRazorpayCheckout(
  order: CheckoutOrder['checkout'],
  onFailure?: (reason: string) => void
): Promise<CheckoutResult> {
  await loadCheckoutScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('The payment window is unavailable.');
  return new Promise<CheckoutResult>((resolve) => {
    const instance = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: '#0b2a5b' },
      handler: (response: CheckoutSuccess) => resolve({ status: 'success', response }),
      modal: { ondismiss: () => resolve({ status: 'dismissed' }) }
    });
    instance.on('payment.failed', (payload) => {
      const error = (payload as { error?: { description?: string } })?.error;
      onFailure?.(error?.description || 'The payment failed. You can try again.');
    });
    instance.open();
  });
}
