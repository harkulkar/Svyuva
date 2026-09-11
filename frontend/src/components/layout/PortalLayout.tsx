import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useId, useState } from 'react';
import { SITE } from '../../data/site';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { BottomNav } from './BottomNav';
import { Breadcrumbs } from './Breadcrumbs';
import { ConfirmDialog } from '../common/AdminUi';
import {
  ADMIN_BOTTOM_NAV,
  ADMIN_LINKS,
  COLLEGE_BOTTOM_NAV,
  COLLEGE_LINKS,
  type PortalNavItem
} from '../../data/portalNav';

function linkClass(isActive: boolean) {
  return `block min-h-11 px-4 py-3 text-sm font-medium hover:bg-navy-light ${isActive ? 'bg-navy-light text-saffron' : ''}`;
}

function SideNav({ items, label, onNavigate }: { items: PortalNavItem[]; label: string; onNavigate?: () => void }) {
  return (
    <nav aria-label={label} className="flex flex-col">
      {items.map((item) =>
        item.children ? (
          <div key={item.label}>
            <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-saffron">{item.label}</p>
            {item.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                end={child.end}
                className={({ isActive }) => `${linkClass(isActive)} pl-6`}
                onClick={onNavigate}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        ) : (
          <NavLink key={item.to} to={item.to!} end={item.end} className={({ isActive }) => linkClass(isActive)} onClick={onNavigate}>
            {item.label}
          </NavLink>
        )
      )}
    </nav>
  );
}

function PortalShell({
  title,
  email,
  items,
  navLabel,
  bottomItems,
  bottomLabel,
  onLogout,
  notificationsTo
}: {
  title: string;
  email?: string;
  items: PortalNavItem[];
  navLabel: string;
  bottomItems: typeof COLLEGE_BOTTOM_NAV;
  bottomLabel: string;
  onLogout: () => void;
  notificationsTo: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const location = useLocation();
  const drawerTitleId = useId();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    document.body.classList.add('overflow-hidden', 'md:overflow-auto');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('overflow-hidden', 'md:overflow-auto');
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-slate-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[60] focus:bg-saffron focus:px-3 focus:py-2 focus:text-navy-dark">
        Skip to Main Content
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center border border-navy text-navy md:hidden"
              aria-expanded={open}
              aria-controls="portal-sidebar"
              onClick={() => setOpen((value) => !value)}
            >
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
              <span aria-hidden="true" className="text-xl leading-none">
                {open ? '×' : '☰'}
              </span>
            </button>
            <img src={SITE.logoSrc} alt="" className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">{title}</p>
              <p className="hidden truncate text-xs text-slate-600 sm:block">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell viewAllTo={notificationsTo} compact />
            <button type="button" className="hidden min-h-11 bg-navy px-3 py-2 text-sm font-semibold text-white sm:inline-flex" onClick={() => setConfirmLogout(true)}>
              Logout
            </button>
          </div>
        </div>
      </header>
      {open ? (
        <button type="button" className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />
      ) : null}
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
        <aside
          id="portal-sidebar"
          className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-navy text-white transition-transform md:static md:z-0 md:block md:min-h-[calc(100vh-4rem)] md:w-60 md:translate-x-0`}
          aria-labelledby={drawerTitleId}
        >
          <p id={drawerTitleId} className="sr-only">
            {navLabel} navigation
          </p>
          <SideNav items={items} label={navLabel} onNavigate={() => setOpen(false)} />
          <button type="button" className="min-h-11 w-full px-4 py-3 text-left text-sm font-medium hover:bg-navy-light" onClick={() => setConfirmLogout(true)}>
            Logout
          </button>
        </aside>
        <main id="main-content" className="min-w-0 flex-1 p-4 pb-20 md:p-8 md:pb-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
      <BottomNav items={bottomItems} label={bottomLabel} />
      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        confirmLabel="Log out"
        danger
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          onLogout();
        }}
      >
        You will need to sign in again to use the college or admin portal.
      </ConfirmDialog>
    </div>
  );
}

export function CollegeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }
  return (
    <PortalShell
      title="College portal"
      email={user?.email}
      items={COLLEGE_LINKS}
      navLabel="College"
      bottomItems={COLLEGE_BOTTOM_NAV}
      bottomLabel="College shortcuts"
      notificationsTo="/college/notifications"
      onLogout={() => void onLogout()}
    />
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }
  return (
    <PortalShell
      title="Administrator"
      email={user?.email}
      items={ADMIN_LINKS}
      navLabel="Admin"
      bottomItems={ADMIN_BOTTOM_NAV}
      bottomLabel="Admin shortcuts"
      notificationsTo="/admin/notifications"
      onLogout={() => void onLogout()}
    />
  );
}
