export type PublicDocument = {
  id: string;
  name: string;
  type: 'PDF' | 'Excel';
  description: string;
  href: string;
  category: 'gr' | 'scheme' | 'national' | 'icici' | 'template';
};

export const PUBLIC_DOCUMENTS: PublicDocument[] = [
  {
    id: 'gr-vidyarthi-vima',
    name: 'Vidyarthi Vima Government Resolution',
    type: 'PDF',
    description: 'Government Resolution related to Vidyarthi Vima / student insurance, as published on the existing portal.',
    href: '/assets/documents/Vidyarthi-Vima-GR.pdf',
    category: 'gr'
  },
  {
    id: 'gr-2023-10-16',
    name: 'Vidyarthi Vima Government Resolution (16 October 2023)',
    type: 'PDF',
    description: 'GR file titled Vidyarthi Vima Gr 16 10 2023 on the existing website.',
    href: '/assets/documents/Vidyarthi-Vima-GR-2023-10-16.pdf',
    category: 'gr'
  },
  {
    id: 'pa-svysy',
    name: 'Personal Accident — SVYSY',
    type: 'PDF',
    description: 'Personal accident scheme document published on the existing website.',
    href: '/assets/documents/PA-SVYSY.pdf',
    category: 'scheme'
  },
  {
    id: 'mediclaim-svysy',
    name: 'Mediclaim — SVYSY',
    type: 'PDF',
    description: 'Mediclaim scheme document published on the existing website.',
    href: '/assets/documents/Mediclaim-SVYSY.pdf',
    category: 'scheme'
  },
  {
    id: 'format-insurance',
    name: 'Format Insurance (Excel)',
    type: 'Excel',
    description: 'Excel format file published on the existing website as Format Insurance.',
    href: '/assets/documents/Format-Insurance.xlsx',
    category: 'template'
  },
  {
    id: 'national-claim',
    name: 'National Insurance — Claim Document',
    type: 'PDF',
    description: 'National Insurance Company claim document from the existing downloads section.',
    href: '/assets/documents/National-Claim-Doc.pdf',
    category: 'national'
  },
  {
    id: 'icici-gpa',
    name: 'ICICI Lombard — GPA Claim Form',
    type: 'PDF',
    description: 'ICICI Lombard GPA claim form from the existing portal.',
    href: '/assets/documents/ICICI-GPA-Claim-Form.pdf',
    category: 'icici'
  },
  {
    id: 'icici-student',
    name: 'ICICI Lombard — Claim Requirements (Student)',
    type: 'PDF',
    description: 'Student claim requirement document published for ICICI Lombard.',
    href: '/assets/documents/ICICI-Claim-Requirements-Student.pdf',
    category: 'icici'
  },
  {
    id: 'icici-parents',
    name: 'ICICI Lombard — Claim Requirements (Parents)',
    type: 'PDF',
    description: 'Parents claim requirement document published for ICICI Lombard.',
    href: '/assets/documents/ICICI-Claim-Requirements-Parents.pdf',
    category: 'icici'
  }
];

export function documentsByCategory(category: PublicDocument['category']): PublicDocument[] {
  return PUBLIC_DOCUMENTS.filter((doc) => doc.category === category);
}
