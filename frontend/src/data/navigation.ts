export type NavChild = { label: string; to: string };

export type NavItem = {
  label: string;
  to?: string;
  children?: NavChild[];
};

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', to: '/' },
  {
    label: 'About Us',
    children: [
      { label: 'Parent Department', to: '/about-scheme' },
      { label: 'Implementing Body', to: '/implementing-body' },
      { label: 'Nodal Agency', to: '/nodal-agency' }
    ]
  },
  {
    label: 'Insurance Scheme',
    children: [
      { label: 'Personal Accident', to: '/personal-accidents' },
      { label: 'Mediclaim', to: '/mediclaim-coverage' }
    ]
  },
  {
    label: 'Downloads',
    children: [
      { label: "G.R'S", to: '/gr' },
      { label: 'National Insurance Company', to: '/national-document' },
      { label: 'ICICI Lombard GIC', to: '/icici-document' }
    ]
  },
  { label: 'Press', to: '/press' },
  { label: 'Contact', to: '/contact' }
];

export const FOOTER_POLICY_LINKS: NavChild[] = [
  { label: 'Website Policies', to: '/website-policies' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms and Conditions', to: '/terms-and-conditions' },
  { label: 'Accessibility Statement', to: '/accessibility-statement' },
  { label: 'Copyright Policy', to: '/copyright-policy' },
  { label: 'Hyperlink Policy', to: '/hyperlink-policy' },
  { label: 'Disclaimer', to: '/disclaimer' }
];

export const FOOTER_QUICK_LINKS: NavChild[] = [
  { label: 'About the Scheme', to: '/scheme' },
  { label: 'Documents', to: '/documents' },
  { label: 'Downloads', to: '/downloads' },
  { label: 'Useful Links', to: '/useful-links' },
  { label: 'FAQ', to: '/faq' },
  { label: 'AI assistant', to: '/ai-assistant' },
  { label: 'Contact', to: '/contact' }
];
