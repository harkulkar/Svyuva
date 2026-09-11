# AI security

AI is an assistant. It must not approve, reject, delete, or change colleges, students, insurance, payments, or official policy data.

## RBAC and isolation

- Guests retrieve only `GLOBAL_OFFICIAL_KNOWLEDGE`.
- College users retrieve `GLOBAL_OFFICIAL_KNOWLEDGE` plus their own `INSTITUTE_SPECIFIC` chunks (`instituteId` from the session).
- Admin may retrieve `ADMIN_ONLY`.
- College users receive 403 on `/api/ai/knowledge` write/list/admin analytics.
- Conversations are owner-only. Administrators cannot open another user’s chat by ID.

The model cannot bypass these filters. Retrieval runs after role is resolved from the authenticated session.

## Prompt injection

Retrieved text and uploads are labelled untrusted. User questions matching injection patterns skip retrieval and tools. System prompts live in `backend/src/ai/prompts/` (version `12.0.0`). Document sentences such as “ignore previous instructions” are content, not instructions.

## Secrets

Never send passwords, refresh tokens, `AI_API_KEY`, or payment credentials to a provider. Chat audit logs store operation metadata, not full prompts. Credential probes are refused.

## Writes

Write-like questions (`approve`, `reject`, `delete`, …) are refused. Suggested actions must be carried out through normal portal endpoints by a human.

## Rate limits and size

- `AI_MAX_REQUESTS_PER_MINUTE` (default 20)
- `AI_MAX_DOCUMENT_SIZE_MB` (default 8)
- `AI_MAX_PROMPT_CHARS` (default 12000)
- `AI_TIMEOUT_MS` (default 20000)

## Data minimisation

Tools return counts and session-scoped summaries. Student Excel AI review stays on the server as suggestions; it does not push row PII to an external LLM.
