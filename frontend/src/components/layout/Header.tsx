import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { PRIMARY_NAV } from '../../data/navigation';
import { SITE } from '../../data/site';
import { useTextScale } from '../../hooks/useTextScale';
import type { NavItem } from '../../data/navigation';
import { useAuth } from '../../context/AuthContext';

export function Header() {
  const { scale, apply } = useTextScale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 shadow">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[60] focus:bg-saffron focus:px-3 focus:py-2 focus:text-navy-dark">
        Skip to Main Content
      </a>
      <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-indiaGreen" />
      <div className="bg-[#111827] text-xs text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5">
          <p className="text-[11px] uppercase tracking-wide">{SITE.departmentLine}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/accessibility-statement" className="hover:underline">
              Screen Reader Access
            </Link>
            <div className="flex items-center gap-1" role="group" aria-label="Text size">
              <span className="sr-only">Text size</span>
              <button type="button" className={`px-1.5 py-0.5 ${scale === 'md' ? 'bg-white text-navy' : 'hover:bg-white/20'}`} onClick={() => apply('md')} aria-pressed={scale === 'md'} aria-label="Default text size">
                A
              </button>
              <button type="button" className={`px-1.5 py-0.5 ${scale === 'lg' ? 'bg-white text-navy' : 'hover:bg-white/20'}`} onClick={() => apply('lg')} aria-pressed={scale === 'lg'} aria-label="Larger text">
                A+
              </button>
              <button type="button" className={`px-1.5 py-0.5 ${scale === 'xl' ? 'bg-white text-navy' : 'hover:bg-white/20'}`} onClick={() => apply('xl')} aria-pressed={scale === 'xl'} aria-label="Largest text">
                A++
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-3">
            <img src={SITE.logoSrc} alt={SITE.logoAlt} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-indiaGreen sm:text-sm">{SITE.departmentLine}</span>
              <span className="block text-lg font-bold leading-tight text-navy sm:text-2xl">{SITE.fullName}</span>
              <span className="block text-xs text-slate-600">{SITE.shortName}</span>
            </span>
          </Link>
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <AuthActions user={user} isLoading={isLoading} onLogout={async () => { await logout(); navigate('/'); }} />
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center border border-navy text-navy lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
            <span aria-hidden="true" className="text-2xl leading-none">
              {mobileOpen ? '×' : '☰'}
            </span>
          </button>
        </div>
      </div>
      <nav className="bg-navy text-white" aria-label="Primary">
        <div className="mx-auto hidden max-w-6xl items-center px-2 lg:flex">
          {PRIMARY_NAV.map((item) =>
            item.children ? <DesktopDropdown key={item.label} item={item} /> : <DesktopLink key={item.label} to={item.to ?? '/'} label={item.label} />
          )}
        </div>
        {mobileOpen ? (
          <div id="mobile-navigation" className="border-t border-white/20 lg:hidden">
            <ul className="mx-auto max-w-6xl px-4 py-3">
              {PRIMARY_NAV.map((item) => (
                <MobileItem key={item.label} item={item} />
              ))}
              <li className="mt-3 flex flex-wrap gap-2">
                <AuthActions
                  user={user}
                  isLoading={isLoading}
                  mobile
                  onLogout={async () => {
                    await logout();
                    navigate('/');
                  }}
                />
              </li>
            </ul>
          </div>
        ) : null}
      </nav>
    </header>
  );
}

function AuthActions({
  user,
  isLoading,
  onLogout,
  mobile
}: {
  user: ReturnType<typeof useAuth>['user'];
  isLoading: boolean;
  onLogout: () => Promise<void>;
  mobile?: boolean;
}) {
  if (isLoading) {
    return <span className={`text-sm ${mobile ? 'text-white' : 'text-slate-600'}`}>…</span>;
  }
  if (user?.role === 'ADMIN') {
    return (
      <>
        <Link to="/admin" className={mobile ? 'flex-1 border border-white px-3 py-2 text-center text-sm font-semibold' : 'border border-navy px-4 py-2 text-sm font-semibold uppercase tracking-wide text-navy hover:bg-navy hover:text-white'}>
          Admin Dashboard
        </Link>
        <button type="button" className={mobile ? 'flex-1 bg-saffron px-3 py-2 text-sm font-semibold text-navy-dark' : 'bg-navy px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white'} onClick={() => void onLogout()}>
          Logout
        </button>
      </>
    );
  }
  if (user?.role === 'COLLEGE') {
    return (
      <>
        <Link to="/college" className={mobile ? 'flex-1 border border-white px-3 py-2 text-center text-sm font-semibold' : 'border border-navy px-4 py-2 text-sm font-semibold uppercase tracking-wide text-navy hover:bg-navy hover:text-white'}>
          College Dashboard
        </Link>
        <button type="button" className={mobile ? 'flex-1 bg-saffron px-3 py-2 text-sm font-semibold text-navy-dark' : 'bg-navy px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white'} onClick={() => void onLogout()}>
          Logout
        </button>
      </>
    );
  }
  return (
    <>
      <Link to="/login" className={mobile ? 'flex-1 border border-white px-3 py-2 text-center text-sm font-semibold' : 'border border-navy px-4 py-2 text-sm font-semibold uppercase tracking-wide text-navy hover:bg-navy hover:text-white'}>
        Login
      </Link>
      <Link to="/signup" className={mobile ? 'flex-1 bg-saffron px-3 py-2 text-center text-sm font-semibold text-navy-dark' : 'bg-saffron px-4 py-2 text-sm font-semibold uppercase tracking-wide text-navy-dark hover:bg-[#e88920]'}>
        Sign Up
      </Link>
    </>
  );
}

function DesktopLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-3 text-sm font-semibold hover:bg-navy-light ${isActive ? 'bg-navy-light text-saffron' : ''}`
      }
    >
      {label}
    </NavLink>
  );
}

function DesktopDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonId = useId();

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        id={buttonId}
        type="button"
        className="px-4 py-3 text-sm font-semibold hover:bg-navy-light"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        {item.label}
      </button>
      {open && item.children ? (
        <ul className="absolute left-0 z-50 min-w-[240px] border border-slate-200 bg-white py-1 text-navy shadow-lg" role="menu" aria-labelledby={buttonId}>
          {item.children.map((child) => (
            <li key={child.to} role="none">
              <NavLink
                to={child.to}
                role="menuitem"
                className="block px-4 py-2 text-sm hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MobileItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  if (!item.children) {
    return (
      <li>
        <NavLink to={item.to ?? '/'} className="block border-b border-white/10 py-3 font-medium">
          {item.label}
        </NavLink>
      </li>
    );
  }
  return (
    <li className="border-b border-white/10">
      <button type="button" className="flex w-full items-center justify-between py-3 font-medium" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {item.label}
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <ul className="pb-2 pl-3">
          {item.children.map((child) => (
            <li key={child.to}>
              <NavLink to={child.to} className="block py-2 text-sm text-blue-100">
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
