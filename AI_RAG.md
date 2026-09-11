# RAG

## Flow

User question → language/safety checks → authorised tools (optional) → vector search on `knowledgeChunks` → ACTIVE parent documents only → extractive or optional OpenAI answer → citations + source quality.

## Vector store

MongoDB `knowledgeChunks` with hashed 128-d embeddings. Cosine similarity in process (cap 400 chunks per query). Filter by access scope before scoring.

Chunk metadata: `knowledgeDocumentId`, title, page, section, source, sourceUrl, version, accessScope, instituteId.

## Citations

The UI lists retrieved titles (and page/section when present). Links use the document `sourceUrl` when it is a portal path (for example `/faq`), otherwise `/api/ai/knowledge/:id/source` with the same authorisation as retrieval.

Citations are only emitted from retrieved hits. If nothing is retrieved, the answer is unverified and the citation list is empty.

## Source quality

| Value | When |
| --- | --- |
| `VERIFIED_FROM_KNOWLEDGE_BASE` | Retrieved approved text actually used |
| `PARTIALLY_SUPPORTED` | Weaker match or optional external model paraphrase |
| `FROM_AUTHORIZED_RECORDS` | Tool counts only |
| `NOT_VERIFIED` | No supporting source |

There is no fake numeric confidence score.

## Hallucination control

Default provider `none` quotes retrieved published portal text. It does not invent GR numbers, premiums, or coverage tables. Unsupported questions use:

- EN: “I could not verify this information from the available official documents.”
- HI / MR equivalents in `backend/src/ai/prompts/index.ts`

Seed corpus is **existing published FAQ / About the Scheme / admin procedure text**, not fabricated Government Resolutions.

## Evaluation

See `AI_EVALUATION.md` and `backend/src/ai/rag/evalDataset.ts`.
