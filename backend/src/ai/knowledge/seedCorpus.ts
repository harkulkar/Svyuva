/** Published portal FAQ and about-scheme text already shown on this rebuild. Not invented policy numbers. */

export const SEED_KNOWLEDGE = [
  {
    seedKey: 'portal-faq',
    title: 'Portal FAQ (published pages)',
    source: 'SV Yuva Suraksha public website FAQ',
    sourceUrl: '/faq',
    accessScope: 'GLOBAL_OFFICIAL_KNOWLEDGE' as const,
    text: `What is Swami Vivekananda Yuva Suraksha Yojana?
It is the comprehensive revamped Student Insurance Scheme of the Directorate of Higher Education, Government of Maharashtra, for students studying under Higher & Technical education. The existing website describes health coverage, accident insurance, and coverage for unforeseen circumstances. Detailed terms are in the official documents under Downloads.

Who is the implementing body?
The Directorate of Higher Education, Government of Maharashtra, is presented on the existing website as the implementing body. Regional Joint Director offices are listed at Mumbai, Panvel, Pune, Kolhapur, Solapur, Aurangabad, Nanded, Jalgaon, Amravati, and Nagpur.

Who is the nodal agency?
Integrated Risk Insurance Brokers Limited is published on the existing website as the nodal agency appointed by the Directorate of Higher Education to oversee implementation and administration of the scheme.

Which insurance companies are listed on the portal?
The existing Downloads menu lists National Insurance Company and ICICI Lombard GIC, with claim documents and contact details on their respective pages.

How can I contact the scheme portal?
The existing website publishes info@svyuvasuraksha.org. Insurer-specific contacts are on the National Insurance Company and ICICI Lombard GIC download pages.

How do colleges or institutes access the portal?
The public website provides Login and Sign Up. Colleges register, then an administrator approves the institute before college users can manage students.

Where are Government Resolutions and scheme PDFs?
Government Resolutions and insurer documents published on the existing website are available under Downloads and Documents on this portal.`
  },
  {
    seedKey: 'portal-about-scheme',
    title: 'About the Scheme (published page)',
    source: 'SV Yuva Suraksha public website About the Scheme',
    sourceUrl: '/scheme',
    accessScope: 'GLOBAL_OFFICIAL_KNOWLEDGE' as const,
    text: `The Directorate of Higher Education, Government of Maharashtra is proud to introduce a pioneering initiative. This forward-thinking insurance program aims to prioritize the well-being of students across the state studying under Higher & Technical education by providing a comprehensive insurance coverage tailored to their unique needs. Recognizing the diverse challenges that students may encounter during their educational journey, this scheme encompasses a range of benefits, including health coverage, accident insurance, and coverage for unforeseen circumstances. The comprehensive revamped Student Insurance Scheme titled Swami Vivekananda Yuva Suraksha Yojana reflects the dedication to supporting the holistic development of each student, ensuring they can pursue their education with confidence and peace of mind.

Personal Accident page note: Lump-sum amounts referred to as “the table above” on the existing site are not reproduced here as a numeric table; see the official PDF under Downloads.

Portal procedures: College users may add students individually or upload an Excel file. The file is validated first. Import happens only after the college confirms. AI suggestions never change student rows automatically.

Insurance, documents, e-card, payment status, and review HTTP modules are not live in this rebuild. The assistant must not invent claim or payment outcomes.`
  },
  {
    seedKey: 'portal-admin-manual',
    title: 'Administrator procedures (portal manual)',
    source: 'Rebuild admin portal behaviour',
    sourceUrl: '/admin',
    accessScope: 'ADMIN_ONLY' as const,
    text: `Administrators approve or reject college registrations in College Registrations. Rejection requires a reason. The last active administrator cannot be deactivated. Audit logs record approvals, exports, and data corrections. System health does not show secrets. AI cannot approve or reject institutes.`
  }
];
