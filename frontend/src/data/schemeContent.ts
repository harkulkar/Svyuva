import { TODO_VERIFY } from './site';

export const ABOUT_SCHEME = {
  title: 'About The Scheme',
  paragraphs: [
    'The Directorate of Higher Education, Government of Maharashtra is proud to introduce a pioneering initiative. This forward-thinking insurance program aims to prioritize the well-being of students across the state studying under Higher & Technical education by providing a comprehensive insurance coverage tailored to their unique needs. Recognizing the diverse challenges that students may encounter during their educational journey, this scheme encompasses a range of benefits, including health coverage, accident insurance, and coverage for unforeseen circumstances. The comprehensive revamped Student Insurance Scheme titled Swami Vivekananda Yuva Suraksha Yojana reflects the dedication to supporting the holistic development of each student, ensuring they can pursue their education with confidence and peace of mind.'
  ]
};

export const PARENT_DEPARTMENT = {
  title: 'Parent Department',
  image: '/assets/images/parent-department.png',
  imageAlt: 'Higher and Technical Education Department, Government of Maharashtra',
  paragraphs: [
    'The scheme is presented on the existing portal under About Us → Parent Department. The parent department shown on the live website is the Higher and Technical Education Department, Government of Maharashtra.',
    TODO_VERIFY + ': Confirm any additional official parent-department narrative before adding further text.'
  ]
};

export const IMPLEMENTING_BODY = {
  title: 'Implementing Body',
  person: {
    name: 'Dr. Shailendra Deolankar',
    role: 'Incharge Director, Higher Education',
    photo: '/assets/images/shailendra-deolankar.jpg',
    photoAlt: 'Photograph of Dr. Shailendra Deolankar, Incharge Director, Higher Education'
  },
  paragraphs: [
    'The Directorate of Higher Education was entrusted with the responsibility of the Management of Non‐ agricultural Universities and its Degree Colleges of higher education in the faculties of Arts, Science, Commerce, law, Education, and Non‐ AICTE in the State. In the year 1969, the State Government had introduced 10+2+3 systems of education and started the number of Senior Colleges in the State to impart Higher Education. The number of these colleges increased immensely after the formation of the Directorate of Higher Education on 31‐10‐ 1984. Consequently, the administrative responsibilities of the Director of Higher Education have enormously increased and the centralized management of all the colleges had become very difficult from the State level Directorate located at Pune. Thus the need was felt to decentralize the organization which has resulted in the creation of 10 regional offices in the State to oversee the functioning of colleges in the respective regions. The 10 offices of Regional Joint Directors are located at Mumbai, Panvel, Pune, Kolhapur, Solapur, Aurangabad, Nanded, Jalgaon, Amravati, and Nagpur.'
  ]
};

export const NODAL_AGENCY = {
  title: 'Nodal Agency',
  person: {
    name: 'Chintan Prakash Adva',
    role: 'MD & CEO, Integrated Risk Insurance Brokers Limited',
    photo: '/assets/images/chintan-adva.jpg',
    photoAlt: 'Photograph of Chintan Prakash Adva, MD & CEO, Integrated Risk Insurance Brokers Limited'
  },
  paragraphs: [
    'Integrated Risk Insurance Brokers Limited, an IRDA Licensed Public Limited company has been duly appointed by Directorate of Higher Education, Government of Maharashtra to oversee the implementation, administration of the scheme, Swami Vivekananda Yuva Suraksha Yojana. The Nodal Agency shall work as an advisor, consultant, intermediary to the Directorate of Higher Education, Government of Maharashtra towards effective management of claims, services, enrolment, grievance management & uphold the interest of the Directorate of Higher Education for the efficient execution & fulfilment of the scheme'
  ]
};

export const PERSONAL_ACCIDENT = {
  title: 'Personal Accident',
  image: '/assets/images/personal-accident.jpg',
  imageAlt: 'Personal accident policy illustration used on the existing website',
  intro:
    'The following benefit descriptions are published on the existing Personal Accident page. Lump-sum amounts referred to as “the table above” on that page are not reproduced here as a numeric table; see the official PDF.',
  benefits: [
    {
      title: 'Accidental Death Benefit',
      text: 'The payment of Lumpsum amount to the nominee in the event of an accidental death of the beneficiary as described in the table above'
    },
    {
      title: 'Accidental Permanent Disability Benefit',
      text: 'The payment of Lumpsum amount to the nominee in the event of an accidental permanent disability of the beneficiary as described in the table above'
    },
    {
      title: 'Accidental Partial Disability Benefit',
      text: 'The payment of Lumpsum amount to the nominee in the event of an accidental partial disability of the beneficiary as described in the table above'
    },
    {
      title: 'Child Education Welfare / Children Education Grant',
      text: 'In the event of death or permanent total disablement of the Insured Parent/Guardian due to an Accident as defined, the Insurance Company shall pay ‘Child Education Grant’ for the Student enrolled in the policy, an additional compensation of a lumpsum pay out of 10% of the Capital Sum Insured once per event, per policy period'
    },
    {
      title: 'Accidental Hospitalisation Benefit',
      text: 'A cashless hospitalisation benefit across the network of empanelled hospitals (Pan-India) in case of bodily injuries to the primary insured member or the secondary insured member. The expenses towards the treatment during the hospitalization for up to a maximum of INR 50,000/- (Primary Plus Secondary insured) floater amount Per policy period. In case of the hospitalization event at the non-network/non-empanelled hospital, the insured can claim for the reimbursement of expenses from the Insurance Company towards the treatment undertaken at the hospitalisation due to accident. The policy shall cover only medicinal expenses including (not limited to): Room/ICU Charges, Doctor’s Fees, Cost of Investigation, Pharmacy Charges, Nursing Charges. All non-medical expenses, consumables shall not be payable under the policy'
    }
  ],
  documentId: 'pa-svysy' as const
};

export const MEDICLAIM = {
  title: 'Mediclaim',
  image: '/assets/images/plans.jpg',
  imageAlt: 'Mediclaim / plans illustration used on the existing website',
  intro: 'The following items are published on the existing Mediclaim page. Full wording is in the official PDF.',
  benefits: [
    { title: 'In-patient Hospitalization for Covid_19', text: 'Covered' },
    { title: 'Pre-Existing Conditions', text: 'Covered from Day One' },
    { title: 'Waiver of 30 days, 1st Year Exclusion, 2nd Year Exclusion & 4th Year Exclusion', text: '' },
    { title: 'Class of Treatment', text: 'Private Room (subject to Clause VII)' },
    { title: 'Room Rent Restriction', text: '2% of Sum Insured for Normal & 4% for ICU' },
    {
      title: 'Pre & Post Hospitalization',
      text: 'Medical Expenses arising 30 days Prior to Hospitalization & 60 days post hospitalization shall be payable'
    },
    { title: 'Ambulance Charges', text: 'INR 2000/- Per Hospitalization event shall be payable' }
  ],
  documentId: 'mediclaim-svysy' as const
};

export const INSURERS = {
  icici: {
    title: 'ICICI Lombard GIC',
    person: 'Amrish Duddalwar',
    mobile: '8605007196',
    email: 'Amrish.duddalwar@icicilombard.com',
    address: '5th Floor Landmark, Plot No 5 & 6 Ramdaspeth, Nagpur 440010, Maharashtra'
  },
  national: {
    title: 'National Insurance Company Ltd',
    person: 'Rahul Balasaheb Patil',
    role: 'Divisional Manager',
    office: 'Pune Divisional Office-III',
    address: '1248-A, Asmani Plaza, Deccan Gymkhana, Pune-04',
    mobile: '8411886135',
    emails: ['rahulb.patil@nic.co.in', 'Incharge.271500@nic.co.in', '271500@nic.co.in']
  }
};

export const PRESS_ITEMS = [
  {
    title: 'Swami Vivekananda Yuva Suraksha Yojana',
    summary: 'An Artical Regarding Our New Student Insurance Program',
    href: 'https://theprint.in/ani-press-releases/maharashtras-new-student-insurance-program-aims-to-secure-futures/1810822/'
  }
];