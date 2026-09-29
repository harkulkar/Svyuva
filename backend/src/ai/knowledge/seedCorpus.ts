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

What is GPA / Group Personal Accident / Personal Accident policy?
On this portal, Personal Accident (also called GPA / Group Personal Accident on insurer claim forms such as the ICICI Lombard GPA Claim Form) is the accident cover described under Insurance Scheme → Personal Accident. Open /personal-accidents and the official Personal Accident PDF under Downloads for complete wording, including any capital sum-insured table. The assistant must not invent premium or sum-insured figures that are not in the published pages.

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
  },
  {
    seedKey: 'portal-personal-accident',
    title: 'Personal Accident / GPA (published page)',
    source: 'SV Yuva Suraksha public website Personal Accident page',
    sourceUrl: '/personal-accidents',
    accessScope: 'GLOBAL_OFFICIAL_KNOWLEDGE' as const,
    text: `Personal Accident policy details (GPA / Group Personal Accident)

This is the Personal Accident cover published on the existing website under Insurance Scheme. Insurer downloads on this portal also use the name GPA (for example ICICI Lombard GPA Claim Form). Lump-sum amounts referred to as “the table above” on that page are not reproduced here as a numeric table; see the official Personal Accident PDF under Downloads.

Accidental Death Benefit: The payment of Lumpsum amount to the nominee in the event of an accidental death of the beneficiary as described in the table above.

Accidental Permanent Disability Benefit: The payment of Lumpsum amount to the nominee in the event of an accidental permanent disability of the beneficiary as described in the table above.

Accidental Partial Disability Benefit: The payment of Lumpsum amount to the nominee in the event of an accidental partial disability of the beneficiary as described in the table above.

Child Education Welfare / Children Education Grant: In the event of death or permanent total disablement of the Insured Parent/Guardian due to an Accident as defined, the Insurance Company shall pay ‘Child Education Grant’ for the Student enrolled in the policy, an additional compensation of a lumpsum pay out of 10% of the Capital Sum Insured once per event, per policy period.

Accidental Hospitalisation Benefit: A cashless hospitalisation benefit across the network of empanelled hospitals (Pan-India) in case of bodily injuries to the primary insured member or the secondary insured member. The expenses towards the treatment during the hospitalization for up to a maximum of INR 50,000/- (Primary Plus Secondary insured) floater amount Per policy period. In case of the hospitalization event at the non-network/non-empanelled hospital, the insured can claim for the reimbursement of expenses from the Insurance Company towards the treatment undertaken at the hospitalisation due to accident. The policy shall cover only medicinal expenses including (not limited to): Room/ICU Charges, Doctor’s Fees, Cost of Investigation, Pharmacy Charges, Nursing Charges. All non-medical expenses, consumables shall not be payable under the policy.

For claim forms and the official PDF, use Downloads on this portal. Do not invent other premium or sum-insured figures.`
  },
  {
    seedKey: 'portal-mediclaim',
    title: 'Mediclaim (published page)',
    source: 'SV Yuva Suraksha public website Mediclaim page',
    sourceUrl: '/mediclaim-coverage',
    accessScope: 'GLOBAL_OFFICIAL_KNOWLEDGE' as const,
    text: `Mediclaim policy details published on the existing website. Full wording is in the official Mediclaim PDF under Downloads.

In-patient Hospitalization for Covid_19: Covered.
Pre-Existing Conditions: Covered from Day One.
Waiver of 30 days, 1st Year Exclusion, 2nd Year Exclusion & 4th Year Exclusion.
Class of Treatment: Private Room (subject to Clause VII).
Room Rent Restriction: 2% of Sum Insured for Normal & 4% for ICU.
Pre & Post Hospitalization: Medical Expenses arising 30 days Prior to Hospitalization & 60 days post hospitalization shall be payable.
Ambulance Charges: INR 2000/- Per Hospitalization event shall be payable.`
  }
];
