import { Link } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';

export function NotFoundPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-16">
      <Seo title="Page not found" path="/404" />
      <h1 className="text-2xl font-semibold text-navy">Page not found</h1>
      <p className="mt-3 text-sm text-slate-700">The page you requested is not available on this website.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-navy underline">Return to home</Link>
    </main>
  );
}

export function ForbiddenPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-16">
      <Seo title="Access denied" path="/forbidden" />
      <h1 className="text-2xl font-semibold text-navy">You do not have access</h1>
      <p className="mt-3 text-sm text-slate-700">This area is restricted. If you believe this is a mistake, sign in with an authorised account.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-navy underline">Return to home</Link>
    </main>
  );
}

export function ServerErrorPage({ requestId }: { requestId?: string }) {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-16">
      <Seo title="Something went wrong" path="/error" />
      <h1 className="text-2xl font-semibold text-navy">Something went wrong</h1>
      <p className="mt-3 text-sm text-slate-700">Please try again. If the problem continues, share the reference ID with support.</p>
      {requestId ? <p className="mt-3 text-sm font-semibold text-navy">Reference ID: {requestId}</p> : null}
      <Link to="/" className="mt-6 inline-block font-semibold text-navy underline">Return to home</Link>
    </main>
  );
}

export function MaintenancePage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-16">
      <Seo title="Maintenance" path="/maintenance" />
      <h1 className="text-2xl font-semibold text-navy">The portal is under maintenance</h1>
      <p className="mt-3 text-sm text-slate-700">Scheme information on the public website remains available. Please try the college or admin portal again later.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-navy underline">View public website</Link>
    </main>
  );
}

export function SessionExpiredPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-16">
      <Seo title="Session expired" path="/session-expired" />
      <h1 className="text-2xl font-semibold text-navy">Your session has expired</h1>
      <p className="mt-3 text-sm text-slate-700">Sign in again to continue. For your security, portal sessions expire after a period of inactivity.</p>
      <Link to="/login" className="mt-6 inline-block min-h-11 bg-navy px-4 py-2 font-semibold text-white">Return to login</Link>
    </main>
  );
}

export function NetworkErrorPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-16">
      <Seo title="Network error" path="/network-error" />
      <h1 className="text-2xl font-semibold text-navy">We could not reach the server</h1>
      <p className="mt-3 text-sm text-slate-700">Check your connection and try again. If you were uploading a file, the upload was not completed automatically.</p>
      <button type="button" className="mt-6 min-h-11 bg-navy px-4 py-2 font-semibold text-white" onClick={() => window.location.reload()}>
        Retry
      </button>
    </main>
  );
}
