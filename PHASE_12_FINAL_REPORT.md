# PHASE 12 FINAL REPORT

PROJECT: SV Yuva Suraksha Yojana Portal

PHASE STATUS: Phase 12 — AI assistance, RAG, document intelligence, secure data access

This phase added an assistant layer. It did **not** start Phase 13, deploy to production, change DNS, invent official insurance/premium/GR data, or give the model write access to records.

---

## AI

- AI provider: Configurable `none` (default extractive RAG) | `local` (same path) | `openai` (optional Chat Completions).
- Model: Extractive RAG (`extractive-rag`). Optional `AI_MODEL` only when `AI_PROVIDER=openai` and `AI_API_KEY` is set server-side.
- Chatbot: `/ai-assistant`, `/chat`, `/college/ai-assistant`, `/admin/ai-assistant`. Role-aware. Citations + source quality + disclosure.
- RAG: Yes. ACTIVE knowledge chunks only; access-scope filters.
- Vector database: MongoDB `knowledgeChunks` + 128-d hashed embeddings (no Chroma in this repo).
- OCR: Review flag for scans/images (`AI_OCR_ENGINE=none`). No invented numeric confidence. Not treated as verified official data.
- Document AI: Rule-based classification; visible email/mobile extraction; human review required.
- Knowledge repository: Admin `/admin/knowledge`. College cannot upload global official knowledge.
- Admin assistant: Read-only authorised tools (counts). No raw Mongo queries.
- College assistant: Session `instituteId` only. Cross-institute questions refused.

## Security

- RBAC: Guest / COLLEGE / ADMIN scopes on retrieval and routes.
- Data isolation: College A cannot retrieve College B students or `ADMIN_ONLY` chunks. Conversations are owner-only.
- Prompt injection protection: Pattern refusals; retrieved documents treated as untrusted content.
- Secret protection: `AI_API_KEY` is not a `VITE_` variable; credential probes refused; audits omit prompt bodies.
- AI rate limiting: `AI_MAX_REQUESTS_PER_MINUTE` on `/api/ai`.

## Testing

- AI tests: `backend/src/ai/ai.unit.test.ts`
- RAG evaluation: `backend/src/ai/ai.api.test.ts` + `evalDataset.ts`
- Security tests: injection, credentials, writes, cross-college, knowledge 403
- Regression tests: existing Phase 1–11 suites remain in `npm test`

## Operations

- Monitoring: audit events + `aiUsage` + `/admin/ai-usage`
- Error handling: extractive fallback; `503 AI_UNAVAILABLE` for hard failures; rest of portal independent
- Cost/usage tracking: request counts; recorded tokens if the provider returns them; **no invented cost**

## Known limitations

- Default path does not call an external LLM (UAT can proceed without a vendor key).
- No Tesseract/full PDF OCR; scans need human review.
- In-process vector scan (not a dedicated ANN service).
- Phase 7 insurance/document/payment/review/e-card HTTP APIs still not live; tools expose counts only.
- OpenAI answers are never labelled fully verified solely because a model replied.
- SMTP, production cutover, and restore drill remain incomplete from earlier phases.

## Production blockers (unchanged from Phases 10–11)

1. Cutover / DNS not authorised.
2. UAT not signed for the full portal (including this AI layer).
3. Restore drill not executed.
4. SMTP not implemented.
5. Phase 7 operational APIs missing.

## OVERALL STATUS

**AI READY FOR UAT**

Ready for UAT of **assistant behaviour** with `AI_PROVIDER=none` (knowledge-backed answers, refusals, college isolation, knowledge admin). Not a claim that production AI, OCR, or OpenAI are fully configured. Not a claim that the whole portal is production-ready.
