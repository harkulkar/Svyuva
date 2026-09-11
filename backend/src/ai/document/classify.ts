import type { DocumentCategory } from '../ai.types.js';

const RULES: Array<{ category: DocumentCategory; pattern: RegExp }> = [
  { category: 'insurance_document', pattern: /insurance|policy|mediclaim|accident|claim/i },
  { category: 'payment_document', pattern: /payment|premium|receipt|billdesk/i },
  { category: 'ecard', pattern: /e-?card|identity card/i },
  { category: 'student_document', pattern: /student|enrol|enrollment|bonafide/i },
  { category: 'institute_document', pattern: /institute|college|university/i },
  { category: 'portal_manual', pattern: /manual|guide|procedure/i },
  { category: 'scheme_faq', pattern: /faq|question/i },
  { category: 'scheme_information', pattern: /scheme|yojana|government resolution|\bgr\b/i }
];

export function classifyDocument(filename: string, text: string): { category: DocumentCategory; method: 'filename_and_text_rules' } {
  const haystack = `${filename}\n${text.slice(0, 2000)}`;
  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) {
      return { category: rule.category, method: 'filename_and_text_rules' };
    }
  }
  return { category: 'unknown', method: 'filename_and_text_rules' };
}
