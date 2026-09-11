import { Link, useLocation } from 'react-router-dom';

function crumbsFor(pathname: string): Array<{ label: string; to?: string }> {
  if (pathname.startsWith('/admin')) {
    const items: Array<{ label: string; to?: string }> = [{ label: 'Admin', to: '/admin' }];
    if (pathname === '/admin') return items;
    if (pathname.startsWith('/admin/institutes/') && pathname !== '/admin/institutes') {
      items.push({ label: 'Institutes', to: '/admin/institutes' }, { label: 'Institute details' });
      return items;
    }
    if (pathname.startsWith('/admin/students/') && pathname !== '/admin/students') {
      items.push({ label: 'Students', to: '/admin/students' }, { label: 'Student details' });
      return items;
    }
    const map: Record<string, string> = {
      '/admin/institutes': 'Institutes',
      '/admin/students': 'Students',
      '/admin/insurance': 'Insurance',
      '/admin/registrations': 'Registrations',
      '/admin/reports': 'Reports',
      '/admin/notifications': 'Notifications',
      '/admin/announcements': 'Announcements',
      '/admin/profile': 'Profile',
      '/admin/users': 'Users',
      '/admin/settings': 'Settings',
      '/admin/system-jobs': 'System jobs',
      '/admin/universities': 'Universities'
    };
    const label = map[pathname] || pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ');
    items.push({ label: label || 'Page' });
    return items;
  }
  if (pathname.startsWith('/college')) {
    const items: Array<{ label: string; to?: string }> = [{ label: 'College', to: '/college' }];
    if (pathname === '/college') return items;
    if (/^\/college\/students\/[^/]+\/edit$/.test(pathname)) {
      items.push({ label: 'Students', to: '/college/students' }, { label: 'Edit student' });
      return items;
    }
    if (/^\/college\/students\/[^/]+$/.test(pathname) && pathname !== '/college/students/add' && pathname !== '/college/students/upload') {
      items.push({ label: 'Students', to: '/college/students' }, { label: 'Student details' });
      return items;
    }
    const map: Record<string, string> = {
      '/college/students': 'Students',
      '/college/students/add': 'Add student',
      '/college/students/upload': 'Upload students',
      '/college/insurance': 'Insurance',
      '/college/documents': 'Documents',
      '/college/ecard': 'E-card',
      '/college/payment-status': 'Payment status',
      '/college/notifications': 'Notifications',
      '/college/profile': 'Profile',
      '/college/reports': 'Reports'
    };
    items.push({ label: map[pathname] || pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ') || 'Page' });
    return items;
  }
  return [];
}

export function Breadcrumbs() {
  const location = useLocation();
  const items = crumbsFor(location.pathname);
  if (items.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 hidden text-sm text-slate-600 md:block">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true">→</span> : null}
            {item.to && index < items.length - 1 ? (
              <Link to={item.to} className="font-medium text-navy underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
