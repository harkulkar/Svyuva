# Feature flags

Flags are **environment-only**. They cannot be changed from the admin UI. Defaults are **false** (safe). Unauthorized users cannot read or set them (admin GET `/api/admin/feature-flags` is read-only names + enabled).

| Name | Env | Default | Meaning |
| --- | --- | --- | --- |
| insuranceHttpApi | `FEATURE_INSURANCE_HTTP` | false | Do not enable until insurance HTTP APIs exist |
| documentHttpApi | `FEATURE_DOCUMENT_HTTP` | false | Document upload/download HTTP |
| paymentHttpApi | `FEATURE_PAYMENT_HTTP` | false | Payment status HTTP |
| reviewHttpApi | `FEATURE_REVIEW_HTTP` | false | Review workflow HTTP |
| ecardHttpApi | `FEATURE_ECARD_HTTP` | false | E-card HTTP |

Setting a flag to true **does not implement** the API. It only records operator intent for health/reporting. Leave false until the corresponding module is built.
