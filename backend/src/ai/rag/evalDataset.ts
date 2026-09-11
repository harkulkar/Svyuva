/** Questions keyed to seeded published portal text. Expected answers are characteristics, not invented policy numbers. */

export const RAG_EVAL_CASES = [
  {
    id: 'nodal-agency',
    question: 'Who is the nodal agency?',
    expectedDocumentTitle: 'Portal FAQ (published pages)',
    expectedSectionHint: 'nodal agency',
    expectedAnswerIncludes: ['Integrated Risk Insurance Brokers'],
    mustNotInvent: ['premium', 'GR number']
  },
  {
    id: 'implementing-body',
    question: 'Who is the implementing body?',
    expectedDocumentTitle: 'Portal FAQ (published pages)',
    expectedSectionHint: 'implementing body',
    expectedAnswerIncludes: ['Directorate of Higher Education'],
    mustNotInvent: ['coverage amount']
  },
  {
    id: 'unverified-premium',
    question: 'What is the exact insurance premium amount for every student in 2024?',
    expectedDocumentTitle: null,
    expectedSectionHint: null,
    expectedAnswerIncludes: ['could not verify'],
    mustNotInvent: ['₹', 'Rs.']
  }
] as const;
