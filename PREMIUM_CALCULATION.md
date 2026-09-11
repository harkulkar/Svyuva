# Premium calculation

**TODO: VERIFY OFFICIAL PREMIUM RULE**

No official SV Yuva Suraksha rate, GST, tax, fee, or formula was found in the rebuilt codebase or recovered legacy source (`LEGACY_SUBMISSION_FLOW_ANALYSIS.md`).

## Engine

`PremiumCalculationService` runs only on the backend.

If an **active** `PremiumRule` for the submission academic year has a finite `ratePerStudent`:

`totalPremium = studentCount × ratePerStudent`

- `studentCount` is counted from confirmed `Student` documents for that `submissionId`.
- Adjustments and taxes arrays stay empty (not applied).
- `ruleVersion` is stored on `PremiumCalculation`. Later rule changes do not rewrite submitted calculations.
- Recalculate before submit uses the **current** active rule and supersedes the previous unsubmitted calculation.

If no rate is configured, `calculationStatus = INCOMPLETE`, amounts are null, and the UI shows: **Premium calculation configuration requires official verification.** Submit is blocked.

A configured rate that is not `officialVerified` still calculates so the flow can run in test/dev, but the same verification banner is shown. Do not treat that number as a Government of Maharashtra or insurer rate.

Admin: `PUT /api/admin/premium-rules`. Do not seed production rates.
