# AI evaluation

Dataset: `backend/src/ai/rag/evalDataset.ts` (published portal FAQ/about text, not invented premiums).

| Case | Expectation |
| --- | --- |
| Who is the nodal agency? | Retrieve Portal FAQ; answer includes Integrated Risk Insurance Brokers |
| Who is the implementing body? | Retrieve Portal FAQ; Directorate of Higher Education |
| Bicycle parking GR number | No citation; “could not verify” |

Automated checks also cover:

- Retrieval relevance and citation accuracy (no citations when unverified)
- College isolation (no College B students; no `ADMIN_ONLY` chunks)
- Prompt injection, credential probes, write refusals
- Hindi unverified wording
- Document classification rules
- Excel suggestions without mutation
- Provider-independent health/login after AI calls

Run:

```
cd backend
npm run test:unit
npm run test:integration
```

Hallucination rate for the default `none` provider is bounded by extractive quoting: unsupported questions must not invent rupee amounts or GR numbers. Optional OpenAI answers are labelled `PARTIALLY_SUPPORTED` even when chunks exist, because the model may paraphrase.
