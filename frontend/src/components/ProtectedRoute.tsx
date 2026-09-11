import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';
import { Loading } from './common/Loading';
import { requiredPasswordResetPath } from '../utils/authGuards';

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main id="main-content" className="mx-auto max-w-xl px-4 py-16">
        <Loading label="Checking your session…" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  const resetPath = requiredPasswordResetPath(user);
  if (resetPath && location.pathname !== resetPath) {
    return <Navigate to={resetPath} replace />;
  }

  return children;
}

export function RoleProtectedRoute({ children, roles }: { children: ReactNode; roles: UserRole[] }) {
  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <main id="main-content" className="mx-auto max-w-xl px-4 py-16">
        <Loading label="Loading…" />
      </main>
    );
  }
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'COLLEGE') return <Navigate to="/college" replace />;
  return children;
}
