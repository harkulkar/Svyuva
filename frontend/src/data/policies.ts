import { TODO_VERIFY } from './site';

export type PolicyPage = {
  slug: string;
  title: string;
  paragraphs: string[];
  incomplete?: string;
};

export const WEBSITE_POLICY_INDEX = [
  { to: '/copyright-policy', label: 'Copyright Policy' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/hyperlink-policy', label: 'Hyperlink Policy' },
  { to: '/content-archival-policy', label: 'Content Archival Policy' },
  { to: '/website-monitoring-plan', label: 'Website Monitoring Plan' },
  { to: '/content-contribution', label: 'Content Contribution, Moderation & Approval (CMAP)' },
  { to: '/content-review-policy', label: 'Content Review Policy' },
  { to: '/contingency-management-plan', label: 'Contingency Management Plan' },
  { to: '/security-policy', label: 'Security Policy' }
] as const;

export const POLICY_PAGES: PolicyPage[] = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    paragraphs: [
      'Directorate Of Higher Education, Government Of Maharashtra, India website does not automatically capture any specific personal information from you, (like name, phone number, or e-mail address), that allows us to identify you individually. If the Directorate Of Higher Education, Government Of Maharashtra, India website requests you to provide personal information, you will be informed of the particular purposes for which the information is gathered and adequate security measures will be taken to protect your personal information. We do not sell or share any personally identifiable information volunteered on the Directorate Of Higher Education, Government Of Maharashtra, India website to any third party (public/private). Any information provided to this Directorate Of Higher Education, Government Of Maharashtra, India will be protected from loss, misuse, unauthorized access or disclosure, alteration, or destruction. We gather certain information about the User, such as Internet protocol (IP) addresses, domain name, browser type, operating system, the date and time of the visit, and the pages visited. We make no attempt to link these addresses with the identity of individuals visiting our site unless an attempt to damage the site has been detected.'
    ]
  },
  {
    slug: 'copyright-policy',
    title: 'Copyright Policy',
    paragraphs: [
      'Material featured on this portal may be reproduced free of charge in any format or media without requiring specific permission. This is subject to the material being reproduced accurately and not being used in a derogatory manner or a misleading context. Where the material is being published or issued to others, the source must be prominently acknowledged. However, the permission to reproduce this material does not extend to any material on this site which is identified as being the copyright of the third party. Authorization to reproduce such material is obtained from the copyright holders concerned.'
    ]
  },
  {
    slug: 'hyperlink-policy',
    title: 'Hyperlink Policy',
    paragraphs: [
      'Links to External Websites/Portals At many places in this portal, you shall find links to other websites/portals created and maintained by other Government, non-Government / private organizations. These links have been placed for your convenience. When you select a link you are navigated to that website. Once on that website, you are subject to the privacy and security policies of the owners/sponsors of the website. Directorate Of Higher Education, Government Of Maharashtra, India is not responsible for the contents and reliability of the linked websites and does not necessarily endorse the views expressed in them. The mere presence of the link or its listing on this Portal should not be assumed as an endorsement of any kind. Links to the Directorate Of Higher Education, Government Of Maharashtra, India Website by Other Websites/Portals We do not object to you linking directly to the information that is hosted on our site, and no prior permission is required for the same. We do not permit our pages to be loaded into frames on your site. Our Department’s pages must load into a newly opened browser window of the user.'
    ]
  },
  {
    slug: 'content-archival-policy',
    title: 'Content Archival Policy',
    paragraphs: [
      'The latest news and spotlight items will be archived automatically after entering the end date from the date of their publishing. All news/ tenders/ notices /announcements /press releases are archived after the given expiry date. The web manager entered the expiry date while entering the details with due approval from the respective department.',
      'Any item from Archives will be taken off only after the approval of the web information manager or concern authority (written communication through email). Such items, though not visible in the archive, remain in the CMS database and can be accessed from Database if required'
    ],
    incomplete: `${TODO_VERIFY}: The live page also contains an archival table whose full rows were not recovered into this rebuild.`
  },
  {
    slug: 'website-monitoring-plan',
    title: 'Website Monitoring Plan',
    paragraphs: [
      'Website Monitoring Policy in place and the website is monitored periodically to address and fix the quality and compatibility issues around the following parameters: Performance: Site download time is optimized for a variety of network connections as well as devices. All important pages of the website are tested for this. Functionality: All modules of the website are tested for their functionality. The interactive components of the site such as feedback forms are working smoothly. Broken Links: The website is thoroughly reviewed to rule out the presence of any broken links or errors. Traffic Analysis: The site traffic is monitored to analyze the usage patterns as well as visitors. Feedback: Feedback from the visitors is the best way to judge a website’s performance and make suitable improvements.'
    ]
  },
  {
    slug: 'content-contribution',
    title: 'Content Contribution, Moderation & Approval (CMAP)',
    paragraphs: [
      'The Directorate Of Higher Education, Government Of Maharashtra, India has a mechanism stating the responsibility, authorization, and workflow details concerning content publishing on the site. The overall content of the website has been verified and checked thoroughly before publishing. The website also has a mechanism to ensure that the content has an appropriate authorization form within the Department before being published to the website. Audit trail of content entering, approval, and publishing of each content is being maintained showing who approved and when. The Website of the Directorate Of Higher Education, Government Of Maharashtra, India represents a single department where most content is contributed by a single set of sources.'
    ],
    incomplete: `${TODO_VERIFY}: Closing sentence of the live CMAP page was truncated in recovery.`
  },
  {
    slug: 'content-review-policy',
    title: 'Content Review Policy',
    paragraphs: [
      'The contents are review as when required by the department/Division and the revised content is published through CMS as per COMAP.'
    ],
    incomplete: `${TODO_VERIFY}: The live page includes a review-frequency table that was not fully recovered.`
  },
  {
    slug: 'contingency-management-plan',
    title: 'Contingency Management Plan',
    paragraphs: [
      'Clause 8.4 Directorate Of Higher Education, Government Of Maharashtra, India Department website has been placed in protected zones with the implementation of firewalls and IDS (Intrusion Detection System) and high availability solutions. Defacement Protection 1. Directorate Of Higher Education, Government Of Maharashtra, India website is audited for protection against Security & Performance degradation. 2. Any application level modification on the Directorate Of Higher Education, Government Of Maharashtra, India website requires re-audit. 3. All the server configuration and logs are monitored timely. 4. Only System administrator users are allowed to access the servers.'
    ],
    incomplete: `${TODO_VERIFY}: Remaining numbered contingency clauses on the live page should be confirmed from the official source.`
  },
  {
    slug: 'security-policy',
    title: 'Security Policy',
    paragraphs: [
      'A. Website Security Policy of Directorate Of Higher Education, Government Of Maharashtra, India website Directorate Of Higher Education, Government Of Maharashtra, India website has a responsibility to protect from disclosure to unauthorized parties the personally identifiable information (name, address, date of birth, social security number, etc.) of its website users. Therefore, the Directorate Of Higher Education, Government Of Maharashtra, India website has adopted and implemented a website security policy to protect the account information of its website users. Notice and Disclosures Directorate Of Higher Education, Government Of Maharashtra, India website will not sell, trade, nor disclose the personally identifiable information of website users except as required for scheme administration or by law, as described on the live portal.'
    ],
    incomplete: `${TODO_VERIFY}: Complete remaining security-policy clauses from the live page before production launch.`
  },
  {
    slug: 'disclaimer',
    title: 'Disclaimer',
    paragraphs: [],
    incomplete: `${TODO_VERIFY}: The live /disclaimer page has a heading but no body text.`
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions',
    paragraphs: [],
    incomplete: `${TODO_VERIFY}: The live /terms-and-conditions page has a heading but no body text.`
  },
  {
    slug: 'accessibility-statement',
    title: 'Accessibility Statement',
    paragraphs: [
      'We have put in our best efforts to ensure that all the information on this portal is accessible to people with disabilities.For example, a user with a visual disability can access this portal using assistive, such as screen readers and magnifiers.',
      'We also aim to be standards compliant and follow principles of usability and universal design, which should help all visitors to this portal. If you have any problem or suggestion regarding the accessibility of this portal, please contact us.',
      'Some scanned, complex pdf may be present on the website which sometimes unavailable for screen readers due to technical issues.'
    ]
  }
];

export const ACCESSIBILITY_FEATURES = [
  'Skip to Main Content: Quick access to the core content on the page is provided without going through repetitive navigation using the keyboard.',
  'Skip to Main Content: Quick access to the navigation pane is provided that enables accessing the different sections, such as Citizens, Government, and Directories.',
  'Keyboard Support: The portal can be browsed using a keyboard by pressing the Tab and Shift + Tab keys.',
  'Customized Text Size: The size of the text on the Web page can be changed either through the browser or through the accessibility options feature.',
  'JavaScript Independent: Web page information and functionalities are independent of JavaScript, irrespective of the browser support for the scripting language.'
];

export function getPolicy(slug: string): PolicyPage | undefined {
  return POLICY_PAGES.find((page) => page.slug === slug);
}
