export type UploadDocumentType =
  | 'GPA_PROPOSAL_FORM'
  | 'STUDENT_DATA_SHEET'
  | 'PEP_KYC'
  | 'SIGNATORY_AADHAAR_PAN'
  | 'BML'
  | 'COLLEGE_PAN_GST'
  | 'NOT_NPO_NGO_DECLARATION'
  | 'DCM_MATRIX';

export const UPLOAD_DOCUMENT_TYPES = [
  'GPA_PROPOSAL_FORM',
  'STUDENT_DATA_SHEET',
  'PEP_KYC',
  'SIGNATORY_AADHAAR_PAN',
  'BML',
  'COLLEGE_PAN_GST',
  'NOT_NPO_NGO_DECLARATION',
  'DCM_MATRIX'
] as const satisfies readonly UploadDocumentType[];

const LABELS: Record<UploadDocumentType, string> = {
  GPA_PROPOSAL_FORM: 'GPA Proposal Form',
  STUDENT_DATA_SHEET: 'Student Data Sheet (Annexure)',
  PEP_KYC: 'Signed & Stamped PEP–KYC',
  SIGNATORY_AADHAAR_PAN: 'Aadhaar & PAN of Authorized Signatory',
  BML: 'BML',
  COLLEGE_PAN_GST: 'College PAN & GST Certificate / NON‑GST Declaration',
  NOT_NPO_NGO_DECLARATION: 'College Not‑NPO/NGO Declaration',
  DCM_MATRIX: 'DCM Matrix'
};

export function isUploadDocumentType(value: string): value is UploadDocumentType {
  return (UPLOAD_DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function uploadDocumentLabel(type: UploadDocumentType): string {
  return LABELS[type];
}

/** ICICI Lombard (GPA or GMC) needs the full document pack before the premium is paid. */
export function requiredUploadDocuments(insurer?: string | null, policyType?: string | null) {
  if (insurer !== 'ICICI' || (policyType !== 'GPA' && policyType !== 'GMC')) return [];
  return UPLOAD_DOCUMENT_TYPES.map((type) => ({ type, label: LABELS[type] }));
}
