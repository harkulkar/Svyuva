# Excel validation

Columns match the college student Excel template (`EXCEL_COLUMNS` / `EXCEL_REQUIRED_COLUMNS`): Sr No, Student ID No, Student Name, Parent Name, Student's DOB, Parent's DOB (Optional), Age, Parent -Age, Student Gender, Father/Mother, Student's Mail Id, Student's Mobile No. **TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT.** The template is headings + notes only (no sample student rows).

## Server checks

- Type (`.xlsx` / `.xls`) and size (`MAX_EXCEL_FILE_SIZE_MB`)
- Parse workbook; required headers; unexpected columns rejected
- Row required fields and types (Zod `studentWriteSchema`), with Student Name split into first/middle/last
- In-file duplicates: Student ID No; Sr No
- Database duplicates using Student ID / enrollment / roll indexes, excluding rows already tied to **this** submission
- Academic year is taken from the college year or the submission year (the sheet has no Academic Year column)
- Age may be blank; it is calculated from Student's DOB when possible. Parent's DOB and Parent -Age are optional and are not cross-checked.
- Formula-like cells are sanitized

## Result shown to the college

Total / valid / invalid / duplicate counts from the uploaded file. Issue list includes row, field, message. **Download error report** is an `.xlsx`. Invalid rows are not imported.

Preview is paginated (default 20, max 50). After confirm, preview reads `Student` documents.

Parsed rows live on `UploadJob` (TTL). Original file bytes are not stored in object storage; checksum, filename, and size are kept on the submission and a `Document` metadata row (`documentType: STUDENT_EXCEL`).
