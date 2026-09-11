import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { useAuth } from '../../context/AuthContext';

export function AdminHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }
  return (
    <>
      <Seo title="Admin" path="/admin" />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-12">
        <div className="border border-slate-300 bg-white p-8">
          <h1 className="text-2xl font-semibold text-navy">Administrator</h1>
          <p className="mt-2 text-sm text-slate-700">Signed in as {user?.email}</p>
          <p className="mt-6 text-sm leading-relaxed text-slate-700">Admin dashboard will be implemented in Phase 6.</p>
          <div className="mt-6 flex gap-3">
            <Link to="/" className="border border-navy px-4 py-2 text-sm font-semibold text-navy">
              Public website
            </Link>
            <button type="button" className="bg-navy px-4 py-2 text-sm font-semibold text-white" onClick={() => void onLogout()}>
              Logout
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

export function CollegeHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }
  return (
    <>
      <Seo title="College portal" path="/college" />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-12">
        <div className="border border-slate-300 bg-white p-8">
          <h1 className="text-2xl font-semibold text-navy">College portal</h1>
          <p className="mt-2 text-sm text-slate-700">Signed in as {user?.email}</p>
          <p className="mt-6 text-sm leading-relaxed text-slate-700">College dashboard will be implemented in Phase 4.</p>
          <div className="mt-6 flex gap-3">
            <Link to="/" className="border border-navy px-4 py-2 text-sm font-semibold text-navy">
              Public website
            </Link>
            <button type="button" className="bg-navy px-4 py-2 text-sm font-semibold text-white" onClick={() => void onLogout()}>
              Logout
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
