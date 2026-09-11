# Knowledge repository

Admin-only UI: `/admin/knowledge`. College users cannot upload into the global official knowledge base.

## Document model (`knowledgeDocuments`)

title, description, documentType, source, sourceUrl, version, effectiveDate, uploadedBy, uploadedAt, status, accessScope, instituteId, fileReference, checksum, chunkingStatus, embeddingStatus, ocrStatus, metadata.

Statuses used: `DRAFT`, `PROCESSING`, `ACTIVE`, `ARCHIVED`, `FAILED`, `REVIEW_REQUIRED`.

Access scopes: `GLOBAL_OFFICIAL_KNOWLEDGE`, `ADMIN_ONLY`, `INSTITUTE_SPECIFIC`.

## Versioning

Uploading a file always creates a **new** record. The previous version is not overwritten. Administrators archive old versions and activate processed documents. Only `ACTIVE` documents are used for official RAG answers. The system does not decide which circular is legally current.

## Processing

1. Validate type/size (`AI_MAX_DOCUMENT_SIZE_MB`).
2. Store file on disk.
3. Extract text (TXT/CSV/XLSX; light PDF/DOCX scrape).
4. If text is missing (scans/images): `OCR_REVIEW_REQUIRED` — output is not treated as verified official data.
5. Chunk (headings/sections/page markers) and embed.
6. Set `ACTIVE` when chunks exist.

Reprocess is available from the admin UI. Processing errors are stored on the document.

## Seed documents

On first chat, published FAQ and About-the-Scheme wording is seeded for RAG. That seed is labelled as portal content, not a new GR.
