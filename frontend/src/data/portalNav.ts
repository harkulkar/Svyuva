export type PortalNavChild = { to: string; label: string; end?: boolean };

export type PortalNavItem = {
  to?: string;
  label: string;
  end?: boolean;
  children?: PortalNavChild[];
};

export type BottomNavItem = { to: string; label: string; end?: boolean };

export const COLLEGE_LINKS: PortalNavItem[] = [
  { to: '/college', label: 'Dashboard', end: true },
  { to: '/college/submissions', label: 'Submissions' },
  { to: '/college/notifications', label: 'Notifications' },
  { to: '/college/profile', label: 'My Profile' },
  {
    label: 'Students',
    children: [
      { to: '/college/students', label: 'All Students', end: true },
      { to: '/college/students/add', label: 'Add Student' },
      { to: '/college/students/upload', label: 'Upload Students' }
    ]
  },
  { to: '/college/reports', label: 'Reports' },
  { to: '/college/insurance', label: 'Insurance' },
  { to: '/college/documents', label: 'Documents' },
  { to: '/college/ecard', label: 'E-Card' },
  { to: '/college/payment-status', label: 'Payment Status' },
  { to: '/college/review', label: 'Review' },
  { to: '/college/ai-assistant', label: 'AI assistant' }
];

export const ADMIN_LINKS: PortalNavItem[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/submissions', label: 'Submissions' },
  { to: '/admin/work-queue', label: 'Work queue' },
  { to: '/admin/notifications', label: 'Notifications' },
  { to: '/admin/announcements', label: 'Announcements' },
  { to: '/admin/universities', label: 'Universities' },
  { to: '/admin/institutes', label: 'Institutes' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/insurance', label: 'Insurance' },
  { to: '/admin/registrations', label: 'College Registrations' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/audit-logs', label: 'Audit Logs' },
  { to: '/admin/login-activity', label: 'Login activity' },
  { to: '/admin/system-jobs', label: 'System jobs' },
  { to: '/admin/system-health', label: 'System health' },
  { to: '/admin/storage-health', label: 'Storage health' },
  { to: '/admin/support', label: 'Support' },
  { to: '/admin/knowledge', label: 'Knowledge' },
  { to: '/admin/ai-assistant', label: 'AI assistant' },
  { to: '/admin/ai-usage', label: 'AI usage' },
  {
    label: 'Settings',
    children: [
      { to: '/admin/settings', label: 'Overview', end: true },
      { to: '/admin/notification-templates', label: 'Notification templates' },
      { to: '/admin/profile', label: 'Profile' },
      { to: '/admin/users', label: 'Users' }
    ]
  }
];

export const COLLEGE_BOTTOM_NAV: BottomNavItem[] = [
  { to: '/college', label: 'Home', end: true },
  { to: '/college/submissions', label: 'Submit' },
  { to: '/college/students', label: 'Students' },
  { to: '/college/insurance', label: 'Insurance' },
  { to: '/college/documents', label: 'Documents' },
  { to: '/college/notifications', label: 'Alerts' },
  { to: '/college/profile', label: 'Profile' }
];

export const ADMIN_BOTTOM_NAV: BottomNavItem[] = [
  { to: '/admin', label: 'Home', end: true },
  { to: '/admin/submissions', label: 'Submissions' },
  { to: '/admin/work-queue', label: 'Queue' },
  { to: '/admin/institutes', label: 'Institutes' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/insurance', label: 'Insurance' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/notifications', label: 'Alerts' }
];

export const COLLEGE_QUICK_ACTIONS = [
  { to: '/college/submissions/new', label: 'New Submission' },
  { to: '/college/submissions', label: 'My Submissions' },
  { to: '/college/students/add', label: 'Add Student' },
  { to: '/college/students/upload', label: 'Upload Students Excel' },
  { to: '/college/documents', label: 'Upload Document' },
  { to: '/college/insurance', label: 'View Insurance' },
  { to: '/college/ecard', label: 'View E-card' },
  { to: '/college/payment-status', label: 'View Payment Status' },
  { to: '/college/notifications', label: 'Notifications' }
];

export const ADMIN_QUICK_ACTIONS = [
  { to: '/admin/submissions', label: 'College submissions' },
  { to: '/admin/work-queue', label: 'Open work queue' },
  { to: '/admin/registrations', label: 'Approve Institute' },
  { to: '/admin/registrations', label: 'View Pending Registrations' },
  { to: '/admin/support', label: 'View Pending Reviews' },
  { to: '/admin/reports', label: 'View Reports' },
  { to: '/admin/announcements', label: 'Send Announcement' },
  { to: '/admin/system-jobs', label: 'View System Jobs' }
];
