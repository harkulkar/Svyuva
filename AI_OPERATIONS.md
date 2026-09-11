# AI operations

## Environment

See `.env.example`. Used variables: `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_MAX_REQUESTS_PER_MINUTE`, `AI_MAX_DOCUMENT_SIZE_MB`, `AI_TIMEOUT_MS`, `AI_MAX_PROMPT_CHARS`, `AI_OCR_ENGINE`.

Restart the API process after changing provider settings. Never commit real keys.

## Failure handling

If OpenAI is configured and fails (timeout, 5xx, missing key), chat falls back to extractive RAG. If generation still throws, the API returns `503 AI_UNAVAILABLE` with a user-facing message. Login, student management, Excel, insurance placeholders, documents, payment, review, e-card, and admin continue to work.

## Monitoring

- Audit actions: `AI_QUERY`, `AI_DOCUMENT_PROCESSED`, `AI_DOCUMENT_CLASSIFIED`, `AI_EXTRACTION_COMPLETED`, `AI_TOOL_CALLED`
- Usage collection `aiUsage` (success/failure, latency, optional token count from the provider)
- Admin UI `/admin/ai-usage` — **counts only**. `estimatedCost` is always null unless a real pricing feed exists (it does not).

## Cost control

Per-user/IP rate limit on `/api/ai`. Prompt and upload size caps. No hardcoded vendor price table.

## Background processing

Knowledge uploads return `202` and process asynchronously. The UI shows PROCESSING / ACTIVE / FAILED / REVIEW_REQUIRED.

## Disk

`backend/storage/knowledge/` must be writable on the API host and is gitignored.
