# Admin submission guide

`/admin/submissions` lists submitted and draft packs with server-side search, academic year, university, institute, district, status, date range, and sort.

Columns: submission number, academic year, university, institute, student count, stored premium, status, submitted at, open.

Detail `/admin/submissions/:id` shows institute, university, year, number, status, student counts from the database, stored premium (rule version, inputs, timestamp), Excel metadata (not a requirement to open the original workbook), validation summary, paginated students, document metadata, versions, audit timeline, reconciliation warnings (count/premium mismatch is displayed, not auto-fixed).

## Review

- Start review → `UNDER_REVIEW`
- Approve / reject / request correction (reason required for reject and correction)
- College is notified via existing notification infrastructure
- Correction unlocks college edit; history versions remain
- Recalculate is refused for submitted/approved records so the stored premium stays

## Export

CSV/Excel summary: submission number, university, institute, academic year, student count, premium, status, submitted date. No extra student PII. Detailed student lists use the authorised student APIs.

## Students

Admin student directory accepts `submissionId` (and institute, university, academic year). College isolation still applies to college APIs.
