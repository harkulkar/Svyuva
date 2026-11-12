# Excel validation

Columns match the college student Excel template (`EXCEL_COLUMNS`): Sr No., Student ID, Name of Insured, DOB, Age, Gender, Relation to, Relation, Location, DOJ, DOC, Sum Insured, Email ID, Mobile No. Every heading must be present. The template is headings + notes only (no sample student rows).

## Server checks

- Type (`.xlsx` / `.xls`) and size (`MAX_EXCEL_FILE_SIZE_MB`)
- Parse workbook; required headers; unexpected columns rejected
- Row required fields and types (Zod `studentWriteSchema`), with Name of Insured split into first/middle/last
- In-file duplicates: Student ID; Sr No.
- Database duplicates using Student ID / enrollment / roll indexes, excluding rows already tied to **this** submission
- Academic year is taken from the college year or the submission year (the sheet has no Academic Year column)
- Cells that must be filled: Sr No., Student ID, Name of Insured, DOB, Gender, and Mobile No. Age may be blank; it is calculated from DOB when possible. Relation to, Relation, Location, DOJ, DOC, Sum Insured, and Email ID may be blank. An Age that disagrees with DOB by more than one year is invalid.
- Formula-like cells are sanitized

## Result shown to the college

Total / valid / invalid / duplicate counts from the uploaded file. Issue list includes row, field, message. **Download error report** is an `.xlsx`. Invalid rows are not imported.

Preview is paginated (default 20, max 50). After confirm, preview reads `Student` documents.

Parsed rows live on `UploadJob` (TTL). Original file bytes are not stored in object storage; checksum, filename, and size are kept on the submission and a `Document` metadata row (`documentType: STUDENT_EXCEL`).
