# Online premium payment (Razorpay)

Colleges pay the insurance premium online (Razorpay Checkout) after validating a student Excel file and choosing an insurer/policy. Administrators enter the Razorpay credentials in the portal — no redeploy needed.

## One-time server setup

1. Set `PAYMENT_ENCRYPTION_KEY` (32+ random characters) in the API environment and restart. It encrypts the Key Secret and Webhook Secret at rest (AES-256-GCM). **Do not change it afterwards** — saved credentials would become unreadable and would have to be re-entered.
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. In production also set `BACKEND_URL` (public API origin) so the admin screen shows the correct webhook URL.

## Admin: add the credentials

Admin → Settings → **Payment gateway**.

| Field | Source |
|---|---|
| Key ID | Razorpay Dashboard → API Keys (`rzp_test_…` / `rzp_live_…`) |
| Key Secret | Same place. Shown once by Razorpay; stored encrypted here and never displayed again |
| Webhook secret | You choose it when creating the webhook in the Razorpay Dashboard; paste the same value here |
| MID / PF MID | The merchant IDs issued by ICICI. Stored for reference and reconciliation only — Razorpay's API does not use them |
| Enable | Switches online payment on for colleges |

Saving requires the admin's password. When a new secret is entered it is checked against Razorpay first, so a wrong key is rejected. **Test connection** re-checks the saved credentials. Changes and removals are written to the audit log (secrets never are).

The mode (test/live) is derived from the Key ID prefix. Start with test keys; switch to live keys only after Razorpay activation.

### Webhook

Razorpay Dashboard → Settings → Webhooks → add `https://<api-domain>/api/payments/razorpay/webhook` with events `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`. The portal works without it (payments are confirmed when the college returns from checkout and by a 5-minute background reconciliation), but the webhook makes confirmation instant and covers closed browser tabs.

## Flow

1. College uploads and validates an Excel file, selects insurer and policy → premium quote (rate × students + 18% GST).
2. **Pay online** → `POST /api/college/payments/create-order`. The amount is recomputed on the server from the stored job; the client sends only the job id. An existing open order for the same amount is reused.
3. Razorpay Checkout opens. On success the browser calls `POST /api/college/payments/verify`; the server checks the HMAC signature, fetches the payment from Razorpay, checks order id / amount / currency, captures it if only authorised, then marks the payment `VERIFIED` and the upload `PAID`.
4. **Import is blocked (HTTP 402) until the upload is `PAID`** — only while online payment is enabled. With the gateway off, behaviour is unchanged.
5. Webhooks and the reconciliation job use the same idempotent settle step, so a payment is never applied twice.

## Security properties

- Key Secret / Webhook Secret: encrypted at rest, never returned by any API, never sent to the browser. Only the (public) Key ID reaches the browser.
- Changing credentials needs the admin's current password (credentials decide where money settles).
- Payment status is only ever set from a server-verified signature or Razorpay's own API response — never from client input.
- Webhook signature is verified over the raw body with a timing-safe comparison; event ids de-duplicate retries.
- A captured amount that differs from the order, or from the current quote, is audited and flagged for manual review instead of unlocking import.

## Status values

`Payment.status`: `PENDING` (order created / being paid) → `VERIFIED` → `REFUNDED`; `CANCELLED` when a quote changes and the old order is superseded. `UploadJob.paymentStatus`: `QUOTED` → `PAYMENT_PENDING` → `PAID` (→ `REFUNDED`).

## Refunds

Issue refunds from the Razorpay Dashboard; the `refund.processed` webhook records them (a full refund marks the payment and upload `REFUNDED`).

## Tests

- `npm run test:unit -w backend` — encryption, signatures, amounts, validators, Razorpay client (no database needed).
- `src/payment.api.test.ts` (part of `test:integration`, needs MongoDB Atlas like the other API tests) — admin settings, order, verify, webhook, import gate, isolation between colleges, with Razorpay mocked.
