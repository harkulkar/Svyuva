import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMe, loginRequest, logoutRequest } from '../services/api';
import type { AuthUser } from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const result = await loginRequest(email, password, rememberMe);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      void import('../pwa/register').then((mod) => mod.clearNonSensitiveCaches());
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refreshUser
    }),
    [user, isLoading, login, logout, refreshUser]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
