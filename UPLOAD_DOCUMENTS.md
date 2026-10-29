# ICICI document pack (college upload flow)

After a college validates a student Excel file and selects **ICICI Lombard** (GPA or GMC), the portal shows an **Upload documents** section. All 8 documents must be uploaded before the premium can be paid (the *Pay online* / *Proceed to payment* button stays disabled, and the server refuses payment with `DOCUMENTS_REQUIRED`). National Insurance has no document step.

| # | Document |
|---|---|
| 1 | GPA Proposal Form |
| 2 | Student Data Sheet (Annexure) |
| 3 | Signed & Stamped PEP–KYC |
| 4 | Aadhaar & PAN of Authorized Signatory |
| 5 | BML |
| 6 | College PAN & GST Certificate / NON‑GST Declaration |
| 7 | College Not‑NPO/NGO Declaration |
| 8 | DCM Matrix |

The list lives in `backend/src/data/uploadDocumentCatalog.ts` (one place; the UI reads it from the API).

## Files
- Accepted: PDF, JPG/JPEG, PNG, DOC/DOCX, XLS/XLSX. Max `MAX_DOCUMENT_FILE_SIZE_MB` (default 5) per file.
- The extension must be allow-listed **and** the file's leading bytes must match it; the stored MIME type comes from the extension, never from the browser.
- Replacing a document keeps the old version in the database (`isCurrent: false`) and stores the new file.
- Documents lock once the upload is `PAID`.
- No malware scanning is performed. Files are served only as downloads (`Content-Disposition: attachment`, `nosniff`, `no-store`).

## Server setup
1. Create a private directory outside `public_html` and make it writable by the user that runs the API:
   `mkdir -p /home/svyuvasuraksha.org/private_uploads && chmod 750 /home/svyuvasuraksha.org/private_uploads`
2. Set `DOCUMENT_STORAGE_DIR=/home/svyuvasuraksha.org/private_uploads` in `.env` and restart the API.
   If unset, files go to `backend/storage/documents` inside the app folder (git-ignored, but deleted if the folder is re-cloned).
3. **Back this directory up** together with the database; metadata is in MongoDB (`documents` collection), the bytes are on disk.
4. If uploads fail with HTTP 413 from the proxy, raise the request-body limit for `/api/` in OpenLiteSpeed (it must be above the file limit).

## Who can see files
- A college can list, upload, replace and download only its own upload's documents.
- Admins can download any stored file from **Admin → Documents** (desktop table, *Download*). Each download is written to the audit log (`DOCUMENT_DOWNLOADED`).

## API
- `GET  /api/college/uploads/:jobId/documents` — list + completeness
- `POST /api/college/uploads/:jobId/documents/:type` — multipart field `file`
- `GET  /api/college/uploads/:jobId/documents/:type/file` — download
- `GET  /api/admin/documents/:id/file` — admin download

These endpoints are independent of the `FEATURE_DOCUMENT_HTTP` flag, which still governs the older document module.

## Tests
`src/uploadDocuments.unit.test.ts` (no database) and `src/uploadDocuments.api.test.ts` (needs MongoDB, part of `test:integration`).
