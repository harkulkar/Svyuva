export const SITE = {
  shortName: 'Swami Vivekananda Yuva Suraksha Yojana',
  fullName: 'Swami Vivekananda Yuva Suraksha Yojana',
  departmentLine: 'Directorate of Higher Education, Government of Maharashtra',
  parentDepartment: 'Higher and Technical Education Department, Government of Maharashtra',
  description:
    'Official public website of Swami Vivekananda Yuva Suraksha Yojana, the student insurance scheme of the Directorate of Higher Education, Government of Maharashtra.',
  logoSrc: '/logo.svg',
  logoAlt: 'Emblem of Swami Vivekananda Yuva Suraksha Yojana',
  contact: {
    displayEmail: 'info@svyuvasuraksha.org',
    mailto: 'mailto:info@buypolicynow.com',
    phoneDisplay: '+91 9136712289',
    phoneHref: 'tel:+919136712289',
    note: 'Email and phone as published on svyuvasuraksha.org. The live footer mailto currently points to info@buypolicynow.com.'
  }
} as const;

export const QUOTES = [
  'Arise, awake, and stop not until the goal is achieved.',
  'In a conflict between the heart and the brain, follow your heart.',
  'You cannot believe in God until you believe in yourself.',
  'The greatest religion is to be true to your own nature. Have faith in yourselves.'
] as const;

export const HERO_SLIDES = [
  {
    id: 'slide-1',
    image: '/assets/images/slider-01.jpg',
    alt: 'Swami Vivekananda Yuva Suraksha Yojana banner 1',
    quote:
      '"As long as we believe ourselves to be even the least different from God, fear remains with us; but when we know ourselves to be the One, fear goes; of what can we be afraid?"'
  },
  {
    id: 'slide-2',
    image: '/assets/images/slider-02.jpg',
    alt: 'Swami Vivekananda Yuva Suraksha Yojana banner 2',
    quote: QUOTES[0]
  },
  {
    id: 'slide-3',
    image: '/assets/images/slider-03.jpg',
    alt: 'Swami Vivekananda Yuva Suraksha Yojana banner 3',
    quote: QUOTES[3]
  }
] as const;

export const USEFUL_LINKS = [
  { label: 'Government of Maharashtra', href: 'https://www.maharashtra.gov.in/' },
  { label: 'Directorate of Higher Education', href: 'https://dhepune.gov.in/' },
  { label: 'Directorate of Technical Education', href: 'https://dte.maharashtra.gov.in/' },
  { label: 'Directorate of Arts', href: 'https://htedu.maharashtra.gov.in/Main/DirectorateofArts' },
  { label: 'Maharashtra State Board of Technical Education', href: 'https://msbte.org.in/' }
] as const;

export const TODO_VERIFY = 'TODO: VERIFY OFFICIAL CONTENT';
