# AI architecture

Phase 12 adds an **assistant** layer to the SV Yuva Suraksha Yojana portal. Core workflows (login, students, Excel, insurance placeholders, documents, payment, review, e-card, admin) stay on the existing Express + MongoDB application. AI is optional: if the provider is down, only `/api/ai/*` and the assistant UI fail.

## Request path

```
Frontend (/ai-assistant, /college/ai-assistant, /admin/ai-assistant)
   → Backend API (/api/ai)
        → Application DB (MongoDB SVYSY)
        → AI module (backend/src/ai)
             → LLM provider abstraction (none | local | openai)
             → Vector search (knowledgeChunks + hashed embeddings)
             → Document processing / OCR review flags
             → Knowledge repository (knowledgeDocuments + local files)
```

The AI module is not imported from React components except via HTTP.

## Provider abstraction

| `AI_PROVIDER` | Behaviour |
| --- | --- |
| `none` (default) | Extractive RAG from approved chunks. No external LLM. |
| `local` | Same extractive path (no local GPU runtime in this phase). |
| `openai` | Optional Chat Completions if `AI_API_KEY` is set. Timeouts, one retry on 5xx/network, then extractive fallback. |

`AI_API_KEY` is server-only. It must never be prefixed with `VITE_`.

## Models and data stores

- Metadata: MongoDB collections `knowledgeDocuments`, `knowledgeChunks`, `aiConversations`, `aiFeedback`, `aiUsage`.
- Files: `backend/storage/knowledge/` (gitignored). Not stored as MongoDB blobs.
- Vectors: 128-dimension feature-hash embeddings on `knowledgeChunks`. There is no Chroma instance in this repo.
- OCR: text/CSV/XLSX extracted directly; scanned PDF/images marked `OCR_REVIEW_REQUIRED`. Engine `AI_OCR_ENGINE=none` (no Tesseract). Numeric OCR confidence is not invented.

## Chat flow

1. Optional authentication (guest allowed for public scheme questions).
2. Permission / safety checks (writes, secrets, cross-institute, injection).
3. Authorised **read-only** tools (counts from session scope; `instituteId` never taken from the model).
4. Vector retrieve of **ACTIVE** documents in the caller’s access scope.
5. LLM or extractive answer + citations + source quality.
6. Audit `AI_QUERY` (no prompt body, no secrets).

## Document pipeline

`UPLOAD → validate → extract → OCR flag if needed → clean/chunk → embed → ACTIVE or REVIEW_REQUIRED/FAILED`

Processing is asynchronous after admin upload (`202`).

## Tools

Read-only: `getDashboardStatistics`, `getMyInstituteSummary`, `searchMyStudents`, `countInsuranceRecords`, `countDocumentMetadata`, `countPaymentRecords`. Tools use the same RBAC as the rest of the API. The model cannot run arbitrary MongoDB.

Phase 7 insurance/document/payment HTTP APIs remain unimplemented; tools report counts and `httpApi: not_implemented` where relevant.

## UI

- Public: `/ai-assistant` (alias `/chat`)
- College: `/college/ai-assistant`
- Admin: `/admin/ai-assistant`, `/admin/knowledge`, `/admin/ai-usage`
